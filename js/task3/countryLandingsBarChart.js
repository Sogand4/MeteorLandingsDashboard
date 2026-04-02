/**
 * Task 3 – Country Bar Chart (linked view)
 * Horizontal bars showing top N countries + "Others" aggregate.
 * Three metric modes: Count, Avg Mass, Fell/Found ratio.
 * References:
 * - UBC InfoVis 447 Tutorial 2 (Making a chart): scales, axes
 * - UBC InfoVis 447 Tutorial 3 (Data joins): selectAll().data().join()
 * - UBC InfoVis 447 Tutorial 5 (Multiple views and advanced interactivity): linking
 */
import mapUtils from '../utils/mapUtils.js';

const METRICS = {
  count: {
    label: 'Landings',
    accessor: (rows) => rows.length,
    format: d3.format(','),
  },
  avgMass: {
    label: 'Avg Mass (g)',
    accessor: (rows) => {
      const masses = rows.map((d) => d.mass).filter((m) => m != null && m > 0);
      return masses.length > 0 ? d3.mean(masses) : 0;
    },
    format: (v) => `${d3.format('.3s')(v)}g`,
  },
  fellRatio: {
    label: '% Fell (observed)',
    accessor: (rows) => {
      if (rows.length === 0) return 0;
      const fell = rows.filter((d) => d.fall === 'Fell').length;
      return (fell / rows.length) * 100;
    },
    format: (v) => `${d3.format('.1f')(v)}%`,
  },
};

const BAR_HEIGHT = 16;
const BAR_PAD = 0.15;

