// components/DayPicker.js
// Add task → Day: Today · Tomorrow · Pick a day. "Today" stores no date (the task
// stays on Today until it's done); a later day keeps it in Coming up and on the
// Calendar until then.
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { addDays, dateKey, friendlyDate, parseDateKey } from '../lib/recurrence';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Chip } from './ui/Chip';

// value: 'YYYY-MM-DD' | null (null = today)
export function DayPicker({ value, onChange }) {
  const colors = useColors();
  const styles = useStyles();
  const todayKey = dateKey();
  const tomorrowKey = dateKey(addDays(new Date(), 1));
  const isToday = !value || value <= todayKey;
  const isTomorrow = value === tomorrowKey;
  const isOther = !isToday && !isTomorrow;
  const [iosPicking, setIosPicking] = useState(false);
  const picked = value ? parseDateKey(value) : new Date();

  const pick = () => {
    if (Platform.OS === 'ios') {
      setIosPicking(true);
      if (!isOther) onChange(dateKey(addDays(new Date(), 2)));
      return;
    }
    DateTimePickerAndroid.open({
      value: isOther ? picked : addDays(new Date(), 2),
      mode: 'date',
      minimumDate: new Date(),
      onValueChange: (_, d) => d && onChange(dateKey(d) === todayKey ? null : dateKey(d)),
    });
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="label" accessible={false}>Day</AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Day">
        <Chip label="Today" selected={isToday} showAddGlyph={false} onPress={() => { setIosPicking(false); onChange(null); }} />
        <Chip label="Tomorrow" selected={isTomorrow} showAddGlyph={false} onPress={() => { setIosPicking(false); onChange(tomorrowKey); }} />
        <Chip
          label={isOther ? friendlyDate(picked) : 'Pick a day'}
          selected={isOther}
          showAddGlyph={false}
          onPress={pick}
          accessibilityLabel={isOther ? `${friendlyDate(picked)}. Change day` : 'Pick a day'}
        />
      </View>
      {Platform.OS === 'ios' && iosPicking && isOther && (
        <DateTimePicker
          mode="date"
          display="inline"
          value={picked}
          minimumDate={new Date()}
          onValueChange={(_, d) => {
            if (!d) return;
            onChange(dateKey(d) === todayKey ? null : dateKey(d));
            setIosPicking(false);
          }}
          themeVariant={colors.mode}
          accentColor={colors.accentText}
        />
      )}
      {!isToday && (
        <AppText variant="small" color={colors.textMuted}>
          Waits in Coming up and on your calendar until {isTomorrow ? 'tomorrow' : friendlyDate(picked)}.
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
