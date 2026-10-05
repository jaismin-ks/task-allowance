// components/ui/MoneyField.js
// Money input: currency symbol as a fixed prefix outside the text, decimal-pad,
// "." or "," accepted, formatted to 2 decimals on blur. Optional −/+ steppers.
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { currencySymbol, parseMoney, toMoneyInput } from '../../lib/format';
import { size, type } from '../../theme/tokens';
import { useColors } from '../../theme/theme';
import { Icon } from './Icon';
import { TextField } from './TextField';

export const MoneyField = forwardRef(function MoneyField(
  { value, onChangeText, currencyCode = 'USD', step, min = 0, max = 999999.99, onBlur, ...props },
  ref
) {
  const bump = (dir) => {
    const current = parseMoney(value);
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) * 100) / 100));
    onChangeText(toMoneyInput(next));
  };

  const steppers = step ? (
    <View style={styles.steppers}>
      <StepButton icon="minus" label={`Decrease by ${step.toFixed(2)}`} onPress={() => bump(-1)} />
      <StepButton icon="plus" label={`Increase by ${step.toFixed(2)}`} onPress={() => bump(1)} />
    </View>
  ) : null;

  return (
    <TextField
      ref={ref}
      prefix={currencySymbol(currencyCode)}
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      inputStyle={styles.input}
      right={steppers}
      onBlur={(e) => {
        const parsed = parseMoney(value);
        if (Number.isFinite(parsed)) onChangeText(toMoneyInput(parsed));
        onBlur?.(e);
      }}
      {...props}
    />
  );
});

function StepButton({ icon, label, onPress }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.border }]}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { ...type.numeric, fontSize: 20 },
  steppers: { flexDirection: 'row', gap: 4, marginRight: -8 },
  step: {
    width: size.hit,
    height: size.hit,
    borderRadius: size.hit / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
