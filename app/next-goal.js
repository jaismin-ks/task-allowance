// app/next-goal.js — "What's next?" after "I bought it" (S11), or "Pick a new goal"
// after removing the goal (S10). Lists the remaining items; tapping one sets it as the goal.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemImage } from '../components/ItemImage';
import { itemPriceText } from '../components/WishlistCard';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { SheetHeader } from '../components/ui/Headers';
import { Icon } from '../components/ui/Icon';
import { usePoolStore } from '../store/poolStore';
import { showToast } from '../store/uiStore';
import { useWishlistStore } from '../store/wishlistStore';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

export default function NextGoalScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { mode } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { others, loadItems, setPriority } = useWishlistStore();
  const currency = usePoolStore((s) => s.budget.currencyCode);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const pick = (item) => {
    setPriority(item.id);
    usePoolStore.getState().refresh();
    showToast(`Now saving for ${item.title}.`);
    router.back();
  };

  return (
    <View style={styles.flex}>
      <SheetHeader title={mode === 'bought' ? 'What’s next?' : 'Pick a new goal'} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {mode === 'bought' && (
          <AppText variant="body" color={colors.textMuted}>
            Nice work. It’s in your “Got it” list. Pick what to save for next.
          </AppText>
        )}
        {others.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="body" color={colors.textMuted}>Your wishlist is empty.</AppText>
            <Button label="Add an item" icon="plus" onPress={() => router.replace('/wishlist/new')} />
          </View>
        ) : (
          others.map((item) => {
            const price = itemPriceText(item, currency);
            return (
              <Pressable
                key={item.id}
                onPress={() => pick(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${price ? `, ${price}` : ''}`}
                accessibilityHint="Makes this your goal"
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
              >
                <ItemImage uri={item.imageUrl} title={item.title} style={styles.thumb} letterSize={22} />
                <View style={styles.flex}>
                  <AppText variant="label" numberOfLines={2}>{item.title}</AppText>
                  {price && <AppText variant="numeric" color={colors.textMuted}>{price}</AppText>}
                </View>
                <Icon name="chevron-right" color={colors.textMuted} />
              </Pressable>
            );
          })
        )}
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  empty: { gap: 16, paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.sm },
}));
