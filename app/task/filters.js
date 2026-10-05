// app/task/filters.js — "Sort & filter" sheet for the Tasks list.
// Changes apply live; the button shows how many tasks match right now.
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { EffortMeter } from '../../components/ui/EffortMeter';
import { SheetHeader } from '../../components/ui/Headers';
import { MoneyField } from '../../components/ui/MoneyField';
import { EFFORT_LEVELS } from '../../lib/effort';
import { parseMoney, toMoneyInput } from '../../lib/format';
import { applyTaskFilters, SORTS } from '../../lib/taskFilters';
import { usePoolStore } from '../../store/poolStore';
import { useTaskFilters } from '../../store/taskFilterStore';
import { useTaskStore } from '../../store/taskStore';
import { makeStyles, useColors } from '../../theme/theme';

export default function TaskFiltersScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const filters = useTaskFilters();
  const { sort, setSort, efforts, toggleEffort, minValue, maxValue, setValueRange, resetFilters } = filters;
  const { pending, completedToday } = useTaskStore();
  const currency = usePoolStore((s) => s.budget.currencyCode);

  // Text in the money fields; the store only receives valid numbers
  const [minText, setMinText] = useState(minValue != null ? toMoneyInput(minValue) : '');
  const [maxText, setMaxText] = useState(maxValue != null ? toMoneyInput(maxValue) : '');
  const [rangeError, setRangeError] = useState(null);

  const applyRange = (minT, maxT, { showErrors = false } = {}) => {
    const min = minT.trim() ? parseMoney(minT) : null;
    const max = maxT.trim() ? parseMoney(maxT) : null;
    let err = null;
    if ((min != null && !(min >= 0)) || (max != null && !(max >= 0))) err = 'Enter an amount, like 1.50.';
    else if (min != null && max != null && min > max) err = 'Max should be more than min.';
    if (showErrors || !err) setRangeError(err);
    if (!err) setValueRange(min, max);
  };

  const matches = applyTaskFilters([...pending, ...completedToday], filters).length;

  const reset = () => {
    resetFilters();
    setMinText('');
    setMaxText('');
    setRangeError(null);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title="Sort & filter" onClose={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.group}>
          <AppText variant="label" accessibilityRole="header">Sort by</AppText>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Sort by">
            {SORTS.map((s) => (
              <Chip key={s.key} label={s.label} selected={sort === s.key} showAddGlyph={false} onPress={() => setSort(s.key)} />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="label" accessibilityRole="header">Effort</AppText>
          <View style={styles.chips}>
            {EFFORT_LEVELS.map(({ level, name }) => {
              const on = efforts.includes(level);
              return (
                <Chip
                  key={level}
                  label={name}
                  selected={on}
                  showAddGlyph={false}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Effort ${level} of 5, ${name}`}
                  onPress={() => toggleEffort(level)}
                  leading={
                    <EffortMeter
                      level={level}
                      scale={0.8}
                      activeColor={on ? colors.onAccent : colors.accentText}
                      inactiveColor={on ? colors.onAccentMuted : colors.border}
                    />
                  }
                />
              );
            })}
          </View>
          <AppText variant="small" color={colors.textMuted}>
            {efforts.length ? 'Showing only the levels you picked.' : 'All effort levels.'}
          </AppText>
        </View>

        <View style={styles.group}>
          <AppText variant="label" accessibilityRole="header">Value</AppText>
          <View style={styles.range}>
            <MoneyField
              label="Min"
              optional
              currencyCode={currency}
              placeholder="0.00"
              value={minText}
              onChangeText={(t) => {
                setMinText(t);
                applyRange(t, maxText);
              }}
              onBlur={() => applyRange(minText, maxText, { showErrors: true })}
              containerStyle={styles.flex}
            />
            <MoneyField
              label="Max"
              optional
              currencyCode={currency}
              placeholder="Any"
              value={maxText}
              onChangeText={(t) => {
                setMaxText(t);
                applyRange(minText, t);
              }}
              onBlur={() => applyRange(minText, maxText, { showErrors: true })}
              containerStyle={styles.flex}
            />
          </View>
          {rangeError ? (
            <AppText variant="small" color={colors.danger} accessibilityLiveRegion="polite">{rangeError}</AppText>
          ) : (
            <AppText variant="small" color={colors.textMuted}>Leave either one blank for no limit.</AppText>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          label={matches === 0 ? 'No tasks match' : `Show ${matches} ${matches === 1 ? 'task' : 'tasks'}`}
          onPress={() => router.back()}
        />
        <Button label="Reset" variant="ghost" onPress={reset} />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 28 },
  group: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  range: { flexDirection: 'row', gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 4, backgroundColor: colors.surface },
}));
