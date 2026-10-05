// components/ui/Checkbox.js
// 28pt visual inside a 44pt hit area. Becoming checked → spring pop (BOUNCY, 450ms).
// Pass `onPress` for a standalone control; omit it when a parent row is the tap target.
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/prefs';
import { springs } from '../../theme/motion';
import { size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { Icon } from './Icon';

export function Checkbox({ checked, onPress, accessibilityLabel }) {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked && !wasChecked.current && !reduced) {
      scale.set(withSequence(withTiming(0.8, { duration: 60 }), withSpring(1, springs.BOUNCY)));
    }
    wasChecked.current = checked;
  }, [checked, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const box = (
    <Animated.View style={[styles.box, checked ? styles.checked : styles.unchecked, animated]}>
      {checked && <Icon name="check" size={16} color={colors.onAccent} strokeWidth={2.5} />}
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View style={styles.hit} accessible={false} importantForAccessibility="no-hide-descendants">
        {box}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={styles.hit}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
    >
      {box}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  hit: { width: size.hit, height: size.hit, alignItems: 'center', justifyContent: 'center' },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: size.checkbox / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unchecked: { borderWidth: 1.5, borderColor: colors.textMuted },
  checked: { backgroundColor: colors.accent },
}));
