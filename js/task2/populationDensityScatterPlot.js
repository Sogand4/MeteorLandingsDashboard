class PopulationDensityScatterPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 700,
      containerHeight: _config.containerHeight || 460,
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
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

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

  static buildYTicks(yMax) {
    const baseTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
      .filter((d) => d <= yMax);

    if (yMax <= 5000) {
      return baseTicks;
    }

    const extraTicks = [];
    const upperTickCount = 3; // number of proportional ticks from 5k to max

    const log5000 = Math.log10(5000);
    const logMax = Math.log10(yMax);

    for (let i = 1; i <= upperTickCount; i++) {
      const t = i / upperTickCount;
      const value = 10 ** (log5000 + (logMax - log5000) * t);
      extraTicks.push(Math.round(value));
    }

    return [...new Set([...baseTicks, ...extraTicks])].sort((a, b) => a - b);
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    if (!vis.chartData.length) return;

    const xMax = d3.max(vis.chartData, (d) => d.landings);
    const yMax = d3.max(vis.chartData, (d) => d.population_density);

    if (!(xMax > 0) || !(yMax > 0)) return;

    vis.xScale = d3
      .scaleLog()
      .domain([1, xMax])
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLog()
      .domain([1, yMax])
      .range([vis.height, 0]);

    vis.xTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
      .filter((d) => d >= 1 && d <= xMax);

    vis.yGridTicks = vis.buildYTicks(yMax);
    vis.yAxisTicks = vis.buildYTicks(yMax);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

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
        .tickFormat(d3.format('~s')),
    );

    vis.yAxisGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yAxisTicks)
        .tickFormat(d3.format('~s')),
    );

    vis.chart.selectAll('.grid .domain').remove();

    vis.yAxisGroup
      .selectAll('.tick text')
      .attr('font-size', '10px')
      .attr('x', -10)
      .attr('dy', '0.32em')
      .style('text-anchor', 'end');

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
