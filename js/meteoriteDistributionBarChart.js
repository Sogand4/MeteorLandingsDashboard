// TODO: abstract details of bar charts if there are other bar charts in project
class MeteoriteDistributionBarChart {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   */
  // Todo: Add or remove parameters from the constructor as needed
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 240,
      containerHeight: 260,
      margin: {
        top: 30,
        right: 5,
        bottom: 20,
        left: 30,
      },
      // Todo: Add or remove attributes from config as needed
    };
    this.data = data;
    this.initVis();
  }

  initVis() {
    let vis = this;
    // Todo: Create SVG area, initialize scales and axes

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
      .attr("id", "meteorite-distribution-bar-chart-svg"); // TODO rename

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
    // Todo: Prepare data and scales
  }

  renderVis() {
    let vis = this;
    // Todo: Bind data to visual elements, update axes
  }
}
