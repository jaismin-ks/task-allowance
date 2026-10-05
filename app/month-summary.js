// app/month-summary.js — G1 New-month summary (sheet, once per month on first foreground)
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatMoney, monthKeyToDate, monthName } from '../lib/format';
import { getMonthSummary } from '../lib/monthRollover';
import { usePoolStore } from '../store/poolStore';
import { fonts, radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

export default function MonthSummaryScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { month } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const progress = usePoolStore((s) => s.progress);
  const [summary] = useState(() => (month ? getMonthSummary(month) : null));

  const closedMonth = month ? monthName(monthKeyToDate(month)) : '';
  const newMonth = monthName();
  const money = (n) => formatMoney(n, currency, { trim: true });

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <AppText variant="caption" color={colors.textMuted}>MONTH CLOSED</AppText>
      <AppText variant="displayL" accessibilityRole="header">
        {closedMonth} <AppText variant="displayL" style={styles.italic}>wrap-up</AppText>
      </AppText>

      {summary && (
        <View style={styles.card}>
          <AppText variant="bodyLarge">
            You earned <AppText variant="numeric" color={colors.accentText}>{formatMoney(summary.earned, currency)}</AppText>
            {summary.cap ? ` of your ${money(summary.cap)} allowance` : ''}
          </AppText>
          {summary.cap > 0 && <ProgressBar percentage={(summary.earned / summary.cap) * 100} height={6} />}
          <AppText variant="caption" color={colors.textMuted}>
            {summary.tasksCompleted} {summary.tasksCompleted === 1 ? 'TASK' : 'TASKS'} COMPLETED
          </AppText>
        </View>
      )}

      {/* Available carries across months, so goal progress never resets on the 1st */}
      {progress?.price != null && (
        <AppText variant="body" color={colors.textMuted}>
          {progress.reached
            ? `You’ve earned enough for ${progress.itemTitle}.`
            : `You’re ${Math.floor(progress.percentage)}% of the way to ${progress.itemTitle} — that carries into ${newMonth}.`}
        </AppText>
      )}

      <Button label={`Start ${newMonth}`} arrow onPress={() => router.back()} style={styles.button} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { paddingHorizontal: 20, paddingTop: 28, gap: 16 },
  italic: { fontFamily: fonts.serifItalic },
  card: {
    gap: 10,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  button: { marginTop: 8 },
}));
