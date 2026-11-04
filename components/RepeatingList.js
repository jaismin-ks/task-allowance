// components/RepeatingList.js
// Tasks → "Coming up": one collapsed row for what's ahead — tasks planned for a
// later day, and repeating tasks that aren't on today's list (e.g. a weekly task
// due Thursday). Tap to expand; tap an entry to edit it. The Calendar shows the
// same things day by day.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatMoney, moneyToWords } from '../lib/format';
import { addDays, describeRule, friendlyDate, nextOccurrence, parseDateKey, ruleFromSeries } from '../lib/recurrence';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function RepeatingList({ series, planned = [], currency }) {
  const colors = useColors();
  const styles = useStyles();
  const [open, setOpen] = useState(false);

  // Only what isn't on today's list already (pending, carried over, or done today).
  // Those are reached by long-pressing their row, so listing them again is noise.
  const upcoming = useMemo(
    () =>
      [
        ...planned.map((t) => ({ ...t, kind: 'task', next: parseDateKey(t.dueDate) })),
        ...series
          .filter((s) => !s.hasPending && !s.dueToday)
          .map((s) => {
            const rule = ruleFromSeries(s);
            return { ...s, kind: 'series', rule, next: nextOccurrence(rule, addDays(new Date(), 1)) };
          }),
      ].sort((a, b) => (a.next?.getTime() ?? Infinity) - (b.next?.getTime() ?? Infinity)),
    [series, planned]
  );
  if (!upcoming.length) return null;

  const first = upcoming[0];
  const summary = `${first.title}${first.next ? ` · ${friendlyDate(first.next)}` : ''}`;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Coming up, ${upcoming.length} ${upcoming.length === 1 ? 'task' : 'tasks'}. Next: ${summary}`}
        style={({ pressed }) => [styles.header, pressed && { backgroundColor: colors.surfaceRaised }]}
      >
        <View style={styles.icon}>
          <Icon name="repeat" size={18} color={colors.textMuted} />
        </View>
        <View style={styles.body}>
          <AppText variant="label">Coming up</AppText>
          {!open && (
            <AppText variant="small" color={colors.textMuted} numberOfLines={1}>
              Next: {summary}
            </AppText>
          )}
        </View>
        <AppText variant="numeric" color={colors.textMuted}>{upcoming.length}</AppText>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>

      {open &&
        upcoming.map((s) => {
          const isTask = s.kind === 'task';
          const schedule = isTask ? 'Planned' : describeRule(s.rule);
          return (
            <Pressable
              key={`${s.kind}-${s.id}`}
              onPress={() => router.push(isTask ? `/task/${s.id}` : `/task/series/${s.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}, ${moneyToWords(s.monetaryValue, currency)}, ${schedule}${s.next ? `, ${isTask ? '' : 'next '}${friendlyDate(s.next)}` : ''}`}
              accessibilityHint={isTask ? 'Edit task' : 'Edit repeating task'}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
            >
              <View style={styles.body}>
                <AppText variant="body">{s.title}</AppText>
                <AppText variant="small" color={colors.textMuted}>
                  {isTask ? friendlyDate(s.next) : `${schedule}${s.next ? ` · next ${friendlyDate(s.next)}` : ''}`}
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
  section: { gap: 4, marginTop: 8 },
  header: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingVertical: 8,
    paddingLeft: 52,
    paddingRight: 14,
    borderRadius: radius.md,
  },
  icon: { width: 28, alignItems: 'center' },
  body: { flex: 1, gap: 2 },
}));
