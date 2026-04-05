class PopulationDensityScatterPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 700,
      containerHeight: _config.containerHeight || 300,
      margin: {
        top: 60, right: 25, bottom: 65, left: 95,
      },
    };
    this.data = data;
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

    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('viewBox', `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    vis.svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'scatter-clip')
      .append('rect')
      .attr('width', vis.width)
      .attr('height', vis.height);

    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.plotArea = vis.chart
      .append('g')
      .attr('clip-path', 'url(#scatter-clip)');

    vis.svg
      .append('text')
      .attr('class', 'chart-title')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text('Meteorite Landings vs. Population Density');

    vis.xAxisGroup = vis.chart
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chart
      .append('g')
      .attr('class', 'axis axis-y');

    vis.xGridGroup = vis.chart
      .append('g')
      .attr('class', 'grid grid-x')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yGridGroup = vis.chart
      .append('g')
      .attr('class', 'grid grid-y');

    vis.svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', vis.config.containerHeight - 12)
      .attr('text-anchor', 'middle')
      .text('Number of Meteor Landings (log scale)');

    vis.svg
      .append('text')
      .attr('class', 'axis-label')
      .attr(
        'transform',
        `translate(24, ${vis.config.containerHeight / 2}) rotate(-90)`,
      )
      .attr('text-anchor', 'middle')
      .text('Population Density (log scale)');
  }

  wrangleData() {
    const vis = this;

    vis.chartData = d3
      .rollups(
        vis.data.filter(
          (d) => d.country
            && d.population_density != null
            && !Number.isNaN(+d.population_density),
        ),
        (values) => ({
          landings: values.length,
          population_density: +values[0].population_density,
        }),
        (d) => d.country,
      )
      .map(([country, values]) => ({
        country,
        landings: +values.landings,
        population_density: +values.population_density,
      }))
      .filter(
        (d) => !Number.isNaN(d.landings)
          && !Number.isNaN(d.population_density)
          && d.landings >= 1
          && d.population_density >= 1,
      )
      .sort((a, b) => a.landings - b.landings);
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    if (!vis.chartData.length) return;

    vis.xMax = d3.max(vis.chartData, (d) => d.landings);
    vis.yMax = d3.max(vis.chartData, (d) => d.population_density);

    if (!(vis.xMax > 0) || !(vis.yMax > 0)) return;

    vis.xDomainMax = 10 ** Math.ceil(Math.log10(vis.xMax));
    vis.yDomainMax = 10 ** Math.ceil(Math.log10(vis.yMax));

    vis.xScale = d3
      .scaleLog()
      .domain([1, vis.xDomainMax])
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLog()
      .domain([1, vis.yDomainMax])
      .range([vis.height, 0]);

    vis.xTickValues = d3.range(
      Math.ceil(Math.log10(1)),
      Math.floor(Math.log10(vis.xDomainMax)) + 1,
    ).map((d) => 10 ** d);

    vis.yTickValues = d3.range(
      Math.ceil(Math.log10(1)),
      Math.floor(Math.log10(vis.yDomainMax)) + 1,
    ).map((d) => 10 ** d);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    vis.xGridGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTickValues)
        .tickSize(-vis.height)
        .tickFormat(''),
    );

    vis.yGridGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yTickValues)
        .tickSize(-vis.width)
        .tickFormat(''),
    );

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTickValues)
        .tickFormat(d3.format('~s')),
    );

    vis.yAxisGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yTickValues)
        .tickFormat(d3.format('~s')),
    );

    vis.xGridGroup.select('.tick:first-of-type line').remove();
    vis.yGridGroup.select('.tick:first-of-type line').remove();

    vis.chart.selectAll('.grid .domain').remove();

    vis.yAxisGroup
      .selectAll('.tick text')
      .attr('font-size', '10px')
      .attr('x', -10)
      .attr('dy', '0.32em')
      .style('text-anchor', 'end');

    const xTickTexts = vis.xAxisGroup.selectAll('.tick text');

    xTickTexts
      .attr('font-size', '9px')
      .attr('dy', '0.9em')
      .style('text-anchor', 'middle');

    const points = vis.plotArea
      .selectAll('.scatter-point')
      .data(vis.chartData, (d) => d.country)
      .join('circle')
      .attr('class', 'scatter-point')
      .attr('cx', (d) => vis.xScale(d.landings))
      .attr('cy', (d) => vis.yScale(d.population_density))
      .attr('r', 4);

    points.selectAll('title').remove();

    points
      .append('title')
      .text(
        (d) => `${d.country}\nLandings: ${d.landings}\nPopulation density: ${d3.format('.1f')(d.population_density)}`,
      );
  }
}

export default PopulationDensityScatterPlot;
