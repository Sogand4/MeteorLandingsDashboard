export default class TopMeteoriteDistributionBarChart {
  constructor(_config, data, dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 240,
      containerHeight: _config.containerHeight || 260,
      margin: {
        top: 45,
        right: 5,
        bottom: 50,
        left: 40,
      },
    };
    this.data = data;
    this.dispatcher = dispatcher;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;
    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    vis.xScale = d3.scaleBand().range([0, vis.width]).padding(0.15);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]).domain([0, 1]);

    vis.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    vis.xAxis = d3.axisBottom(vis.xScale).tickFormat((d) => `${d}–${d + 9}`);
    vis.yAxis = d3.axisLeft(vis.yScale).tickFormat(d3.format('.0%')).ticks(5);

    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight)
      .attr('id', 'top-meteorite-distribution-bar-chart-svg');

    vis.svg
      .append('text')
      .attr('class', 'chart-title')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text('Top Meteorite Recclass Distribution by Decade');

    vis.chartArea = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.xAxisGroup = vis.chartArea
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chartArea.append('g').attr('class', 'y-axis');

    vis.legendGroup = vis.svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${vis.config.containerWidth / 4}, 38)`);

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    const recclassCounts = d3.rollups(
      vis.data,
      (group) => group.length,
      (d) => d.recclass,
    );

    vis.topRecclasses = recclassCounts
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map((d) => d[0]);

    vis.stackKeys = [...vis.topRecclasses, 'Other'];

    const processedData = vis.data.map((d) => {
      const yearBucket = Math.floor(d.year / 10) * 10;
      const recclassGroup = vis.topRecclasses.includes(d.recclass)
        ? d.recclass
        : 'Other';

      return {
        yearBucket,
        recclassGroup,
      };
    });

    const rolled = d3.rollups(
      processedData,
      (group) => group.length,
      (d) => d.yearBucket,
      (d) => d.recclassGroup,
    );

    vis.stackedData = rolled.map(([yearBucket, classEntries]) => {
      const obj = { year: yearBucket };

      vis.stackKeys.forEach((key) => {
        obj[key] = 0;
      });

      classEntries.forEach(([recclassGroup, count]) => {
        obj[recclassGroup] = count;
      });

      return obj;
    });

    vis.stackedData.forEach((d) => {
      const total = d3.sum(vis.stackKeys, (key) => d[key]);

      vis.stackKeys.forEach((key) => {
        d[key] /= total;
      });
    });

    vis.stackedData.sort((a, b) => a.year - b.year);

    vis.series = d3.stack().keys(vis.stackKeys)(vis.stackedData);

    vis.xScale.domain(vis.stackedData.map((d) => d.year));

    vis.colorScale.domain(vis.stackKeys);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    const layer = vis.chartArea
      .selectAll('.stack-layer')
      .data(vis.series, (d) => d.key)
      .join('g')
      .attr('class', 'stack-layer')
      .attr('fill', (d) => vis.colorScale(d.key))
      .on('mouseenter', (event, d) => {
        vis.dispatcher.call('hoverMeteoriteType', event, {
          recclass: d.key,
          topRecclasses: vis.topRecclasses,
        });
      })
      .on('mouseleave', () => {
        vis.dispatcher.call('hoverMeteoriteType', null);
      });

    const bars = layer
      .selectAll('rect')
      .data((d) => d)
      .join('rect')
      .attr('x', (d) => vis.xScale(d.data.year))
      .attr('y', (d) => vis.yScale(d[1]))
      .attr('width', vis.xScale.bandwidth())
      .attr('height', (d) => vis.yScale(d[0]) - vis.yScale(d[1]))
      .on('mouseenter', (event, d) => {
        bars
          .classed('is-highlighted', (barData) => barData.key === d.key)
          .classed('is-dimmed', (barData) => barData.key !== d.key);
      })
      .on('mouseleave', () => {
        bars
          .classed('is-highlighted', false)
          .classed('is-dimmed', false);
      });

    vis.dispatcher.on('hoverTotalMeteoriteBucket', (bucket) => {
      if (bucket == null) {
        bars
          .classed('is-highlighted', false)
          .classed('is-dimmed', false);
      } else {
        bars
          .classed('is-highlighted', (d) => d.data.year === bucket)
          .classed('is-dimmed', (d) => d.data.year !== bucket);
      }
    });

    const legendItems = vis.legendGroup
      .selectAll('.legend-item')
      .data(vis.stackKeys, (d) => d)
      .join('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${i * 55}, 0)`);

    legendItems
      .selectAll('rect')
      .data((d) => [d])
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', -10)
      .attr('fill', (d) => vis.colorScale(d));

    legendItems
      .selectAll('text')
      .data((d) => [d])
      .join('text')
      .attr('x', 14)
      .attr('y', -1)
      .style('font-size', '10px')
      .text((d) => d);

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);

    vis.xAxisGroup
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');
  }
}
