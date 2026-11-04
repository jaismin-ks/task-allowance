// components/SettingsList.js — grouped, iOS-style list primitives for Settings (S12)
import { Pressable, StyleSheet, View } from 'react-native';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function SettingsGroup({ title, children, footer }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <AppText variant="label" color={colors.textMuted} style={styles.groupTitle} accessibilityRole="header">
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
      {footer && (
        <AppText variant="small" color={colors.textMuted} style={styles.footer}>
          {footer}
        </AppText>
      )}
    </View>
  );
}

// Navigation row (label + value + chevron), read-only row (no onPress), or control row (`right`)
export function SettingsRow({ label, value, helper, onPress, right, danger, last, accessibilityLabel }) {
  const colors = useColors();
  const styles = useStyles();
  const content = (
    <>
      <View style={styles.textCol}>
        <AppText variant="label" color={danger ? colors.danger : colors.text}>{label}</AppText>
        {helper && <AppText variant="small" color={colors.textMuted}>{helper}</AppText>}
      </View>
      {value != null && (
        <AppText variant="numeric" color={colors.textMuted} style={styles.value}>{value}</AppText>
      )}
      {right}
      {onPress && !danger && <Icon name="chevron-right" size={18} color={colors.textMuted} />}
    </>
  );
  const rowStyle = [styles.row, !last && styles.divider];
  if (!onPress) {
    return (
      <View style={rowStyle} accessible={!right} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value != null ? `${label}, ${value}` : label)}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: colors.surfaceRaised }]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: 4 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  textCol: { flex: 1, gap: 2 },
  value: { fontSize: 15 },
}));
