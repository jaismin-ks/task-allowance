// components/ui/Chip.js
// 44pt min height. Selected adds a ✓ glyph so state is not colour-only.
import { Pressable, View } from 'react-native';
import { fonts, radius, size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useFocusRing } from './useFocusRing';

export function Chip({
  label,
  selected,
  onPress,
  showAddGlyph = true,
  accessibilityRole = 'radio',
  accessibilityLabel,
  leading, // optional node after the ✓/+ glyph, e.g. an effort meter
}) {
  const colors = useColors();
  const styles = useStyles();
  const { focusProps, ring } = useFocusRing(radius.pill);
  const fg = selected ? colors.onAccent : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, checked: selected }}
      style={[styles.chip, selected ? styles.on : styles.off]}
      {...focusProps}
    >
      {selected ? (
        <Icon name="check" size={16} color={fg} strokeWidth={2.25} />
      ) : (
        showAddGlyph && <Icon name="plus" size={16} color={colors.textMuted} />
      )}
      {leading}
      <AppText variant="small" color={fg} style={styles.label}>
        {label}
      </AppText>
      {ring && <View pointerEvents="none" style={ring} />}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    minHeight: size.hit,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  on: { backgroundColor: colors.accent },
  off: { borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.sansMedium },
}));
