/**
 * Task 5 – Geographic Bubble Map
 * Correlate meteorite mass and classification across geographic regions
 * Marks: points (circles)
 * Channels: position (lat/lon), size (mass, log scale), color (recclass, top 7 + Other)
 *
 * References:
 * - UBC InfoVis 447 Tutorial 6 (Geographic maps): d3.geoPath, projection
 * - VAD Chapter 5: Marks and channels – area size for quantitative, hue for categorical
 */
class MassDistributionMap {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 400,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      topN: 7, // top 7 classes get distinct hue; rest will be under "Other"
    };
    this.data = data;
    this.countries = null;
    this.selectedCountry = null;
    this.highlightedClass = null;
    this.svg = null;
    this.projection = null;
    this.path = null;
    this.tooltip = null;
    this.classColorScale = null;
    this.topClasses = [];
  }

  get width() {
    return this.config.containerWidth - this.config.margin.left - this.config.margin.right;
  }

  get height() {
    return this.config.containerHeight - this.config.margin.top - this.config.margin.bottom;
  }

  initVis() {
    const vis = this;

    vis.svgRoot = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    vis.svg = vis.svgRoot
      .append("g")
      .attr("transform", `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.projection = d3
      .geoNaturalEarth1()
      .fitSize([vis.width, vis.height], { type: "Sphere" });
    vis.path = d3.geoPath().projection(vis.projection);

    // Tooltip
    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "task5-map-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("pointer-events", "none");

    // Base layer groups
    vis.baseGroup = vis.svg.append("g").attr("class", "t5-base");
    vis.pointsGroup = vis.svg.append("g").attr("class", "t5-points");
    vis.legendGroup = vis.svg.append("g").attr("class", "t5-legend");

    vis.svg.append("text")
      .attr("x", vis.width / 2)
      .attr("y", vis.config.margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 20)
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("Geographic Distribution of Meteorite Mass and Classification");
      }

  async loadWorldMap() {
  this.countries = await mapUtils.loadWorldMap();
}

  renderVis() {
    const vis = this;
    vis.baseGroup.selectAll("*").remove();

    if (vis.countries) {
      vis.baseGroup
        .selectAll("path")
        .data(vis.countries)
        .join("path")
        .attr("d", vis.path)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 0.5);
    } else {
      const graticule = d3.geoGraticule10();
      vis.baseGroup
        .append("path")
        .attr("d", vis.path(graticule()))
        .attr("fill", "none")
        .attr("stroke", "#ddd");
    }
  }

  wrangleData() {
    const vis = this;

    let filtered = vis.data.filter(mapUtils.hasValidCoords);
    if (vis.selectedCountry) {
      filtered = filtered.filter((d) => d.country === vis.selectedCountry);
    }

    // Determine top N classes by count
    const classCounts = d3.rollup(
      vis.data.filter(mapUtils.hasValidCoords),
      (v) => v.length,
      (d) => d.recclass || "Unknown"
    );
    vis.topClasses = [...classCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, vis.config.topN)
      .map(([c]) => c);

    // Color scale: categorical hue for top classes + "Other"
    const palette = [
      "#e41a1c", "#377eb8", "#4daf4a", "#984ea3",
      "#ff7f00", "#dbd805", "#f781bf", "#999999",
    ];
    vis.classColorScale = d3.scaleOrdinal()
      .domain([...vis.topClasses, "Other"])
      .range([...palette.slice(0, vis.topClasses.length), "#cccccc"]);

    // Assign display class (topN or "Other")
    vis.filteredData = filtered
      .filter((d) => d.mass != null && d.mass > 0)
      .map((d) => ({
        ...d,
        lon: mapUtils.normalizeLon(d.reclong),
        lat: d.reclat,
        displayClass: vis.topClasses.includes(d.recclass) ? d.recclass : "Other",
      }));

    // Log scale for radius; radius = sqrt(mass_log) keeps area proportional
    const masses = vis.filteredData.map((d) => d.mass).filter((m) => m > 0);
    const logMin = Math.log10(d3.min(masses) || 1);
    const logMax = Math.log10(d3.max(masses) || 1);

    vis.radiusScale = d3.scaleLinear()
      .domain([logMin, logMax])
      .range([1, 18])
      .clamp(true);
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();
    vis.renderPoints();
    vis.renderLegend();
  }

  renderPoints() {
    const vis = this;

    // Project coordinates
    const projected = vis.filteredData
      .map((d) => {
        const p = vis.projection([d.lon, d.lat]);
        return p ? { ...d, px: p[0], py: p[1] } : null;
      })
      .filter(Boolean);

    const circles = vis.pointsGroup
      .selectAll("circle")
      .data(projected, (d) => d.id);

    circles
      .join(
        (enter) => enter.append("circle"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("cx", (d) => d.px)
      .attr("cy", (d) => d.py)
      .attr("r", (d) => vis.radiusScale(Math.log10(d.mass)))
      .attr("fill", (d) => vis.classColorScale(d.displayClass))
      .attr("fill-opacity", (d) =>
        vis.highlightedClass === null || d.displayClass === vis.highlightedClass
          ? 0.7
          : 0.1
      )
      .attr("stroke", (d) =>
        vis.highlightedClass !== null && d.displayClass === vis.highlightedClass
          ? "#333"
          : "white"
      )
      .attr("stroke-width", (d) =>
        vis.highlightedClass !== null && d.displayClass === vis.highlightedClass ? 1 : 0.3
      )
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        vis.tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${d.name}</strong><br/>` +
            `Class: ${d.recclass || "Unknown"}<br/>` +
            `Mass: ${d3.format(",.1f")(d.mass)} g<br/>` +
            `Country: ${d.country || "Unknown"}<br/>` +
            `Year: ${d.year ?? "Unknown"}<br/>` +
            `Fall: ${d.fall || "Unknown"}`
          );
      })
      .on("mousemove", function (event) {
        vis.tooltip
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY + 12 + "px");
      })
      .on("mouseout", function () {
        vis.tooltip.style("visibility", "hidden");
      })
      .on("click", function (event, d) {
        vis.highlightedClass =
          vis.highlightedClass === d.displayClass ? null : d.displayClass;
        vis.renderPoints();
        vis.renderLegend();
      });
  }

  renderLegend() {
    const vis = this;
    vis.legendGroup.selectAll("*").remove();

    const classEntries = [...vis.topClasses, "Other"];
    const rowH = 16;
    const r = 6;
    const legendX = 15;
    const legendY = vis.height - (classEntries.length * rowH) - 95;

    const g = vis.legendGroup
      .append("g")
      .attr("transform", `translate(${legendX},${legendY})`);

    // Title
    g.append("text")
      .attr("x", 0).attr("y", -5)
      .attr("font-size", 11).attr("font-weight", "bold")
      .text("Meteorite class");

    g.append("text")
      .attr("x", 0).attr("y", 8)
      .attr("font-size", 9).attr("fill", "#666")
      .text("(click to highlight)");

    // Class swatches
    classEntries.forEach((cls, i) => {
      const row = g.append("g")
        .attr("transform", `translate(0,${18 + i * rowH})`)
        .style("cursor", "pointer")
        .on("click", () => {
          vis.highlightedClass = vis.highlightedClass === cls ? null : cls;
          vis.renderPoints();
          vis.renderLegend();
        });

      row.append("circle")
        .attr("cx", r).attr("cy", r / 2).attr("r", r)
        .attr("fill", vis.classColorScale(cls))
        .attr("fill-opacity",
          vis.highlightedClass === null || vis.highlightedClass === cls ? 0.85 : 0.25
        )
        .attr("stroke", vis.highlightedClass === cls ? "#333" : "none")
        .attr("stroke-width", 1.5);

      row.append("text")
        .attr("x", r * 2 + 4).attr("y", r / 2 + 4)
        .attr("font-size", 10)
        .attr("fill", vis.highlightedClass === null || vis.highlightedClass === cls ? "#333" : "#aaa")
        .text(cls);
    });

    // Size legend (mass)
    const sizeY = legendY + 18 + classEntries.length * rowH + 12;
    const sg = vis.legendGroup.append("g")
      .attr("transform", `translate(${legendX},${sizeY})`);

    sg.append("text").attr("x", 0).attr("y", 0)
      .attr("font-size", 11).attr("font-weight", "bold")
      .text("Mass (g)");
    sg.append("text").attr("x", 0).attr("y", 11)
      .attr("font-size", 9).attr("fill", "#666")
      .text("(log scale)");

    const sizeExamples = [1, 1000, 1e6, 60e6];
    const sxStart = 0;
    let sxOffset = sxStart;
    sizeExamples.forEach((mass) => {
      const rr = vis.radiusScale(Math.log10(mass));
      sxOffset += rr + 4;
      sg.append("circle")
        .attr("cx", sxOffset).attr("cy", 26 + rr)
        .attr("r", rr)
        .attr("fill", "#888").attr("fill-opacity", 0.5)
        .attr("stroke", "#555").attr("stroke-width", 0.5);
      sg.append("text")
        .attr("x", sxOffset).attr("y", 26 + rr * 2 + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", 8).attr("fill", "#555")
        .text(d3.format(".2s")(mass));
      sxOffset += rr + 6;
    });
  }

  setSelectedCountry(country) {
    this.selectedCountry = country;
  }

  update(data) {
    this.data = data;
    this.updateVis();
  }

  show() {
    if (this.svgRoot) this.svgRoot.style("display", null);
  }

  hide() {
    if (this.svgRoot) this.svgRoot.style("display", "none");
  }

  async render() {
    this.initVis();
    await this.loadWorldMap();
    this.renderVis();
    this.updateVis();
  }
}
