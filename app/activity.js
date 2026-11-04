// app/activity.js — Activity (sheet): this month, streak, lifetime totals, the last
// 7 days, and every completed task grouped by day. Read-only.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WeekChart } from '../components/WeekChart';
import { AppText } from '../components/ui/AppText';
import { EffortMeter } from '../components/ui/EffortMeter';
import { EmptyState } from '../components/ui/EmptyState';
import { SheetHeader } from '../components/ui/Headers';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getCompletedTasks, getDailyEarnings, getLifetimeStats } from '../db/operations/stats';
import { formatMoney, moneyToWords, monthName } from '../lib/format';
import { addDays, dateKey, friendlyDate, parseDateKey } from '../lib/recurrence';
import { lastNDays } from '../lib/stats';
import { usePoolStore } from '../store/poolStore';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

const HISTORY_LIMIT = 200;

function dayHeading(key) {
  const today = dateKey();
  if (key === today) return 'Today';
  if (key === dateKey(addDays(new Date(), -1))) return 'Yesterday';
  return friendlyDate(parseDateKey(key));
}

function Tile({ icon, label, value, sub, a11y, children }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.tile} accessible accessibilityLabel={a11y}>
      <View style={styles.tileHead}>
        <Icon name={icon} size={16} color={colors.accentText} />
        <AppText variant="caption" color={colors.textMuted}>{label}</AppText>
      </View>
      <AppText variant="numeric" style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {sub && <AppText variant="small" color={colors.textMuted}>{sub}</AppText>}
      {children}
    </View>
  );
}

export default function ActivityScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { budget, streak, dailyCap } = usePoolStore();
  const currency = budget.currencyCode;
  const money = (n, opts) => formatMoney(n, currency, opts);

  // Snapshot on open — nothing on this sheet can change while it's up
  const data = useMemo(() => {
    const week = lastNDays(getDailyEarnings(dateKey(addDays(new Date(), -6))), 7);
    const tasks = getCompletedTasks({ limit: HISTORY_LIMIT });
    const groups = [];
    for (const t of tasks) {
      const last = groups[groups.length - 1];
      if (last?.day === t.day) {
        last.tasks.push(t);
        last.total += t.monetaryValue;
      } else {
        groups.push({ day: t.day, tasks: [t], total: t.monetaryValue });
      }
    }
    return { week, groups, lifetime: getLifetimeStats(), truncated: tasks.length === HISTORY_LIMIT };
  }, []);

  const cap = budget.monthlyAllowanceCap;
  const monthPct = cap > 0 ? (budget.totalEarnedThisMonth / cap) * 100 : 0;
  const { lifetime } = data;

  return (
    <View style={styles.flex}>
      <SheetHeader title="Activity" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.tiles}>
          <Tile
            icon="chart"
            label={monthName().toUpperCase()}
            value={money(budget.totalEarnedThisMonth)}
            sub={`of ${money(cap, { trim: true })} allowance`}
            a11y={`${monthName()}: ${moneyToWords(budget.totalEarnedThisMonth, currency)} earned of ${moneyToWords(cap, currency)} allowance`}
          >
            <ProgressBar percentage={monthPct} height={4} />
          </Tile>
          <Tile
            icon="flame"
            label="STREAK"
            value={`${streak.current} ${streak.current === 1 ? 'day' : 'days'}`}
            sub={
              streak.current > 0 && !streak.doneToday
                ? 'Finish a task today to keep it'
                : `Best: ${streak.best} ${streak.best === 1 ? 'day' : 'days'}`
            }
            a11y={`Streak: ${streak.current} ${streak.current === 1 ? 'day' : 'days'}. Best ${streak.best}.${streak.current > 0 && !streak.doneToday ? ' Finish a task today to keep it.' : ''}`}
          />
          <Tile
            icon="checklist"
            label="ALL TIME"
            value={money(lifetime.earned)}
            sub={`${lifetime.tasksCompleted} ${lifetime.tasksCompleted === 1 ? 'task' : 'tasks'} done`}
            a11y={`All time: ${moneyToWords(lifetime.earned, currency)} earned from ${lifetime.tasksCompleted} tasks`}
          />
          <Tile
            icon="trophy"
            label="GOALS REACHED"
            value={String(lifetime.goalsReached)}
            sub={lifetime.spent > 0 ? `${money(lifetime.spent)} spent on them` : 'Your first is on its way'}
            a11y={`Goals reached: ${lifetime.goalsReached}`}
          />
        </View>

        <View style={styles.card}>
          <AppText variant="h2" accessibilityRole="header">Last 7 days</AppText>
          <WeekChart days={data.week} currency={currency} guide={dailyCap} />
        </View>

        <View style={styles.section}>
          <AppText variant="h2" accessibilityRole="header">History</AppText>
          {data.groups.length === 0 ? (
            <EmptyState
              icon="checklist"
              headline="No activity yet."
              body="Tasks you complete show up here, day by day."
            />
          ) : (
            data.groups.map((g) => (
              <View key={g.day} style={styles.day}>
                <View
                  style={styles.dayHead}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${dayHeading(g.day)}, ${moneyToWords(g.total, currency)} earned`}
                >
                  <AppText variant="label">{dayHeading(g.day)}</AppText>
                  <AppText variant="numeric" color={colors.accentText}>{money(g.total, { signed: true })}</AppText>
                </View>
                <View style={styles.dayCard}>
                  {g.tasks.map((t, i) => (
                    <View
                      key={t.id}
                      style={[styles.row, i > 0 && styles.divider]}
                      accessible
                      accessibilityLabel={`${t.title}, ${moneyToWords(t.monetaryValue, currency)}, effort ${t.effortRating} of 5`}
                    >
                      <EffortMeter level={t.effortRating} scale={0.7} />
                      <AppText variant="body" style={styles.flex} numberOfLines={2}>{t.title}</AppText>
                      <AppText variant="numeric" color={colors.textMuted} style={styles.value}>
                        {money(t.monetaryValue, { signed: true })}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
          {data.truncated && (
            <AppText variant="small" color={colors.textMuted} style={styles.center}>
              Showing your latest {HISTORY_LIMIT} tasks.
            </AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 24 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 6,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileValue: { fontSize: 22, lineHeight: 28 },
  card: {
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { gap: 16 },
  day: { gap: 8 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 },
  dayCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  value: { fontSize: 15 },
  center: { textAlign: 'center' },
}));
