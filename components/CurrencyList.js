// components/CurrencyList.js — searchable currency list (S14, onboarding)
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CURRENCIES } from '../lib/currencies';
import { currencySymbol } from '../lib/format';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';
import { TextField } from './ui/TextField';

export function CurrencyList({ value, onChange }) {
  const colors = useColors();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <View style={styles.wrap}>
      <TextField
        label="Search currencies"
        placeholder="e.g. CAD or euro"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        right={<Icon name="search" size={18} color={colors.textMuted} />}
      />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Currency">
        {results.length === 0 && (
          <AppText variant="body" color={colors.textMuted} style={styles.none}>
            No currencies match “{query}”.
          </AppText>
        )}
        {results.map((c, i) => {
          const selected = c.code === value;
          return (
            <Pressable
              key={c.code}
              onPress={() => onChange(c.code)}
              accessibilityRole="radio"
              accessibilityLabel={`${c.name}, ${c.code}`}
              accessibilityState={{ selected, checked: selected }}
              style={({ pressed }) => [
                styles.row,
                i < results.length - 1 && styles.divider,
                pressed && { backgroundColor: colors.surfaceRaised },
              ]}
            >
              <AppText variant="numeric" color={colors.textMuted} style={styles.symbol}>
                {currencySymbol(c.code)}
              </AppText>
              <View style={styles.flex}>
                <AppText variant="label">{c.name}</AppText>
                <AppText variant="caption" color={colors.textMuted}>{c.code}</AppText>
              </View>
              {selected && <Icon name="check" size={20} color={colors.accentText} strokeWidth={2.25} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 16 },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  symbol: { width: 36 },
  flex: { flex: 1, paddingVertical: 8 },
  none: { padding: 16 },
}));
