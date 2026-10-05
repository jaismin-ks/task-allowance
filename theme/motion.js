// theme/motion.js
// Microinteraction tokens. The Figma Microinteractions page isn't built yet, so
// these are the source of truth: names match the curves referenced on the
// component pages (BOUNCY checkbox pop, GENTLE tab pill, EASE_OUT button nudge).
import { Easing } from 'react-native-reanimated';

export const springs = {
  // Checkbox pop, goal-reached entrance
  BOUNCY: { duration: 450, dampingRatio: 0.45 },
  // Tab pill morph, sheet content, progress fill
  GENTLE: { duration: 550, dampingRatio: 0.85 },
};

export const timings = {
  EASE_OUT: { duration: 200, easing: Easing.out(Easing.cubic) },
  // Every transition collapses to this fade under Reduce Motion
  REDUCED_FADE: { duration: 150, easing: Easing.linear },
  PROGRESS: { duration: 600, easing: Easing.out(Easing.cubic) },
  COUNT_UP_MS: 700,
  PULSE_MS: 1600,
};

export const durations = {
  UNDO_MS: 5000,
  TOAST_MS: 2600,
  SKELETON_DELAY_MS: 150,
  NEW_ROW_HIGHLIGHT_MS: 1000,
  FETCH_SLOW_HINT_MS: 2000,
  VOICE_SILENCE_MS: 5000,
};

export const nudge = { buttonArrow: 6 };
