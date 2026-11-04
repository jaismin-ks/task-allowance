// components/ReminderPicker.js
// Add task → Reminder. One-off tasks pick a date and time; repeating tasks pick a
// time and get reminded on each day they're due. Asking for notification permission
// happens when the reminder is switched on (TaskForm), never on launch.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Linking, Platform, Pressable, View } from 'react-native';
import { describeReminder, describeReminderTime } from '../lib/taskReminder';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { IconButton } from './ui/Headers';
import { Icon } from './ui/Icon';

// value: Date. timeOnly: repeating task (the date part is ignored).
export function ReminderPicker({ value, onChange, onRemove, timeOnly, blocked }) {
  const colors = useColors();
  const styles = useStyles();
  const label = timeOnly
    ? `Each day it’s due, ${describeReminderTime({ hour: value.getHours(), minute: value.getMinutes() })}`
    : describeReminder(value);

  // Android has no combined picker: date first, then time
  const openAndroid = () => {
    const pickTime = (base) =>
      DateTimePickerAndroid.open({
        value: base,
        mode: 'time',
        onValueChange: (_, t) => {
          if (!t) return;
          const next = new Date(base);
          next.setHours(t.getHours(), t.getMinutes(), 0, 0);
          onChange(next);
        },
      });
    if (timeOnly) return pickTime(value);
    return DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate: new Date(),
      onValueChange: (_, d) => {
        if (!d) return;
        const next = new Date(value);
        next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
        pickTime(next);
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <AppText variant="label" accessible={false}>Reminder</AppText>
        <IconButton icon="close" label="Remove reminder" size={18} onPress={onRemove} color={colors.textMuted} />
      </View>
      {Platform.OS === 'ios' ? (
        <View style={styles.row}>
          <Icon name="bell" size={18} color={colors.textMuted} />
          <AppText variant="body" color={colors.textMuted} style={styles.flex} numberOfLines={2}>
            {timeOnly ? 'Each day it’s due' : 'Remind me'}
          </AppText>
          <DateTimePicker
            mode={timeOnly ? 'time' : 'datetime'}
            display="compact"
            value={value}
            minimumDate={timeOnly ? undefined : new Date()}
            onValueChange={(_, d) => d && onChange(d)}
            themeVariant={colors.mode}
            accentColor={colors.accentText}
            accessibilityLabel={`Reminder, ${label}`}
          />
        </View>
      ) : (
        <Pressable
          onPress={openAndroid}
          accessibilityRole="button"
          accessibilityLabel={`Reminder, ${label}. Change`}
          style={({ pressed }) => [styles.row, styles.field, pressed && { backgroundColor: colors.border }]}
        >
          <Icon name="bell" size={18} color={colors.textMuted} />
          <AppText variant="body" style={styles.flex}>{label}</AppText>
          <Icon name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      {blocked && (
        <Pressable onPress={() => Linking.openSettings()} accessibilityRole="link">
          <AppText variant="small" color={colors.warning}>
            Notifications are off for TaskAllowance, so this reminder won’t show. Turn them on in Settings.
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  field: {
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  flex: { flex: 1 },
}));
