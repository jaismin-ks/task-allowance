// components/TaskRow.js
// Whole row is the tap target. Completing: checkbox pops, title strikes through,
// value flips to "+$" in lime, border glows (translucent glow — not a solid fill).
// Tap the row (or its tick) to mark it done — or, if it's done, not done again.
// Long-press opens Edit. Swipe right = quick done / undo. Swipe left = a tray of
// buttons: Done (Undo) · Edit · Delete (pending only — a done task's money is
// already counted). Everything is also reachable without gestures through the
// accessibility actions.
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, interpolate, LinearTransition, useAnimatedStyle } from 'react-native-reanimated';
import { formatMoney, moneyToWords } from '../lib/format';
import { dateKey, friendlyDate, parseDateKey } from '../lib/recurrence';
import { describeReminder, parseRemindAt } from '../lib/taskReminder';
import { useReducedMotion } from '../lib/prefs';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Checkbox } from './ui/Checkbox';
import { EffortMeter } from './ui/EffortMeter';
import { Icon } from './ui/Icon';

// Swipe right: how far before letting go toggles done
const ACTION_WIDTH = 96;
// Swipe left: one button's width in the tray
const TRAY_BUTTON = 76;

// Only one row's tray open at a time
let openRow = null;

export function TaskRow({ task, currency, onComplete, onUndo, onEdit, onDelete }) {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const swipeRef = useRef(null);
  const done = task.completionStatus === 'completed';
  const value = formatMoney(task.monetaryValue, currency, { signed: done });

  // Repeating occurrences show how often, and missed ones show the day they were for
  const repeats = task.seriesId && task.frequency ? task.frequency : null;
  const missedFrom = !done && task.dueDate && task.dueDate < dateKey() ? parseDateKey(task.dueDate) : null;
  const missedCount = !done && task.missedCount > 0 ? task.missedCount : 0;

  // One quiet line, only when there's something to say (docs/UX_REVIEW.md #4):
  // "Daily · missed 2" / "Weekly · from Mon, Oct 5". Muted, never amber — a miss
  // isn't something to fix. Effort is the bars by the value; the screen reader
  // label below still says everything.
  const frequencyName = repeats ? repeats[0].toUpperCase() + repeats.slice(1) : null;
  const missedText = missedCount
    ? `missed ${missedCount}`
    : missedFrom
      ? `from ${friendlyDate(missedFrom)}`
      : null;
  const repeatText = done ? null : [frequencyName, missedText].filter(Boolean).join(' · ') || null;
  // Upcoming reminder: "Today, 6:00 PM" (past ones have fired; nothing to show)
  const remindDate = done ? null : parseRemindAt(task.remindAt);
  const reminderText = remindDate && remindDate > new Date() ? describeReminder(remindDate) : null;
  const detail = repeatText || reminderText;

  const a11yLabel =
    `${task.title}, ${moneyToWords(task.monetaryValue, currency)}, ` +
    `effort ${task.effortRating} of 5, ${done ? 'done' : 'not done'}` +
    (repeats ? `, repeats ${repeats}` : '') +
    (missedFrom ? `, from ${friendlyDate(missedFrom)}` : '') +
    (missedCount ? `, missed ${missedCount} ${missedCount === 1 ? 'time' : 'times'} before this` : '') +
    (reminderText ? `, reminder ${reminderText}` : '');

  const toggle = () => (done ? onUndo?.(task) : onComplete(task));
  const fgOn = (bgIsDanger) => (bgIsDanger ? (colors.mode === 'dark' ? '#0B0B0C' : '#FFFFFF') : colors.onAccent);
  const trayButtons = [
    done
      ? { key: 'undo', label: 'Undo', icon: 'retry', bg: colors.surfaceRaised, fg: colors.text, onPress: () => onUndo?.(task) }
      : { key: 'done', label: 'Done', icon: 'check', bg: colors.accent, fg: colors.onAccent, onPress: () => onComplete(task) },
    { key: 'edit', label: 'Edit', icon: 'pencil', bg: colors.surfaceRaised, fg: colors.text, onPress: () => onEdit(task) },
    !done &&
      onDelete && { key: 'delete', label: 'Delete', icon: 'trash', bg: colors.danger, fg: fgOn(true), onPress: () => onDelete(task) },
  ].filter(Boolean);

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(260)}
      layout={reduced ? undefined : LinearTransition.duration(220)}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        leftThreshold={ACTION_WIDTH * 0.6}
        rightThreshold={TRAY_BUTTON * 0.5}
        overshootLeft={false}
        overshootRight={false}
        containerStyle={styles.swipe}
        renderLeftActions={(progress) => <SwipeAction done={done} progress={progress} />}
        renderRightActions={() => (
          <View style={[styles.tray, { width: TRAY_BUTTON * trayButtons.length }]}>
            {trayButtons.map((b) => (
              <Pressable
                key={b.key}
                onPress={() => {
                  swipeRef.current?.close();
                  b.onPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${b.label} ${task.title}`}
                style={({ pressed }) => [styles.trayButton, { backgroundColor: b.bg }, pressed && styles.trayPressed]}
              >
                <Icon name={b.icon} size={20} color={b.fg} strokeWidth={2.25} />
                <AppText variant="small" color={b.fg}>{b.label}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        onSwipeableWillOpen={() => {
          if (openRow && openRow !== swipeRef.current) openRow.close();
          openRow = swipeRef.current;
        }}
        // Swiped right past the threshold: toggle, then snap back. Swiped left: the
        // tray stays open until a button (or the row) is tapped.
        onSwipeableOpen={(direction) => {
          if (direction !== 'right') return;
          swipeRef.current?.close();
          toggle();
        }}
        onSwipeableClose={() => {
          if (openRow === swipeRef.current) openRow = null;
        }}
      >
        <Pressable
          onPress={toggle}
          onLongPress={() => onEdit(task)}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={done ? 'Double-tap to mark not done.' : 'Double-tap to mark done.'}
          accessibilityState={{ checked: done }}
          // Double-tap still goes to onPress; these make the long-press and tray reachable
          accessibilityActions={[
            { name: 'edit', label: 'Edit' },
            ...(!done && onDelete ? [{ name: 'delete', label: 'Delete' }] : []),
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'edit') onEdit(task);
            if (e.nativeEvent.actionName === 'delete') onDelete?.(task);
          }}
          style={({ pressed }) => [styles.row, done && styles.done, pressed && styles.pressed]}
        >
          <Checkbox checked={done} />
          <View style={styles.body}>
            <AppText
              variant="label"
              color={done ? colors.textMuted : colors.text}
              style={done && styles.struck}
            >
              {task.title}
            </AppText>
            {detail && (
              <View style={styles.meta}>
                {repeatText && (
                  <>
                    {repeats && <Icon name="repeat" size={12} color={colors.textMuted} />}
                    <AppText variant="small" color={colors.textMuted} style={styles.flexShrink}>
                      {repeatText}
                    </AppText>
                  </>
                )}
                {reminderText && (
                  <>
                    <Icon name="bell" size={12} color={colors.textMuted} />
                    <AppText variant="small" color={colors.textMuted} style={styles.flexShrink}>
                      {reminderText}
                    </AppText>
                  </>
                )}
              </View>
            )}
          </View>
          <View style={styles.right}>
            <AppText variant="numeric" color={done ? colors.accentText : colors.text}>
              {value}
            </AppText>
            {!done && <EffortMeter level={task.effortRating} scale={0.6} />}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

// Revealed when swiping right: Done, or Undo for a done task. Icon + word, never colour alone.
function SwipeAction({ done, progress }) {
  const colors = useColors();
  const styles = useStyles();
  const bg = done ? colors.surfaceRaised : colors.accent;
  const fg = done ? colors.text : colors.onAccent;
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.6, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.8, 1]) }],
  }));
  return (
    <View
      style={[styles.action, { backgroundColor: bg }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.actionContent, content]}>
        <Icon name={done ? 'retry' : 'check'} size={20} color={fg} strokeWidth={2.25} />
        <AppText variant="small" color={fg}>{done ? 'Undo' : 'Done'}</AppText>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // Clips the action panels to the row's rounded shape
  swipe: { borderRadius: radius.lg, overflow: 'hidden' },
  action: { width: ACTION_WIDTH, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 20 },
  actionContent: { alignItems: 'center', gap: 2 },
  tray: { flexDirection: 'row', marginLeft: 'auto' },
  trayButton: { width: TRAY_BUTTON, alignItems: 'center', justifyContent: 'center', gap: 2 },
  trayPressed: { opacity: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 6,
  },
  done: {
    borderColor: colors.accentText,
    shadowColor: colors.accentText,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  body: { flex: 1, gap: 6 },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flexShrink: { flexShrink: 1 },
  right: { marginLeft: 8, alignItems: 'flex-end', gap: 6 },
}));
