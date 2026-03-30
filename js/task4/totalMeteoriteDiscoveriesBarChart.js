export default class TotalMeteoriteDiscoveriesBarChart {
  constructor(_config, data, dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 240,
      containerHeight: _config.containerHeight || 260,
      margin: {
        top: 62,
        right: 20,
        bottom: 26,
        left: 65,
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
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = d3.axisBottom(vis.xScale).tickFormat((d) => `${d}–${d + 9}`).tickSizeOuter(0);
    vis.yAxis = d3.axisLeft(vis.yScale).tickFormat(d3.format('d')).ticks(5).tickSizeOuter(0);

    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight)
      .attr('id', 'total-meteorite-discoveries-bar-chart-svg');

    vis.svg
      .append('text')
      .attr('class', 'chart-title')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .text('Total Meteorite Discoveries Per Decade');

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

    vis.chartArea
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -vis.height / 2)
      .attr('y', -vis.config.margin.left + 20)
      .attr('text-anchor', 'middle')
      .text('Number of Discoveries');

    vis.typeTrendLine = vis.chartArea
      .append('path')
      .attr('class', 'type-trend-line')
      .attr('fill', 'none')
      .attr('display', 'none')
      .style('pointer-events', 'none');

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    vis.yearCounts = d3
      .rollups(
        vis.data,
        (group) => group.length,
        (d) => Math.floor(d.year / 10) * 10,
      )
      .map((d) => ({
        year: d[0],
        count: d[1],
      }));

    vis.yearCounts.sort((a, b) => a.year - b.year);

    vis.xScale.domain(vis.yearCounts.map((d) => d.year));
    vis.yScale.domain([0, d3.max(vis.yearCounts, (d) => d.count)]).nice();

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    vis.bars = vis.chartArea
      .selectAll('.bar')
      .data(vis.yearCounts, (d) => d.year)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => vis.xScale(d.year))
      .attr('y', (d) => vis.yScale(d.count))
      .attr('width', vis.xScale.bandwidth())
      .attr('height', (d) => vis.height - vis.yScale(d.count))
      .on('mouseover', (event, d) => {
        vis.bars
          .classed('is-highlighted', (bar) => bar.year === d.year)
          .classed('is-dimmed', (bar) => bar.year !== d.year);

        vis.dispatcher.call('hoverTotalMeteoriteBucket', event, d.year);
      })
      .on('mouseout', (event) => {
        vis.bars
          .classed('is-highlighted', false)
          .classed('is-dimmed', false);

        vis.dispatcher.call('hoverTotalMeteoriteBucket', event, null);
      });

    vis.dispatcher.on('hoverMeteoriteType', (payload) => {
      if (payload == null) {
        vis.typeTrendLine
          .attr('display', 'none')
          .datum([]);

        vis.bars.classed('is-dimmed', false);
        return;
      }

      const { recclass, topRecclasses } = payload;

      const trendData = vis.yearCounts.map((bucketObj) => {
        const bucketYear = bucketObj.year;

        const bucketRows = vis.data.filter(
          (row) => Math.floor(row.year / 10) * 10 === bucketYear,
        );

        const classCount = bucketRows.filter((row) => {
          if (recclass === 'Other') {
            return !topRecclasses.includes(row.recclass);
          }
          return row.recclass === recclass;
        }).length;

        return {
          year: bucketYear,
          count: classCount,
        };
      });

      vis.bars.classed('is-dimmed', true);
      vis.typeTrendLine
        .datum(trendData)
        .attr('display', null)
        .attr(
          'd',
          d3.line()
            .x((d) => vis.xScale(d.year) + vis.xScale.bandwidth() / 2)
            .y((d) => vis.yScale(d.count)),
        )
        .raise();
    });

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);

    vis.xAxisGroup
      .selectAll('text')
      .style('text-anchor', 'middle');
  }
}
