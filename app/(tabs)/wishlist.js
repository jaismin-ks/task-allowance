// app/(tabs)/wishlist.js — S7 Wishlist: goal pinned on top, 2-column grid, "Got it" at the bottom
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_GUTTER, useBottomChrome } from '../../components/layout';
import { WishlistCard, WishlistGoalCard } from '../../components/WishlistCard';
import { AppText } from '../../components/ui/AppText';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { usePoolStore } from '../../store/poolStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { makeStyles } from '../../theme/theme';

function Grid({ items, currency }) {
  const styles = useStyles();
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((pair) => (
        <View key={pair[0].id} style={styles.gridRow}>
          {pair.map((item) => (
            <WishlistCard key={item.id} item={item} currency={currency} />
          ))}
          {pair.length === 1 && <View style={styles.flex} />}
        </View>
      ))}
    </View>
  );
}

export default function WishlistScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { tabContentPadding } = useBottomChrome();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const { goal, others, purchased, loaded, loadItems } = useWishlistStore();
  const { progress, budget, refresh } = usePoolStore();
  const currency = budget.currencyCode;

  useFocusEffect(
    useCallback(() => {
      loadItems();
      refresh();
    }, [loadItems, refresh])
  );

  const isEmpty = loaded && !goal && others.length === 0 && purchased.length === 0;
  const addItem = () => router.push('/wishlist/new');

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: tabContentPadding },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="h1" accessibilityRole="header">Wishlist</AppText>
        <Button label="Add" icon="plus" small variant="secondary" onPress={addItem} accessibilityLabel="Add an item" />
      </View>

      {isEmpty ? (
        <EmptyState
          icon="gift"
          headline="Your wishlist is empty."
          body="Add something you want to earn — paste a link or type it in."
        >
          <Button label="Add an item" icon="plus" onPress={addItem} />
        </EmptyState>
      ) : (
        <>
          {goal ? (
            <WishlistGoalCard item={goal} progress={progress} currency={currency} />
          ) : (
            others.length > 0 && (
              <Banner tone="accent" body="Pick a goal to start tracking progress." />
            )
          )}
          {others.length > 0 && <Grid items={others} currency={currency} />}
          {purchased.length > 0 && (
            <View style={styles.section}>
              <AppText variant="h2" accessibilityRole="header">Got it</AppText>
              <Grid items={purchased} currency={currency} />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: SCREEN_GUTTER, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  section: { gap: 12, marginTop: 12 },
}));
