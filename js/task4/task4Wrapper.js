/**
 * Task 4 – Orchestrator
 * Creates the meteorite distribution bar charts and sizes it to its container.
 */
import TopMeteoriteDistributionBarChart from './topMeteoriteDistributionBarChart.js';
import TotalMeteoriteDiscoveriesBarChart from './totalMeteoriteDiscoveriesBarChart.js';
import FilterOutlierYears from '../utils/yearFilter.js';

const dispatcher = d3.dispatch('hoverTotalMeteoriteBucket', 'hoverMeteoriteType');

const Task4 = {
  totalMeteoriteDiscoveriesBarChart: null,
  topMeteoriteDistributionBarChart: null,

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
    const filteredData = FilterOutlierYears(data);

    const barSize = Task4.getContainerSize(barChartContainer);

    Task4.totalMeteoriteDiscoveriesBarChart = new TotalMeteoriteDiscoveriesBarChart(
      {
        parentElement: '#total-meteorite-discoveries-bar-chart',
        containerWidth: barSize.width,
        containerHeight: barSize.height,
      },
      filteredData,
      dispatcher,
    );

    Task4.topMeteoriteDistributionBarChart = new TopMeteoriteDistributionBarChart(
      {
        parentElement: '#top-meteorite-distribution-bar-chart',
        containerWidth: barSize.width,
        containerHeight: barSize.height,
      },
      filteredData,
      dispatcher,
    );

    return Task4;
  },
};

export default Task4;
