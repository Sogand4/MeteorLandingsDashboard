class PopulationDensityScatterPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 520,
      containerHeight: _config.containerHeight || 320,
      margin: {
        top: 55, right: 25, bottom: 60, left: 80,
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

    vis.chart = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.svg
      .append('text')
      .attr('class', 'chart-title')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .text('Meteorite Landings vs. Population Density');

    vis.xAxisGroup = vis.chart
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chart.append('g').attr('class', 'axis axis-y');

    vis.svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', vis.config.containerHeight - 12)
      .attr('text-anchor', 'middle')
      .text('Number of Meteor Landings');

    vis.svg
      .append('text')
      .attr('class', 'axis-label')
      .attr(
        'transform',
        `translate(22, ${vis.config.containerHeight / 2}) rotate(-90)`,
      )
      .attr('text-anchor', 'middle')
      .text('Population Density');

    vis.updateVis();
  }

  wrangleData() {
    const vis = this;

    const grouped = d3
      .rollups(
        vis.data.filter(
          (d) => d.country
            && d.population_density != null
            && !isNaN(d.population_density),
        ),
        (values) => ({
          landings: values.length,
          population_density: values[0].population_density,
        }),
        (d) => d.country,
      )
      .map(([country, values]) => ({ country, ...values }))
      .filter(
        (d) => d.landings <= 7000
          && d.population_density > 0
          && d.population_density <= 850,
      )
      .sort((a, b) => a.landings - b.landings);

    vis.chartData = grouped;
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    vis.xScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(7000, d3.max(vis.chartData, (d) => d.landings) || 1),
      ])
      .nice()
      .range([0, vis.width]);

    vis.yScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(850, d3.max(vis.chartData, (d) => d.population_density) || 1),
      ])
      .nice()
      .range([vis.height, 0]);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale).ticks(7).tickFormat(d3.format('~s')),
    );
    vis.yAxisGroup.call(d3.axisLeft(vis.yScale).ticks(8));

    vis.chart
      .selectAll('.grid-line-x')
      .data(vis.yScale.ticks(8))
      .join('line')
      .attr('class', 'grid-line-x')
      .attr('x1', 0)
      .attr('x2', vis.width)
      .attr('y1', (d) => vis.yScale(d))
      .attr('y2', (d) => vis.yScale(d));

    vis.chart
      .selectAll('.scatter-point')
      .data(vis.chartData, (d) => d.country)
      .join('circle')
      .attr('class', 'scatter-point')
      .attr('cx', (d) => vis.xScale(d.landings))
      .attr('cy', (d) => vis.yScale(d.population_density))
      .attr('r', 3.5)
      .append('title')
      .text(
        (d) => `${d.country}\nLandings: ${d.landings}\nPopulation density: ${d3.format(
          '.1f',
        )(d.population_density)}`,
      );
  }
}