export default class Task3CountryLandingsBarChart {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 280,
      containerHeight: _config.containerHeight || 200,
      margin: {
        top: 6, right: 40, bottom: 14, left: 100,
      },
      topN: _config.topN ?? 10,
      onCountrySelect: _config.onCountrySelect ?? (() => {}),
    };
    this.data = data;
    this.selectedCountry = null;
    this.selectedClass = null;
    this.metric = 'count';
    this.countryLookup = new Map();
  }

  initVis() {
    const vis = this;
    vis.width = vis.config.containerWidth
      - vis.config.margin.left - vis.config.margin.right;

    const root = d3.select(vis.config.parentElement);

    vis.headerDiv = root.append('div').attr('class', 'bar-chart-header');

    vis.headerDiv.append('div')
      .attr('class', 'bar-chart-title')
      .text('Meteorite Landings by Country');

    vis.metricToggle = vis.headerDiv.append('div').attr('class', 'bar-metric-toggle');

    Object.entries(METRICS).forEach(([key, m]) => {
      const btn = vis.metricToggle
        .append('button')
        .attr('class', `metric-btn${key === vis.metric ? ' active' : ''}`)
        .attr('data-metric', key)
        .text(m.label)
        .on('click', () => {
          vis.metric = key;
          vis.metricToggle.selectAll('.metric-btn').classed('active', false);
          btn.classed('active', true);
          vis.updateVis();
          vis.renderVis();
        });
    });

    vis.subtitleText = vis.headerDiv
      .append('div')
      .attr('class', 'bar-chart-subtitle-text');

    vis.svgContainer = root.append('svg')
      .attr('viewBox', `0 0 ${vis.config.containerWidth} ${vis.config.containerHeight}`)
      .attr('preserveAspectRatio', 'xMinYMin meet');

    vis.svg = vis.svgContainer
      .append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'bar-chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');
  }

  setYearRange(min, max) {
    this.yearMin = min;
    this.yearMax = max;
  }

  wrangleData() {
    const vis = this;
    let valid = vis.data.filter(mapUtils.hasCountry);
    if (vis.selectedClass) {
      valid = valid.filter((d) => d.recclass === vis.selectedClass);
    }
    if (vis.yearMin != null) {
      valid = valid.filter((d) => d.year != null && d.year >= vis.yearMin);
    }
    if (vis.yearMax != null) {
      valid = valid.filter((d) => d.year != null && d.year <= vis.yearMax);
    }
    const grouped = d3.group(valid, (d) => d.country);
    const metricDef = METRICS[vis.metric];

    const all = [...grouped.entries()].map(([country, rows]) => ({
      country,
      value: metricDef.accessor(rows),
      count: rows.length,
      rows,
    }));
    all.sort((a, b) => b.count - a.count);

    vis.countryLookup = new Map(all.map((d) => [d.country, d]));

    const topSet = new Set(all.slice(0, vis.config.topN).map((d) => d.country));
    const top = all.filter((d) => topSet.has(d.country));
    if (vis.metric !== 'count') {
      top.sort((a, b) => b.value - a.value);
    }

    const selectedOutsideTop = vis.selectedCountry
      && !topSet.has(vis.selectedCountry)
      && vis.countryLookup.has(vis.selectedCountry);

    const rest = all.filter((d) => !topSet.has(d.country));

    if (selectedOutsideTop) {
      const entry = vis.countryLookup.get(vis.selectedCountry);
      const rank = vis.getRank(vis.selectedCountry);
      top.push({
        ...entry,
        isSwapped: true,
        rank,
        othersCount: rest.length,
      });
    } else if (rest.length > 0) {
      const restRows = rest.flatMap((d) => d.rows);
      top.push({
        country: `Others (${rest.length})`,
        value: metricDef.accessor(restRows),
        count: restRows.length,
        isOthers: true,
        restEntries: rest,
      });
    }

    vis.barData = top;
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    const numBars = vis.barData.length;
    const bandStep = BAR_HEIGHT / (1 - BAR_PAD);
    vis.height = Math.max(80, numBars * bandStep);

    const totalH = vis.height + vis.config.margin.top + vis.config.margin.bottom;
    vis.svgContainer.attr(
      'viewBox',
      `0 0 ${vis.config.containerWidth} ${totalH}`,
    );

    vis.xScale = d3.scaleLinear()
      .domain([0, d3.max(vis.barData, (d) => d.value) || 1])
      .nice()
      .range([0, vis.width]);

    vis.yScale = d3.scaleBand()
      .domain(vis.barData.map((d) => d.country))
      .range([0, vis.height])
      .padding(BAR_PAD);

    const metricDef = METRICS[vis.metric];
    const swapped = vis.barData.find((d) => d.isSwapped);
    const sub = swapped
      ? `Top ${vis.config.topN} · ${metricDef.label}  ·  #${swapped.rank} ${vis.selectedCountry}`
      : `Top ${vis.config.topN} by landings · ${metricDef.label}`;
    vis.subtitleText.text(sub);
  }

  buildOthersTooltip(d) {
    const vis = this;
    const metricDef = METRICS[vis.metric];
    const entries = d.restEntries || [];
    const preview = [...entries].sort((a, b) => b.value - a.value).slice(0, 8);
    let html = `<strong>${d.country}</strong><br/>`;
    html += '<span style="color:#aaa">Select via search or map click</span><br/>';
    html += `Total landings: ${d3.format(',')(d.count)}`;
    if (vis.metric !== 'count') {
      html += `${metricDef.label}: ${metricDef.format(d.value)}<br/>`;
    }
    html += '<br/><em>Top in group:</em><br/>';
    preview.forEach((e) => {
      html += `&nbsp;&nbsp;${e.country}: ${metricDef.format(e.value)}<br/>`;
    });
    if (entries.length > 8) {
      html += `&nbsp;&nbsp;<em>… ${entries.length - 8} more</em><br/>`;
    }

    return html;
  }

  barFill(d) {
    const vis = this;
    if (d.country === vis.selectedCountry || d.isSwapped) return '#e74c3c';
    if (d.isOthers) return '#95a5a6';
    if (vis.metric === 'fellRatio') return d3.interpolateRdYlBu(d.value / 100);
    return '#3498db';
  }

  barTooltipHtml(d) {
    const vis = this;
    const metricDef = METRICS[vis.metric];
    if (d.isOthers) return vis.buildOthersTooltip(d);
    let html = `<strong>${d.country}</strong>`;
    if (d.isSwapped) {
      html += ` <span style="color:#aaa">(#${d.rank} by count, from Others)</span>`;
    }
    html += `<br/>Landings: ${d3.format(',')(d.count)}<br/>`;
    if (vis.metric !== 'count') {
      html += `${metricDef.label}: ${metricDef.format(d.value)}`;
    }
    return html;
  }

  getRank(country) {
    const entries = [...this.countryLookup.values()];
    const idx = entries.findIndex((e) => e.country === country);
    return idx >= 0 ? idx + 1 : null;
  }

  renderVis() {
    const vis = this;
    const metricDef = METRICS[vis.metric];
    vis.svg.selectAll('.axis').remove();
    vis.svg.selectAll('.bars').remove();

    const yAxis = vis.svg.append('g')
      .attr('class', 'axis axis-y')
      .call(d3.axisLeft(vis.yScale).tickSizeOuter(0));

    yAxis.selectAll('text')
      .attr('font-size', 10)
      .attr('fill', (t) => {
        const entry = vis.barData.find((d) => d.country === t);
        return entry?.isSwapped ? '#e74c3c' : '#444';
      })
      .attr('font-weight', (t) => {
        const entry = vis.barData.find((d) => d.country === t);
        return entry?.isSwapped ? 600 : 400;
      });

    vis.svg.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${vis.height})`)
      .call(d3.axisBottom(vis.xScale).ticks(4).tickFormat(metricDef.format));

    vis.svg.append('g').attr('class', 'bars')
      .selectAll('.bar')
      .data(vis.barData)
      .join('rect')
      .attr('class', (d) => `bar${d.isOthers ? ' bar-others' : ''}`)
      .attr('x', 0)
      .attr('y', (d) => vis.yScale(d.country))
      .attr('width', (d) => Math.max(0, vis.xScale(d.value)))
      .attr('height', vis.yScale.bandwidth())
      .attr('fill', (d) => vis.barFill(d))
      .attr('opacity', (d) => (d.isOthers && vis.selectedCountry ? 0.5 : 1))
      .attr('stroke', (d) => (d.isOthers ? '#7f8c8d' : 'none'))
      .attr('stroke-width', (d) => (d.isOthers ? 1 : 0))
      .attr('stroke-dasharray', (d) => (d.isOthers ? '4 2' : 'none'))
      .style('cursor', (d) => (d.isOthers ? 'default' : 'pointer'))
      .on('click', (event, d) => {
        if (d.isOthers) return;
        const next = d.country === vis.selectedCountry ? null : d.country;
        vis.config.onCountrySelect(next);
      })
      .on('mouseover', (event, d) => {
        vis.tooltip.style('visibility', 'visible').html(vis.barTooltipHtml(d));
      })
      .on('mousemove', (event) => {
        vis.tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`);
      })
      .on('mouseout', () => vis.tooltip.style('visibility', 'hidden'));
  }

  setSelectedCountry(country) {
    this.selectedCountry = country || null;
    this.updateVis();
    this.renderVis();
  }

  setSelectedClass(recclass) {
    this.selectedClass = recclass || null;
    this.updateVis();
    this.renderVis();
  }

  setMetric(metric) {
    if (!METRICS[metric]) return;
    this.metric = metric;
    this.metricToggle?.selectAll('.metric-btn').classed('active', false);
    this.metricToggle?.select(`[data-metric="${metric}"]`).classed('active', true);
    this.updateVis();
    this.renderVis();
  }

  resize(w) {
    const vis = this;
    vis.config.containerWidth = w;
    vis.width = w - vis.config.margin.left - vis.config.margin.right;
    vis.updateVis();
    vis.renderVis();
  }

  update(data) {
    this.data = data;
    this.updateVis();
    this.renderVis();
  }
}
