// components/ui/Button.js
// 56pt pill. While pressing: fill dims and the trailing arrow nudges 6px right
// (EASE_OUT 200ms). The dim is a translucent overlay — not a solid swap.
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/prefs';
import { nudge, timings } from '../../theme/motion';
import { radius, size } from '../../theme/tokens';
import { useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useFocusRing } from './useFocusRing';

const variantsFor = (colors) => ({
  primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
  secondary: { bg: colors.surfaceRaised, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
  danger: { bg: 'transparent', fg: colors.danger, border: 'transparent' },
  // On an accent-filled screen (Goal reached): onAccent pill, accent label
  ink: { bg: colors.onAccent, fg: colors.accent, border: colors.onAccent },
  inkGhost: { bg: 'transparent', fg: colors.onAccent, border: colors.onAccentMuted },
});

export function Button({
  label,
  onPress,
  variant = 'primary',
  small = false,
  arrow = false,
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}) {
  const colors = useColors();
  const v = variantsFor(colors)[variant];
  const reduced = useReducedMotion();
  const shift = useSharedValue(0);
  const { focusProps, ring } = useFocusRing(radius.pill);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() }] }));
  const height = small ? size.hit : size.button;

  const setPressed = (pressed) => {
    if (!arrow || reduced) return;
    shift.set(withTiming(pressed ? nudge.buttonArrow : 0, timings.EASE_OUT));
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      hitSlop={small ? 4 : 0}
      {...focusProps}
      style={[
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: small ? 16 : 24,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {pressed && <View pointerEvents="none" style={[styles.dim, { borderRadius: radius.pill }]} />}
          {loading && !loadingLabel ? (
            <ActivityIndicator color={v.fg} />
          ) : (
            <View style={styles.row}>
              {loading && <ActivityIndicator color={v.fg} />}
              {!loading && icon && <Icon name={icon} size={18} color={v.fg} />}
              <AppText variant="label" color={v.fg} style={styles.label}>
                {loading ? loadingLabel : label}
              </AppText>
              {arrow && !loading && (
                <Animated.View style={arrowStyle}>
                  <Icon name="arrow-right" size={18} color={v.fg} />
                </Animated.View>
              )}
            </View>
          )}
          {ring && <View pointerEvents="none" style={ring} />}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.18)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { textAlign: 'center', flexShrink: 1 },
});
