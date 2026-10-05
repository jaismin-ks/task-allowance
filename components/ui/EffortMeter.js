// components/ui/EffortMeter.js
// Rising bars encode effort by height AND count, so it survives greyscale.
// Decorative — the enclosing row/control speaks "effort n of 5".
import { StyleSheet, View } from 'react-native';
import { useColors } from '../../theme/theme';

export function EffortMeter({ level, scale = 1, activeColor, inactiveColor }) {
  const colors = useColors();
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            width: 3 * scale,
            height: (4 + i * 2) * scale,
            borderRadius: 1.5 * scale,
            marginRight: i < 5 ? 2 * scale : 0,
            backgroundColor: i <= level ? activeColor ?? colors.accentText : inactiveColor ?? colors.border,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'flex-end' } });
