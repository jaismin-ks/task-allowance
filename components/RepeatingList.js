// components/RepeatingList.js
// Tasks → "Repeating": every active repeating task with its schedule and next date,
// so a weekly task that isn't due today is still visible and editable.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatMoney, moneyToWords } from '../lib/format';
import { addDays, describeRule, friendlyDate, nextOccurrence, ruleFromSeries, shortDate } from '../lib/recurrence';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function RepeatingList({ series, currency }) {
  const colors = useColors();
  const styles = useStyles();
  if (!series.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="h2" accessibilityRole="header">Repeating</AppText>
        <AppText variant="numeric" color={colors.textMuted}>{series.length}</AppText>
      </View>
      {series.map((s) => {
        const rule = ruleFromSeries(s);
        // Today's copy already exists (pending or done) → the next one is after today
        const next = nextOccurrence(rule, s.dueToday ? addDays(new Date(), 1) : new Date());
        const schedule = describeRule(rule);
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push(`/task/series/${s.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}, ${moneyToWords(s.monetaryValue, currency)}, ${schedule}${next ? `, next ${friendlyDate(next)}` : ''}`}
            accessibilityHint="Edit repeating task"
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
          >
            <View style={styles.icon}>
              <Icon name="repeat" size={18} color={colors.textMuted} />
            </View>
            <View style={styles.body}>
              <AppText variant="label">{s.title}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {schedule.toUpperCase()}
                {next ? ` · NEXT ${shortDate(next)}` : ''}
              </AppText>
            </View>
            <AppText variant="numeric" color={colors.textMuted}>{formatMoney(s.monetaryValue, currency)}</AppText>
            <Icon name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  section: { gap: 10, marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  icon: { width: 28, alignItems: 'center' },
  body: { flex: 1, gap: 4 },
}));
