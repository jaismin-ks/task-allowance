// components/ui/ProgressBar.js
// Lime = earned. Animates to its value; under Reduce Motion it jumps.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '../../lib/prefs';
import { timings } from '../../theme/motion';
import { makeStyles } from '../../theme/theme';

// accessibilityValue: { min, max, now, text } — e.g. text "$124.50 of $349"
export function ProgressBar({ percentage = 0, height = 8, accessibilityValue, accessibilityLabel }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percentage || 0));
  const width = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    width.set(reduced ? clamped : withTiming(clamped, timings.PROGRESS));
  }, [clamped, reduced, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }]}
      accessible={!!accessibilityValue}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fill]} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  track: { width: '100%', backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accentText },
}));
