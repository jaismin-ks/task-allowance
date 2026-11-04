// components/ui/Headers.js
// Header for each presentation type (spec §3.2):
//  SheetHeader — bottom sheets: title + ✕ on the right (grabber is native)
//  FlowHeader  — modal stacks: ✕ (left) closes the flow, ← goes back a step, step title
//  PushHeader  — Settings sub-pages: back arrow + title
// Titles are the first thing focused when a sheet opens (accessibilityRole="header").
import { Pressable, StyleSheet, View } from 'react-native';
import { size } from '../../theme/tokens';
import { useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function IconButton({ icon, label, onPress, color, style, size: iconSize = 22 }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surfaceRaised }, style]}
    >
      <Icon name={icon} size={iconSize} color={color ?? colors.text} />
    </Pressable>
  );
}

// SHEET_ROOT: iOS form sheets (react-native-screens) look for a ScrollView among the
// sheet's top-level native views and resize/position it themselves, assuming at most
// [header, ScrollView]. Fabric flattens layout-only views (a KeyboardAvoidingView,
// this header), which exposes the form's ScrollView and the header's text as loose
// top-level views, and the ScrollView ends up drawn over the header. So every sheet
// root is `collapsable={false}`, and headers are too.
export function SheetHeader({ title, onClose, closeLabel = 'Close' }) {
  return (
    <View style={styles.sheetHeader} collapsable={false}>
      <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {onClose && <IconButton icon="close" label={closeLabel} onPress={onClose} />}
    </View>
  );
}

export function FlowHeader({ title, step, onClose, onBack }) {
  const colors = useColors();
  return (
    <View style={styles.flowHeader} collapsable={false}>
      <View style={styles.flowSide}>
        <IconButton icon="close" label="Close" onPress={onClose} />
        {onBack && <IconButton icon="chevron-left" label="Back" onPress={onBack} />}
      </View>
      <View style={styles.flowTitle}>
        <AppText variant="label" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
        {step && (
          <AppText variant="small" color={colors.textMuted}>
            {step}
          </AppText>
        )}
      </View>
      <View style={styles.flowSide} />
    </View>
  );
}

export function PushHeader({ title, onBack }) {
  return (
    <View style={styles.pushHeader}>
      <IconButton icon="chevron-left" label="Back" onPress={onBack} />
      <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconBtn: {
    width: size.hit,
    height: size.hit,
    borderRadius: size.hit / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  flowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 56,
  },
  flowSide: { width: 96, flexDirection: 'row' },
  flowTitle: { flex: 1, alignItems: 'center' },
  pushHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    minHeight: 56,
  },
});
