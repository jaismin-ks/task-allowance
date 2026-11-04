// lib/calendar.js
// Month grid + what lands on each day. Pure: rows come from
// db/operations/calendar.js, future repeats are worked out from each series' rule
// (occurrence rows only exist up to today).
import { addDays, dateKey, matchesRule, parseDateKey, ruleFromSeries } from './recurrence';

// Monday first, matching the repeat picker
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // days before the 1st in the first row
  const start = addDays(first, -offset);
  const last = new Date(year, month + 1, 0);
  const weeks = Math.ceil((offset + last.getDate()) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (__, d) => {
      const date = addDays(start, w * 7 + d);
      return { date, key: dateKey(date), inMonth: date.getMonth() === month };
    })
  );
}

// Repeats that will come due after today, inside [fromKey, toKey]
export function futureRepeats(series, fromKey, toKey, todayKey) {
  const out = {};
  const startKey = fromKey > todayKey ? fromKey : dateKey(addDays(parseDateKey(todayKey), 1));
  if (startKey > toKey) return out;
  for (const s of series) {
    if (!s.active) continue;
    const rule = ruleFromSeries(s);
    for (let d = parseDateKey(startKey); dateKey(d) <= toKey; d = addDays(d, 1)) {
      const key = dateKey(d);
      if (key < s.startDate || !matchesRule(rule, d)) continue;
      (out[key] ??= []).push({
        seriesId: s.id,
        title: s.title,
        monetaryValue: s.monetaryValue,
        effortRating: s.effortRating,
        kind: 'repeat',
      });
    }
  }
  return out;
}

const emptyDay = () => ({ done: [], todo: [], missed: [], repeats: [], earned: 0 });

// rows: { done, todo, missed } from getCalendarRange; series: active series.
// Undated pending tasks belong to today. → { [dayKey]: { done, todo, missed, repeats, earned } }
export function buildDays({ done, todo, missed }, series, fromKey, toKey, todayKey) {
  const days = {};
  const day = (key) => (days[key] ??= emptyDay());
  for (const t of done) {
    const d = day(t.day);
    d.done.push(t);
    d.earned = Math.round((d.earned + t.monetaryValue) * 100) / 100;
  }
  for (const t of todo) {
    const key = t.dueDate ?? todayKey;
    // An undated or overdue task is still "to do" — it shows on today, not in the past
    const shownOn = key < todayKey ? todayKey : key;
    if (shownOn >= fromKey && shownOn <= toKey) day(shownOn).todo.push(t);
  }
  for (const t of missed) day(t.dueDate).missed.push(t);
  for (const [key, list] of Object.entries(futureRepeats(series, fromKey, toKey, todayKey))) {
    day(key).repeats.push(...list);
  }
  return days;
}
