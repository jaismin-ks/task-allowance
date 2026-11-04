// app/onboarding/goal.js — S0 step 2: first wishlist item, becomes the goal (skippable)
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemFields, useItemForm } from '../../components/ItemFields';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/Headers';
import { usePoolStore } from '../../store/poolStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { makeStyles, useColors } from '../../theme/theme';

export default function OnboardingGoal() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const addItem = useWishlistStore((s) => s.addItem);
  const form = useItemForm();

  const finish = () => router.replace('/tasks');

  const save = () => {
    const item = form.submit(['title', 'price', 'productUrl', 'imageUrl']);
    if (!item) return;
    addItem({ ...item, makeGoal: true, scrapeStatus: 'failed_manual_entry' });
    usePoolStore.getState().refresh();
    finish();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <AppText variant="small" color={colors.accentText}>Step 2 of 2</AppText>
          <AppText variant="h1" accessibilityRole="header">What are you saving for?</AppText>
          <AppText variant="body" color={colors.textMuted}>
            Add one thing you want. Every task you finish moves you closer to it.
          </AppText>
        </View>
        <ItemFields form={form} currency={currency} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="Set my goal" arrow onPress={save} />
        <Button label="Skip for now" variant="ghost" onPress={finish} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 28 },
  hero: { gap: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4 },
}));
