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

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);
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
