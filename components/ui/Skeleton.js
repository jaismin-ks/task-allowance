// components/ui/Skeleton.js
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/prefs';
import { radius } from '../../theme/tokens';
import { useColors } from '../../theme/theme';

export function Skeleton({ height = 16, width = '100%', borderRadius = radius.sm, style }) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (!reduced) opacity.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [reduced, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View
      accessible={false}
      style={[{ height, width, borderRadius, backgroundColor: colors.surfaceRaised }, animated, style]}
    />
  );
}
