# Meteorite Landing Data Visualization Plan

## Consolidation Implementation Plan

### 1. Map Reduction (Three → One)

The dashboard will use a single main map with two modes instead of three separate maps:

| Mode | Task(s) | Encoding |
|------|---------|----------|
| **Density** | Task 3 (spatial hotspots) | Hexbin heatmap: color = log-scaled count per spatial bin |
| **Points** | Task 5 (mass/class by region) | Points: size = mass (log scale), color = top classes |

A small toggle control switches between modes.

### 2. Dashboard Layout

Single-page layout targeting ~1920×1080 viewport:

```
┌─────────────────────────────────────────────────────────────────────┐
│  FILTERS (compact row)                                               │
│  [Class ▼] [Year range: ____ – ____] [Country ▼] [Map: Density|Points] │
├──────────────────────────────────────┬─────────────────────────────┤
│                                      │  Bar chart: landings by      │
│         MAIN MAP                     │  country (top 12 + Others)   │
│         (Density | Points toggle)    │  ↔ linked to map             │
│                                      ├─────────────────────────────┤
│                                      │  Boxplot: mass by class      │
│                                      │  (Task 1)                    │
├──────────────────────────────────────┴─────────────────────────────┤
│  ┌─────────────────────────────┬─────────────────────────────────┐ │
│  │ Scatterplot: population     │  Temporal charts: bar + stacked  │ │
│  │ density vs landings (Task 2)│  bar, discoveries over time (T4) │ │
│  └─────────────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Space allocation:**

| Region | % width | Purpose |
|--------|---------|---------|
| Filters | 100% | Shared controls |
| Main map | ~60% | Central spatial view |
| Right sidebar | ~40% | Bar chart + boxplot stacked vertically |
| Bottom row | 100% | Scatterplot + temporal charts (50/50) |

### 3. Sizing and Visual Hierarchy

- **Map:** ~600×400 px (or 55–60% of main content area)
- **Bar chart:** ~250×180 px
- **Boxplot:** ~250×150 px
- **Scatterplot:** ~350×180 px
- **Temporal charts:** ~350×180 px (or combined ~400×200 px)

The map is the largest element; supporting charts occupy smaller but readable areas.

### 4. Shared Interactions

- **Filters:** Class, year range, and country apply across all views.
- **Map ↔ bar chart:** Selection on country bar highlights regions on map; selection on map region highlights corresponding country in bar chart.
- **Boxplot:** Selecting a class filters the map and other views to that class.
- **Temporal charts:** Brushing a year range filters all other views.

### 5. Compact Filter Bar

Filters are placed in a single row to minimize vertical space:

```
Class: [Dropdown]  Year: [Range inputs]  Country: [Searchable dropdown]  Map: [Density ○ Points]
```

### Data (Task 3+)

- Primary CSV: `data/meteorite_clean_no_zero_coords.csv` (no Null Island `(0,0)`; coordinates used for maps).
- Hexbin density uses a **log₁p color scale** so hotspots do not flatten the rest of the gradient.

### 6. Implementation Order

1. Build layout structure (flexbox or CSS grid).
2. Implement unified map with Density / Points mode toggle.
3. Add bar chart and wire bidirectional linking with map.
4. Add boxplot, temporal charts, and scatterplot.
5. Implement shared filter logic and cross-view linking.
