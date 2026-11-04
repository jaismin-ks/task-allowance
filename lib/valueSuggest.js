// lib/valueSuggest.js
// What a task is worth, filled in automatically so the user only picks a difficulty.
//
// Goal: if you keep doing your usual amount of tasks, you earn the daily guide
// every day — and so your whole monthly allowance by the end of the month.
//
//   value = effort points × (daily guide ÷ your usual effort points per day)
//
// Effort points use the architecture doc's 1:2:3:5:8 weights. "Usual points per
// day" comes from the last two weeks of completed tasks (quiet days count as zero),
// with a sensible default until there's enough history. The daily guide already
// re-spreads what's left of the allowance over the days left, so values rise a bit
// when you're behind and ease off when you're ahead. Pure — no SQLite.
import { addDays, dateKey } from './recurrence';

export const EFFORT_POINTS = [1, 2, 3, 5, 8];

// About a Tiny + Quick + Steady + Hard task a day, until we've seen real days
export const DEFAULT_POINTS_PER_DAY = 10;

const WINDOW_DAYS = 14;
const MIN_ACTIVE_DAYS = 3;

export const effortPoints = (level) => EFFORT_POINTS[Math.min(5, Math.max(1, level)) - 1];

// rows: [{ day: 'YYYY-MM-DD', points }] of completed effort points per local day.
// Looks at the 14 days before today: today is still in progress and would drag
// the average down.
export function usualPointsPerDay(rows, today = new Date()) {
  const from = dateKey(addDays(today, -WINDOW_DAYS));
  const todayKey = dateKey(today);
  const active = rows.filter((r) => r.day >= from && r.day < todayKey && r.points > 0);
  if (active.length < MIN_ACTIVE_DAYS) return DEFAULT_POINTS_PER_DAY;
  // Someone who started 5 days ago averages over those 5 days, not 14
  const first = active.reduce((min, r) => (r.day < min ? r.day : min), active[0].day);
  const [y, m, d] = first.split('-').map(Number);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const span = Math.min(WINDOW_DAYS, Math.round((midnight - new Date(y, m - 1, d)) / 86400000));
  const total = active.reduce((sum, r) => sum + r.points, 0);
  // Never let one unusual fortnight swing prices wildly
  return Math.min(40, Math.max(3, total / Math.max(span, 1)));
}

// Friendly amounts: 5¢ steps under $1, 25¢ under $10, 50¢ above. Never below 5¢.
export function roundNice(amount) {
  if (!(amount > 0)) return 0.05;
  const step = amount < 1 ? 0.05 : amount < 10 ? 0.25 : 0.5;
  const rounded = Math.round(amount / step) * step;
  return Math.min(999.99, Math.max(0.05, Math.round(rounded * 100) / 100));
}

export function suggestTaskValue({ dailyGuide, pointsPerDay = DEFAULT_POINTS_PER_DAY, effort }) {
  const perPoint = (dailyGuide > 0 ? dailyGuide : 0) / (pointsPerDay > 0 ? pointsPerDay : DEFAULT_POINTS_PER_DAY);
  return roundNice(perPoint * effortPoints(effort));
}

// Soft warning (spec §6.3) once a value is well above the suggestion. Never blocks.
export const isWellAboveSuggestion = (value, suggested) => value > suggested * 2 + 0.005;
