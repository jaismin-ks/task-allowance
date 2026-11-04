// components/DailyGuideStrip.js
// Informational only — the guide is soft and never blocks (spec §1: never call it a cap).
// Tapping it opens Activity.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatMoney } from '../lib/format';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

export function DailyGuideStrip({ earnedToday, dailyGuide, overAllowance, currency }) {
  const colors = useColors();
  const styles = useStyles();
  const open = () => router.push('/activity');

  if (overAllowance) {
    return (
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="You’ve reached this month’s allowance. Anything extra still counts."
        accessibilityHint="Opens activity"
      >
        <Icon name="flame" size={18} color={colors.accentText} />
        <AppText variant="body" style={styles.flex}>
          You&apos;ve reached this month&apos;s allowance. Anything extra still counts.
        </AppText>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  const earned = formatMoney(earnedToday, currency);
  const guide = formatMoney(dailyGuide, currency);
  // Past today's guide: say so, instead of a bar that just sits full
  const ahead = dailyGuide > 0 && earnedToday >= dailyGuide;
  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.strip, styles.column, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        ahead
          ? `Daily guide. Earned today ${earned}, past the ${guide} suggested`
          : `Daily guide. Earned today ${earned} of ${guide} suggested`
      }
      accessibilityHint="Opens activity"
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText variant="small" color={colors.textMuted}>Earned today</AppText>
          <AppText variant="numeric" style={styles.amount}>{earned}</AppText>
          <AppText variant="small" color={colors.textMuted}>
            {ahead ? `· past today’s ${guide} guide` : `of ${guide} suggested`}
          </AppText>
        </View>
        {ahead && <Icon name="check" size={16} color={colors.accentText} strokeWidth={2.25} />}
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </View>
      <ProgressBar percentage={dailyGuide > 0 ? (earnedToday / dailyGuide) * 100 : 0} height={4} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  column: { flexDirection: 'column', alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  amount: { fontSize: 15 },
  flex: { flex: 1 },
}));
