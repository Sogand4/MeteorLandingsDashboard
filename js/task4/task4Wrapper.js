/**
 * Task 4 – Orchestrator
 * Creates the meteorite distribution bar charts and sizes it to its container.
 */
const Task4 = {
  meteoriteDistributionBarChart: null,

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
    const { barChartContainer, data } = config;

    const barSize = Task4.getContainerSize(barChartContainer);

    Task4.meteoriteDistributionBarChart = new MeteoriteDistributionBarChart(
      {
        parentElement: barChartContainer,
        containerWidth: barSize.width,
        containerHeight: barSize.height,
      },
      data,
    );

    return Task4;
  },
};
