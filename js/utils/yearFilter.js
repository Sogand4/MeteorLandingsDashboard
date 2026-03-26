/*
    Removes outliers and incomplete data by filtering the appropriate range for year
*/

export default function FilterOutlierYears(data) {
  return data.filter((d) => d.year >= 1960 && d.year <= 2009);
}
