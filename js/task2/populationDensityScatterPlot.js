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

  static buildPowerOfTenTicks(maxValue) {
    const ticks = [];
    let power = 0;

    while (10 ** power <= maxValue) {
      ticks.push(10 ** power);
      power += 1;
    }

    return ticks;
  }

  static buildTicksWithMax(baseTicks, maxValue) {
    const ticks = [...baseTicks];

    if (!ticks.includes(maxValue)) {
      ticks.push(maxValue);
    }

    return [...new Set(ticks)].sort((a, b) => a - b);
  }

  static formatMaxTick(value) {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}k`;
    }
    return value.toFixed(2);
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    if (!vis.chartData.length) return;

    vis.xMax = d3.max(vis.chartData, (d) => d.landings);
    vis.yMax = d3.max(vis.chartData, (d) => d.population_density);

    if (!(vis.xMax > 0) || !(vis.yMax > 0)) return;

    vis.xScale = d3
      .scaleLog()
      .domain([1, vis.xMax])
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLog()
      .domain([1, vis.yMax])
      .range([vis.height, 0]);

    const baseXTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
      .filter((d) => d >= 1 && d <= vis.xMax);

    const baseYTicks = PopulationDensityScatterPlot.buildPowerOfTenTicks(vis.yMax);

    vis.xTicks = PopulationDensityScatterPlot.buildTicksWithMax(baseXTicks, vis.xMax);
    vis.yGridTicks = PopulationDensityScatterPlot.buildTicksWithMax(baseYTicks, vis.yMax);
    vis.yAxisTicks = PopulationDensityScatterPlot.buildTicksWithMax(baseYTicks, vis.yMax);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    const xTickFormat = (d) => {
      if (d === vis.xMax) return PopulationDensityScatterPlot.formatMaxTick(d);
      return d3.format('~s')(d);
    };

    const yTickFormat = (d) => {
      if (d === vis.yMax) return PopulationDensityScatterPlot.formatMaxTick(d);
      return d3.format('~s')(d);
    };

    vis.xGridGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTicks)
        .tickSize(-vis.height)
        .tickFormat(''),
    );

    vis.yGridGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yGridTicks)
        .tickSize(-vis.width)
        .tickFormat(''),
    );

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTicks)
        .tickFormat(xTickFormat),
    );

    vis.yAxisGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yAxisTicks)
        .tickFormat(yTickFormat),
    );

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

    const xTicks = vis.xAxisGroup.selectAll('.tick').nodes();
    if (xTicks.length >= 2) {
      const secondLastTick = d3.select(xTicks[xTicks.length - 2]).select('text');
      const lastTick = d3.select(xTicks[xTicks.length - 1]).select('text');

      secondLastTick.attr('dx', '-0.7em');
      lastTick.attr('dx', '0.7em');
    }

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
