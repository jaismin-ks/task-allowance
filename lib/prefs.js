// lib/prefs.js
// Device-only preferences (Haptics, Motion, Appearance, Reminder) plus small UI flags. The spec suggests
// MMKV; expo-sqlite's kv-store gives the same synchronous API without adding a
// native module, so the app keeps running in Expo Go. Profile fields
// (name, allowance, currency, voice input) live in user_profile, not here.
import Storage from 'expo-sqlite/kv-store';
import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';
import { create } from 'zustand';

const read = (key, fallback) => {
  try {
    return Storage.getItemSync(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    Storage.setItemSync(key, value);
  } catch {
    // Preferences are best-effort; the in-memory value still applies this session
  }
};

export const usePrefs = create((set) => ({
  haptics: read('pref.haptics', '1') === '1',
  motion: read('pref.motion', 'system'), // 'system' | 'reduced' | 'full'
  appearance: read('pref.appearance', 'system'), // 'system' | 'light' | 'dark'
  accent: read('pref.accent', 'lime'), // see theme/palettes.js ACCENTS
  reminder: read('pref.reminder', '0') === '1', // daily reminder notification on/off
  reminderTime: read('pref.reminderTime', '19:00'), // local 'HH:MM'
  setHaptics: (on) => {
    write('pref.haptics', on ? '1' : '0');
    set({ haptics: on });
  },
  setMotion: (motion) => {
    write('pref.motion', motion);
    set({ motion });
  },
  setAppearance: (appearance) => {
    write('pref.appearance', appearance);
    set({ appearance });
  },
  setAccent: (accent) => {
    write('pref.accent', accent);
    set({ accent });
  },
  setReminder: (on) => {
    write('pref.reminder', on ? '1' : '0');
    set({ reminder: on });
  },
  setReminderTime: (reminderTime) => {
    write('pref.reminderTime', reminderTime);
    set({ reminderTime });
  },
}));

// True when animations should collapse to 150ms fades: OS Reduce Motion
// (under "Match system") or the in-app "Reduced" override.
export function useReducedMotion() {
  const system = useSystemReducedMotion();
  const motion = usePrefs((s) => s.motion);
  if (motion === 'reduced') return true;
  if (motion === 'full') return false;
  return system;
}

// One-off flags (e.g. which goal already showed the celebration)
export const flags = {
  get: (key) => read(`flag.${key}`, null),
  set: (key, value) => write(`flag.${key}`, String(value)),
  clearAll: () => {
    try {
      Storage.clearSync();
    } catch {
      // ignore
    }
  },
};
