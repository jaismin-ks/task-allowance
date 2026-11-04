// app/(tabs)/tasks.js — S1 Tasks (home)
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Composer } from '../../components/Composer';
import { DailyGuideStrip } from '../../components/DailyGuideStrip';
import { GoalCard } from '../../components/GoalCard';
import { SCREEN_GUTTER, useBottomChrome } from '../../components/layout';
import { RepeatingList } from '../../components/RepeatingList';
import { StreakChip } from '../../components/StreakChip';
import { TaskRow } from '../../components/TaskRow';
import { TaskToolbar } from '../../components/TaskToolbar';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { completeTask, uncompleteTask } from '../../db/operations/completeTask';
import { formatHeaderDate, formatMoney, greeting, moneyToWords } from '../../lib/format';
import { haptic } from '../../lib/haptics';
import { flags } from '../../lib/prefs';
import { activeFilterCount, applyTaskFilters, isFiltering } from '../../lib/taskFilters';
import { useVoiceAvailable } from '../../lib/voiceInput';
import { usePoolStore } from '../../store/poolStore';
import { useTaskFilters } from '../../store/taskFilterStore';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { durations } from '../../theme/motion';
import { radius } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';

export default function TasksScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { tasksContentPadding } = useBottomChrome();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const { pending, completedToday, series, loaded, load } = useTaskStore();
  const { progress, profile, earnedToday, dailyCap, overAllowance, budget, streak, goalEtaDays, refresh } =
    usePoolStore();
  const wishlistCount = useWishlistStore((s) => s.others.length + (s.goal ? 1 : 0));
  const loadWishlist = useWishlistStore((s) => s.loadItems);
  const voiceAvailable = useVoiceAvailable();
  const currency = budget.currencyCode;

  // Skeletons only if loading takes > 150ms, to avoid a flash
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    if (loaded) return undefined;
    const t = setTimeout(() => setShowSkeleton(true), durations.SKELETON_DELAY_MS);
    return () => clearTimeout(t);
  }, [loaded]);

  const refreshAll = useCallback(() => {
    load();
    refresh();
    loadWishlist();
  }, [load, refresh, loadWishlist]);

  // Re-query on every focus so changes from other tabs/sheets show up here
  useFocusEffect(refreshAll);

  const handleComplete = (task) => {
    // Commit to the DB first so killing the app mid-animation can't lose the credit.
    // Nothing credited (e.g. a missed repeat skipped since the list was drawn) →
    // just redraw; never claim "+$ earned".
    if (!completeTask(task.id)) {
      refreshAll();
      return;
    }
    haptic.complete();
    refreshAll();

    useUiStore.getState().showSnackbar({
      message: `${formatMoney(task.monetaryValue, currency, { signed: true })} earned`,
      announcement: `Done. ${moneyToWords(task.monetaryValue, currency)} earned.`,
      actionLabel: 'Undo',
      actionA11yLabel: `Undo completing ${task.title}`,
      onAction: () => {
        uncompleteTask(task.id);
        refreshAll();
        AccessibilityInfo.announceForAccessibility(`${task.title} marked not done.`);
      },
    });

    // S11: right after the completion that pushes Available ≥ goal price — once per goal
    const now = usePoolStore.getState().progress;
    if (now?.reached && flags.get('celebratedGoal') !== now.itemId) {
      flags.set('celebratedGoal', now.itemId);
      router.push('/goal-reached');
    }
  };

  const openEdit = (task) => router.push(`/task/${task.id}`);

  // Swipe left (or the "Delete" accessibility action). No confirm dialog: the
  // 5-second Undo puts the row back exactly as it was.
  const handleDelete = (task) => {
    const row = useTaskStore.getState().deleteTaskForUndo(task.id);
    if (!row) return;
    haptic.selection();
    useUiStore.getState().showSnackbar({
      message: 'Task deleted',
      announcement: `${task.title} deleted.`,
      actionLabel: 'Undo',
      actionA11yLabel: `Undo deleting ${task.title}`,
      onAction: () => {
        useTaskStore.getState().restoreTask(row);
        refreshAll();
        AccessibilityInfo.announceForAccessibility(`${task.title} restored.`);
      },
    });
    refreshAll();
  };

  const name = profile?.displayName && profile.displayName !== 'Me' ? `, ${profile.displayName}` : '';
  const total = pending.length + completedToday.length;

  // Search / filter / sort apply within each group: pending stays above done
  const filters = useTaskFilters();
  const filtering = isFiltering(filters);
  const shownPending = applyTaskFilters(pending, filters);
  const shownDone = applyTaskFilters(completedToday, filters);
  const shownSeries = applyTaskFilters(series, filters);
  const shown = shownPending.length + shownDone.length;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: tasksContentPadding },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <AppText variant="caption" color={colors.textMuted}>{formatHeaderDate()}</AppText>
            <StreakChip streak={streak} />
          </View>
          <AppText variant="h1" accessibilityRole="header">
            {greeting()}
            {name}
          </AppText>
        </View>

        {!loaded && showSkeleton ? (
          <View style={styles.gap}>
            <Skeleton height={168} borderRadius={radius.lg} />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={68} borderRadius={radius.lg} />
            ))}
          </View>
        ) : loaded ? (
          <>
            <GoalCard
              progress={progress}
              currency={currency}
              hasWishlistItems={wishlistCount > 0}
              etaDays={goalEtaDays}
            />
            <DailyGuideStrip
              earnedToday={earnedToday}
              dailyGuide={dailyCap}
              overAllowance={overAllowance}
              currency={currency}
            />

            {(total > 0 || series.length > 0) && <TaskToolbar shown={shown} total={total} />}

            <View style={styles.sectionHeader}>
              <AppText variant="h2" accessibilityRole="header">Today</AppText>
              {total > 0 && (
                <AppText
                  variant="numeric"
                  color={colors.textMuted}
                  accessibilityLabel={`${completedToday.length} of ${total} done`}
                >
                  {completedToday.length} / {total}
                </AppText>
              )}
            </View>

            {total === 0 ? (
              <EmptyState
                icon="checklist"
                headline="Nothing on today’s list."
                body="Add a task to start earning."
              >
                <Button label="Add a task" icon="plus" onPress={() => router.push('/task/new')} />
              </EmptyState>
            ) : shown === 0 ? (
              <EmptyState
                icon="search"
                headline="No tasks match."
                body={
                  filters.query.trim()
                    ? `Nothing on today’s list matches “${filters.query.trim()}”${activeFilterCount(filters) ? ' with these filters' : ''}.`
                    : 'Try fewer filters.'
                }
              >
                <Button label="Clear search and filters" variant="secondary" onPress={filters.clearAll} />
              </EmptyState>
            ) : (
              <View style={styles.list}>
                {shownPending.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    currency={currency}
                    onComplete={handleComplete}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
                {shownDone.map((t) => (
                  <TaskRow key={t.id} task={t} currency={currency} onComplete={handleComplete} onEdit={openEdit} />
                ))}
                {pending.length === 0 && !filtering && (
                  <View style={styles.allDone} accessible>
                    <AppText variant="displayItalic" color={colors.accentText} style={styles.allDoneText}>
                      All done for today. Nice.
                    </AppText>
                    <AppText variant="body" color={colors.textMuted}>
                      Earned today{' '}
                      <AppText variant="numeric" color={colors.text}>
                        {formatMoney(earnedToday, currency, { signed: true })}
                      </AppText>
                    </AppText>
                  </View>
                )}
              </View>
            )}

            <RepeatingList series={shownSeries} currency={currency} />
          </>
        ) : null}
      </ScrollView>
      <Composer showMic={voiceAvailable} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: SCREEN_GUTTER, gap: 16 },
  header: { gap: 6, marginBottom: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  gap: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  list: { gap: 10 },
  allDone: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  allDoneText: { textAlign: 'center' },
}));
