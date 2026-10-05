// lib/taskFilters.js
// Search, filter and sort for the Tasks list. Pure — works on any array of rows
// with { title, monetaryValue, effortRating } (tasks and repeating series alike).

export const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'valueDesc', label: 'Value: high to low' },
  { key: 'valueAsc', label: 'Value: low to high' },
  { key: 'effortDesc', label: 'Effort: high to low' },
  { key: 'effortAsc', label: 'Effort: low to high' },
];

export const DEFAULT_FILTERS = { query: '', sort: 'newest', efforts: [], minValue: null, maxValue: null };

// Case- and accent-insensitive ("cafe" finds "Café")
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const COMPARE = {
  valueDesc: (a, b) => b.monetaryValue - a.monetaryValue,
  valueAsc: (a, b) => a.monetaryValue - b.monetaryValue,
  effortDesc: (a, b) => b.effortRating - a.effortRating,
  effortAsc: (a, b) => a.effortRating - b.effortRating,
};

export function applyTaskFilters(rows, { query, sort, efforts, minValue, maxValue }) {
  // Every word must appear somewhere in the title: "fold lau" finds "Fold laundry"
  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  const out = rows.filter((r) => {
    if (words.length && !words.every((w) => fold(r.title).includes(w))) return false;
    if (efforts.length && !efforts.includes(r.effortRating)) return false;
    if (minValue != null && r.monetaryValue < minValue) return false;
    if (maxValue != null && r.monetaryValue > maxValue) return false;
    return true;
  });
  // Array order is already newest-first; sort is stable, so ties keep that order
  const cmp = COMPARE[sort];
  return cmp ? [...out].sort(cmp) : out;
}

// Filters that narrow the list (search and sort aren't counted — they have their own UI)
export const activeFilterCount = (f) =>
  (f.efforts.length ? 1 : 0) + (f.minValue != null || f.maxValue != null ? 1 : 0);

export const isFiltering = (f) => !!f.query.trim() || activeFilterCount(f) > 0;
