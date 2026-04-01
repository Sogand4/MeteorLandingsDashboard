/**
 * References:
 * - Boxplot in D3: https://d3-graph-gallery.com/graph/boxplot_basic.html
 * - Boxplot tutorial: https://observablehq.com/@d3/box-plot/2
*/

import { getRankedRecclasses } from '../utils/recclassUtils.js';

export default class MassByClassBoxPlot {
  constructor(_config, data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 320,
      containerHeight: _config.containerHeight || 280,
      margin: {
        top: 20,
        right: 20,
        bottom: 65,
        left: 60,
      },
    };

    this.data = data;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.width = vis.config.containerWidth
      - vis.config.margin.left
      - vis.config.margin.right;

    vis.height = vis.config.containerHeight
      - vis.config.margin.top
      - vis.config.margin.bottom;

    vis.container = d3.select(vis.config.parentElement);

    vis.title = vis.container
      .append('div')
      .attr('class', 'chart-title')
      .text('Mass Distribution for Top Meteorite Classes');

    vis.rankOrderedClasses = getRankedRecclasses(vis.data, (d) => d.recclass && +d.mass > 0);

    // Show the top 4 most frequent recclasses as fixed boxplots
    // The 5th slot is user-controlled via dropdown and defaults to the 5th most frequent class
    vis.fixedClasses = vis.rankOrderedClasses.slice(0, 4);
    vis.dropdownOptions = vis.rankOrderedClasses.slice(4).sort(d3.ascending);
    vis.selectedDropdownClass = vis.rankOrderedClasses[4] || vis.rankOrderedClasses[0];

    vis.controls = vis.container
      .append('div')
      .attr('class', 'chart-controls');

    vis.controls
      .append('label')
      .attr('for', 'class-select-5')
      .text('5th class:');

    vis.dropdown = vis.controls
      .append('select')
      .attr('id', 'class-select-5');

    vis.dropdown
      .selectAll('option')
      .data(vis.dropdownOptions)
      .join('option')
      .attr('value', (d) => d)
      .text((d) => d);

    vis.dropdown.property('value', vis.selectedDropdownClass);

    vis.yScale = d3.scaleLog().range([vis.height, 0]);

    vis.xScale = d3.scaleBand()
      .range([0, vis.width])
      .padding(0.3);

    vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);

    vis.svg = vis.container
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight)
      .attr('id', 'mass-by-class-boxplot-svg');

    vis.chartArea = vis.svg
      .append('g')
      .attr(
        'transform',
        `translate(${vis.config.margin.left},${vis.config.margin.top})`,
      );

    vis.xAxisGroup = vis.chartArea
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${vis.height})`);

    vis.yAxisGroup = vis.chartArea
      .append('g')
      .attr('class', 'y-axis');

    vis.dropdown.on('change', () => {
      vis.selectedDropdownClass = vis.dropdown.property('value');
      vis.updateVis();
    });

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    vis.selectedClasses = [...vis.fixedClasses, vis.selectedDropdownClass];
    vis.xScale.domain(vis.selectedClasses);

    vis.boxData = vis.selectedClasses
      .map((recclass) => {
        const values = vis.data
          .filter((d) => d.recclass === recclass && +d.mass > 0)
          .map((d) => +d.mass)
          .sort(d3.ascending);

        if (!values.length) return null;

        const min = values[0];
        const max = values[values.length - 1];
        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const iqr = q3 - q1;

        const r0 = Math.max(min, q1 - 1.5 * iqr);
        const r1 = Math.min(max, q3 + 1.5 * iqr);

        return {
          recclass,
          quartiles: [q1, median, q3],
          range: [r0, r1],
          outliers: values.filter((value) => value < r0 || value > r1),
        };
      })
      .filter((d) => d !== null);

    // Include outliers in the visible domain so they are not clipped
    const allVisibleValues = vis.boxData.flatMap((d) => [
      d.range[0],
      d.range[1],
      ...d.outliers,
    ]);

    const minVal = d3.min(allVisibleValues);
    const maxVal = d3.max(allVisibleValues);

    // Add padding
    vis.yScale.domain([
      minVal / 1.2,
      maxVal * 1.2,
    ]);

    const [minY, maxY] = vis.yScale.domain();

    // The y-position uses a log scale,
    // but tick labels show the original mass values in grams to help interpretability
    vis.yTickValues = d3.range(
      Math.ceil(Math.log10(minY)),
      Math.floor(Math.log10(maxY)) + 1,
    ).map((d) => 10 ** d);

    vis.renderVis();
  }

  renderVis() {
    const vis = this;

    const boxWidth = Math.min(42, vis.xScale.bandwidth() * 0.65);

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      .domain(vis.rankOrderedClasses);
    // Keep the dropdown-selected class visually consistent by assigning it a
    // static color, regardless of which recclass is selected
    const dropdownColor = d3.schemeTableau10[4];

    vis.boxGroups = vis.chartArea
      .selectAll('.box-group')
      .data(vis.boxData, (d) => d.recclass)
      .join('g')
      .attr('class', 'box-group')
      .attr(
        'transform',
        (d) => `translate(${vis.xScale(d.recclass) + vis.xScale.bandwidth() / 2},0)`,
      );

    vis.boxGroups
      .selectAll('.range-line')
      .data((d) => [d])
      .join('line')
      .attr('class', 'range-line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', (d) => vis.yScale(d.range[0]))
      .attr('y2', (d) => vis.yScale(d.range[1]));

    vis.boxGroups
      .selectAll('.box')
      .data((d) => [d])
      .join('rect')
      .attr('class', 'box')
      .attr('x', -boxWidth / 2)
      .attr('width', boxWidth)
      .attr('y', (d) => vis.yScale(d.quartiles[2]))
      .attr('height', (d) => vis.yScale(d.quartiles[0]) - vis.yScale(d.quartiles[2]))
      .attr('fill', (d) => (d.recclass === vis.selectedDropdownClass
        ? dropdownColor
        : colorScale(d.recclass)));

    vis.boxGroups
      .selectAll('.median-line')
      .data((d) => [d])
      .join('line')
      .attr('class', 'median-line')
      .attr('x1', -boxWidth / 2)
      .attr('x2', boxWidth / 2)
      .attr('y1', (d) => vis.yScale(d.quartiles[1]))
      .attr('y2', (d) => vis.yScale(d.quartiles[1]));

    vis.boxGroups
      .selectAll('.range-cap-top')
      .data((d) => [d])
      .join('line')
      .attr('class', 'range-cap-top')
      .attr('x1', -boxWidth / 4)
      .attr('x2', boxWidth / 4)
      .attr('y1', (d) => vis.yScale(d.range[1]))
      .attr('y2', (d) => vis.yScale(d.range[1]));

    vis.boxGroups
      .selectAll('.range-cap-bottom')
      .data((d) => [d])
      .join('line')
      .attr('class', 'range-cap-bottom')
      .attr('x1', -boxWidth / 4)
      .attr('x2', boxWidth / 4)
      .attr('y1', (d) => vis.yScale(d.range[0]))
      .attr('y2', (d) => vis.yScale(d.range[0]));

    vis.boxGroups
      .selectAll('.outlier')
      .data((d) => d.outliers.map((value) => ({
        recclass: d.recclass,
        value,
      })))
      .join('circle')
      .attr('class', 'outlier')
      .attr('cx', 0)
      .attr('cy', (d) => vis.yScale(d.value))
      .attr('fill', (d) => (d.recclass === vis.selectedDropdownClass
        ? dropdownColor
        : colorScale(d.recclass)));

    vis.yAxis = d3.axisLeft(vis.yScale)
      .tickValues(vis.yTickValues)
      .tickFormat(d3.format('~s'))
      .tickSizeOuter(0);

    vis.yAxisGroup.call(vis.yAxis);

    vis.yAxisGroup
      .selectAll('.axis-label')
      .data([null])
      .join('text')
      .attr('class', 'axis-label')
      .attr('x', -vis.height / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text('Mass (g, log scale)');

    vis.xAxisGroup.call(vis.xAxis);
    vis.xAxisGroup
      .selectAll('.axis-label')
      .data([null])
      .join('text')
      .attr('class', 'axis-label')
      .attr('x', vis.width / 2)
      .attr('y', 35)
      .text('Meteorite Class');
  }
}
