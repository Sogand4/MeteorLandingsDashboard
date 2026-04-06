/**
 * Meteorite Landing Data Visualization – Main entry point
 * Loads data, parses types, populates filters, initializes Task 3 and teammate charts.
 *
 * References: UBC InfoVis 447 Tutorial 1 (Intro to D3) – d3.csv
 */
import MapWrapper from './task3/mapWrapper.js';
import Task4 from './task4/task4Wrapper.js';
import Task2 from './task2/task2Wrapper.js';
import Task1 from './task1/task1Wrapper.js';

function parseMeteoriteRow(d) {
  return {
    ...d,
    id: +d.id,
    recclass: d.recclass ? d.recclass.trim() : d.recclass,
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

function initClassSearchFilter(data, onSelect) {
  const classes = [...new Set(data.map((d) => d.recclass).filter(Boolean))].sort();
  const input = document.getElementById('filter-class-search');
  const list = document.getElementById('filter-class-list');
  if (!input || !list) return { setValue: () => {}, getValue: () => '' };

  function setExpanded(open) {
    input.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function filterAndShow(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = q
      ? classes.filter((c) => c.toLowerCase().includes(q))
      : classes;
    list.innerHTML = '';
    const clearLi = document.createElement('li');
    clearLi.className = 'country-clear';
    clearLi.setAttribute('role', 'option');
    clearLi.textContent = 'All classes';
    clearLi.dataset.value = '';
    clearLi.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = '';
      list.setAttribute('aria-hidden', 'true');
      setExpanded(false);
      onSelect(null);
    });
    list.appendChild(clearLi);
    filtered.slice(0, 50).forEach((c) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.textContent = c;
      li.dataset.value = c;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = c;
        list.setAttribute('aria-hidden', 'true');
        setExpanded(false);
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
      none.textContent = 'No matching classes';
      list.appendChild(none);
    }
    list.setAttribute('aria-hidden', 'false');
    setExpanded(true);
  }

  input.addEventListener('focus', () => filterAndShow(input.value));
  input.addEventListener('input', () => filterAndShow(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      list.setAttribute('aria-hidden', 'true');
      setExpanded(false);
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.setAttribute('aria-hidden', 'true');
      setExpanded(false);
    }
  });

  return {
    setValue: (recclass) => {
      input.value = recclass || '';
    },
    getValue: () => input.value || '',
  };
}

const HISTORY_KEY = 'meteorite-filter-history';

