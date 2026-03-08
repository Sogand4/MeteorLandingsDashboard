/**
 * Task 3 – Orchestrator
 * Creates map + country bar chart, wires bidirectional linking.
 *
 * References:
 * - UBC InfoVis 447 Tutorial 5 (Multiple views and advanced interactivity)
 */
const Task3 = {
  map: null,
  barChart: null,

  getContainerSize(selector) {
    const el = document.querySelector(selector);
    if (!el) return { width: 600, height: 400 };
    const rect = el.getBoundingClientRect();
    return { width: Math.max(200, rect.width), height: Math.max(150, rect.height) };
  },

  init(config) {
    const { mapContainer, barChartContainer, data, onCountrySelectExternal } = config;

    const mapSize = Task3.getContainerSize(mapContainer);
    const barSize = Task3.getContainerSize(barChartContainer);

    const onCountrySelect = (country) => {
      const c = country || null;
      if (Task3.map) Task3.map.setSelectedCountry(c);
      if (Task3.barChart) Task3.barChart.setSelectedCountry(c);
      if (onCountrySelectExternal) onCountrySelectExternal(c);
      Task3.map?.update(data);
      Task3.barChart?.update(data);
    };

    Task3.barChart = new Task3CountryLandingsBarChart(
      {
        parentElement: barChartContainer,
        containerWidth: barSize.width,
        containerHeight: barSize.height,
        onCountrySelect,
      },
      data
    );
    Task3.barChart.initVis();
    Task3.barChart.updateVis();
    Task3.barChart.renderVis();

    Task3.map = new Task3Map(
      {
        parentElement: mapContainer,
        containerWidth: mapSize.width,
        containerHeight: mapSize.height,
        hexRadius: Math.max(1.5, mapSize.width / 240),
      },
      data
    );

    return Task3.map.render().then(() => Task3);
  },
};
