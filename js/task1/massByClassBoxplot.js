class MassByClassBoxPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 320,
      containerHeight: _config.containerHeight || 280,
      margin: {
        top: 20,
        right: 20,
        bottom: 50,
        left: 60,
      },
    };
    this.data = data;
    this.selectedClass1 = "H5";
    this.selectedClass2 = "H6";
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

    vis.container = d3.select(vis.config.parentElement);

    vis.title = vis.container
      .append("div")
      .attr("class", "chart-title")
      .style("text-align", "center")
      .style("font-size", "12px")
      .style("font-weight", "600")
      .style("margin-bottom", "8px")
      .text("Mass Distribution for Two Meteorite Classes");

    const classes = Array.from(new Set(vis.data.map((d) => d.recclass))).sort();

    vis.controls = vis.container
      .append("div")
      .attr("class", "chart-controls")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("gap", "8px")
      .style("margin-bottom", "8px");

    vis.dropdown1 = vis.controls.append("select").attr("id", "class-select-1");

    vis.dropdown2 = vis.controls.append("select").attr("id", "class-select-2");

    vis.dropdown1
      .selectAll("option")
      .data(classes)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);

    vis.dropdown2
      .selectAll("option")
      .data(classes)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => d);

    vis.dropdown1.property("value", vis.selectedClass1);
    vis.dropdown2.property("value", vis.selectedClass2);

    vis.yScale = d3.scaleLog().range([vis.height, 0]);
    vis.xScale = d3
      .scaleBand()
      .domain([vis.selectedClass1, vis.selectedClass2])
      .range([0, vis.width])
      .padding(0.3);

    vis.xAxis = d3.axisBottom(vis.xScale);
    vis.yAxis = d3.axisLeft(vis.yScale).ticks(5).tickFormat(d3.format("~s"));

    vis.svg = vis.container
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight)
      .attr("id", "mass-by-class-boxplot-svg");

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

    vis.selectedClass1 = vis.dropdown1.property("value");
    vis.selectedClass2 = vis.dropdown2.property("value");

    vis.selectedClasses = [vis.selectedClass1, vis.selectedClass2];

    vis.xScale.domain(vis.selectedClasses);

    vis.boxData = vis.selectedClasses
      .map((recclass) => {
        const values = vis.data
          .filter((d) => d.recclass === recclass && +d.mass > 0)
          .map((d) => +d.mass)
          .sort(d3.ascending);

        if (!values.length) return null;

        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;

        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;

        const inliers = values.filter(
          (value) => value >= lowerFence && value <= upperFence,
        );

        const outliers = values.filter(
          (value) => value < lowerFence || value > upperFence,
        );

        return {
          recclass,
          q1,
          median,
          q3,
          min: d3.min(inliers),
          max: d3.max(inliers),
          outliers,
          values,
        };
      })
      .filter((d) => d !== null);

    vis.yScale.domain([
      d3.min(vis.boxData, (d) => d.min),
      d3.max(vis.boxData, (d) => d.max),
    ]);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const boxWidth = Math.min(40, vis.xScale.bandwidth() * 0.6);
    const colors = ["#4e79a7", "#f28e2b"];

    vis.boxGroups = vis.chartArea
      .selectAll(".box-group")
      .data(vis.boxData, (d) => d.recclass)
      .join("g")
      .attr("class", "box-group")
      .attr(
        "transform",
        (d) =>
          `translate(${vis.xScale(d.recclass) + vis.xScale.bandwidth() / 2},0)`,
      );

    vis.boxGroups
      .selectAll(".whisker-line")
      .data((d) => [d])
      .join("line")
      .attr("class", "whisker-line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", (d) => vis.yScale(d.min))
      .attr("y2", (d) => vis.yScale(d.max))
      .attr("stroke", "#444");

    vis.boxGroups
      .selectAll(".whisker-top")
      .data((d) => [d])
      .join("line")
      .attr("class", "whisker-top")
      .attr("x1", -boxWidth / 3)
      .attr("x2", boxWidth / 3)
      .attr("y1", (d) => vis.yScale(d.max))
      .attr("y2", (d) => vis.yScale(d.max))
      .attr("stroke", "#444");

    vis.boxGroups
      .selectAll(".whisker-bottom")
      .data((d) => [d])
      .join("line")
      .attr("class", "whisker-bottom")
      .attr("x1", -boxWidth / 3)
      .attr("x2", boxWidth / 3)
      .attr("y1", (d) => vis.yScale(d.min))
      .attr("y2", (d) => vis.yScale(d.min))
      .attr("stroke", "#444");

    vis.boxGroups
      .selectAll(".box")
      .data((d) => [d])
      .join("rect")
      .attr("class", "box")
      .attr("x", -boxWidth / 2)
      .attr("width", boxWidth)
      .attr("y", (d) => vis.yScale(d.q3))
      .attr("height", (d) => vis.yScale(d.q1) - vis.yScale(d.q3))
      .attr("fill", (d) => colors[vis.selectedClasses.indexOf(d.recclass)])
      .attr("fill-opacity", 0.45)
      .attr("stroke", "#444");

    vis.boxGroups
      .selectAll(".median-line")
      .data((d) => [d])
      .join("line")
      .attr("class", "median-line")
      .attr("x1", -boxWidth / 2)
      .attr("x2", boxWidth / 2)
      .attr("y1", (d) => vis.yScale(d.median))
      .attr("y2", (d) => vis.yScale(d.median))
      .attr("stroke", "#111")
      .attr("stroke-width", 1.5);

    vis.boxGroups
      .selectAll(".outlier")
      .data((d) => d.outliers.map((value) => ({ recclass: d.recclass, value })))
      .join("circle")
      .attr("class", "outlier")
      .attr("cx", 0)
      .attr("cy", (d) => vis.yScale(d.value))
      .attr("r", 2.5)
      .attr("fill", (d) => colors[vis.selectedClasses.indexOf(d.recclass)])
      .attr("fill-opacity", 0.7);

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);

    vis.yAxisGroup
      .selectAll(".axis-label")
      .data([null])
      .join("text")
      .attr("class", "axis-label")
      .attr("x", -vis.height / 2)
      .attr("y", -42)
      .attr("transform", "rotate(-90)")
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text("Mass (log scale)");
  }
}
