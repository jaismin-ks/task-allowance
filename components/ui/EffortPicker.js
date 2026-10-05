// components/ui/EffortPicker.js
// Segmented control, 5 options with rising bars + number (bar count + name, not colour alone).
import { Pressable, View } from 'react-native';
import { EFFORT_LEVELS } from '../../lib/effort';
import { haptic } from '../../lib/haptics';
import { radius, size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { EffortMeter } from './EffortMeter';

export function EffortPicker({ value, onChange }) {
  const colors = useColors();
  const styles = useStyles();
  const selected = EFFORT_LEVELS[value - 1];
  return (
    <View style={styles.wrap}>
      <AppText variant="label" accessible={false}>Effort</AppText>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Effort">
        {EFFORT_LEVELS.map(({ level, name }) => {
          const on = level === value;
          return (
            <Pressable
              key={level}
              onPress={() => {
                if (!on) haptic.selection();
                onChange(level);
              }}
              accessibilityRole="radio"
              accessibilityLabel={`Effort ${level} of 5, ${name}`}
              accessibilityState={{ selected: on, checked: on }}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <EffortMeter
                level={level}
                activeColor={on ? colors.onAccent : colors.accentText}
                inactiveColor={on ? colors.onAccentMuted : colors.border}
              />
              <AppText variant="caption" color={on ? colors.onAccent : colors.textMuted}>
                {level}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="small" color={colors.textMuted} accessible={false}>
        {selected.name} · {selected.time}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: size.field - 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  segmentOn: { backgroundColor: colors.accent },
}));
