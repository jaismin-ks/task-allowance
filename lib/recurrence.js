// lib/recurrence.js
// Repeat rules for task_series. Pure functions on local calendar dates — no DB access.
// A rule is { frequency: 'never'|'daily'|'weekly'|'monthly', weekdays: number[], monthDay }.

export const WEEKDAYS = [
  { day: 0, short: 'S', name: 'Sunday', abbr: 'Sun' },
  { day: 1, short: 'M', name: 'Monday', abbr: 'Mon' },
  { day: 2, short: 'T', name: 'Tuesday', abbr: 'Tue' },
  { day: 3, short: 'W', name: 'Wednesday', abbr: 'Wed' },
  { day: 4, short: 'T', name: 'Thursday', abbr: 'Thu' },
  { day: 5, short: 'F', name: 'Friday', abbr: 'Fri' },
  { day: 6, short: 'S', name: 'Saturday', abbr: 'Sat' },
];

// Mon-first display order
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Local 'YYYY-MM-DD' (never toISOString — that's UTC and shifts the day)
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

export const parseWeekdays = (text) =>
  text ? text.split(',').map(Number).filter((n) => n >= 0 && n <= 6) : [];

export function matchesRule(rule, date) {
  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.weekdays.includes(date.getDay());
    case 'monthly':
      // The 31st repeats on the last day of shorter months
      return date.getDate() === Math.min(rule.monthDay, daysInMonth(date));
    default:
      return false;
  }
}

// First matching date on or after `from` (rules always match within ~31 days)
export function nextOccurrence(rule, from = new Date()) {
  if (rule.frequency === 'never') return null;
  for (let i = 0; i < 62; i++) {
    const d = addDays(from, i);
    if (matchesRule(rule, d)) return d;
  }
  return null;
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const listJoin = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// "Every day" · "Every Mon and Thu" · "Every weekday" · "On the 31st of each month"
export function describeRule(rule, { long = false } = {}) {
  if (rule.frequency === 'daily') return 'Every day';
  if (rule.frequency === 'weekly') {
    const days = WEEKDAY_ORDER.filter((d) => rule.weekdays.includes(d));
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Every weekday';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Every weekend';
    return `Every ${listJoin(days.map((d) => (long ? WEEKDAYS[d].name : WEEKDAYS[d].abbr)))}`;
  }
  if (rule.frequency === 'monthly') {
    const base = `On the ${ordinal(rule.monthDay)} of each month`;
    return rule.monthDay > 28 && long ? `${base} (the last day in shorter months)` : base;
  }
  return 'Doesn’t repeat';
}

export const ruleFromSeries = (s) => ({
  frequency: s.frequency,
  weekdays: parseWeekdays(s.weekdays),
  monthDay: s.monthDay ?? 1,
});

export const sameRule = (a, b) =>
  a.frequency === b.frequency &&
  (a.frequency !== 'weekly' || [...a.weekdays].sort().join() === [...b.weekdays].sort().join()) &&
  (a.frequency !== 'monthly' || a.monthDay === b.monthDay);

// Short date for captions: "THU OCT 8"
export function shortDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '').toUpperCase();
}

// Sentence date: "Thu, Oct 8"
export function friendlyDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
