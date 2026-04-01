/**
 * Task 3 – Hexbin Density Map
 * Spatial hotspots: color = log-scaled count per spatial bin
 *
 * References:
 * - UBC InfoVis 447 Tutorial 6 (Geographic maps): d3.geoPath, projection
 * - Bivariate Hexbin Map (Bostock): https://gist.github.com/mbostock/4330486
 * - D3 Hexbin Map: https://observablehq.com/@d3/hexbin-map
 */
import mapUtils from '../utils/mapUtils.js';

export default class Task3Map {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 400,
      margin: {
        top: 10, right: 10, bottom: 10, left: 10,
      },
      hexRadius: _config.hexRadius || 3,
    };
    this.data = data;
    this.countries = null;
    this.selectedCountry = null;
    this.selectedClass = null;
  }

  initVis() {
    const vis = this;
    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;
    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    vis.svgRoot = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    vis.svg = vis.svgRoot
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.projection = d3
      .geoNaturalEarth1()
      .fitSize([vis.width, vis.height], { type: 'Sphere' });
    vis.path = d3.geoPath().projection(vis.projection);

    vis.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'task3-map-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');
  }

  async loadWorldMap() {
    this.countries = await mapUtils.loadWorldMap();
  }

  setYearRange(min, max) {
    this.yearMin = min;
    this.yearMax = max;
  }

  wrangleData() {
    const vis = this;
    let filtered = vis.data.filter(mapUtils.hasValidCoords);

    if (vis.selectedCountry) {
      filtered = filtered.filter((d) => d.country === vis.selectedCountry);
    }
    if (vis.selectedClass) {
      filtered = filtered.filter((d) => d.recclass === vis.selectedClass);
    }
    if (vis.yearMin != null) {
      filtered = filtered.filter((d) => d.year != null && d.year >= vis.yearMin);
    }
    if (vis.yearMax != null) {
      filtered = filtered.filter((d) => d.year != null && d.year <= vis.yearMax);
    }

    vis.filteredData = filtered.map((d) => ({
      ...d,
      lon: mapUtils.normalizeLon(d.reclong),
      lat: d.reclat,
    }));
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    const projected = vis.filteredData
      .map((d) => {
        const p = vis.projection([d.lon, d.lat]);
        return p
          ? {
            x: p[0],
            y: p[1],
            name: d.name,
            country: d.country,
            recclass: d.recclass,
            year: d.year,
            mass: d.mass,
            fall: d.fall,
          }
          : null;
      })
      .filter(Boolean);

    vis.hexbin = d3
      .hexbin()
      .x((d) => d.x)
      .y((d) => d.y)
      .radius(vis.config.hexRadius)
      .extent([
        [0, 0],
        [vis.width, vis.height],
      ]);

    vis.bins = vis.hexbin(projected);
    const rawMin = d3.min(vis.bins, (b) => b.length);
    const rawMax = d3.max(vis.bins, (b) => b.length);
    vis.minCount = Number.isFinite(rawMin) ? rawMin : 0;
    vis.maxCount = Number.isFinite(rawMax) ? Math.max(rawMax, vis.minCount, 1) : 1;
    /* Log10(1+x) color scale reduces skew from hotspots */
    vis.logMin = Math.log10(1 + Math.max(0, vis.minCount));
    vis.logMax = Math.log10(1 + Math.max(vis.maxCount, 1));
    if (vis.logMax <= vis.logMin) vis.logMax = vis.logMin + 1e-9;
    vis.colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([vis.logMin, vis.logMax]);
    vis.legendSteps = Math.min(5, Math.max(0, Math.round(vis.maxCount - vis.minCount)));
  }

  renderVis() {
    const vis = this;

    vis.svg.selectAll('.hexbin').remove();
    vis.svg.selectAll('.country').remove();
    vis.svg.selectAll('.graticule').remove();
    vis.svg.selectAll('.legend').remove();

    if (vis.countries) {
      vis.svg
        .append('g')
        .attr('class', 'country')
        .selectAll('path')
        .data(vis.countries)
        .join('path')
        .attr('d', vis.path)
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 0.5);
    } else {
      const graticule = d3.geoGraticule10();
      vis.svg
        .append('path')
        .attr('class', 'graticule')
        .attr('d', vis.path(graticule()))
        .attr('fill', 'none')
        .attr('stroke', '#ddd');
    }

    const hexPaths = vis.svg
      .append('g')
      .attr('class', 'hexbin')
      .selectAll('path')
      .data(vis.bins)
      .join('path')
      .attr('d', vis.hexbin.hexagon())
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('fill', (d) => vis.colorScale(Math.log10(1 + d.length)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.85);

    hexPaths
      .on('mouseover', (event, d) => {
        const countryCounts = d3.rollup(
          d,
          (v) => v.length,
          (p) => p.country || 'Unknown',
        );
        const topCountries = [...countryCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([c, n]) => `${c}: ${n}`)
          .join(', ');

        const classCounts = d3.rollup(
          d,
          (v) => v.length,
          (p) => p.recclass || 'Unknown',
        );
        const topClasses = [...classCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c, n]) => `${c}: ${n}`)
          .join(', ');

        const years = d.map((p) => p.year).filter((y) => y != null && !Number.isNaN(y));
        const yearRange = years.length > 0
          ? `${Math.min(...years)} – ${Math.max(...years)}`
          : 'N/A';

        const masses = d.map((p) => p.mass).filter((m) => m != null && m > 0);
        const massRange = masses.length > 0
          ? `${d3.format('.2s')(Math.min(...masses))} – ${d3.format('.2s')(Math.max(...masses))} g`
          : 'N/A';

        const fallCount = d.filter((p) => p.fall === 'Fell').length;
        const foundCount = d.filter((p) => p.fall === 'Found').length;
        const fallInfo = fallCount > 0 || foundCount > 0
          ? `Fell: ${fallCount} · Found: ${foundCount}`
          : '';

        const cleanNames = [
          ...new Set(
            d.map((p) => mapUtils.cleanMeteoriteName(p.name)).filter(Boolean),
          ),
        ];
        const maxNames = 8;
        const namesToShow = cleanNames.slice(0, maxNames);
        const namesHtml = namesToShow.length > 0
          ? `Examples: ${namesToShow.join(', ')}${
            cleanNames.length > maxNames
              ? ` (+${cleanNames.length - maxNames} more)`
              : ''}`
          : '';

        vis.tooltip
          .style('visibility', 'visible')
          .html(
            `<strong>${d.length} meteorite(s) in this region</strong><br/>${
              namesHtml ? `${namesHtml}<br/>` : ''
            }${topCountries ? `Countries: ${topCountries}<br/>` : ''
            }${topClasses ? `Classes: ${topClasses}<br/>` : ''
            }Year range: ${yearRange}<br/>`
              + `Mass range: ${massRange}${
                fallInfo ? `<br/>${fallInfo}` : ''}`,
          );
      })
      .on('mousemove', (event) => {
        vis.tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`);
      })
      .on('mouseout', () => {
        vis.tooltip.style('visibility', 'hidden');
      });

    vis.renderLegend();
  }

  async render() {
    this.initVis();
    await this.loadWorldMap();
    this.updateVis();
    this.renderVis();
  }

  renderLegend() {
    const vis = this;
    const safeMin = Number.isFinite(vis.minCount) ? vis.minCount : 0;
    const safeMax = Number.isFinite(vis.maxCount) ? Math.max(vis.maxCount, safeMin, 1) : 1;
    const steps = Math.min(5, Math.max(0, Math.round(safeMax - safeMin)));
    const logLo = vis.logMin;
    const logHi = vis.logMax;
    const barWidth = 20;
    const barHeight = 18;
    const labelOffset = 28;

    const fmt = (n) => (Number.isFinite(n) ? d3.format(',')(Math.round(n)) : '0');

    const legendHeight = 25 + (steps + 1) * barHeight;
    const legend = vis.svg
      .append('g')
      .attr('class', 'legend')
      .attr(
        'transform',
        `translate(15, ${vis.height - legendHeight - 10})`,
      );

    legend
      .append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .text('Meteorite density');

    legend
      .append('text')
      .attr('x', 0)
      .attr('y', 8)
      .attr('font-size', 9)
      .attr('fill', '#666')
      .text('(count per hexbin, log color scale)');

    for (let i = 0; i <= steps; i++) {
      const logA = steps === 0
        ? logLo
        : logLo + (i / steps) * (logHi - logLo);
      let logB = logHi;
      if (steps > 0 && i < steps) {
        logB = logLo + ((i + 1) / steps) * (logHi - logLo);
      }
      const countLo = Math.max(0, Math.floor(10 ** logA - 1));
      const countHi = Math.max(countLo, Math.ceil(10 ** logB - 1));
      const label = `${fmt(countLo)}–${fmt(countHi)}`;
      const logMid = (logA + logB) / 2;
      const y = 18 + i * barHeight;

      legend
        .append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight - 2)
        .attr('fill', vis.colorScale(logMid));

      legend
        .append('text')
        .attr('x', labelOffset)
        .attr('y', y + (barHeight - 2) / 2 + 4)
        .attr('font-size', 10)
        .attr('fill', '#333')
        .attr('dominant-baseline', 'middle')
        .text(label);
    }
  }

  setSelectedCountry(country) {
    this.selectedCountry = country;
  }

  setSelectedClass(recclass) {
    this.selectedClass = recclass;
  }

  show() {
    if (this.svgRoot) this.svgRoot.style('display', null);
  }

  hide() {
    if (this.svgRoot) this.svgRoot.style('display', 'none');
  }

  update(data) {
    this.data = data;
    this.updateVis();
    this.renderVis();
  }
}
