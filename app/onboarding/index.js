// app/onboarding/index.js — S0 step 1: monthly allowance + currency (skippable).
// Without this, a non-US user would silently get $150 USD.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllowanceField } from '../../components/AllowanceField';
import { CurrencyList } from '../../components/CurrencyList';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { ensureUserProfile, updateMonthlyCap, updateProfile } from '../../db/operations/userProfile';
import { CURRENCIES, deviceCurrency } from '../../lib/currencies';
import { parseMoney } from '../../lib/format';
import { validate } from '../../lib/validation';
import { usePoolStore } from '../../store/poolStore';
import { radius, size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';

export default function OnboardingAllowance() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [currency, setCurrency] = useState(deviceCurrency);
  const [allowance, setAllowance] = useState('150.00');
  const [error, setError] = useState(null);
  const [picking, setPicking] = useState(false);

  const saveProfile = (cap) => {
    ensureUserProfile({ monthlyAllowanceCap: cap, currencyCode: currency });
    updateMonthlyCap(cap);
    updateProfile({ currencyCode: currency });
    usePoolStore.getState().refresh();
  };

  const next = () => {
    const err = validate.allowance(allowance);
    setError(err);
    if (err) return;
    saveProfile(parseMoney(allowance));
    router.push('/onboarding/goal');
  };

  // Skip keeps $150 but still uses the device's currency
  const skip = () => {
    saveProfile(150);
    router.replace('/tasks');
  };

  const currencyName = CURRENCIES.find((c) => c.code === currency)?.name ?? currency;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <AppText variant="small" color={colors.accentText}>Step 1 of 2</AppText>
          <AppText variant="displayXL" accessibilityRole="header">Earn the things you want.</AppText>
          <AppText variant="displayItalic" color={colors.textMuted} style={styles.tagline}>
            A guilt-free allowance, paid in effort.
          </AppText>
        </View>

        <AllowanceField
          value={allowance}
          onChangeText={(v) => {
            setAllowance(v);
            if (error && !validate.allowance(v)) setError(null);
          }}
          onBlur={() => setError(validate.allowance(allowance))}
          error={error}
          currency={currency}
        />

        <View style={styles.currency}>
          <AppText variant="label">Currency</AppText>
          <Pressable
            onPress={() => setPicking((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel={`Currency, ${currencyName}`}
            accessibilityHint="Changes the symbol only. Amounts aren’t converted."
            accessibilityState={{ expanded: picking }}
            style={styles.currencyRow}
          >
            <AppText variant="bodyLarge" style={styles.flex}>
              {currencyName} <AppText variant="numeric" color={colors.textMuted}>{currency}</AppText>
            </AppText>
            <AppText variant="label" color={colors.accentText}>{picking ? 'Done' : 'Change'}</AppText>
            <Icon name="chevron-right" size={18} color={colors.accentText} />
          </Pressable>
          <AppText variant="small" color={colors.textMuted}>
            Changes the symbol only. Amounts aren’t converted.
          </AppText>
          {picking && (
            <CurrencyList
              value={currency}
              onChange={(c) => {
                setCurrency(c);
                setPicking(false);
              }}
            />
          )}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="Continue" arrow onPress={next} />
        <Button label="Skip for now" variant="ghost" onPress={skip} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 28 },
  hero: { gap: 8 },
  tagline: { fontSize: 26, lineHeight: 30 },
  currency: { gap: 8 },
  currencyRow: {
    minHeight: size.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4 },
}));
