// app/wishlist/new/details.js — S9 Add item: details. Always reachable — on scrape
// success it's a review screen, on failure the manual form with the reason on top.
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemFields, useItemForm } from '../../../components/ItemFields';
import { AppText } from '../../../components/ui/AppText';
import { Banner } from '../../../components/ui/Banner';
import { Button } from '../../../components/ui/Button';
import { FlowHeader } from '../../../components/ui/Headers';
import { FALLBACK_MESSAGE, SCRAPE_MESSAGES } from '../../../lib/api/scrapeMessages';
import { domainOf, formatMoney, parseMoney } from '../../../lib/format';
import { usePoolStore } from '../../../store/poolStore';
import { showToast } from '../../../store/uiStore';
import { getGoal, useWishlistStore } from '../../../store/wishlistStore';
import { makeStyles, useColors } from '../../../theme/theme';

export default function AddItemDetailsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const addItem = useWishlistStore((s) => s.addItem);
  const currentGoal = getGoal();

  const scraped = params.status === 'success';
  const scrapedPrice = parseMoney(params.price);
  const foreignCurrency = scraped && params.currency && params.currency !== currency ? params.currency : null;

  const form = useItemForm({
    productUrl: params.url ?? '',
    title: scraped ? params.title : '',
    price: scraped && Number.isFinite(scrapedPrice) ? scrapedPrice : null,
    imageUrl: scraped ? params.imageUrl : '',
    currency: foreignCurrency,
    makeGoal: !currentGoal, // on by default only if there's no goal yet
  });

  // ✕ closes the whole flow (the parent root stack pops the modal)
  const closeFlow = () => {
    const parent = navigation.getParent();
    if (parent) parent.goBack();
    else router.back();
  };

  const save = () => {
    const item = form.submit();
    if (!item) return;
    addItem({
      ...item,
      // 'success' only if the user kept the scraped data
      scrapeStatus: scraped && item.title === params.title?.trim() ? 'success' : 'failed_manual_entry',
    });
    usePoolStore.getState().refresh();
    if (item.makeGoal) showToast(`Now saving for ${item.title}.`);
    closeFlow();
  };

  const failure = params.status === 'failed' ? SCRAPE_MESSAGES[params.reason] ?? FALLBACK_MESSAGE : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} collapsable={false}>
      <View style={{ paddingTop: Platform.OS === 'android' ? insets.top : 8 }}>
        <FlowHeader title="Add an item" step="STEP 2 OF 2" onClose={closeFlow} onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText variant="h1" accessibilityRole="header">
            {scraped ? 'Check the details' : 'Add the details'}
          </AppText>
          {scraped && domainOf(params.url) && (
            <AppText variant="body" color={colors.textMuted}>
              Filled in from {domainOf(params.url)}. Check it looks right.
            </AppText>
          )}
        </View>

        {failure && <Banner tone="warning" title={failure.title} body={failure.body} />}
        {foreignCurrency && Number.isFinite(scrapedPrice) && (
          <Banner
            tone="info"
            title={`≈ ${formatMoney(scrapedPrice, foreignCurrency)}`}
            body={`This store lists prices in ${foreignCurrency}. We don’t convert — enter the ${currency} price if you know it.`}
          />
        )}

        <ItemFields form={form} currency={currency} showGoalToggle currentGoalTitle={currentGoal?.title} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="Add to wishlist" onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 24, paddingBottom: 32 },
  intro: { gap: 6 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
}));
