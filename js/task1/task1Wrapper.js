/**
 * Task 1 – Orchestrator
 * Creates the boxplot and sizes it to its container.
 */
import MassByClassBoxPlot from './massByClassBoxplot.js';

const Task1 = {
  massByClassBoxPlot: null,
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
    const { boxplotContainer, data } = config;
    Task1.lastConfig = config;

    const plotSize = Task1.getContainerSize(boxplotContainer);

    Task1.massByClassBoxPlot = new MassByClassBoxPlot(
      {
        parentElement: '#mass-by-class-boxplot',
        containerWidth: plotSize.width,
        containerHeight: plotSize.height,
      },
      data,
    );

    return Task1;
  },

  resize() {
    if (!Task1.lastConfig) return;
    const el = document.querySelector(Task1.lastConfig.boxplotContainer);
    if (!el) return;
    el.innerHTML = '';
    Task1.init(Task1.lastConfig);
  },
};

export default Task1;
