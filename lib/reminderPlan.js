// lib/reminderPlan.js
// What the daily reminder says and when. Pure (no notifications API), so it's
// testable; lib/reminders.js turns the plan into scheduled local notifications.
//
// Notifications are scheduled ahead with fixed text, so only today's can quote
// live numbers. Later days get a general nudge, and every time the app opens or
// the list changes the whole plan is rebuilt, so the next one shown is current.
import { formatMoney } from './format';

// Days scheduled ahead. Not opening the app for a week lets reminders lapse
// rather than nagging indefinitely.
export const REMINDER_DAYS = 7;
export const DEFAULT_REMINDER_TIME = '18:00';

// "18:00" → { hours: 18, minutes: 0 }; falls back to the default on bad input
export function parseTime(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? ''));
  const hours = m ? Number(m[1]) : NaN;
  const minutes = m ? Number(m[2]) : NaN;
  if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) return { hours, minutes };
  return parseTime(DEFAULT_REMINDER_TIME);
}

export const formatTime = ({ hours, minutes }) => `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

// "6:00 PM" — for Settings copy
export function displayTime(text) {
  const { hours, minutes } = parseTime(text);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function goalLine(progress) {
  if (!progress?.itemTitle || !(progress.price > 0)) return null;
  if (progress.reached) return `You’ve earned enough for ${progress.itemTitle}.`;
  return `You’re ${Math.floor(progress.percentage)}% of the way to ${progress.itemTitle}.`;
}

/**
 * @param now           current time
 * @param time          'HH:MM' reminder time
 * @param pendingCount  tasks still on today's list
 * @param pendingValue  what they're worth together
 * @param progress      getPriorityItemProgress() result or null
 * @param currency      currency code for amounts
 * @returns [{ date, title, body }] — at most REMINDER_DAYS entries, in order
 */
export function buildReminderPlan({ now = new Date(), time, pendingCount, pendingValue, progress, currency }) {
  const { hours, minutes } = parseTime(time);
  const goal = goalLine(progress);
  const plan = [];

  for (let day = 0; day < REMINDER_DAYS; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes);
    if (date <= now) continue; // today's time already passed

    if (day === 0) {
      // Finished (or nothing planned) today → no nudge today
      if (pendingCount <= 0) continue;
      const tasks = `${pendingCount} ${pendingCount === 1 ? 'task' : 'tasks'} left today`;
      const earn = pendingValue > 0 ? `${formatMoney(pendingValue, currency)} still to earn.` : null;
      plan.push({ date, title: tasks, body: [earn, goal].filter(Boolean).join(' ') || 'Tick one off when you’re ready.' });
    } else {
      plan.push({
        date,
        title: 'Time for a task or two',
        body: goal ?? 'Every task you finish adds to what you’ve earned.',
      });
    }
  }
  return plan;
}
