// lib/stats.js
// Streaks, goal ETA and per-day series for Activity. Pure — inputs are local
// 'YYYY-MM-DD' day keys and amounts already read from SQLite.
import { addDays, dateKey } from './recurrence';

// Current and best run of consecutive days with at least one completed task.
// A streak stays alive through today until midnight: if nothing is done yet
// today, it counts back from yesterday.
export function computeStreak(dayKeys, today = new Date()) {
  const days = new Set(dayKeys);
  const todayKey = dateKey(today);
  const doneToday = days.has(todayKey);

  let current = 0;
  for (let d = doneToday ? today : addDays(today, -1); days.has(dateKey(d)); d = addDays(d, -1)) {
    current += 1;
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of [...days].sort()) {
    run = prev && dateKey(addDays(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    const [y, m, d] = key.split('-').map(Number);
    prev = new Date(y, m - 1, d);
  }

  return { current, best: Math.max(best, current), doneToday };
}

const PACE_WINDOW_DAYS = 14;
const MIN_ACTIVE_DAYS = 3;

// Average earned per day over the last two weeks (counting quiet days as zero),
// or null until there's enough history to say anything honest.
export function recentDailyPace(daily, today = new Date()) {
  const from = dateKey(addDays(today, -(PACE_WINDOW_DAYS - 1)));
  const window = daily.filter((d) => d.day >= from && d.day <= dateKey(today) && d.earned > 0);
  if (window.length < MIN_ACTIVE_DAYS) return null;
  // Someone who started 5 days ago averages over 5 days, not 14
  const first = window.reduce((min, d) => (d.day < min ? d.day : min), window[0].day);
  const [y, m, d] = first.split('-').map(Number);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const span = Math.round((midnight - new Date(y, m - 1, d)) / 86400000) + 1;
  const total = window.reduce((sum, row) => sum + row.earned, 0);
  return total / Math.min(PACE_WINDOW_DAYS, Math.max(span, 1));
}

// Whole days until `remaining` is earned at `pace` per day; null when unknown
export function daysToGoal(remaining, pace) {
  if (!(remaining > 0)) return 0;
  if (!(pace > 0)) return null;
  return Math.ceil(remaining / pace);
}

// "about 12 days" · "about 3 weeks" · "about 2 months" — deliberately loose
export function describeEta(days) {
  if (days == null) return null;
  if (days <= 1) return 'about a day';
  if (days < 14) return `about ${days} days`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

// The last `n` days ending today, oldest first, with zero for quiet days
export function lastNDays(daily, n = 7, today = new Date()) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - (n - 1));
    const key = dateKey(date);
    return { day: key, date, earned: byDay.get(key)?.earned ?? 0, count: byDay.get(key)?.count ?? 0 };
  });
}
