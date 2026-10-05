// store/taskFilterStore.js
// Tasks list search / filter / sort. The filter sheet edits this live, so the
// "Show N tasks" count is always real. Session-only: a fresh launch shows everything.
import { create } from 'zustand';
import { DEFAULT_FILTERS } from '../lib/taskFilters';

export const useTaskFilters = create((set) => ({
  ...DEFAULT_FILTERS,
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  toggleEffort: (level) =>
    set((s) => ({
      efforts: s.efforts.includes(level) ? s.efforts.filter((l) => l !== level) : [...s.efforts, level],
    })),
  setValueRange: (minValue, maxValue) => set({ minValue, maxValue }),
  // Clears filters + sort; leaves the search text alone (it has its own ✕)
  resetFilters: () =>
    set({ sort: DEFAULT_FILTERS.sort, efforts: [], minValue: null, maxValue: null }),
  clearAll: () => set({ ...DEFAULT_FILTERS }),
}));
