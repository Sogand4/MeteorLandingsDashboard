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

/** Hex colors and legend use the same discrete steps on log10(1 + count). */
const DENSITY_LEGEND_BINS = 5;

export default class Task3Map {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 400,
      margin: {
        top: 30, right: 10, bottom: 10, left: 10,
      },
      hexRadius: _config.hexRadius || 3,
      onCountrySelect: _config.onCountrySelect ?? (() => {}),
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
      .attr('viewBox', `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

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

    vis.zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        vis.mapGroup.attr('transform', event.transform);
      });
    vis.svgRoot.call(vis.zoom);

    vis.mapGroup = vis.svg.append('g').attr('class', 't3-map');
    vis.legendGroup = vis.svg.append('g').attr('class', 't3-legend');

    vis.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'task3-map-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');

    vis.svgRoot.append('text')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', vis.config.margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Spatial Density of Meteorite Landings');

    vis.svgRoot.append('text')
      .attr('class', 'zoom-reset')
      .attr('x', vis.config.containerWidth - 10)
      .attr('y', 16)
      .attr('text-anchor', 'end')
      .attr('font-size', 11)
      .attr('fill', '#555')
      .style('cursor', 'pointer')
      .text('Reset zoom')
      .on('click', (event) => {
        event.stopPropagation();
        vis.svgRoot.transition().duration(300).call(vis.zoom.transform, d3.zoomIdentity);
      });
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
    /* True when every non-empty hex has the same count (e.g. heavy filtering). */
    vis.densityUniform = vis.minCount === vis.maxCount;

    /* Log10(1+x) color scale reduces skew from hotspots */
    vis.logMin = Math.log10(1 + Math.max(0, vis.minCount));
    vis.logMax = Math.log10(1 + Math.max(vis.maxCount, 1));
    if (!vis.densityUniform && vis.logMax <= vis.logMin) {
      vis.logMax = vis.logMin + 1e-9;
    }

    const scaleDomainHi = vis.densityUniform ? vis.logMin + 1e-9 : vis.logMax;
    vis.colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([vis.logMin, scaleDomainHi]);

    const logSpan = vis.logMax - vis.logMin;

    if (vis.densityUniform || logSpan <= 1e-12) {
      vis.densityBinColors = [vis.colorScale(vis.logMin)];
      vis.densityBinIndex = () => 0;
    } else {
      vis.densityBinColors = d3.range(DENSITY_LEGEND_BINS).map((i) => {
        const t0 = vis.logMin + (i / DENSITY_LEGEND_BINS) * logSpan;
        const t1 = vis.logMin + ((i + 1) / DENSITY_LEGEND_BINS) * logSpan;
        return vis.colorScale((t0 + t1) / 2);
      });
      vis.densityBinIndex = (logVal) => {
        const span = vis.logMax - vis.logMin;
        const u = (logVal - vis.logMin) / span;
        return Math.min(
          DENSITY_LEGEND_BINS - 1,
          Math.max(0, Math.floor(u * DENSITY_LEGEND_BINS)),
        );
      };
    }
  }

  renderVis() {
    const vis = this;

    vis.mapGroup.selectAll('*').remove();
    vis.legendGroup.selectAll('*').remove();

    if (vis.countries) {
      if (!vis.geoNameMap) {
        vis.geoNameMap = new Map();
        const pts = vis.data.filter(mapUtils.hasValidCoords);
        vis.countries.forEach((feature) => {
          const match = pts.find((d) => d3.geoContains(
            feature,
            [mapUtils.normalizeLon(d.reclong), d.reclat],
          ));
          if (match) vis.geoNameMap.set(feature, match.country);
        });
      }
      const hasSelection = !!vis.selectedCountry;
      vis.mapGroup
        .append('g')
        .attr('class', 'country')
        .selectAll('path')
        .data(vis.countries)
        .join('path')
        .attr('d', vis.path)
        .attr('fill', hasSelection ? '#e8e8e8' : '#f0f0f0')
        .attr('stroke', hasSelection ? '#ddd' : '#ccc')
        .attr('stroke-width', 0.5)
        .attr('opacity', hasSelection ? 0.6 : 1)
        .style('cursor', 'pointer')
        .on('click', (event, feature) => {
          event.stopPropagation();
          const country = vis.geoNameMap.get(feature) || null;
          if (!country) return;
          vis.config.onCountrySelect(
            country === vis.selectedCountry ? null : country,
          );
        });
    } else {
      const graticule = d3.geoGraticule10();
      vis.mapGroup
        .append('path')
        .attr('class', 'graticule')
        .attr('d', vis.path(graticule()))
        .attr('fill', 'none')
        .attr('stroke', '#ddd');
    }

    const hexPaths = vis.mapGroup
      .append('g')
      .attr('class', 'hexbin')
      .selectAll('path')
      .data(vis.bins)
      .join('path')
      .attr('d', vis.hexbin.hexagon())
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('fill', (d) => {
        const logVal = Math.log10(1 + d.length);
        return vis.densityBinColors[vis.densityBinIndex(logVal)];
      })
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

  /**
   * @param {object[]|null} [preloadedCountries] – from mapUtils.loadWorldMap(); avoids a second fetch when Task 5 shares the same data.
   */
  async render(preloadedCountries = null) {
    this.initVis();
    this.countries = preloadedCountries != null
      ? preloadedCountries
      : await this.loadWorldMap();
    this.updateVis();
    this.renderVis();
  }

  /**
   * Legend swatch colors are identical to hex fills: both use the same log10(1+count) axis
   * split into DENSITY_LEGEND_BINS discrete steps (not a smooth gradient).
   */
  renderLegend() {
    const vis = this;
    const safeMin = Number.isFinite(vis.minCount) ? vis.minCount : 0;
    const safeMax = Number.isFinite(vis.maxCount) ? Math.max(vis.maxCount, safeMin, 1) : 1;
    const logLo = vis.logMin;
    const logHi = vis.logMax;
    const logSpan = logHi - logLo;
    const barWidth = 20;
    const barHeight = 18;
    const labelOffset = 28;

    const fmt = (n) => (Number.isFinite(n) ? d3.format(',')(Math.round(n)) : '0');

    /** Map log value to count k = 10^L - 1 (inverse of L = log10(1+k)). */
    const countAtLog = (L) => 10 ** L - 1;

    /**
     * Integers k with log10(1+k) in [t0, t1) — same rule as partitioning the color axis.
     */
    const countRangeForLogSlice = (t0, t1) => {
      const kMin = Math.max(0, Math.ceil(countAtLog(t0) - 1e-9));
      const kMax = Math.floor(countAtLog(t1) - 1e-9);
      return { kMin, kMax };
    };

    const rows = [];
    if (vis.densityUniform || logSpan <= 1e-12) {
      rows.push({
        t0: logLo,
        t1: logHi,
        label: safeMin === safeMax ? fmt(safeMin) : `${fmt(safeMin)}–${fmt(safeMax)}`,
      });
    } else {
      for (let i = 0; i < DENSITY_LEGEND_BINS; i++) {
        const t0 = logLo + (i / DENSITY_LEGEND_BINS) * logSpan;
        const t1 = logLo + ((i + 1) / DENSITY_LEGEND_BINS) * logSpan;
        const { kMin, kMax } = countRangeForLogSlice(t0, t1);
        let label;
        if (kMax < kMin) {
          const mid = (t0 + t1) / 2;
          const approx = Math.max(0, Math.round(countAtLog(mid)));
          label = fmt(approx);
        } else if (kMin === kMax) {
          label = fmt(kMin);
        } else {
          label = `${fmt(kMin)}–${fmt(kMax)}`;
        }
        rows.push({ t0, t1, label });
      }
    }

    const legendHeight = 25 + rows.length * barHeight;
    const legend = vis.legendGroup
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
      .text(
        rows.length <= 1
          ? '(count per hexbin, log scale)'
          : `(count per hexbin, log scale · ${DENSITY_LEGEND_BINS} discrete colors)`,
      );

    rows.forEach((row, i) => {
      const y = 18 + i * barHeight;
      const fill = vis.densityBinColors && vis.densityBinColors[i] != null
        ? vis.densityBinColors[i]
        : vis.colorScale((row.t0 + row.t1) / 2);

      legend
        .append('rect')
        .attr('x', 0)
        .attr('y', y)
        .attr('width', barWidth)
        .attr('height', barHeight - 2)
        .attr('fill', fill);

      legend
        .append('text')
        .attr('x', labelOffset)
        .attr('y', y + (barHeight - 2) / 2 + 4)
        .attr('font-size', 10)
        .attr('fill', '#333')
        .attr('dominant-baseline', 'middle')
        .text(row.label);
    });
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

  resize(w, h) {
    const vis = this;
    vis.config.containerWidth = w;
    vis.config.containerHeight = h;
    vis.width = w - vis.config.margin.left - vis.config.margin.right;
    vis.height = h - vis.config.margin.top - vis.config.margin.bottom;
    vis.svgRoot.attr('viewBox', `0 0 ${w} ${h}`);
    vis.svgRoot.select('text').attr('x', w / 2);
    vis.svgRoot.select('.zoom-reset').attr('x', w - 10);
    vis.svgRoot.transition().duration(0).call(vis.zoom.transform, d3.zoomIdentity);
    vis.projection.fitSize([vis.width, vis.height], { type: 'Sphere' });
    vis.path = d3.geoPath().projection(vis.projection);
    vis.config.hexRadius = Math.max(1.5, w / 240);
    vis.updateVis();
    vis.renderVis();
  }

  update(data) {
    this.data = data;
    this.updateVis();
    this.renderVis();
  }
}
