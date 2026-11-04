// components/WishlistCard.js
// Grid card (S7) and the pinned goal card. Tap → Item detail (S10).
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { formatMoney } from '../lib/format';
import { needsDetails } from '../store/wishlistStore';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { ItemImage } from './ItemImage';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { ProgressBar } from './ui/ProgressBar';

// Scraped in another currency: show it as-is with "≈" — never converted
export function itemPriceText(item, userCurrency) {
  if (!(item.price > 0)) return null;
  const foreign = item.currency && item.currency !== userCurrency;
  return foreign
    ? `≈ ${formatMoney(item.price, item.currency)}`
    : formatMoney(item.price, userCurrency);
}

function Tag({ label, tone }) {
  const colors = useColors();
  const styles = useStyles();
  const bg = tone === 'warning' ? colors.warningTint : tone === 'accent' ? colors.accent : colors.surfaceRaised;
  const fg = tone === 'warning' ? colors.warning : tone === 'accent' ? colors.onAccent : colors.textMuted;
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <AppText variant="caption" color={fg}>{label}</AppText>
    </View>
  );
}

export function WishlistCard({ item, currency }) {
  const colors = useColors();
  const styles = useStyles();
  const price = itemPriceText(item, currency);
  const details = needsDetails(item);
  const got = !!item.purchasedAt;
  const label = [item.title, price, details && 'needs details', got && 'got it'].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => router.push(`/wishlist/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, got && styles.got]}
    >
      <ItemImage uri={item.imageUrl} title={item.title} style={styles.image} />
      <View style={styles.body}>
        <AppText variant="label" numberOfLines={2}>{item.title}</AppText>
        {price && <AppText variant="numeric" color={colors.textMuted}>{price}</AppText>}
        {details && <Tag label="ADD DETAILS" tone="warning" />}
        {got && <Tag label="GOT IT" />}
      </View>
    </Pressable>
  );
}

export function WishlistGoalCard({ item, progress, currency }) {
  const colors = useColors();
  const styles = useStyles();
  const price = itemPriceText(item, currency);
  const label = [item.title, price, 'goal'].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={() => router.push(`/wishlist/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.goal, pressed && styles.pressed]}
    >
      <ItemImage uri={item.imageUrl} title={item.title} style={styles.goalImage} letterSize={56} />
      <View style={styles.goalBody}>
        <View style={styles.tagRow}>
          <View style={styles.goalTag}>
            <Icon name="target" size={12} color={colors.onAccent} />
            <AppText variant="caption" color={colors.onAccent}>GOAL</AppText>
          </View>
          {progress?.reached && <Tag label="READY TO BUY" tone="accent" />}
        </View>
        <AppText variant="h2" numberOfLines={2}>{item.title}</AppText>
        {price ? (
          <AppText variant="numeric" color={colors.textMuted}>{price}</AppText>
        ) : (
          <Tag label="ADD DETAILS" tone="warning" />
        )}
        {progress?.price != null && !progress.reached && (
          <>
            <ProgressBar
              percentage={progress.percentage}
              accessibilityLabel="Goal progress"
              accessibilityValue={{
                min: 0,
                max: Math.round(progress.price * 100),
                now: Math.round(Math.max(0, progress.available) * 100),
                text: `${formatMoney(progress.available, currency)} of ${formatMoney(progress.price, currency)}`,
              }}
            />
            <AppText variant="caption" color={colors.textMuted}>
              {formatMoney(progress.remaining, currency)} to go
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  got: { opacity: 0.7 },
  image: { width: '100%', aspectRatio: 1 },
  body: { padding: 12, gap: 6 },
  tag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  goal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentRing,
    overflow: 'hidden',
  },
  goalImage: { width: '100%', height: 180 },
  goalBody: { padding: 16, gap: 8 },
  tagRow: { flexDirection: 'row', gap: 8 },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
}));
