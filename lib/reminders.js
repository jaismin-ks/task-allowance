// lib/reminders.js
// Local notifications only, no server: the optional daily reminder (Settings) and
// optional per-task reminders (Add task → Reminder). useReminderSync (root layout)
// rebuilds both schedules whenever tasks, earnings or the setting change.
import * as Notifications from 'expo-notifications';
// IosAuthorizationStatus / AndroidImportance are real runtime enums, re-exported via
// `export *` from expo-notifications' *.types modules, which eslint-plugin-import can't
// follow — hence the disables.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePoolStore } from '../store/poolStore';
import { useTaskStore } from '../store/taskStore';
import { usePrefs } from './prefs';
import { parseReminderTime, planReminders } from './reminderPlan';
import { planTaskReminders } from './taskReminder';

// eslint-disable-next-line import/namespace
const PROVISIONAL = Notifications.IosAuthorizationStatus.PROVISIONAL;
// eslint-disable-next-line import/namespace
const DEFAULT_IMPORTANCE = Notifications.AndroidImportance.DEFAULT;

const CHANNEL_ID = 'daily-reminder';
const SYNC_DEBOUNCE_MS = 400;

// If a reminder fires while the app is open, the user is already here — stay quiet
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 'granted' | 'denied' | 'undetermined'
export async function getReminderPermission() {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === PROVISIONAL) return 'granted';
    return p.canAskAgain === false || p.status === 'denied' ? 'denied' : 'undetermined';
  } catch {
    return 'denied';
  }
}

// Android 8+ drops notifications sent to a channel that doesn't exist, and
// Android 13+ only shows the permission prompt once a channel exists
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: DEFAULT_IMPORTANCE,
  });
}

// Shows the OS prompt when it hasn't been answered yet; true when allowed
export async function requestReminderPermission() {
  try {
    await ensureChannel();
    const p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return !!p.granted || p.ios?.status === PROVISIONAL;
  } catch {
    return false;
  }
}

// Everything the copy needs, read fresh from the stores
function currentState() {
  const { pending } = useTaskStore.getState();
  const { streak, progress, budget } = usePoolStore.getState();
  return {
    pendingCount: pending.length,
    pendingValue: Math.round(pending.reduce((sum, t) => sum + t.monetaryValue, 0) * 100) / 100,
    doneToday: streak.doneToday,
    streak: streak.current,
    goalTitle: progress?.itemTitle ?? null,
    currency: budget.currencyCode,
  };
}

// Two kinds of scheduled notification, told apart by identifier prefix so each
// sync only replaces its own: the daily nudge and per-task reminders.
const DAILY_PREFIX = 'daily-';
const TASK_PREFIX = 'task-';

async function cancelWithPrefix(prefix) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier?.startsWith(prefix)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

async function syncDaily(granted) {
  await cancelWithPrefix(DAILY_PREFIX);
  const { reminder, reminderTime } = usePrefs.getState();
  if (!reminder || !granted) return;
  const plan = planReminders(parseReminderTime(reminderTime), currentState());
  for (const [i, { date, title, body }] of plan.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${DAILY_PREFIX}${i}`,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

// One notification per pending task with a future reminder. Completing, deleting
// or undoing changes the pending list, which re-runs this, so a done task never
// pings.
async function syncTasks(granted) {
  await cancelWithPrefix(TASK_PREFIX);
  if (!granted) return;
  const { pending, upcoming } = useTaskStore.getState();
  const plan = planTaskReminders([...pending, ...upcoming], usePoolStore.getState().budget.currencyCode);
  for (const { id, date, title, body } of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${TASK_PREFIX}${id}`,
      content: { title, body, data: { taskId: id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

let running = null;
let again = false;

// Cancel and re-plan. Calls that arrive mid-sync collapse into one more pass.
export async function syncReminders() {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        // The task list must be loaded, or "0 tasks" would be a lie (and task
        // reminders would all be cancelled)
        if (!useTaskStore.getState().loaded) continue;
        const granted = (await getReminderPermission()) === 'granted';
        if (granted) await ensureChannel();
        await syncDaily(granted);
        await syncTasks(granted);
      } catch {
        // Best-effort: a failed schedule must never break the app
      }
    } while (again);
  })();
  try {
    await running;
  } finally {
    running = null;
  }
  return undefined;
}

// Root layout: keep the schedule in step with the data, debounced so a burst of
// store updates (complete → refresh → reload) schedules once
export function useReminderSync(ready) {
  useEffect(() => {
    if (!ready) return undefined;
    let timer = null;
    const queue = () => {
      clearTimeout(timer);
      timer = setTimeout(syncReminders, SYNC_DEBOUNCE_MS);
    };
    queue();
    const unsubs = [
      useTaskStore.subscribe(queue),
      usePoolStore.subscribe(queue),
      usePrefs.subscribe((s, prev) => {
        if (s.reminder !== prev.reminder || s.reminderTime !== prev.reminderTime) queue();
      }),
    ];
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, [ready]);
}
