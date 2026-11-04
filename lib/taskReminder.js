// lib/taskReminder.js
// Optional per-task reminders. Stored as a local wall-clock time, 'YYYY-MM-DDTHH:MM'
// (no time zone: "6 PM" means 6 PM wherever the phone is). Pure — the scheduling
// lives in lib/reminders.js.
import { formatMoney } from './format';
import { addDays, dateKey } from './recurrence';

// iOS keeps at most 64 pending local notifications per app; the daily reminder uses 7
export const MAX_TASK_REMINDERS = 50;

const pad = (n) => String(n).padStart(2, '0');

export function toRemindAt(date) {
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseRemindAt(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(text ?? ''));
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

export const toRemindTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function parseRemindTime(text) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(text ?? ''));
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

// First suggestion when you switch a reminder on: the next whole hour, at least
// 30 minutes away; late at night that's tomorrow at 9 AM
export function defaultReminderDate(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
  if (d - now < 30 * 60000) d.setHours(d.getHours() + 1);
  if (d.getHours() >= 22 || d.getDate() !== now.getDate()) {
    const t = addDays(now, 1);
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 9, 0);
  }
  return d;
}

const timeText = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// "Today, 6:00 PM" · "Tomorrow, 9:00 AM" · "Thu, Nov 12, 6:00 PM"
export function describeReminder(date, now = new Date()) {
  if (!date) return null;
  const key = dateKey(date);
  if (key === dateKey(now)) return `Today, ${timeText(date)}`;
  if (key === dateKey(addDays(now, 1))) return `Tomorrow, ${timeText(date)}`;
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day}, ${timeText(date)}`;
}

export const describeReminderTime = ({ hour, minute }) => timeText(new Date(2026, 0, 1, hour, minute));

// tasks: pending rows with { id, title, monetaryValue, notes, remindAt }
// → [{ id, date, title, body }] soonest first, future only, capped
export function planTaskReminders(tasks, currency, now = new Date()) {
  return tasks
    .map((t) => ({ t, date: parseRemindAt(t.remindAt) }))
    .filter(({ date }) => date && date > now)
    .sort((a, b) => a.date - b.date)
    .slice(0, MAX_TASK_REMINDERS)
    .map(({ t, date }) => {
      const note = t.notes?.trim().split('\n')[0];
      return {
        id: t.id,
        date,
        title: t.title,
        body: note ? `${note.slice(0, 120)} · worth ${formatMoney(t.monetaryValue, currency)}` : `Worth ${formatMoney(t.monetaryValue, currency)}.`,
      };
    });
}
