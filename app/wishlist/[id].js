// app/wishlist/[id].js — S10 Item detail (sheet): view, edit and manage one item.
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ItemFields, useItemForm } from '../../components/ItemFields';
import { ItemImage } from '../../components/ItemImage';
import { itemPriceText } from '../../components/WishlistCard';
import { AppText } from '../../components/ui/AppText';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { SheetHeader } from '../../components/ui/Headers';
import { Icon } from '../../components/ui/Icon';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatMoney } from '../../lib/format';
import { usePoolStore } from '../../store/poolStore';
import { showToast } from '../../store/uiStore';
import { getItem, needsDetails, useWishlistStore } from '../../store/wishlistStore';
import { radius, size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';

export default function ItemDetailScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { setPriority, updateItem, deleteItem, redeem } = useWishlistStore();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const progress = usePoolStore((s) => s.progress);
  const [item, setItem] = useState(() => getItem(id));
  const [editing, setEditing] = useState(() => !!item && needsDetails(item));

  const reload = () => {
    usePoolStore.getState().refresh();
    setItem(getItem(id));
  };

  if (!item) {
    return (
      <View>
        <SheetHeader title="Item details" onClose={() => router.back()} />
        <AppText variant="body" color={colors.textMuted} style={styles.pad}>
          This item is no longer on your wishlist.
        </AppText>
      </View>
    );
  }

  const isGoal = item.priorityFlag && !item.purchasedAt;
  const goalProgress = isGoal && progress?.itemId === item.id ? progress : null;
  const price = itemPriceText(item, currency);

  const makeGoal = () => {
    setPriority(item.id);
    reload();
    showToast(`Now saving for ${item.title}.`);
  };

  const iBoughtIt = () => {
    redeem(item.id);
    usePoolStore.getState().refresh();
    router.replace({ pathname: '/next-goal', params: { mode: 'bought' } });
  };

  const remove = () => {
    const hasOthers = useWishlistStore.getState().others.some((o) => o.id !== item.id);
    if (isGoal) {
      Alert.alert('Remove your goal?', 'Your earned money stays — you’ll just pick a new goal.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteItem(item.id);
            usePoolStore.getState().refresh();
            if (hasOthers) router.replace({ pathname: '/next-goal', params: { mode: 'removed' } });
            else router.back();
          },
        },
      ]);
    } else {
      Alert.alert('Remove from wishlist?', `${item.title} will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteItem(item.id);
            router.back();
          },
        },
      ]);
    }
  };

  if (editing) {
    return (
      <EditItem
        item={item}
        currency={currency}
        onCancel={() => setEditing(false)}
        onSave={(fields) => {
          updateItem(item.id, fields);
          reload();
          setEditing(false);
        }}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <SheetHeader title="Item details" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <ItemImage uri={item.imageUrl} title={item.title} style={styles.image} letterSize={72} />

        <View style={styles.titleBlock}>
          {isGoal && (
            <View style={styles.goalTag}>
              <Icon name="target" size={12} color={colors.onAccent} />
              <AppText variant="caption" color={colors.onAccent}>GOAL</AppText>
            </View>
          )}
          {item.purchasedAt && (
            <AppText variant="caption" color={colors.textMuted}>
              GOT IT · {new Date(item.purchasedAt.replace(' ', 'T') + 'Z').toLocaleDateString()}
            </AppText>
          )}
          <AppText variant="h1">{item.title}</AppText>
          {price && <AppText variant="numeric" color={colors.textMuted}>{price}</AppText>}
          {item.productUrl && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(item.productUrl)}
              accessibilityRole="link"
              accessibilityLabel="View in store"
              style={styles.link}
            >
              <AppText variant="label" color={colors.accentText}>View in store</AppText>
              <Icon name="external" size={16} color={colors.accentText} />
            </Pressable>
          )}
        </View>

        {isGoal && goalProgress?.price != null && (
          <View style={styles.progress}>
            <AppText variant="numeric">
              {formatMoney(goalProgress.available, currency)}{' '}
              <AppText variant="numeric" color={colors.textMuted}>
                of {formatMoney(goalProgress.price, currency)}
              </AppText>
            </AppText>
            {goalProgress.reached ? (
              <Banner tone="accent" icon="check" body="Ready to buy — you’ve earned it." />
            ) : (
              <>
                <ProgressBar
                  percentage={goalProgress.percentage}
                  accessibilityLabel="Goal progress"
                  accessibilityValue={{
                    min: 0,
                    max: Math.round(goalProgress.price * 100),
                    now: Math.round(Math.max(0, goalProgress.available) * 100),
                    text: `${formatMoney(goalProgress.available, currency)} of ${formatMoney(goalProgress.price, currency)}`,
                  }}
                />
                <AppText variant="caption" color={colors.textMuted}>
                  {Math.floor(goalProgress.percentage)}% · {formatMoney(goalProgress.remaining, currency)} TO GO
                </AppText>
              </>
            )}
          </View>
        )}

        {needsDetails(item) && (
          <Banner tone="warning" body="Add a price to track progress." />
        )}

        <View style={styles.actions}>
          {isGoal && goalProgress?.reached && <Button label="I bought it" icon="check" onPress={iBoughtIt} />}
          {!isGoal && !item.purchasedAt && (
            <Button label="Make this my goal" icon="target" onPress={makeGoal} />
          )}
          {!item.purchasedAt && (
            <Button label="Edit" icon="pencil" variant="secondary" onPress={() => setEditing(true)} />
          )}
          <Button label="Remove from wishlist" icon="trash" variant="danger" onPress={remove} />
        </View>
      </ScrollView>
    </View>
  );
}

function EditItem({ item, currency, onCancel, onSave }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const form = useItemForm(item);
  const save = () => {
    const fields = form.submit();
    if (fields) onSave(fields);
  };
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title="Edit item" onClose={onCancel} closeLabel="Cancel editing" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ItemFields form={form} currency={currency} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="Save changes" onPress={save} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingBottom: 32 },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  image: { width: '100%', height: 220, borderRadius: radius.lg },
  titleBlock: { gap: 8 },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: size.hit, alignSelf: 'flex-start' },
  progress: {
    gap: 10,
    padding: 16,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  actions: { gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4 },
}));
