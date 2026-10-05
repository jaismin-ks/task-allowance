// app/(tabs)/settings/currency.js — S14 Currency (explicit Save). Symbol only — no conversion.
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrencyList } from '../../../components/CurrencyList';
import { useBottomChrome } from '../../../components/layout';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { PushHeader } from '../../../components/ui/Headers';
import { updateProfile } from '../../../db/operations/userProfile';
import { usePoolStore } from '../../../store/poolStore';
import { makeStyles, useColors } from '../../../theme/theme';

export default function CurrencyScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { tabContentPadding } = useBottomChrome();
  const { budget, refresh } = usePoolStore();
  const [code, setCode] = useState(budget.currencyCode);

  const save = () => {
    updateProfile({ currencyCode: code });
    refresh();
    router.back();
  };

  return (
    <View style={styles.flex}>
      <View style={{ paddingTop: insets.top }}>
        <PushHeader title="Currency" onBack={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabContentPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="body" color={colors.textMuted}>
          Changes the symbol only. Amounts aren’t converted.
        </AppText>
        <Button label={`Save · ${code}`} onPress={save} />
        <CurrencyList value={code} onChange={setCode} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
}));
