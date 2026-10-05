// components/RepeatPicker.js
// "Repeat" field for Add/Edit task: Never · Daily · Weekly · Monthly, then weekday
// toggles (weekly) or a day-of-month stepper (monthly). Selection is shown by fill
// AND a ✓ / bold text, never colour alone.
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { describeRule, friendlyDate, nextOccurrence, WEEKDAY_ORDER, WEEKDAYS } from '../lib/recurrence';
import { fonts, radius, size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Chip } from './ui/Chip';
import { Icon } from './ui/Icon';

const FREQUENCIES = [
  ['never', 'Never'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
];

const ordinal = (n) => describeRule({ frequency: 'monthly', monthDay: n }).replace('On the ', '').replace(' of each month', '');

export function RepeatPicker({ rule, onChange, error, note }) {
  const colors = useColors();
  const styles = useStyles();
  const set = (patch) => onChange({ ...rule, ...patch });

  const toggleDay = (day) => {
    haptic.selection();
    const has = rule.weekdays.includes(day);
    set({ weekdays: has ? rule.weekdays.filter((d) => d !== day) : [...rule.weekdays, day] });
  };

  const stepDay = (dir) => {
    const next = Math.min(31, Math.max(1, rule.monthDay + dir));
    set({ monthDay: next });
    AccessibilityInfo.announceForAccessibility(`Day ${next}`);
  };

  const next = rule.frequency !== 'never' && !error ? nextOccurrence(rule) : null;
  const isToday = next && next.toDateString() === new Date().toDateString();
  const base =
    rule.frequency === 'never'
      ? 'Repeat it to have it added to your list automatically.'
      : `${describeRule(rule, { long: true })}.${next ? (isToday ? ' Next one is today.' : ` Next one: ${friendlyDate(next)}.`) : ''}`;
  const helper = note ? `${base} ${note}` : base;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" accessible={false}>Repeat</AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Repeat">
        {FREQUENCIES.map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={rule.frequency === key}
            showAddGlyph={false}
            onPress={() => set({ frequency: key })}
          />
        ))}
      </View>

      {rule.frequency === 'weekly' && (
        <View style={styles.days} accessibilityLabel="Repeat on">
          {WEEKDAY_ORDER.map((d) => {
            const on = rule.weekdays.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDay(d)}
                accessibilityRole="checkbox"
                accessibilityLabel={WEEKDAYS[d].name}
                accessibilityState={{ checked: on }}
                style={[styles.day, on ? styles.dayOn : styles.dayOff, error && !on && styles.dayError]}
              >
                <AppText
                  variant="label"
                  color={on ? colors.onAccent : colors.textMuted}
                  style={on && { fontFamily: fonts.sansSemiBold }}
                  maxFontSizeMultiplier={1.2}
                >
                  {WEEKDAYS[d].short}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      {rule.frequency === 'monthly' && (
        <View style={styles.stepper}>
          <StepButton icon="minus" label="Earlier day" onPress={() => stepDay(-1)} disabled={rule.monthDay <= 1} />
          <View
            style={styles.stepValue}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Day of the month"
            accessibilityValue={{ text: `the ${ordinal(rule.monthDay)}` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => stepDay(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          >
            <AppText variant="caption" color={colors.textMuted}>DAY</AppText>
            <AppText variant="numeric">{ordinal(rule.monthDay)}</AppText>
          </View>
          <StepButton icon="plus" label="Later day" onPress={() => stepDay(1)} disabled={rule.monthDay >= 31} />
        </View>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={16} color={colors.danger} />
          <AppText variant="small" color={colors.danger}>{error}</AppText>
        </View>
      ) : (
        <AppText variant="small" color={colors.textMuted}>{helper}</AppText>
      )}
    </View>
  );
}

function StepButton({ icon, label, onPress, disabled }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.border }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  days: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    minWidth: size.hit,
    height: size.hit,
    borderRadius: size.hit / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.accent },
  dayOff: { borderWidth: 1, borderColor: colors.border },
  dayError: { borderColor: colors.danger },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 4,
    alignSelf: 'flex-start',
  },
  stepValue: { minWidth: 88, alignItems: 'center', paddingHorizontal: 8 },
  step: {
    width: size.hit,
    height: size.hit,
    borderRadius: size.hit / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
