// store/poolStore.js
import { create } from 'zustand';
import { sqlite } from '../db/client';
import { getBudgetInfo } from '../db/operations/getBudgetInfo';
import { getPriorityItemProgress } from '../db/operations/getProgress';
import { getProfile } from '../db/operations/userProfile';
import { computeDailyCap } from '../lib/dailyCap';

function getEarnedToday() {
  return (
    sqlite.getFirstSync(
      `SELECT ROUND(COALESCE(SUM(monetary_value), 0), 2) AS earned FROM task
       WHERE completion_status = 'completed'
         AND date(completed_at, 'localtime') = date('now', 'localtime')`
    )?.earned ?? 0
  );
}

// Thin wrapper only — financial totals are never held as running state here.
// `refresh` always re-reads derived values fresh from SQLite.
export const usePoolStore = create((set) => ({
  profile: null,
  progress: null,
  budget: { monthlyAllowanceCap: 0, totalEarnedThisMonth: 0, currencyCode: 'USD' },
  earnedToday: 0,
  // "Daily guide" in the UI. Computed from the start of today (this month's earnings
  // before today) so the suggestion and effort ranges stay steady all day.
  dailyCap: 0,
  tierRanges: [],
  overAllowance: false,
  refresh: () => {
    const budget = getBudgetInfo();
    const earnedToday = getEarnedToday();
    const { dailyCap, tierRanges } = computeDailyCap(
      budget.monthlyAllowanceCap,
      budget.totalEarnedThisMonth - earnedToday
    );
    set({
      profile: getProfile(),
      progress: getPriorityItemProgress(),
      budget,
      earnedToday,
      dailyCap,
      tierRanges,
      overAllowance: budget.totalEarnedThisMonth >= budget.monthlyAllowanceCap,
    });
  },
}));

export const useCurrency = () => usePoolStore((s) => s.budget.currencyCode);
