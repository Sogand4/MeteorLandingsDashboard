/**
 * Task 1 – Orchestrator
 * Creates the boxplot and sizes it to its container.
 */
const Task1 = {
  massByClassBoxPlot: null,

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
    const { chartContainer, data } = config;

    const plotSize = Task1.getContainerSize(chartContainer);

    Task1.massByClassBoxPlot = new MassByClassBoxPlot(
      {
        parentElement: "#mass-by-class-boxplot",
        containerWidth: plotSize.width,
        containerHeight: plotSize.height,
      },
      data,
    );

    return Task1;
  },
};
