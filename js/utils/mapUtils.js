/**
 * Task 3 – Shared data utilities
 * Used by Task3Map and CountryLandingsBarChart to avoid duplication.
 */
const mapUtils = {
  /** Remove number suffix (e.g. " 001") and parenthesized year (e.g. " (2003)") from meteorite names */
  cleanMeteoriteName(name) {
    if (!name || typeof name !== "string") return "";
    return name
      .replace(/\s+\d{2,}$/, "") // trailing space + 2+ digits: "Acfer 001" -> "Acfer"
      .replace(/\s+\d+$/, "")     // trailing space + digits: "XYZ 1" -> "XYZ"
      .replace(/\s*\(\d{4}\)\s*$/, "") // parenthesized year: "Boumdeid (2003)" -> "Boumdeid"
      .trim();
  },

  /** Longitude outside [-180,180] causes projection issues. Normalize for display. */
  normalizeLon(lon) {
    if (lon == null || isNaN(lon)) return lon;
    if (lon > 180) return lon - 360;
    if (lon < -180) return lon + 360;
    return lon;
  },

  /** Filter rows with valid reclat/reclong for mapping. */
  hasValidCoords(d) {
    return (
      d.reclat != null &&
      !isNaN(d.reclat) &&
      d.reclong != null &&
      !isNaN(d.reclong)
    );
  },

  /** Filter rows with non-empty country. */
  hasCountry(d) {
    return d.country != null && String(d.country).trim() !== "";
  },

  /** Loads and returns world country features from the CDN, or null on failure. */
  async loadWorldMap() {
  try {
    const world = await d3.json(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );
    return topojson.feature(world, world.objects.countries).features;
  } catch (e) {
    console.warn("Could not load world map:", e);
    return null;
  }
},
};