const FilterHistory = {
  entries: [],

  load() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) FilterHistory.entries = JSON.parse(raw);
    } catch { /* ignore corrupt data */ }
  },

  save() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(FilterHistory.entries));
    } catch { /* storage full or unavailable */ }
  },

  capture() {
    const snap = {
      recclass: document.getElementById('filter-class-search')?.value || '',
      yearMin: document.getElementById('filter-year-min')?.value || '',
      yearMax: document.getElementById('filter-year-max')?.value || '',
      country: document.getElementById('filter-country-search')?.value || '',
      mapMode: document.querySelector("input[name='map-mode']:checked")?.value || 'density',
    };
    const key = JSON.stringify(snap);
    FilterHistory.entries = FilterHistory.entries.filter(
      (e) => JSON.stringify(e) !== key,
    );
    FilterHistory.entries.unshift(snap);
    FilterHistory.save();
    FilterHistory.render();
  },

  label(snap) {
    const parts = [];
    if (snap.recclass) parts.push(snap.recclass);
    if (snap.yearMin || snap.yearMax) {
      parts.push(`${snap.yearMin || '…'}–${snap.yearMax || '…'}`);
    }
    if (snap.country) parts.push(snap.country);
    parts.push(snap.mapMode === 'points' ? 'Points' : 'Density');
    return parts.join(' · ') || 'All defaults';
  },

  render() {
    const list = document.getElementById('filter-history-list');
    if (!list) return;
    list.innerHTML = '';
    if (FilterHistory.entries.length === 0) {
      const li = document.createElement('li');
      li.className = 'filter-history-empty';
      li.textContent = 'No history yet';
      list.appendChild(li);
      return;
    }
    FilterHistory.entries.forEach((snap, i) => {
      const li = document.createElement('li');

      const label = document.createElement('span');
      label.className = 'filter-history-label';
      label.textContent = `${i + 1}. ${FilterHistory.label(snap)}`;
      li.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'filter-history-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        FilterHistory.entries.splice(i, 1);
        FilterHistory.save();
        FilterHistory.render();
      });
      li.appendChild(removeBtn);

      li.addEventListener('mousedown', (e) => {
        if (e.target === removeBtn) return;
        e.preventDefault();
        FilterHistory.restore(snap);
        list.setAttribute('aria-hidden', 'true');
        const btn = document.getElementById('filter-history-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      list.appendChild(li);
    });
  },

  restore: null,

  init(restoreFn) {
    FilterHistory.restore = restoreFn;
    FilterHistory.load();
    const btn = document.getElementById('filter-history-btn');
    const list = document.getElementById('filter-history-list');
    if (!btn || !list) return;

    btn.addEventListener('click', () => {
      const open = list.getAttribute('aria-hidden') !== 'true';
      list.setAttribute('aria-hidden', open ? 'true' : 'false');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !list.contains(e.target)) {
        list.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    FilterHistory.render();
  },
};

d3.csv('data/meteorite_clean_no_zero_coords.csv').then((raw) => {
  const currentYear = new Date().getFullYear();
  const data = raw.map(parseMeteoriteRow)
    .filter((d) => d.year == null || (d.year >= 1900 && d.year <= currentYear));

  let countryFilterRef = null;
  let classFilterRef = null;

  classFilterRef = initClassSearchFilter(data, (recclass) => {
    MapWrapper.setSelectedClass(recclass || null);
    MapWrapper.densityMap?.update(data);
    MapWrapper.pointsMap?.update(data);
  });

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

  const applyYearFilter = () => {
    const minEl = document.getElementById('filter-year-min');
    const maxEl = document.getElementById('filter-year-max');
    const min = minEl && minEl.value !== '' ? +minEl.value : null;
    const max = maxEl && maxEl.value !== '' ? +maxEl.value : null;
    MapWrapper.setYearRange(min, max);
    MapWrapper.densityMap?.update(data);
    MapWrapper.pointsMap?.update(data);
    MapWrapper.barChart?.update(data);
  };

  ['filter-year-min', 'filter-year-max'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyYearFilter);
  });

  requestAnimationFrame(() => {
    MapWrapper.init({
      mapContainer: '#main-map',
      barChartContainer: '#task3-country-bar',
      data,
      onCountrySelectExternal: syncFilterToSelection,
    });

    const clearBtn = document.getElementById('filter-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (classFilterRef) classFilterRef.setValue('');
        const yearMin = document.getElementById('filter-year-min');
        const yearMax = document.getElementById('filter-year-max');
        if (yearMin) yearMin.value = '';
        if (yearMax) yearMax.value = '';
        if (countryFilterRef) countryFilterRef.setValue('');
        document.getElementById('map-mode-density').checked = true;
        void MapWrapper.setMode('density');
        MapWrapper.setSelectedClass(null);
        MapWrapper.setYearRange(null, null);
        applyCountryFilter(null);
      });
    }

    const saveBtn = document.getElementById('filter-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => FilterHistory.capture());
    }

    FilterHistory.init((snap) => {
      if (classFilterRef) classFilterRef.setValue(snap.recclass || '');
      const yearMin = document.getElementById('filter-year-min');
      const yearMax = document.getElementById('filter-year-max');
      if (yearMin) yearMin.value = snap.yearMin;
      if (yearMax) yearMax.value = snap.yearMax;
      if (countryFilterRef) countryFilterRef.setValue(snap.country);

      const modeRadio = document.querySelector(
        `input[name='map-mode'][value='${snap.mapMode}']`,
      );
      if (modeRadio) {
        modeRadio.checked = true;
        void MapWrapper.setMode(snap.mapMode || 'density');
      }

      const minVal = snap.yearMin !== '' ? +snap.yearMin : null;
      const maxVal = snap.yearMax !== '' ? +snap.yearMax : null;
      MapWrapper.setYearRange(minVal, maxVal);
      MapWrapper.setSelectedClass(snap.recclass || null);
      applyCountryFilter(snap.country || null);
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

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        MapWrapper.resize();
        Task1.resize();
        Task2.resize();
        Task4.resize();
      }, 200);
    });
  });
});
