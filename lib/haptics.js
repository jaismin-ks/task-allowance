// lib/haptics.js
// Haptics reinforce, never inform — every call site also has a visible + spoken cue.
import * as Haptics from 'expo-haptics';
import { usePrefs } from './prefs';

const enabled = () => usePrefs.getState().haptics;

export const haptic = {
  selection: () => enabled() && Haptics.selectionAsync().catch(() => {}),
  complete: () =>
    enabled() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    enabled() &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () =>
    enabled() &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
