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
import mapUtils from '../utils/mapUtils.js';
import { getTopRecclasses } from '../utils/recclassUtils.js';

export default class MassDistributionMap {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 600,
      containerHeight: _config.containerHeight || 400,
      margin: {
        top: 30, right: 20, bottom: 2, left: 20,
      },
      topN: 7,
      onCountrySelect: _config.onCountrySelect ?? (() => {}),
    };
    this.data = data;
    this.countries = null;
    this.selectedCountry = null;
    this.selectedClass = null;
    this.highlightedClasses = new Set();
    this.svg = null;
    this.projection = null;
    this.path = null;
    this.tooltip = null;
    this.classColorScale = null;
    this.topClasses = [];
    /** True after initVis + first renderVis/updateVis (lazy until Points mode is selected). */
    this.pointsLayerReady = false;
    /** In-flight ensureRendered; coalesces concurrent callers. */
    this.ensureRenderedPromise = null;
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
      .append('svg')
      .attr('viewBox', `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    vis.svg = vis.svgRoot
      .append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.projection = d3
      .geoNaturalEarth1()
      .fitSize([vis.width, vis.height], { type: 'Sphere' });
    vis.path = d3.geoPath().projection(vis.projection);

    vis.zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        vis.baseGroup.attr('transform', event.transform);
        vis.pointsGroup.attr('transform', event.transform);
      });

    vis.svgRoot.call(vis.zoom);

    vis.svgRoot.on('click', () => {
      vis.highlightedClasses.clear();
      vis.updateVis().catch(() => {});
    });

    // Tooltip
    vis.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'task5-map-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');

    // Base layer groups
    vis.baseGroup = vis.svg.append('g').attr('class', 't5-base');
    vis.pointsGroup = vis.svg.append('g').attr('class', 't5-points');
    vis.legendGroup = vis.svg.append('g').attr('class', 't5-legend');

    vis.svgRoot.append('text')
      .attr('x', vis.config.containerWidth / 2)
      .attr('y', vis.config.margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text('Geographic Distribution of Meteorite Mass and Classification');

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

  renderVis() {
    const vis = this;
    vis.baseGroup.selectAll('*').remove();

    if (vis.countries) {
      if (!vis.geoNameMap) {
        vis.geoNameMap = new Map();
        const pts = vis.data.filter(mapUtils.hasValidCoords);
        const byCountry = d3.group(pts, (d) => d.country);
        byCountry.forEach((rows, countryName) => {
          if (countryName == null || String(countryName).trim() === '') return;
          const sample = rows[0];
          const lon = mapUtils.normalizeLon(sample.reclong);
          const lat = sample.reclat;
          for (let fi = 0; fi < vis.countries.length; fi++) {
            const feature = vis.countries[fi];
            if (d3.geoContains(feature, [lon, lat])) {
              vis.geoNameMap.set(feature, countryName);
              break;
            }
          }
        });
      }
      const hasSelection = !!vis.selectedCountry;
      vis.baseGroup
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
      vis.baseGroup
        .append('path')
        .attr('d', vis.path(graticule()))
        .attr('fill', 'none')
        .attr('stroke', '#ddd');
    }
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
    if (vis.yearMin != null) {
      filtered = filtered.filter((d) => d.year != null && d.year >= vis.yearMin);
    }
    if (vis.yearMax != null) {
      filtered = filtered.filter((d) => d.year != null && d.year <= vis.yearMax);
    }

    vis.topClasses = getTopRecclasses(vis.data, vis.config.topN, mapUtils.hasValidCoords);

    // If selected class is not in top 7, add it with a distinct color
    const extraClass = vis.selectedClass && !vis.topClasses.includes(vis.selectedClass)
      ? vis.selectedClass : null;

    const styles = getComputedStyle(document.documentElement);
    const palette = [
      styles.getPropertyValue('--cat-1').trim(),
      styles.getPropertyValue('--cat-2').trim(),
      styles.getPropertyValue('--cat-3').trim(),
      styles.getPropertyValue('--cat-4').trim(),
      styles.getPropertyValue('--cat-5').trim(),
      styles.getPropertyValue('--cat-6').trim(),
      styles.getPropertyValue('--cat-7').trim(),
    ];

    const extraColor = styles.getPropertyValue('--cat-8').trim();

    const domain = extraClass
      ? [...vis.topClasses, extraClass, 'Other']
      : [...vis.topClasses, 'Other'];

    const range = extraClass
      ? [...palette.slice(0, vis.topClasses.length), extraColor, '#cccccc']
      : [...palette.slice(0, vis.topClasses.length), '#cccccc'];

    vis.classColorScale = d3.scaleOrdinal().domain(domain).range(range);

    // Assign display class (topN, extraClass, or "Other")
    vis.filteredData = filtered
      .filter((d) => d.mass != null && d.mass > 0)
      .map((d) => {
        let displayClass = 'Other';

        if (vis.topClasses.includes(d.recclass)) {
          displayClass = d.recclass;
        } else if (extraClass && d.recclass === extraClass) {
          displayClass = extraClass;
        }

        return {
          ...d,
          lon: mapUtils.normalizeLon(d.reclong),
          lat: d.reclat,
          displayClass,
        };
      });

    // Log scale for radius
    const masses = vis.filteredData.map((d) => d.mass).filter((m) => m > 0);
    const logMin = Math.log10(d3.min(masses) || 1);
    const logMax = Math.log10(d3.max(masses) || 1);

    vis.radiusScale = d3.scaleLinear()
      .domain([logMin, logMax])
      .range([1, 15])
      .clamp(true);
  }

  async updateVis() {
    const vis = this;
    vis.wrangleData();
    await Promise.resolve(vis.renderPoints());
    vis.renderLegend();
  }

  /**
   * Bind circle geometry + interactions (used for full render and rAF chunks).
   */
  bindPointCircles(circleSel) {
    const vis = this;
    return circleSel
      .attr('cx', (d) => d.px)
      .attr('cy', (d) => d.py)
      .attr('r', (d) => vis.radiusScale(Math.log10(d.mass)))
      .attr('fill', (d) => vis.classColorScale(d.displayClass))
      .attr('fill-opacity', (d) => (vis.highlightedClasses.size === 0 || vis.highlightedClasses.has(d.displayClass) ? 0.7 : 0))
      .attr('stroke', (d) => {
        if (vis.highlightedClasses.size === 0) return 'white';
        return vis.highlightedClasses.has(d.displayClass) ? '#333' : 'none';
      })
      .attr('stroke-width', (d) => (vis.highlightedClasses.has(d.displayClass) ? 1 : 0.3))
      .style('cursor', 'pointer')
      .style('pointer-events', (d) => (vis.highlightedClasses.size === 0 || vis.highlightedClasses.has(d.displayClass) ? 'auto' : 'none'))
      .on('mouseover', (event, d) => {
        if (vis.highlightedClasses.size > 0 && !vis.highlightedClasses.has(d.displayClass)) return;
        vis.tooltip
          .style('visibility', 'visible')
          .html(
            `<strong>${d.name}</strong><br/>`
            + `Class: ${d.recclass || 'Unknown'}<br/>`
            + `Mass: ${d3.format(',.1f')(d.mass)} g<br/>`
            + `Country: ${d.country || 'Unknown'}<br/>`
            + `Year: ${d.year ?? 'Unknown'}<br/>`
            + `Fall: ${d.fall || 'Unknown'}`,
          );
      })
      .on('mousemove', (event) => {
        vis.tooltip
          .style('left', `${event.pageX + 12}px`)
          .style('top', `${event.pageY + 12}px`);
      })
      .on('mouseout', () => {
        vis.tooltip.style('visibility', 'hidden');
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (vis.highlightedClasses.has(d.displayClass)) {
          vis.highlightedClasses.delete(d.displayClass);
        } else {
          vis.highlightedClasses.add(d.displayClass);
        }
        vis.updateVis().catch(() => {});
      });
  }

  renderPoints() {
    const vis = this;

    const projected = vis.filteredData
      .map((d) => {
        const p = vis.projection([d.lon, d.lat]);
        return p ? { ...d, px: p[0], py: p[1] } : null;
      })
      .filter(Boolean);

    vis.pointsRenderGen = (vis.pointsRenderGen || 0) + 1;
    const gen = vis.pointsRenderGen;

    vis.pointsGroup.selectAll('circle').remove();

    const chunkSize = 7000;
    if (projected.length <= chunkSize) {
      vis.bindPointCircles(
        vis.pointsGroup
          .selectAll('circle')
          .data(projected, (d) => d.id)
          .join('circle'),
      );
      return undefined;
    }

    return new Promise((resolve) => {
      let offset = 0;
      const paintChunk = () => {
        if (gen !== vis.pointsRenderGen) {
          resolve();
          return;
        }
        const slice = projected.slice(offset, offset + chunkSize);
        vis.bindPointCircles(
          vis.pointsGroup
            .selectAll(`circle.pt-${offset}`)
            .data(slice, (d) => d.id)
            .join('circle')
            .attr('class', `pt-${offset}`),
        );
        offset += chunkSize;
        if (offset < projected.length) {
          requestAnimationFrame(paintChunk);
        } else {
          resolve();
        }
      };
      paintChunk();
    });
  }

  renderLegend() {
    const vis = this;
    vis.legendGroup.selectAll('*').remove();

    const extraClass = vis.selectedClass && !vis.topClasses.includes(vis.selectedClass)
      ? vis.selectedClass : null;
    const classEntries = extraClass
      ? [...vis.topClasses, extraClass, 'Other']
      : [...vis.topClasses, 'Other'];

    const rowH = 16;
    const r = 6;
    const legendX = 15;
    const legendY = vis.height - (classEntries.length * rowH) - 95;

    const g = vis.legendGroup
      .append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Title
    g.append('text')
      .attr('x', 0).attr('y', -5)
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .text('Meteorite class');

    g.append('text')
      .attr('x', 0).attr('y', 8)
      .attr('font-size', 9)
      .attr('fill', '#666')
      .text('(click to highlight)');

    classEntries.forEach((cls, i) => {
      const row = g.append('g')
        .attr('transform', `translate(0,${18 + i * rowH})`)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          if (vis.highlightedClasses.has(cls)) {
            vis.highlightedClasses.delete(cls);
          } else {
            vis.highlightedClasses.add(cls);
          }
          vis.updateVis().catch(() => {});
        });

      row.append('circle')
        .attr('cx', r).attr('cy', r / 2).attr('r', r)
        .attr('fill', vis.classColorScale(cls))
        .attr('fill-opacity', vis.highlightedClasses.size === 0 || vis.highlightedClasses.has(cls) ? 0.85 : 0.25)
        .attr('stroke', vis.highlightedClasses.has(cls) ? '#333' : 'none')
        .attr('stroke-width', 1.5);

      row.append('text')
        .attr('x', r * 2 + 4).attr('y', r / 2 + 4)
        .attr('font-size', 10)
        .attr('fill', vis.highlightedClasses.size === 0 || vis.highlightedClasses.has(cls) ? '#333' : '#aaa')
        .text(cls);
    });

    // Size legend (mass)
    const sizeY = legendY + 18 + classEntries.length * rowH + 12;
    const sg = vis.legendGroup.append('g')
      .attr('transform', `translate(${legendX},${sizeY})`);

    sg.append('text').attr('x', 0).attr('y', 0)
      .attr('font-size', 11)
      .attr('font-weight', 'bold')
      .text('Mass (g)');
    sg.append('text').attr('x', 0).attr('y', 11)
      .attr('font-size', 9)
      .attr('fill', '#666')
      .text('(log scale)');

    const sizeExamples = [1, 1000, 1e6, 60e6];
    let sxOffset = 0;
    sizeExamples.forEach((mass) => {
      const rr = vis.radiusScale(Math.log10(mass));
      sxOffset += rr + 4;
      sg.append('circle')
        .attr('cx', sxOffset).attr('cy', 26 + rr)
        .attr('r', rr)
        .attr('fill', '#888')
        .attr('fill-opacity', 0.5)
        .attr('stroke', '#555')
        .attr('stroke-width', 0.5);
      sg.append('text')
        .attr('x', sxOffset).attr('y', 26 + rr * 2 + 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', 8)
        .attr('fill', '#555')
        .text(d3.format('.2s')(mass));
      sxOffset += rr + 6;
    });
  }

  setSelectedCountry(country) {
    this.selectedCountry = country;
  }

  setSelectedClass(recclass) {
    this.selectedClass = recclass;
    this.highlightedClasses.clear();
    if (recclass) {
      this.highlightedClasses.add(recclass);
    }
    if (this.filteredData) {
      this.updateVis().catch(() => {});
    }
  }

  resize(w, h) {
    const vis = this;
    vis.config.containerWidth = w;
    vis.config.containerHeight = h;
    if (!vis.pointsLayerReady) return;
    vis.svgRoot.attr('viewBox', `0 0 ${w} ${h}`);
    vis.svgRoot.select('text').attr('x', w / 2);
    vis.svgRoot.select('.zoom-reset').attr('x', w - 10);
    vis.projection.fitSize([vis.width, vis.height], { type: 'Sphere' });
    vis.path = d3.geoPath().projection(vis.projection);
    vis.svgRoot.transition().duration(0).call(vis.zoom.transform, d3.zoomIdentity);
    vis.renderVis();
    vis.updateVis().catch(() => {});
  }

  update(data) {
    this.data = data;
    if (this.pointsLayerReady) {
      this.updateVis().catch(() => {});
    }
  }

  show() {
    if (this.svgRoot) this.svgRoot.style('display', null);
  }

  hide() {
    if (this.svgRoot) this.svgRoot.style('display', 'none');
  }

  isReady() {
    return this.pointsLayerReady;
  }

  /**
   * Build DOM and draw points/legend once. Optional shared countries GeoJSON.
   * Concurrent calls share the same in-flight promise.
   * @param {object[]|null} [preloadedCountries]
   */
  async ensureRendered(preloadedCountries = null) {
    const vis = this;
    if (vis.pointsLayerReady) return;
    if (vis.ensureRenderedPromise) {
      await vis.ensureRenderedPromise;
      return;
    }

    vis.ensureRenderedPromise = (async () => {
      vis.countries = preloadedCountries != null
        ? preloadedCountries
        : await vis.loadWorldMap();

      vis.initVis();
      vis.renderVis();
      await vis.updateVis();
      vis.pointsLayerReady = true;
    })();

    try {
      await vis.ensureRenderedPromise;
    } finally {
      vis.ensureRenderedPromise = null;
    }
  }

  async render(preloadedCountries = null) {
    await this.ensureRendered(preloadedCountries);
  }
}
