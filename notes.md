## Feedback Summary

### Data & Scaling
- **Null island (0, 0):** Remove from map; encode as "unknown" elsewhere
- **Outliers:** Map is skewed by outliers; filter or encode separately
- **Log scaling:** Consider log-scale for color encoding; think about when to log vs filter for usability
- **Date range:** Don't show data before 1900 or in the future

### Map
- **Color scale:** Consider log scaling for density
- **White space:** Reduce white pixels within charts
- **Aggregation:** Aggregate data points + scaling (e.g. class on map)

### Boxplot
- **Number of boxes:** Show more boxes (3–4, even 10 is fine)
- **Class hierarchy:** Consider hierarchical structures for classes; keep dropdown for classes outside top 10
- **Purpose:** Help users pick and compare more classes

### Bar Charts
- **X scale:** Fix x scale
- **Country bar:** Consider mini legend on the chart to save space
- **Layout:** Sideways bar chart for better information density
- **Others:** Make it clickable to expand/show other countries

### Scatterplot
- Use log scale where appropriate

### Layout & Linking
- **Fit:** All views must fit on screen at once
- **Bidirectional linking:** At least two views must be bidirectionally linked and visible side by side
- **Priority:** Consider reserving bidirectional linking for views where it adds most value (e.g. Vis 4)

### General
- Match visualizations to data characteristics
- Focus on pattern over decade