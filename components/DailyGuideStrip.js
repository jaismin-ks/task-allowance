// components/DailyGuideStrip.js
// Informational only — the guide is soft and never blocks (spec §1: never call it a cap).
import { View } from 'react-native';
import { formatMoney } from '../lib/format';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

export function DailyGuideStrip({ earnedToday, dailyGuide, overAllowance, currency }) {
  const colors = useColors();
  const styles = useStyles();
  if (overAllowance) {
    return (
      <View style={styles.strip} accessible accessibilityRole="text">
        <Icon name="flame" size={18} color={colors.accentText} />
        <AppText variant="body" style={styles.flex}>
          You&apos;ve reached this month&apos;s allowance. Anything extra still counts.
        </AppText>
      </View>
    );
  }

  const earned = formatMoney(earnedToday, currency);
  const guide = formatMoney(dailyGuide, currency);
  return (
    <View
      style={[styles.strip, styles.column]}
      accessible
      accessibilityLabel={`Daily guide. Earned today ${earned} of ${guide} suggested`}
    >
      <View style={styles.row}>
        <AppText variant="small" color={colors.textMuted}>Earned today</AppText>
        <AppText variant="numeric" style={styles.amount}>{earned}</AppText>
        <AppText variant="small" color={colors.textMuted}>of {guide} suggested</AppText>
      </View>
      <ProgressBar percentage={dailyGuide > 0 ? (earnedToday / dailyGuide) * 100 : 0} height={4} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  column: { flexDirection: 'column', alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  amount: { fontSize: 15 },
  flex: { flex: 1 },
}));
