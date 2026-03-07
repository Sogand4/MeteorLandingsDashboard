d3.csv("data/meteorite_with_country_population_cleaned.csv").then((data) => {
  // Convert columns to numerical values
  data.forEach((d) => {
    d.id = +d.id;
    d.year = d.year ? +d.year : null;
    d.mass = d["mass (g)"] ? +d["mass (g)"] : null;
    d.reclat = d.reclat ? +d.reclat : null;
    d.reclong = d.reclong ? +d.reclong : null;
    d.population_density = d.population_density ? +d.population_density : null;
    d.population_estimate = d.population_estimate
      ? +d.population_estimate
      : null;
  });

  meteoriteDistribution = new MeteoriteDistributionBarChart(
    {
      parentElement: "#meteorite-distribution-bar-chart",
    },
    data,
  );
});
