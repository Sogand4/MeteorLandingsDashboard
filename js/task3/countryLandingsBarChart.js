/**
 * Task 3 – Country Landings Bar Chart (linked view)
 * Top N countries + Others. Bidirectionally linked with hexbin map.
 *
 * References:
 * - UBC InfoVis 447 Tutorial 2 (Making a chart): scales, axes
 * - UBC InfoVis 447 Tutorial 3 (Data joins): selectAll().data().join()
 * - UBC InfoVis 447 Tutorial 5 (Multiple views and advanced interactivity): linking
 */
import mapUtils from '../utils/mapUtils.js';

export default class Task3CountryLandingsBarChart {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 280,
      containerHeight: _config.containerHeight || 200,
      margin: {
        top: 20, right: 10, bottom: 60, left: 45,
      },
      topN: _config.topN ?? 12,
      onCountrySelect: _config.onCountrySelect ?? (() => {}),
    };
    this.data = data;
    this.selectedCountry = null;
  }

  initVis() {
    const vis = this;
    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;
    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight)
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );
  }

  wrangleData() {
    const vis = this;
    const valid = vis.data.filter(mapUtils.hasCountry);
    const counts = d3.rollup(valid, (v) => v.length, (d) => d.country);
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }));

    const top = sorted.slice(0, vis.config.topN);
    const rest = sorted.slice(vis.config.topN);
    const othersCount = rest.reduce((s, d) => s + d.count, 0);
    if (othersCount > 0) {
      top.push({ country: 'Others', count: othersCount, isOthers: true });
    }
    vis.barData = top;
  }

  updateVis() {
    const vis = this;
    vis.wrangleData();
    vis.xScale = d3
      .scaleBand()
      .domain(vis.barData.map((d) => d.country))
      .range([0, vis.width])
      .padding(0.2);
    vis.yScale = d3
      .scaleLinear()
      .domain([0, d3.max(vis.barData, (d) => d.count) || 1])
      .nice()
      .range([vis.height, 0]);
  }

  renderVis() {
    const vis = this;
    vis.svg.selectAll('.axis').remove();
    vis.svg.selectAll('.bars').remove();

    vis.svg
      .append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${vis.height})`)
      .call(
        d3
          .axisBottom(vis.xScale)
          .tickSizeOuter(0)
          .tickValues(vis.barData.map((d) => d.country)),
      )
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    vis.svg.append('g').attr('class', 'axis axis-y').call(d3.axisLeft(vis.yScale));

    const bars = vis.svg
      .append('g')
      .attr('class', 'bars')
      .selectAll('.bar')
      .data(vis.barData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => vis.xScale(d.country))
      .attr('y', (d) => vis.yScale(d.count))
      .attr('width', vis.xScale.bandwidth())
      .attr('height', (d) => vis.height - vis.yScale(d.count))
      .attr('fill', (d) => (d.country === vis.selectedCountry ? '#e74c3c' : '#3498db'))
      .attr('opacity', (d) => (d.isOthers && vis.selectedCountry ? 0.5 : 1))
      .style('cursor', (d) => (d.isOthers ? 'default' : 'pointer'))
      .on('click', (event, d) => {
        if (d.isOthers) return;
        vis.config.onCountrySelect(d.country);
      });

    bars.append('title').text((d) => (d.isOthers ? `Others: ${d.count} meteorites` : `${d.country}: ${d.count} meteorites`));
  }

  setSelectedCountry(country) {
    this.selectedCountry = country;
    this.updateVis();
    this.renderVis();
  }

  update(data) {
    this.data = data;
    this.updateVis();
    this.renderVis();
  }
}
