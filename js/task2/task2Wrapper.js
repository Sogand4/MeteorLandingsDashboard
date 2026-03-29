/**
 * Task 2 – Orchestrator
 * Creates the scatterplot chart and sizes it to its container.
 */
const Task2 = {
  populationDensityScatterPlot: null,

  getContainerSize(selector) {
    const el = document.querySelector(selector);
    if (!el) return { width: 600, height: 300 };

    const rect = el.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
    };
  },

  init(config) {
    const { scatterplotContainer, data } = config;

    const plotSize = Task2.getContainerSize(scatterplotContainer);

    Task2.populationDensityScatterPlot = new PopulationDensityScatterPlot(
      {
        parentElement: scatterplotContainer,
        containerWidth: plotSize.width,
        containerHeight: plotSize.height,
      },
      data
    );

    Task2.populationDensityScatterPlot.updateVis();

    return Task2;
  },
};