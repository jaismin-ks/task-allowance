// app/calendar.js — Calendar: each day's tasks at a glance, and planning ahead.
// Month grid (Monday first) with dots: filled = done, hollow = to do / due. Tap a
// day for its list: what you did and earned, what's planned, repeats due, and
// repeats that were missed. Tap a task to edit it; "Add a task for this day" plans
// one ahead. Read-only otherwise — ticking things off happens on Tasks.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { IconButton, PushHeader } from '../components/ui/Headers';
import { Icon } from '../components/ui/Icon';
import { getCalendarRange } from '../db/operations/calendar';
import { listActiveSeries } from '../db/operations/recurring';
import { buildDays, monthGrid } from '../lib/calendar';
import { formatMoney, moneyToWords } from '../lib/format';
import { haptic } from '../lib/haptics';
import { dateKey, parseDateKey, WEEKDAY_ORDER, WEEKDAYS } from '../lib/recurrence';
import { usePoolStore } from '../store/poolStore';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

const longDay = (key) =>
  parseDateKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function CalendarScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const todayKey = dateKey();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(todayKey);
  const [version, setVersion] = useState(0);

  // Re-read when coming back from editing or adding a task
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []));

  const grid = useMemo(() => monthGrid(month.year, month.month), [month]);
  const days = useMemo(() => {
    const from = grid[0][0].key;
    const to = grid[grid.length - 1][6].key;
    return buildDays(getCalendarRange(from, to), listActiveSeries(), from, to, todayKey);
    // `version` re-reads after edits elsewhere
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, todayKey, version]);

  const shift = (delta) => {
    haptic.selection();
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goToday = () => {
    const d = new Date();
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(todayKey);
  };

  const title = new Date(month.year, month.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const day = days[selected] ?? { done: [], todo: [], missed: [], repeats: [], earned: 0 };
  const isPast = selected < todayKey;
  const nothing = !day.done.length && !day.todo.length && !day.missed.length && !day.repeats.length;
  const money = (n, opts) => formatMoney(n, currency, opts);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} collapsable={false}>
      <PushHeader title="Calendar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.monthRow}>
          <IconButton icon="chevron-left" label="Previous month" onPress={() => shift(-1)} />
          <Pressable onPress={goToday} accessibilityRole="button" accessibilityHint="Go to today" style={styles.monthTitle}>
            <AppText variant="h2" accessibilityRole="header">{title}</AppText>
          </Pressable>
          <IconButton icon="chevron-right" label="Next month" onPress={() => shift(1)} />
        </View>

        <View style={styles.weekRow} accessible={false} importantForAccessibility="no-hide-descendants">
          {WEEKDAY_ORDER.map((d) => (
            <AppText key={d} variant="caption" color={colors.textMuted} style={styles.weekday}>
              {WEEKDAYS[d].abbr.slice(0, 2).toUpperCase()}
            </AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((week) => (
            <View key={week[0].key} style={styles.weekRow}>
              {week.map((cell) => {
                const info = days[cell.key];
                const doneCount = info?.done.length ?? 0;
                const toDo = (info?.todo.length ?? 0) + (info?.repeats.length ?? 0);
                const isToday = cell.key === todayKey;
                const isSelected = cell.key === selected;
                const label =
                  `${longDay(cell.key)}` +
                  (doneCount ? `, ${doneCount} done` : '') +
                  (toDo ? `, ${toDo} to do` : '') +
                  (isToday ? ', today' : '');
                return (
                  <Pressable
                    key={cell.key}
                    onPress={() => {
                      setSelected(cell.key);
                      if (!cell.inMonth) setMonth({ year: cell.date.getFullYear(), month: cell.date.getMonth() });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isSelected }}
                    style={styles.cell}
                  >
                    <View
                      style={[
                        styles.dayNum,
                        isToday && styles.today,
                        isSelected && styles.selected,
                      ]}
                    >
                      <AppText
                        variant="label"
                        color={isSelected ? colors.onAccent : cell.inMonth ? colors.text : colors.textMuted}
                        style={!cell.inMonth && styles.outside}
                      >
                        {cell.date.getDate()}
                      </AppText>
                    </View>
                    <View style={styles.dots}>
                      {doneCount > 0 && <View style={[styles.dot, { backgroundColor: colors.accentText }]} />}
                      {toDo > 0 && <View style={[styles.dot, styles.hollow]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend} accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={[styles.dot, { backgroundColor: colors.accentText }]} />
          <AppText variant="small" color={colors.textMuted}>Done</AppText>
          <View style={[styles.dot, styles.hollow, styles.legendGap]} />
          <AppText variant="small" color={colors.textMuted}>To do</AppText>
        </View>

        <View style={styles.dayCard}>
          <View style={styles.dayHead}>
            <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
              {selected === todayKey ? 'Today' : longDay(selected)}
            </AppText>
            {day.earned > 0 && (
              <AppText variant="numeric" color={colors.accentText} accessibilityLabel={`${moneyToWords(day.earned, currency)} earned`}>
                {money(day.earned, { signed: true })}
              </AppText>
            )}
          </View>

          {nothing && (
            <AppText variant="body" color={colors.textMuted}>
              {isPast ? 'Nothing done this day.' : 'Nothing planned yet.'}
            </AppText>
          )}

          {day.done.map((t) => (
            <Item key={t.id} icon="check" iconColor={colors.accentText} title={t.title} value={money(t.monetaryValue, { signed: true })} done
              onPress={selected === todayKey ? () => router.push(`/task/${t.id}`) : undefined}
              a11y={`${t.title}, done, ${moneyToWords(t.monetaryValue, currency)}`} />
          ))}
          {day.todo.map((t) => (
            <Item key={t.id} icon="circle" title={t.title} value={money(t.monetaryValue)}
              sub={t.seriesId ? 'Repeating' : undefined}
              onPress={() => router.push(`/task/${t.id}`)}
              a11y={`${t.title}, to do, ${moneyToWords(t.monetaryValue, currency)}. Opens edit.`} />
          ))}
          {day.repeats.map((r) => (
            <Item key={`${r.seriesId}-${selected}`} icon="repeat" title={r.title} value={money(r.monetaryValue)}
              sub="Repeats — shows up on Tasks that day"
              onPress={() => router.push(`/task/series/${r.seriesId}`)}
              a11y={`${r.title}, repeating, ${moneyToWords(r.monetaryValue, currency)}. Opens edit repeating task.`} />
          ))}
          {day.missed.map((t) => (
            <Item key={t.id} icon="close" title={t.title} value={money(t.monetaryValue)} sub="Missed" muted
              a11y={`${t.title}, missed`} />
          ))}

          {!isPast && (
            <Button
              label={selected === todayKey ? 'Add a task for today' : 'Add a task for this day'}
              icon="plus"
              variant="secondary"
              onPress={() => router.push({ pathname: '/task/new', params: { day: selected } })}
              style={styles.add}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Item({ icon, iconColor, title, value, sub, done, muted, onPress, a11y }) {
  const colors = useColors();
  const styles = useStyles();
  const fg = muted ? colors.textMuted : colors.text;
  const content = (
    <>
      <Icon name={icon} size={18} color={iconColor ?? colors.textMuted} />
      <View style={styles.flex}>
        <AppText variant="body" color={done || muted ? colors.textMuted : fg} style={done && styles.struck} numberOfLines={2}>
          {title}
        </AppText>
        {sub && <AppText variant="small" color={colors.textMuted}>{sub}</AppText>}
      </View>
      <AppText variant="numeric" color={done ? colors.accentText : colors.textMuted}>{value}</AppText>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.item} accessible accessibilityLabel={a11y}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      {content}
    </Pressable>
  );
}

const CELL = 44;

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  flex: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  grid: { gap: 2 },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: CELL + 10 },
  dayNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.accentText },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  outside: { opacity: 0.45 },
  dots: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  hollow: { borderWidth: 1.5, borderColor: colors.textMuted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  legendGap: { marginLeft: 10 },
  dayCard: {
    marginTop: 4,
    padding: 16,
    gap: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6, paddingHorizontal: 4, borderRadius: radius.md },
  struck: { textDecorationLine: 'line-through' },
  add: { marginTop: 10 },
}));
