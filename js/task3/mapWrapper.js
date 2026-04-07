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
import mapUtils from '../utils/mapUtils.js';

const MapWrapper = {
  densityMap: null,
  pointsMap: null,
  barChart: null,
  currentMode: 'density', // "density" | "points"

  /**
   * Indeterminate loading bar over #main-map (see index.html #map-loading).
   * @param {boolean} show
   * @param {string} [message]
   */
  setMapLoading(show, message = 'Loading map…') {
    const root = document.getElementById('map-loading');
    const label = root?.querySelector('.map-loading-text');
    if (!root) return;
    if (label && message) label.textContent = message;
    root.hidden = !show;
    root.setAttribute('aria-busy', show ? 'true' : 'false');
  },

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
   * Points map DOM and heavy rendering are deferred until the first time mode is "points".
   */
  async setMode(mode) {
    MapWrapper.currentMode = mode;
    if (mode === 'density') {
      MapWrapper.densityMap?.show();
      MapWrapper.pointsMap?.hide();
    } else {
      MapWrapper.densityMap?.hide();
      if (MapWrapper.pointsMap) {
        const needsPointsBuild = !MapWrapper.pointsMap.isReady();
        if (needsPointsBuild) {
          MapWrapper.setMapLoading(true, 'Loading points view…');
        }
        try {
          await MapWrapper.pointsMap.ensureRendered(MapWrapper.worldCountries);
        } finally {
          if (needsPointsBuild) MapWrapper.setMapLoading(false);
        }
        MapWrapper.pointsMap.show();
      }
    }
  },

  async init(config) {
    const {
      mapContainer, barChartContainer, data, onCountrySelectExternal,
    } = config;

    MapWrapper.containerSelectors = { mapContainer, barChartContainer };

    MapWrapper.setMapLoading(true, 'Loading map…');
    try {
      const mapSize = MapWrapper.getContainerSize(mapContainer);
      const barSize = MapWrapper.getContainerSize(barChartContainer);

      const worldMapPromise = mapUtils.loadWorldMap();

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

      MapWrapper.worldCountries = await worldMapPromise;

      MapWrapper.densityMap = new Task3Map(
        {
          parentElement: mapContainer,
          containerWidth: mapSize.width,
          containerHeight: mapSize.height,
          hexRadius: Math.max(1.5, mapSize.width / 240),
          onCountrySelect,
        },
        data,
      );

      MapWrapper.pointsMap = new MassDistributionMap(
        {
          parentElement: mapContainer,
          containerWidth: mapSize.width,
          containerHeight: mapSize.height,
          onCountrySelect,
        },
        data,
      );

      document.querySelectorAll("input[name='map-mode']").forEach((radio) => {
        radio.addEventListener('change', (e) => {
          MapWrapper.setMode(e.target.value).catch(() => {});
        });
      });

      await MapWrapper.densityMap.render(MapWrapper.worldCountries);
      MapWrapper.setMode('density').catch(() => {});
      return MapWrapper;
    } finally {
      MapWrapper.setMapLoading(false);
    }
  },
};

export default MapWrapper;
