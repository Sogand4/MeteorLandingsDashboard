/**
 * Map Wrapper – Orchestrator for Task 3 (density) and Task 5 (points)
 * Creates map + country bar chart, wires bidirectional linking.
 * Manages the Density / Points toggle between the two map views.
 *
 * References:
 * - UBC InfoVis 447 Tutorial 5 (Multiple views and advanced interactivity)
 */
import Task3CountryLandingsBarChart from './countryLandingsBarChart.js';
import Task3Map from './task3Map.js';
import MassDistributionMap from '../task5/massDistribution.js';

const MapWrapper = {
  densityMap: null,
  pointsMap: null,
  barChart: null,
  currentMode: 'density', // "density" | "points"

  getContainerSize(selector) {
    const el = document.querySelector(selector);
    if (!el) return { width: 600, height: 400 };
    const rect = el.getBoundingClientRect();
    return { width: Math.max(200, rect.width), height: Math.max(150, rect.height) };
  },

  setSelectedClass(recclass) {
    const cls = recclass || null;
    if (MapWrapper.densityMap) MapWrapper.densityMap.setSelectedClass(cls);
    if (MapWrapper.pointsMap) MapWrapper.pointsMap.setSelectedClass(cls);
    if (MapWrapper.barChart) MapWrapper.barChart.setSelectedClass(cls);
  },

  setYearRange(min, max) {
    if (MapWrapper.densityMap) MapWrapper.densityMap.setYearRange(min, max);
    if (MapWrapper.pointsMap) MapWrapper.pointsMap.setYearRange(min, max);
    if (MapWrapper.barChart) MapWrapper.barChart.setYearRange(min, max);
  },

  resize() {
    const { mapContainer, barChartContainer } = MapWrapper.containerSelectors || {};
    if (mapContainer) {
      const ms = MapWrapper.getContainerSize(mapContainer);
      if (MapWrapper.densityMap) MapWrapper.densityMap.resize(ms.width, ms.height);
      if (MapWrapper.pointsMap) MapWrapper.pointsMap.resize(ms.width, ms.height);
    }
    if (barChartContainer) {
      const bs = MapWrapper.getContainerSize(barChartContainer);
      if (MapWrapper.barChart) MapWrapper.barChart.resize(bs.width);
    }
  },

  /**
   * Switch between density (Task 3) and points (Task 5) modes.
   * Both SVGs share the same #main-map container; only one is visible at a time.
   */
  setMode(mode) {
    MapWrapper.currentMode = mode;
    if (mode === 'density') {
      MapWrapper.densityMap?.show();
      MapWrapper.pointsMap?.hide();
    } else {
      MapWrapper.densityMap?.hide();
      MapWrapper.pointsMap?.show();
    }
  },

  init(config) {
    const {
      mapContainer, barChartContainer, data, onCountrySelectExternal,
    } = config;

    MapWrapper.containerSelectors = { mapContainer, barChartContainer };

    const mapSize = MapWrapper.getContainerSize(mapContainer);
    const barSize = MapWrapper.getContainerSize(barChartContainer);

    const onCountrySelect = (country) => {
      const c = country || null;
      if (MapWrapper.densityMap) MapWrapper.densityMap.setSelectedCountry(c);
      if (MapWrapper.pointsMap) MapWrapper.pointsMap.setSelectedCountry(c);
      if (MapWrapper.barChart) MapWrapper.barChart.setSelectedCountry(c);
      if (onCountrySelectExternal) onCountrySelectExternal(c);
      MapWrapper.densityMap?.update(data);
      MapWrapper.pointsMap?.update(data);
      MapWrapper.barChart?.update(data);
    };

    MapWrapper.barChart = new Task3CountryLandingsBarChart(
      {
        parentElement: barChartContainer,
        containerWidth: barSize.width,
        containerHeight: barSize.height,
        onCountrySelect,
      },
      data,
    );
    MapWrapper.barChart.initVis();
    MapWrapper.barChart.updateVis();
    MapWrapper.barChart.renderVis();

    MapWrapper.densityMap = new Task3Map(
      {
        parentElement: mapContainer,
        containerWidth: mapSize.width,
        containerHeight: mapSize.height,
        hexRadius: Math.max(1.5, mapSize.width / 240),
      },
      data,
    );

    MapWrapper.pointsMap = new MassDistributionMap(
      {
        parentElement: mapContainer,
        containerWidth: mapSize.width,
        containerHeight: mapSize.height,
      },
      data,
    );

    // Wire toggle radios
    document.querySelectorAll("input[name='map-mode']").forEach((radio) => {
      radio.addEventListener('click', (e) => {
        MapWrapper.setMode(e.target.value);
      });
    });

    return MapWrapper.densityMap.render().then(() => MapWrapper.pointsMap.render().then(() => {
      MapWrapper.pointsMap.hide(); // density is default
      return MapWrapper;
    }));
  },
};

export default MapWrapper;
