// components/ReminderSettings.js
// Settings → Reminder: on/off + time. Turning it on asks for notification
// permission at that moment (never on launch). If the OS says no, the toggle
// stays off and a banner points to the phone's Settings.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { usePrefs } from '../lib/prefs';
import { displayReminderTime, formatReminderTime, parseReminderTime } from '../lib/reminderPlan';
import { getReminderPermission, requestReminderPermission } from '../lib/reminders';
import { showToast } from '../store/uiStore';
import { makeStyles, useColors } from '../theme/theme';
import { SettingsRow } from './SettingsList';
import { Banner } from './ui/Banner';
import { Toggle } from './ui/Toggle';

export function ReminderSettings() {
  const colors = useColors();
  const styles = useStyles();
  const { reminder, setReminder, reminderTime, setReminderTime } = usePrefs();
  const [blocked, setBlocked] = useState(false);
  const time = parseReminderTime(reminderTime);
  const shown = displayReminderTime(time);
  const asDate = new Date(2026, 0, 1, time.hour, time.minute);

  // Re-check on focus and whenever the app comes back (e.g. from the phone's
  // Settings via the banner): permission may have been revoked, or granted, in
  // which case the reminder the user asked for switches on by itself
  const wanted = reminder || blocked;
  useFocusEffect(
    useCallback(() => {
      if (!wanted) return undefined;
      let live = true;
      const check = () =>
        getReminderPermission().then((p) => {
          if (!live) return;
          setBlocked(p !== 'granted');
          if (p === 'granted') setReminder(true);
        });
      check();
      const sub = AppState.addEventListener('change', (next) => next === 'active' && check());
      return () => {
        live = false;
        sub.remove();
      };
    }, [wanted, setReminder])
  );

  const toggle = async (on) => {
    if (!on) {
      setReminder(false);
      setBlocked(false);
      return;
    }
    const granted = (await getReminderPermission()) === 'granted' || (await requestReminderPermission());
    setBlocked(!granted);
    if (granted) {
      setReminder(true);
      showToast(`Reminder set for ${shown}.`);
    }
  };

  const pickTime = (date) => {
    if (!date) return;
    setReminderTime(formatReminderTime({ hour: date.getHours(), minute: date.getMinutes() }));
  };

  return (
    <>
      <SettingsRow
        label="Daily reminder"
        helper={
          reminder && !blocked
            ? `Every day at ${shown}, with what’s left to earn. Quiet once you’re done for the day.`
            : 'A nudge at a time you pick, with what’s left to earn.'
        }
        last={!reminder && !blocked}
        right={
          <Toggle
            value={reminder && !blocked}
            onValueChange={toggle}
            accessibilityLabel="Daily reminder"
            accessibilityHint={`A notification at ${shown} with what’s left to earn.`}
          />
        }
      />

      {reminder && !blocked && (
        Platform.OS === 'ios' ? (
          <SettingsRow
            label="Time"
            last
            right={
              <DateTimePicker
                mode="time"
                display="compact"
                value={asDate}
                onValueChange={(_, date) => pickTime(date)}
                themeVariant={colors.mode}
                accentColor={colors.accentText}
                accessibilityLabel={`Reminder time, ${shown}`}
              />
            }
          />
        ) : (
          <SettingsRow
            label="Time"
            value={shown}
            last
            accessibilityLabel={`Reminder time, ${shown}`}
            onPress={() =>
              DateTimePickerAndroid.open({ value: asDate, mode: 'time', onValueChange: (_, date) => pickTime(date) })
            }
          />
        )
      )}

      {blocked && (
        <View style={styles.banner}>
          <Banner
            tone="warning"
            body="Notifications are off for TaskAllowance. Turn them on in your phone’s Settings to get reminders."
            actions={[{ label: 'Open Settings', primary: true, onPress: () => Linking.openSettings() }]}
            onDismiss={() => {
              setBlocked(false);
              setReminder(false);
            }}
          />
        </View>
      )}
    </>
  );
}

const useStyles = makeStyles(() => ({
  banner: { padding: 12 },
}));
