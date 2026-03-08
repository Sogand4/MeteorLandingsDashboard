class TopMeteoriteDistributionBarChart {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 240,
      containerHeight: _config.containerHeight || 260,
      margin: {
        top: 30,
        right: 5,
        bottom: 30,
        left: 40,
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

    vis.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    vis.xAxis = d3.axisBottom(vis.xScale);
    vis.yAxis = d3.axisLeft(vis.yScale).tickFormat(d3.format("d"));

    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight)
      .attr("id", "top-meteorite-distribution-bar-chart-svg");

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

    const recclassCounts = d3.rollups(
      vis.data,
      (group) => group.length,
      (d) => d.recclass,
    );

    vis.topRecclasses = recclassCounts
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((d) => d[0]);

    vis.stackKeys = [...vis.topRecclasses, "Other"];

    const processedData = vis.data.map((d) => {
      const yearBucket = Math.floor(d.year / 100) * 100;
      const recclassGroup = vis.topRecclasses.includes(d.recclass)
        ? d.recclass
        : "Other";

      return {
        yearBucket,
        recclassGroup,
      };
    });

    const rolled = d3.rollups(
      processedData,
      (group) => group.length,
      (d) => d.yearBucket,
      (d) => d.recclassGroup,
    );

    // Step 4: reshape into object form for d3.stack()
    vis.stackedData = rolled.map(([yearBucket, classEntries]) => {
      const obj = { year: yearBucket };

      vis.stackKeys.forEach((key) => {
        obj[key] = 0;
      });

      classEntries.forEach(([recclassGroup, count]) => {
        obj[recclassGroup] = count;
      });

      return obj;
    });

    vis.stackedData.sort((a, b) => a.year - b.year);

    vis.series = d3.stack().keys(vis.stackKeys)(vis.stackedData);

    vis.xScale.domain(vis.stackedData.map((d) => d.year));
    vis.yScale.domain([
      0,
      d3.max(vis.stackedData, (d) => d3.sum(vis.stackKeys, (key) => d[key])),
    ]);

    vis.colorScale.domain(vis.stackKeys);

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    const layer = vis.chartArea
      .selectAll(".stack-layer")
      .data(vis.series, (d) => d.key)
      .join("g")
      .attr("class", "stack-layer")
      .attr("fill", (d) => vis.colorScale(d.key));

    layer
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("x", (d) => vis.xScale(d.data.year))
      .attr("y", (d) => vis.yScale(d[1]))
      .attr("width", vis.xScale.bandwidth())
      .attr("height", (d) => vis.yScale(d[0]) - vis.yScale(d[1]));

    vis.xAxisGroup.call(vis.xAxis);
    vis.yAxisGroup.call(vis.yAxis);
  }
}
