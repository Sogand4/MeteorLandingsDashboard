/**
 * Task 2 – Orchestrator
 * Creates the scatterplot chart and sizes it to its container.
 */
import PopulationDensityScatterPlot from './populationDensityScatterPlot.js';

const Task2 = {
  populationDensityScatterPlot: null,
  lastConfig: null,

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
    Task2.lastConfig = config;

    const plotSize = Task2.getContainerSize(scatterplotContainer);

    Task2.populationDensityScatterPlot = new PopulationDensityScatterPlot(
      {
        parentElement: scatterplotContainer,
        containerWidth: plotSize.width,
        containerHeight: plotSize.height,
      },
      data,
    );

    Task2.populationDensityScatterPlot.updateVis();

    return Task2;
  },

  resize() {
    if (!Task2.lastConfig) return;
    const el = document.querySelector(Task2.lastConfig.scatterplotContainer);
    if (!el) return;
    el.innerHTML = '';
    Task2.init(Task2.lastConfig);
  },
};

export default Task2;
