// components/ItemFields.js
// Wishlist item fields (spec §5.3) shared by Add item details (S9), Item detail
// edit (S10) and onboarding's first goal.
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { parseMoney, toMoneyInput } from '../lib/format';
import { validate } from '../lib/validation';

import { PhotoField } from './PhotoField';
import { AppText } from './ui/AppText';
import { MoneyField } from './ui/MoneyField';
import { TextField } from './ui/TextField';
import { Toggle } from './ui/Toggle';
import { useColors } from '../theme/theme';

export function useItemForm(initial = {}) {
  const [values, setValues] = useState({
    productUrl: initial.productUrl ?? '',
    title: initial.title ?? '',
    price: initial.price > 0 ? toMoneyInput(initial.price) : '',
    imageUrl: initial.imageUrl ?? '',
    // Scraped currency is kept only while the scraped price is untouched
    currency: initial.currency ?? null,
    makeGoal: initial.makeGoal ?? false,
  });
  const [errors, setErrors] = useState({});
  // Field nodes are registered with callback refs so render never reads a ref
  const nodes = useRef({});
  const register = (field) => (el) => {
    nodes.current[field] = el;
  };
  const focus = (field) => nodes.current[field]?.focus();

  const rules = {
    productUrl: (v) => validate.productUrl(v),
    title: validate.itemName,
    price: validate.price,
    imageUrl: validate.imageUrl,
  };

  const set = (field, v) => {
    setValues((s) => ({ ...s, [field]: v, ...(field === 'price' ? { currency: null } : null) }));
    if (errors[field] && rules[field] && !rules[field](v)) setErrors((e) => ({ ...e, [field]: null }));
  };
  const blur = (field) => setErrors((e) => ({ ...e, [field]: rules[field](values[field]) }));

  // Returns the fields to save, or null after focusing the first invalid field
  const submit = (fields = ['productUrl', 'title', 'price', 'imageUrl']) => {
    const next = {};
    fields.forEach((f) => (next[f] = rules[f](values[f])));
    setErrors(next);
    const firstBad = fields.find((f) => next[f]);
    if (firstBad) {
      focus(firstBad);
      return null;
    }
    return {
      productUrl: values.productUrl.trim() || null,
      title: values.title.trim(),
      price: parseMoney(values.price),
      imageUrl: values.imageUrl.trim() || null,
      currency: values.currency,
      makeGoal: values.makeGoal,
    };
  };

  return { values, errors, set, blur, submit, register, focus };
}

export function ItemFields({
  form,
  currency,
  showLink = true,
  showImage = true,
  showGoalToggle = false,
  currentGoalTitle,
}) {
  const colors = useColors();
  const { values, errors, set, blur, register, focus } = form;
  return (
    <View style={styles.fields}>
      {showLink && (
        <TextField
          ref={register('productUrl')}
          label="Product link"
          optional
          placeholder="https://"
          value={values.productUrl}
          onChangeText={(v) => set('productUrl', v)}
          onBlur={() => blur('productUrl')}
          error={errors.productUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => focus('title')}
        />
      )}
      <TextField
        ref={register('title')}
        label="Item name"
        placeholder="e.g. Sony WH-1000XM5"
        value={values.title}
        onChangeText={(v) => set('title', v)}
        onBlur={() => blur('title')}
        error={errors.title}
        multiline
        numberOfLines={2}
        maxLength={120}
        submitBehavior="blurAndSubmit"
        returnKeyType="next"
        onSubmitEditing={() => focus('price')}
        inputStyle={styles.twoLines}
      />
      <MoneyField
        ref={register('price')}
        label="Price"
        currencyCode={currency}
        helper="Used to track your progress."
        placeholder="0.00"
        value={values.price}
        onChangeText={(v) => set('price', v)}
        onBlur={() => blur('price')}
        error={errors.price}
      />
      {showImage && (
        <PhotoField
          value={values.imageUrl}
          onChange={(v) => set('imageUrl', v)}
          title={values.title}
          linkRef={register('imageUrl')}
          linkError={errors.imageUrl}
          onLinkBlur={() => blur('imageUrl')}
        />
      )}
      {showGoalToggle && (
        <View style={styles.toggleRow}>
          <View style={styles.flex}>
            <AppText variant="label">Make this my goal</AppText>
            {values.makeGoal && currentGoalTitle && (
              <AppText variant="small" color={colors.textMuted}>Replaces {currentGoalTitle}.</AppText>
            )}
          </View>
          <Toggle
            value={values.makeGoal}
            onValueChange={(v) => set('makeGoal', v)}
            accessibilityLabel="Make this my goal"
            accessibilityHint={values.makeGoal && currentGoalTitle ? `Replaces ${currentGoalTitle}.` : undefined}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 24 },
  flex: { flex: 1, gap: 2 },
  twoLines: { minHeight: 0, maxHeight: 64 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
