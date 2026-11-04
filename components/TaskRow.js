// components/TaskRow.js
// Whole row is the tap target. Completing: checkbox pops, title strikes through,
// value flips to "+$" in lime, border glows (translucent glow — not a solid fill).
// Long-press (or the "Edit" accessibility action) opens Edit task; pending only.
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { effortInfo } from '../lib/effort';
import { formatMoney, moneyToWords } from '../lib/format';
import { dateKey, friendlyDate, parseDateKey, shortDate } from '../lib/recurrence';
import { useReducedMotion } from '../lib/prefs';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Checkbox } from './ui/Checkbox';
import { EffortMeter } from './ui/EffortMeter';
import { Icon } from './ui/Icon';

export function TaskRow({ task, currency, onComplete, onEdit }) {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const done = task.completionStatus === 'completed';
  const effort = effortInfo(task.effortRating);
  const value = formatMoney(task.monetaryValue, currency, { signed: done });

  // Repeating occurrences show how often, and missed ones show the day they were for
  const repeats = task.seriesId && task.frequency ? task.frequency : null;
  const missedFrom = !done && task.dueDate && task.dueDate < dateKey() ? parseDateKey(task.dueDate) : null;
  const missedCount = !done && task.missedCount > 0 ? task.missedCount : 0;

  const a11yLabel =
    `${task.title}, ${moneyToWords(task.monetaryValue, currency)}, ` +
    `effort ${task.effortRating} of 5, ${done ? 'done' : 'not done'}` +
    (repeats ? `, repeats ${repeats}` : '') +
    (missedFrom ? `, from ${friendlyDate(missedFrom)}` : '') +
    (missedCount ? `, missed ${missedCount} ${missedCount === 1 ? 'time' : 'times'} before this` : '');

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(260)}
      layout={reduced ? undefined : LinearTransition.duration(220)}
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
        accessibilityActions={done ? [] : [{ name: 'edit', label: 'Edit' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'edit') onEdit(task);
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
          <View style={styles.meta}>
            <EffortMeter level={task.effortRating} scale={0.8} />
            <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
              EFFORT {task.effortRating}/5 · {effort.short}
              {task.source === 'voice' ? ' · VOICE' : ''}
            </AppText>
          </View>
          {(repeats || missedFrom || missedCount > 0) && (
            <View style={styles.meta}>
              {repeats && (
                <View style={styles.repeatTag}>
                  <Icon name="repeat" size={11} color={colors.textMuted} />
                  <AppText variant="caption" color={colors.textMuted}>{repeats.toUpperCase()}</AppText>
                </View>
              )}
              {missedFrom && (
                <AppText variant="caption" color={colors.warning}>FROM {shortDate(missedFrom)}</AppText>
              )}
              {missedCount > 0 && (
                <AppText variant="caption" color={colors.warning}>MISSED {missedCount}</AppText>
              )}
            </View>
          )}
        </View>
        <AppText variant="numeric" color={done ? colors.accentText : colors.text} style={styles.value}>
          {value}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flexShrink: 1 },
  repeatTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { marginLeft: 8 },
}));
