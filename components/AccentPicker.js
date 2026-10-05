// components/AccentPicker.js
// Settings → Appearance → Accent colour. Five swatches, each previewed in the
// current mode; selection = ring + ✓ + bold name (never colour alone).
import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { ACCENTS, getPalette } from '../theme/palettes';
import { makeStyles, useColors } from '../theme/theme';
import { fonts, size } from '../theme/tokens';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

const SWATCH = 40;

export function AccentPicker({ value, onChange }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Accent colour">
      {ACCENTS.map((a) => {
        const preview = getPalette(colors.mode, a.key);
        const selected = value === a.key;
        return (
          <Pressable
            key={a.key}
            onPress={() => {
              if (!selected) haptic.selection();
              onChange(a.key);
            }}
            accessibilityRole="radio"
            accessibilityLabel={`${a.name} accent`}
            accessibilityState={{ selected, checked: selected }}
            style={styles.option}
          >
            <View style={[styles.ring, selected && { borderColor: preview.accentText }]}>
              <View style={[styles.swatch, { backgroundColor: preview.accent }]}>
                {selected && <Icon name="check" size={18} color={preview.onAccent} strokeWidth={2.5} />}
              </View>
            </View>
            <AppText
              variant="small"
              color={selected ? colors.text : colors.textMuted}
              style={selected && { fontFamily: fonts.sansSemiBold }}
              maxFontSizeMultiplier={1.3}
            >
              {a.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  option: { alignItems: 'center', gap: 6, minWidth: size.hit, paddingVertical: 4 },
  ring: {
    width: SWATCH + 10,
    height: SWATCH + 10,
    borderRadius: (SWATCH + 10) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Hairline so light swatches (Mono on dark) still have an edge
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
}));
