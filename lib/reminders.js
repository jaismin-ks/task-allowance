// lib/reminders.js
// Daily reminder: local notifications only, no server. Settings turns it on and
// picks the time; useReminderSync (root layout) rebuilds the schedule from
// lib/reminderPlan.js whenever tasks, earnings or the setting change.
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePoolStore } from '../store/poolStore';
import { useTaskStore } from '../store/taskStore';
import { usePrefs } from './prefs';
import { parseReminderTime, planReminders } from './reminderPlan';

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
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
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
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Shows the OS prompt when it hasn't been answered yet; true when allowed
export async function requestReminderPermission() {
  try {
    await ensureChannel();
    const p = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return !!p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
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
    pendingValue: pending.reduce((sum, t) => sum + t.monetaryValue, 0),
    doneToday: streak.doneToday,
    streak: streak.current,
    goalTitle: progress?.itemTitle ?? null,
    currency: budget.currencyCode,
  };
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
        await Notifications.cancelAllScheduledNotificationsAsync();
        const { reminder, reminderTime } = usePrefs.getState();
        if (!reminder || (await getReminderPermission()) !== 'granted') continue;
        // The task list must be loaded, or "0 tasks" would be a lie
        if (!useTaskStore.getState().loaded) continue;
        await ensureChannel();
        const plan = planReminders(parseReminderTime(reminderTime), currentState());
        for (const { date, title, body } of plan) {
          await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
          });
        }
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
