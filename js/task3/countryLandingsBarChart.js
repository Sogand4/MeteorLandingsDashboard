/**
 * Task 3 – Country Bar Chart (linked view)
 * Horizontal bars, top N countries + Others.
 * Three metric modes: Count, Avg Mass, Fell/Found ratio.
 *
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
    tooltipSuffix: ' landings',
  },
  avgMass: {
    label: 'Avg Mass (g)',
    accessor: (rows) => {
      const masses = rows.map((d) => d.mass).filter((m) => m != null && m > 0);
      return masses.length > 0 ? d3.mean(masses) : 0;
    },
    format: (v) => d3.format('.3s')(v) + 'g',
    tooltipSuffix: '',
  },
  fellRatio: {
    label: '% Fell (observed)',
    accessor: (rows) => {
      if (rows.length === 0) return 0;
      const fell = rows.filter((d) => d.fall === 'Fell').length;
      return (fell / rows.length) * 100;
    },
    format: (v) => d3.format('.1f')(v) + '%',
    tooltipSuffix: '',
  },
};

export default class Task3CountryLandingsBarChart {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 280,
      containerHeight: _config.containerHeight || 200,
      margin: {
        top: 30, right: 40, bottom: 10, left: 100,
      },
      topN: _config.topN ?? 10,
      onCountrySelect: _config.onCountrySelect ?? (() => {}),
    };
    this.data = data;
    this.selectedCountry = null;
    this.metric = 'count';
  }

  initVis() {
    const vis = this;
    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;
    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    const root = d3.select(vis.config.parentElement);

    vis.metricToggle = root
      .append('div')
      .attr('class', 'bar-metric-toggle');

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

    vis.svg = root
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight)
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'bar-chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none');
  }

  wrangleData() {
    const vis = this;
    const valid = vis.data.filter(mapUtils.hasCountry);
    const grouped = d3.group(valid, (d) => d.country);
    const metricDef = METRICS[vis.metric];

    const all = [...grouped.entries()]
      .map(([country, rows]) => ({
        country,
        value: metricDef.accessor(rows),
        count: rows.length,
        rows,
      }));

    const sortField = vis.metric === 'count' ? 'value' : 'count';
    all.sort((a, b) => b[sortField] - a[sortField]);

    const topCountries = new Set(all.slice(0, vis.config.topN).map((d) => d.country));
    const top = all.filter((d) => topCountries.has(d.country));

    if (vis.metric !== 'count') {
      top.sort((a, b) => b.value - a.value);
    }

    const rest = all.filter((d) => !topCountries.has(d.country));
    if (rest.length > 0) {
      const restRows = rest.flatMap((d) => d.rows);
      top.push({
        country: 'Others',
        value: metricDef.accessor(restRows),
        count: restRows.length,
        isOthers: true,
      });
    }
    vis.barData = top;
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();

    vis.yScale = d3
      .scaleBand()
      .domain(vis.barData.map((d) => d.country))
      .range([0, vis.height])
      .padding(0.15);

    vis.xScale = d3
      .scaleLinear()
      .domain([0, d3.max(vis.barData, (d) => d.value) || 1])
      .nice()
      .range([0, vis.width]);
  }

  renderVis() {
    const vis = this;
    const metricDef = METRICS[vis.metric];
    vis.svg.selectAll('.axis').remove();
    vis.svg.selectAll('.bars').remove();
    vis.svg.selectAll('.chart-subtitle').remove();

    vis.svg
      .append('text')
      .attr('class', 'chart-subtitle')
      .attr('x', vis.width / 2)
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#555')
      .text(`Top ${vis.config.topN} countries by landings · ${metricDef.label}`);

    vis.svg
      .append('g')
      .attr('class', 'axis axis-y')
      .call(
        d3.axisLeft(vis.yScale).tickSizeOuter(0),
      )
      .selectAll('text')
      .attr('font-size', 10);

    vis.svg
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${vis.height})`)
      .call(d3.axisBottom(vis.xScale).ticks(5).tickFormat(metricDef.format));

    const bars = vis.svg
      .append('g')
      .attr('class', 'bars')
      .selectAll('.bar')
      .data(vis.barData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => vis.yScale(d.country))
      .attr('width', (d) => Math.max(0, vis.xScale(d.value)))
      .attr('height', vis.yScale.bandwidth())
      .attr('fill', (d) => {
        if (d.country === vis.selectedCountry) return '#e74c3c';
        if (vis.metric === 'fellRatio') {
          return d3.interpolateRdYlBu(d.value / 100);
        }
        return '#3498db';
      })
      .attr('opacity', (d) => (d.isOthers && vis.selectedCountry ? 0.5 : 1))
      .style('cursor', (d) => (d.isOthers ? 'default' : 'pointer'))
      .on('click', (event, d) => {
        if (d.isOthers) return;
        vis.config.onCountrySelect(d.country);
      })
      .on('mouseover', (event, d) => {
        let html = `<strong>${d.country}</strong><br/>`;
        html += `Landings: ${d3.format(',')(d.count)}<br/>`;
        if (vis.metric !== 'count') {
          html += `${metricDef.label}: ${metricDef.format(d.value)}`;
        }
        vis.tooltip.style('visibility', 'visible').html(html);
      })
      .on('mousemove', (event) => {
        vis.tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY + 10}px`);
      })
      .on('mouseout', () => {
        vis.tooltip.style('visibility', 'hidden');
      });
  }

  setSelectedCountry(country) {
    this.selectedCountry = country;
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

  update(data) {
    this.data = data;
    this.updateVis();
    this.renderVis();
  }
}
