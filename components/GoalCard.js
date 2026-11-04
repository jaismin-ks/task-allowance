// components/GoalCard.js
// S1 goal card: "Saving for" + Available vs price. Every state from the spec:
// no goal, goal without price, in progress, and "Ready to buy" after "Not yet".
// The one headline on Tasks (docs/UX_REVIEW.md): one number, one bar, and one quiet
// line for today. Percent, "to go" and the ETA live in Item detail; the daily guide
// lives in Add task (suggested range) and Activity.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatMoney, moneyToWords } from '../lib/format';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { CountUp } from './ui/CountUp';
import { Icon } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

// "$3.20 earned today", or the spec's over-allowance note (never a block)
function TodayLine({ earnedToday, overAllowance, currency }) {
  const colors = useColors();
  if (!overAllowance && !(earnedToday > 0)) return null;
  return (
    <AppText variant="small" color={colors.textMuted}>
      {overAllowance
        ? 'You’ve reached this month’s allowance. Anything extra still counts.'
        : `${formatMoney(earnedToday, currency)} earned today`}
    </AppText>
  );
}

export function GoalCard({ progress, currency, hasWishlistItems, earnedToday = 0, overAllowance = false }) {
  const colors = useColors();
  const styles = useStyles();
  const today = <TodayLine earnedToday={earnedToday} overAllowance={overAllowance} currency={currency} />;
  if (!progress) {
    return (
      <View style={[styles.card, styles.empty]}>
        <View style={styles.iconWrap}>
          <Icon name="target" size={22} color={colors.accentText} />
        </View>
        <AppText variant="h2">Pick something to save for</AppText>
        <Button
          label="Choose a goal"
          variant="secondary"
          small
          arrow
          onPress={() => router.navigate(hasWishlistItems ? '/wishlist' : '/wishlist/new')}
          style={styles.alignStart}
        />
        {today}
      </View>
    );
  }

  const open = () => router.push(`/wishlist/${progress.itemId}`);

  if (progress.price == null) {
    return (
      <Pressable
        onPress={open}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`Saving for ${progress.itemTitle}. Add a price to track progress`}
      >
        <AppText variant="caption" color={colors.textMuted}>SAVING FOR</AppText>
        <AppText variant="h2">{progress.itemTitle}</AppText>
        <View style={styles.inline}>
          <Icon name="pencil" size={16} color={colors.warning} />
          <AppText variant="body" color={colors.warning}>Add a price to track progress</AppText>
        </View>
        {today}
      </Pressable>
    );
  }

  const money = (n, opts) => formatMoney(n, currency, opts);
  const pct = Math.floor(progress.percentage);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        `Saving for ${progress.itemTitle}. ` +
        `${moneyToWords(progress.available, currency)} of ${moneyToWords(progress.price, currency)}` +
        (progress.reached ? '. Ready to buy.' : `, ${pct} percent.`) +
        (overAllowance
          ? ' You’ve reached this month’s allowance. Anything extra still counts.'
          : earnedToday > 0
            ? ` ${moneyToWords(earnedToday, currency)} earned today.`
            : '')
      }
      accessibilityHint="Opens item details"
    >
      <View style={styles.headRow}>
        <AppText variant="caption" color={colors.textMuted}>SAVING FOR</AppText>
        {progress.reached && (
          <View style={styles.readyTag}>
            <Icon name="check" size={12} color={colors.onAccent} strokeWidth={2.5} />
            <AppText variant="caption" color={colors.onAccent}>READY TO BUY</AppText>
          </View>
        )}
      </View>
      <AppText variant="h2" numberOfLines={2}>{progress.itemTitle}</AppText>
      <View style={styles.amountRow}>
        <CountUp
          value={progress.available}
          format={(n) => money(n)}
          variant="displayL"
          color={progress.reached ? colors.accentText : colors.text}
          accessibilityLabel={`${moneyToWords(progress.available, currency)} available of ${moneyToWords(progress.price, currency)}`}
        />
        <AppText variant="numeric" color={colors.textMuted} accessible={false}>
          of {money(progress.price, { trim: true })}
        </AppText>
      </View>
      {progress.reached ? (
        <AppText variant="body" color={colors.textMuted}>
          You&apos;ve earned it. Tap to mark it bought.
        </AppText>
      ) : (
        <>
          <ProgressBar
            percentage={progress.percentage}
            accessibilityLabel="Goal progress"
            accessibilityValue={{
              min: 0,
              max: Math.round(progress.price * 100),
              now: Math.round(Math.max(0, progress.available) * 100),
              text: `${money(progress.available)} of ${money(progress.price, { trim: true })}`,
            }}
          />
          {today}
        </>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  empty: { gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignStart: { alignSelf: 'flex-start' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  readyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
}));
