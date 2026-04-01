/*
    Sort and return data based on recclass frequency
*/
export function getRankedRecclasses(data, filter = () => true) {
  return d3.rollups(
    data.filter(filter),
    (v) => v.length,
    (d) => d.recclass || 'Unknown',
  )
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);
}

/*
    Return only the top N recclass categories from the data, based on their frequency.
*/
export function getTopRecclasses(data, topN, filter = () => true) {
  return getRankedRecclasses(data, filter).slice(0, topN);
}
