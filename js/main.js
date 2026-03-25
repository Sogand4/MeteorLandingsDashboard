/**
 * Meteorite Landing Data Visualization – Main entry point
 * Loads data, parses types, populates filters, initializes Task 3 and teammate charts.
 *
 * References: UBC InfoVis 447 Tutorial 1 (Intro to D3) – d3.csv
 */
let meteoriteDistributionBarChart;
let populationDensityScatterPlot;

function parseMeteoriteRow(d) {
  return {
    ...d,
    id: +d.id,
    year: d.year ? +d.year : null,
    mass: d['mass (g)'] ? +d['mass (g)'] : null,
    reclat: d.reclat ? +d.reclat : null,
    reclong: d.reclong ? +d.reclong : null,
    population_density: d.population_density ? +d.population_density : null,
    population_estimate: d.population_estimate ? +d.population_estimate : null,
  };
}

function initCountrySearchFilter(data, onSelect) {
  const countries = [
    ...new Set(data.map((d) => d.country).filter((c) => c && String(c).trim())),
  ].sort();
  const input = document.getElementById('filter-country-search');
  const list = document.getElementById('filter-country-list');
  if (!input || !list) return { setValue: () => {} };

  function filterAndShow(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = q
      ? countries.filter((c) => c.toLowerCase().includes(q))
      : countries;
    list.innerHTML = '';
    const clearLi = document.createElement('li');
    clearLi.className = 'country-clear';
    clearLi.textContent = 'All countries';
    clearLi.dataset.value = '';
    clearLi.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = '';
      list.setAttribute('aria-hidden', 'true');
      onSelect(null);
    });
    list.appendChild(clearLi);
    filtered.slice(0, 50).forEach((c) => {
      const li = document.createElement('li');
      li.textContent = c;
      li.dataset.value = c;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = c;
        list.setAttribute('aria-hidden', 'true');
        onSelect(c);
      });
      list.appendChild(li);
    });
    if (filtered.length > 50) {
      const more = document.createElement('li');
      more.className = 'country-clear';
      more.textContent = `… ${filtered.length - 50} more (keep typing)`;
      list.appendChild(more);
    }
    if (q && filtered.length === 0) {
      const none = document.createElement('li');
      none.className = 'country-clear';
      none.textContent = 'No matching countries';
      list.appendChild(none);
    }
    list.setAttribute('aria-hidden', 'false');
  }

  input.addEventListener('focus', () => filterAndShow(input.value));
  input.addEventListener('input', () => filterAndShow(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      list.setAttribute('aria-hidden', 'true');
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.setAttribute('aria-hidden', 'true');
    }
  });

  return {
    setValue: (country) => {
      input.value = country || '';
    },
  };
}

d3.csv('data/meteorite_with_country_population_cleaned.csv').then((raw) => {
  const data = raw.map(parseMeteoriteRow);

  let countryFilterRef = null;

  const applyCountryFilter = (country) => {
    if (MapWrapper.barChart) MapWrapper.barChart.setSelectedCountry(country);
    if (MapWrapper.densityMap) MapWrapper.densityMap.setSelectedCountry(country);
    if (MapWrapper.pointsMap) MapWrapper.pointsMap.setSelectedCountry(country);
    MapWrapper.densityMap?.update(data);
    MapWrapper.pointsMap?.update(data);
    MapWrapper.barChart?.update(data);
  };

  const syncFilterToSelection = (country) => {
    if (countryFilterRef) countryFilterRef.setValue(country);
  };

  countryFilterRef = initCountrySearchFilter(data, applyCountryFilter);

  requestAnimationFrame(() => {
    MapWrapper.init({
      mapContainer: '#main-map',
      barChartContainer: '#task3-country-bar',
      data,
      onCountrySelectExternal: syncFilterToSelection,
    });

    Task4.init({
      barChartContainer: '#total-meteorite-discoveries-bar-chart',
      data,
    });

    Task2.init({
      scatterplotContainer: '#population-density-scatter',
      data,
    });

    Task1.init({
      boxplotContainer: '#mass-by-class-boxplot',
      data,
    });
  });
});
