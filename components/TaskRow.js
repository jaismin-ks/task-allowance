// components/TaskRow.js
// Whole row is the tap target. Completing: checkbox pops, title strikes through,
// value flips to "+$" in lime, border glows (translucent glow — not a solid fill).
// Long-press (or the "Edit" accessibility action) opens Edit task; pending only.
// Swipe right = done, swipe left = delete (with Undo, handled by the screen). Both
// also exist without the gesture: tap, and the "Delete" accessibility action.
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

// How far the row must travel before letting go triggers the action
const ACTION_WIDTH = 96;

export function TaskRow({ task, currency, onComplete, onEdit, onDelete }) {
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

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(260)}
      layout={reduced ? undefined : LinearTransition.duration(220)}
    >
      <ReanimatedSwipeable
        ref={swipeRef}
        enabled={!done}
        leftThreshold={ACTION_WIDTH * 0.6}
        rightThreshold={ACTION_WIDTH * 0.6}
        overshootLeft={false}
        overshootRight={false}
        containerStyle={styles.swipe}
        renderLeftActions={(progress) => <SwipeAction kind="done" progress={progress} />}
        renderRightActions={onDelete ? (progress) => <SwipeAction kind="delete" progress={progress} /> : undefined}
        // Released past the threshold: run the action, then snap the row back
        onSwipeableOpen={(direction) => {
          swipeRef.current?.close();
          if (direction === 'right') onComplete(task);
          else onDelete?.(task);
        }}
      >
        <Pressable
          onPress={done ? undefined : () => onComplete(task)}
          onLongPress={done ? undefined : () => onEdit(task)}
          disabled={done}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={done ? undefined : 'Double-tap to mark done.'}
          accessibilityState={{ checked: done }}
          // Double-tap still goes to onPress; "Edit" makes long-press reachable without the gesture
          accessibilityActions={
            done
              ? []
              : [{ name: 'edit', label: 'Edit' }, ...(onDelete ? [{ name: 'delete', label: 'Delete' }] : [])]
          }
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

// The panel revealed behind the row. Icon + word, never colour alone.
function SwipeAction({ kind, progress }) {
  const colors = useColors();
  const styles = useStyles();
  const done = kind === 'done';
  const bg = done ? colors.accent : colors.danger;
  // Dark text on the bright dark-mode red, white on the deep light-mode red
  const fg = done ? colors.onAccent : colors.mode === 'dark' ? '#0B0B0C' : '#FFFFFF';
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.6, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.8, 1]) }],
  }));
  return (
    <View
      style={[styles.action, { backgroundColor: bg }, done ? styles.actionLeft : styles.actionRight]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.actionContent, content]}>
        <Icon name={done ? 'check' : 'trash'} size={20} color={fg} strokeWidth={2.25} />
        <AppText variant="small" color={fg}>{done ? 'Done' : 'Delete'}</AppText>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // Clips the action panels to the row's rounded shape
  swipe: { borderRadius: radius.lg, overflow: 'hidden' },
  action: { width: ACTION_WIDTH, justifyContent: 'center' },
  actionLeft: { alignItems: 'flex-start', paddingLeft: 20 },
  actionRight: { alignItems: 'flex-end', paddingRight: 20, marginLeft: 'auto' },
  actionContent: { alignItems: 'center', gap: 2 },
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
