// components/ui/Toggle.js
// Knob slides with a spring; state is also knob position + track fill, never colour alone.
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/prefs';
import { springs } from '../../theme/motion';
import { size } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { useFocusRing } from './useFocusRing';

const TRACK_W = 52;
const KNOB = 24;
const TRAVEL = TRACK_W - KNOB - 8;

export function Toggle({ value, onValueChange, accessibilityLabel, accessibilityHint, disabled }) {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const x = useSharedValue(value ? TRAVEL : 0);
  const { focusProps, ring } = useFocusRing(16);

  useEffect(() => {
    x.set(reduced ? (value ? TRAVEL : 0) : withSpring(value ? TRAVEL : 0, springs.GENTLE));
  }, [value, reduced, x]);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled }}
      style={styles.hit}
      {...focusProps}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff, disabled && { opacity: 0.45 }]}>
        <Animated.View
          style={[styles.knob, { backgroundColor: value ? colors.onAccent : colors.textMuted }, knobStyle]}
        />
        {ring && <View pointerEvents="none" style={ring} />}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  hit: { minHeight: size.hit, minWidth: size.hit, justifyContent: 'center' },
  track: { width: TRACK_W, height: 32, borderRadius: 16, padding: 4, justifyContent: 'center' },
  trackOn: { backgroundColor: colors.accent },
  trackOff: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
}));
