// app/settings/allowance.js — S13 Monthly allowance (explicit Save)
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllowanceField } from '../../components/AllowanceField';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PushHeader } from '../../components/ui/Headers';
import { updateMonthlyCap } from '../../db/operations/userProfile';
import { parseMoney, toMoneyInput } from '../../lib/format';
import { validate } from '../../lib/validation';
import { usePoolStore } from '../../store/poolStore';
import { makeStyles } from '../../theme/theme';

export default function AllowanceScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { budget, earnedToday, refresh } = usePoolStore();
  const [value, setValue] = useState(toMoneyInput(budget.monthlyAllowanceCap));
  const [error, setError] = useState(null);
  const midMonth = new Date().getDate() > 1 || budget.totalEarnedThisMonth > 0;

  const save = () => {
    const err = validate.allowance(value);
    setError(err);
    if (err) return;
    updateMonthlyCap(parseMoney(value));
    refresh();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }}>
        <PushHeader title="Monthly allowance" onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <AllowanceField
          value={value}
          onChangeText={(v) => {
            setValue(v);
            if (error && !validate.allowance(v)) setError(null);
          }}
          onBlur={() => setError(validate.allowance(value))}
          error={error}
          currency={budget.currencyCode}
          earnedBeforeToday={budget.totalEarnedThisMonth - earnedToday}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {midMonth && (
          <Banner
            tone="info"
            body="Changing this won’t take back anything you’ve earned. Your daily guide will update."
          />
        )}
        <Button label="Save" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
}));
