// store/poolStore.js
import { create } from 'zustand';
import { sqlite } from '../db/client';
import { getBudgetInfo } from '../db/operations/getBudgetInfo';
import { getPriorityItemProgress } from '../db/operations/getProgress';
import { getCompletionDays, getDailyEarnings } from '../db/operations/stats';
import { getProfile } from '../db/operations/userProfile';
import { computeDailyCap } from '../lib/dailyCap';
import { addDays, dateKey } from '../lib/recurrence';
import { computeStreak, daysToGoal, recentDailyPace } from '../lib/stats';

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
  streak: { current: 0, best: 0, doneToday: false },
  // Days until the goal at the last two weeks' pace; null until there's enough history
  goalEtaDays: null,
  refresh: () => {
    const budget = getBudgetInfo();
    const earnedToday = getEarnedToday();
    const { dailyCap, tierRanges } = computeDailyCap(
      budget.monthlyAllowanceCap,
      budget.totalEarnedThisMonth - earnedToday
    );
    const progress = getPriorityItemProgress();
    const pace = recentDailyPace(getDailyEarnings(dateKey(addDays(new Date(), -13))));
    set({
      profile: getProfile(),
      progress,
      budget,
      earnedToday,
      dailyCap,
      tierRanges,
      overAllowance: budget.totalEarnedThisMonth >= budget.monthlyAllowanceCap,
      streak: computeStreak(getCompletionDays()),
      goalEtaDays: progress?.price != null && !progress.reached ? daysToGoal(progress.remaining, pace) : null,
    });
  },
}));

export const useCurrency = () => usePoolStore((s) => s.budget.currencyCode);
