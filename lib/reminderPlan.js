// lib/reminderPlan.js
// What the daily reminder says and when. Pure, so the copy rules are testable.
// Notifications are scheduled as one-off dates for the next few days, rebuilt
// whenever the app's data changes. That lets today's reminder carry real
// numbers, and lets it stay quiet once everything is done.
import { formatMoney } from './format';
import { addDays } from './recurrence';

// After this many days without opening the app, reminders stop on their own.
// A nudge is welcome; a daily ping to someone who's moved on isn't.
export const REMINDER_WINDOW_DAYS = 7;

export const DEFAULT_REMINDER_TIME = '19:00';

// '19:00' → { hour: 19, minute: 0 }; anything malformed falls back to the default
export function parseReminderTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? ''));
  const hour = m ? Number(m[1]) : NaN;
  const minute = m ? Number(m[2]) : NaN;
  if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) {
    return parseReminderTime(DEFAULT_REMINDER_TIME);
  }
  return { hour, minute };
}

export const formatReminderTime = ({ hour, minute }) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

// "7:00 PM" in the phone's own 12/24-hour style
export function displayReminderTime({ hour, minute }) {
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const tasksWord = (n) => `${n} ${n === 1 ? 'task' : 'tasks'}`;

// state: { pendingCount, pendingValue, doneToday, streak, goalTitle, currency }
// → [{ date, title, body }] oldest first
export function planReminders(time, state, now = new Date()) {
  const { pendingCount = 0, pendingValue = 0, doneToday = false, streak = 0, goalTitle, currency = 'USD' } = state;
  const toward = goalTitle ? ` toward ${goalTitle}` : '';
  const toEarn = `${formatMoney(pendingValue, currency)} to earn${toward}.`;
  const out = [];

  for (let i = 0; i < REMINDER_WINDOW_DAYS; i++) {
    const day = addDays(now, i);
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute);
    if (date <= now) continue;

    if (i === 0) {
      // Everything done today: say nothing
      if (doneToday && pendingCount === 0) continue;
      if (pendingCount === 0) {
        out.push({ date, title: 'Nothing on today’s list', body: `Add a task and start earning${toward}.` });
      } else if (!doneToday && streak > 0) {
        out.push({ date, title: `Keep your ${streak}-day streak`, body: `${tasksWord(pendingCount)} waiting · ${toEarn}` });
      } else if (doneToday) {
        out.push({ date, title: `${tasksWord(pendingCount)} left today`, body: toEarn });
      } else {
        out.push({ date, title: `${tasksWord(pendingCount)} waiting`, body: toEarn });
      }
      continue;
    }

    // Later days: the pending list carries over until the app is opened again
    out.push(
      pendingCount > 0
        ? { date, title: `${tasksWord(pendingCount)} waiting`, body: toEarn }
        : { date, title: 'Time to earn', body: `Add a task and check it off${toward}.` }
    );
  }
  return out;
}
