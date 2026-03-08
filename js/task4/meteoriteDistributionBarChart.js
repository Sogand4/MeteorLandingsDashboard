class MeteoriteDistributionBarChart {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 240,
      containerHeight: _config.containerHeight || 260,
      margin: {
        top: 30,
        right: 5,
        bottom: 20,
        left: 30,
      },
    };
    this.data = data;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.xScale = d3.scaleBand().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xAxis = d3.axisBottom(vis.xScale);
    vis.yAxis = d3.axisLeft(vis.yScale).tickFormat(d3.format("d"));

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight)
      .attr("id", "total-meteorite-discoveries-bar-chart-svg");

    vis.chartArea = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.xAxisGroup = vis.chartArea
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chartArea.append("g").attr("class", "y-axis");

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.data.filter((d) => {
      if (d.year === null) console.log("year is null");
    });

    vis.yearCounts = d3
      .rollups(
        vis.data,
        (group) => group.length,
        (d) => d.year,
      )
      .map((d) => ({
        year: d[0],
        count: d[1],
      }));

    vis.yearCounts.sort((a, b) => a.year - b.year);

    vis.xScale.domain(vis.yearCounts.map((d) => d.year));
    vis.yScale.domain([0, d3.max(vis.yearCounts, (d) => d.count)]);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    vis.bars = vis.chartArea
      .selectAll(".bar")
      .data(vis.yearCounts, (d) => d.year)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => vis.xScale(d.year))
      .attr("y", (d) => vis.yScale(d.count))
      .attr("width", vis.xScale.bandwidth())
      .attr("height", (d) => vis.height - vis.yScale(d.count));

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);
  }
}
