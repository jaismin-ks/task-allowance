// components/ui/Banner.js
// Inline message: translucent tint + border + icon + text (never colour alone).
// Actions wrap onto a new line instead of clipping (Figma Add Task sheet bug).
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, size } from '../../theme/tokens';
import { useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

const tonesFor = (colors) => ({
  warning: { tint: colors.warningTint, border: colors.warningBorder, fg: colors.warning, on: colors.onWarning, icon: 'warning' },
  danger: { tint: colors.dangerTint, border: colors.dangerBorder, fg: colors.danger, on: colors.surface, icon: 'alert' },
  info: { tint: colors.surfaceRaised, border: colors.border, fg: colors.textMuted, on: colors.surface, icon: 'info' },
  accent: { tint: colors.accentTint, border: colors.accentRing, fg: colors.accentText, on: colors.surface, icon: 'target' },
});

export function Banner({ tone = 'warning', title, body, actions, onDismiss, icon }) {
  const colors = useColors();
  const t = tonesFor(colors)[tone];
  return (
    <View
      style={[styles.banner, { backgroundColor: t.tint, borderColor: t.border }]}
      accessibilityRole="alert"
    >
      <View style={styles.top}>
        <Icon name={icon ?? t.icon} size={18} color={t.fg} />
        <View style={styles.textCol}>
          {title && <AppText variant="label">{title}</AppText>}
          {body && <AppText variant="body" color={title ? colors.textMuted : colors.text}>{body}</AppText>}
        </View>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.close}
            hitSlop={4}
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {actions?.length > 0 && (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                a.primary ? { backgroundColor: t.fg } : { borderColor: t.border, borderWidth: 1 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <AppText variant="label" color={a.primary ? t.on : colors.text}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, borderWidth: 1, padding: 14, gap: 12 },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  textCol: { flex: 1, gap: 2 },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 28 },
  action: {
    minHeight: size.hit,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
