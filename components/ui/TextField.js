// components/ui/TextField.js
// Spec §5.1: visible label above, helper below; an error replaces the helper in the
// same spot (no layout jump) and shows border + icon + text. Label is the
// accessibilityLabel, helper/error is the hint; new errors are announced politely.
import { forwardRef, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, TextInput, View } from 'react-native';
import { MAX_FONT_SCALE, radius, size, type } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export const TextField = forwardRef(function TextField(
  {
    label,
    optional = false,
    helper,
    error,
    prefix,
    right,
    multiline = false,
    counter,
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    ...inputProps
  },
  ref
) {
  const colors = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const lastError = useRef(null);

  useEffect(() => {
    if (error && error !== lastError.current) AccessibilityInfo.announceForAccessibility(error);
    lastError.current = error ?? null;
  }, [error]);

  const borderColor = error ? colors.danger : focused ? colors.focus : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.labelRow}>
        <AppText variant="label" accessible={false}>
          {label}
          {optional && <AppText variant="body" color={colors.textMuted}> (optional)</AppText>}
        </AppText>
        {counter && (
          <AppText variant="caption" color={colors.textMuted} accessible={false}>
            {counter}
          </AppText>
        )}
      </View>
      <View style={[styles.field, multiline && styles.multiline, { borderColor }]}>
        {prefix != null && (
          <AppText variant="numeric" color={colors.textMuted} style={styles.prefix} accessible={false}>
            {prefix}
          </AppText>
        )}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accentText}
          keyboardAppearance={colors.mode}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          multiline={multiline}
          accessibilityLabel={optional ? `${label}, optional` : label}
          accessibilityHint={error ?? helper}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {right}
      </View>
      {error ? (
        <View style={styles.messageRow} accessible={false}>
          <Icon name="alert" size={16} color={colors.danger} />
          <AppText variant="small" color={colors.danger} style={styles.message}>
            {error}
          </AppText>
        </View>
      ) : helper ? (
        <AppText variant="small" color={colors.textMuted} style={styles.helper} accessible={false}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  field: {
    minHeight: size.field,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  prefix: { marginRight: -2 },
  input: { ...type.bodyLarge, flex: 1, color: colors.text, paddingVertical: 14 },
  inputMultiline: { minHeight: 72, paddingVertical: 2, textAlignVertical: 'top' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  message: { flex: 1 },
  helper: {},
}));
