// components/WeekChart.js
// Activity: earned per day for the last 7 days. One series, so one accent hue and
// no legend. Bars are thin with rounded tops on a shared baseline. Tapping a bar
// shows its day in the readout above, and each bar is a labelled button for
// screen readers. A dashed line marks today's daily guide on the same scale.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { formatMoney, moneyToWords } from '../lib/format';
import { friendlyDate } from '../lib/recurrence';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';

const PLOT_HEIGHT = 112;

export function WeekChart({ days, currency, guide }) {
  const colors = useColors();
  const styles = useStyles();
  const [selected, setSelected] = useState(days.length - 1);
  const max = Math.max(guide || 0, ...days.map((d) => d.earned), 0.01);
  const pick = days[selected] ?? days[days.length - 1];
  const isToday = selected === days.length - 1;
  const guideY = guide > 0 ? (guide / max) * PLOT_HEIGHT : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.readout} accessibilityLiveRegion="polite">
        <AppText variant="small" color={colors.textMuted}>
          {isToday ? 'Today' : friendlyDate(pick.date)}
        </AppText>
        <AppText variant="numeric">
          {formatMoney(pick.earned, currency)}
          <AppText variant="small" color={colors.textMuted}>
            {'  '}
            {pick.count} {pick.count === 1 ? 'task' : 'tasks'}
          </AppText>
        </AppText>
      </View>

      <View style={styles.plot}>
        {guideY != null && (
          <View pointerEvents="none" style={[styles.guide, { bottom: guideY }]} />
        )}
        {days.map((d, i) => {
          const h = d.earned > 0 ? Math.max(4, (d.earned / max) * PLOT_HEIGHT) : 2;
          const on = i === selected;
          return (
            <Pressable
              key={d.day}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${friendlyDate(d.date)}, ${moneyToWords(d.earned, currency)}, ${d.count} ${d.count === 1 ? 'task' : 'tasks'}`}
              style={styles.col}
            >
              <View
                style={[
                  styles.bar,
                  { height: h },
                  d.earned > 0
                    ? { backgroundColor: colors.accentText, opacity: on ? 1 : 0.55 }
                    : { backgroundColor: colors.track },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.axis} accessible={false} importantForAccessibility="no-hide-descendants">
        {days.map((d, i) => (
          <AppText
            key={d.day}
            variant="caption"
            color={i === selected ? colors.text : colors.textMuted}
            style={styles.tick}
            maxFontSizeMultiplier={1.2}
          >
            {d.date.toLocaleDateString('en-US', { weekday: 'narrow' })}
          </AppText>
        ))}
      </View>
      {guideY != null && (
        <AppText variant="small" color={colors.textMuted}>
          Dashed line: today’s daily guide, {formatMoney(guide, currency)}.
        </AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 10 },
  readout: { gap: 2 },
  plot: {
    height: PLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Full-height columns: the tap target is the whole column, not just the bar
  col: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '56%', maxWidth: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  guide: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    opacity: 0.6,
  },
  axis: { flexDirection: 'row', gap: 2 },
  tick: { flex: 1, textAlign: 'center' },
}));
