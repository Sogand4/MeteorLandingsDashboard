class PopulationDensityScatterPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 700,
      containerHeight: _config.containerHeight || 360,
      margin: { top: 60, right: 25, bottom: 65, left: 85 }
    };
    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;

    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    vis.svg
      .append("defs")
      .append("clipPath")
      .attr("id", "scatter-clip")
      .append("rect")
      .attr("width", vis.width)
      .attr("height", vis.height);

    vis.chart = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.plotArea = vis.chart
      .append("g")
      .attr("clip-path", "url(#scatter-clip)");

    vis.svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", vis.config.containerWidth / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .text("Meteorite Landings vs. Population Density");

    vis.xAxisGroup = vis.chart
      .append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chart
      .append("g")
      .attr("class", "axis axis-y");

    vis.xGridGroup = vis.chart
      .append("g")
      .attr("class", "grid grid-x")
      .attr("transform", `translate(0, ${vis.height})`);

    vis.yGridGroup = vis.chart
      .append("g")
      .attr("class", "grid grid-y");

    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", vis.config.containerWidth / 2)
      .attr("y", vis.config.containerHeight - 12)
      .attr("text-anchor", "middle")
      .text("Number of Meteor Landings (log scale)");

    vis.svg
      .append("text")
      .attr("class", "axis-label")
      .attr(
        "transform",
        `translate(22, ${vis.config.containerHeight / 2}) rotate(-90)`
      )
      .attr("text-anchor", "middle")
      .text("Population Density (log scale)");
  }

  wrangleData() {
    const vis = this;

    vis.chartData = d3
      .rollups(
        vis.data.filter(
          d =>
            d.country &&
            d.population_density != null &&
            !isNaN(+d.population_density)
        ),
        values => ({
          landings: values.length,
          population_density: +values[0].population_density
        }),
        d => d.country
      )
      .map(([country, values]) => ({
        country,
        landings: +values.landings,
        population_density: +values.population_density
      }))
      .filter(
        d =>
          !isNaN(d.landings) &&
          !isNaN(d.population_density) &&
          d.landings >= 1 &&
          d.population_density >= 1
      )
      .sort((a, b) => a.landings - b.landings);
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    if (!vis.chartData.length) return;

    const xMax = d3.max(vis.chartData, d => d.landings);
    const yMax = d3.max(vis.chartData, d => d.population_density);

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
      .filter(d => d >= 1 && d <= xMax);

    vis.yGridTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500]
      .filter(d => d >= 1 && d <= yMax);

    vis.yAxisTicks = [1, 5, 20, 100, 500]
      .filter(d => d >= 1 && d <= yMax);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    vis.xGridGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTicks)
        .tickSize(-vis.height)
        .tickFormat("")
    );

    vis.yGridGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yGridTicks)
        .tickSize(-vis.width)
        .tickFormat("")
    );

    vis.xAxisGroup.call(
      d3.axisBottom(vis.xScale)
        .tickValues(vis.xTicks)
        .tickFormat(d3.format("~s"))
    );

    vis.yAxisGroup.call(
      d3.axisLeft(vis.yScale)
        .tickValues(vis.yAxisTicks)
        .tickFormat(d3.format("~s"))
    );

    vis.chart.selectAll(".grid .domain").remove();

    const points = vis.plotArea
      .selectAll(".scatter-point")
      .data(vis.chartData, d => d.country)
      .join("circle")
      .attr("class", "scatter-point")
      .attr("cx", d => vis.xScale(d.landings))
      .attr("cy", d => vis.yScale(d.population_density))
      .attr("r", 4);

    points.selectAll("title").remove();

    points
      .append("title")
      .text(
        d =>
          `${d.country}\nLandings: ${d.landings}\nPopulation density: ${d3.format(".1f")(d.population_density)}`
      );
  }
}