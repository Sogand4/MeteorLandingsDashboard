Revised Task 3:
> {identify, spatial hotspots, (reclat, reclong), derived: count per geolocation bin}
> Users identify geographic regions with high meteorite landing concentration. A hexbinned heatmap encodes count per spatial bin. A linked bar chart shows landing count by country; selecting a country highlights its regions on the map and vice versa. Supporting interactions (year filter, class filter) help isolate patterns in time and type.

Revised Vis 3:
> View 1: A single geographic heatmap. The map is divided into hexbins; each bin’s color encodes the number of landings in that region (sequential color scale from low to high density). No point-level coloring by country.
> View 2: Bar chart of landing count by country (top N + “Others” expandable). Bidirectional linking: selecting a country highlights its bins on the map; brushing or clicking bins highlights the corresponding country.
> Legend: Explains that color = count per spatial bin and that hexbins summarize landing density.
> Conflict avoidance: Country is represented by position (map) and by bar selection, not by color on the map, so the density encoding stays clear.

