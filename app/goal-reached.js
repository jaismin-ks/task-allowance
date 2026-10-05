// app/goal-reached.js — S11 the payoff moment (full-screen, cross-fade, explicit buttons only)
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { formatMoney, moneyToWords } from '../lib/format';
import { haptic } from '../lib/haptics';
import { useReducedMotion } from '../lib/prefs';
import { usePoolStore } from '../store/poolStore';
import { getGoal, useWishlistStore } from '../store/wishlistStore';
import { type } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

// Confetti reads on any accent fill: onAccent, its muted tint, and white
const confettiColors = (colors) => [colors.onAccent, colors.onAccentMuted, '#FFFFFF', colors.onAccent];

// Deterministic scatter (render must stay pure): 0..1 from piece index + salt
const scatter = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export default function GoalReachedScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const currency = usePoolStore((s) => s.budget.currencyCode);
  const redeem = useWishlistStore((s) => s.redeem);
  const [goal] = useState(() => getGoal());

  useEffect(() => {
    if (goal) haptic.success();
    else router.back();
  }, [goal]);

  if (!goal) return null;

  const iBoughtIt = () => {
    redeem(goal.id);
    usePoolStore.getState().refresh();
    router.replace({ pathname: '/next-goal', params: { mode: 'bought' } });
  };

  const enter = (delay) => (reduced ? undefined : FadeInDown.delay(delay).springify().damping(14));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style={colors.onAccent === '#0B0B0C' ? 'dark' : 'light'} />
      {!reduced && <Confetti />}
      <View style={styles.center}>
        <Animated.View entering={enter(0)}>
          <AppText variant="displayXL" color={colors.onAccent} style={styles.unlocked} accessibilityRole="header">
            Unlocked.
          </AppText>
        </Animated.View>
        <Animated.View entering={enter(120)} style={styles.copy}>
          <AppText variant="displayItalic" color={colors.onAccent} style={styles.centerText}>
            You earned your {goal.title}.
          </AppText>
          {goal.price > 0 && (
            <AppText
              variant="numericXL"
              color={colors.onAccent}
              accessibilityLabel={moneyToWords(goal.price, currency)}
            >
              {formatMoney(goal.price, currency)}
            </AppText>
          )}
        </Animated.View>
      </View>
      <View style={styles.actions}>
        <Button label="I bought it" variant="ink" arrow onPress={iBoughtIt} />
        <Button label="Not yet" variant="inkGhost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

// One burst, ~1.6s; never rendered under Reduce Motion
function Confetti() {
  const palette = confettiColors(useColors());
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        key: i,
        x: scatter(i, 1) * width,
        drift: (scatter(i, 2) - 0.5) * 120,
        delay: scatter(i, 3) * 250,
        rotate: scatter(i, 4) * 720 - 360,
        w: 6 + scatter(i, 5) * 6,
        color: palette[i % palette.length],
      })),
    [width, palette]
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      {pieces.map((p) => (
        <Piece key={p.key} {...p} fall={height + 40} />
      ))}
    </View>
  );
}

function Piece({ x, drift, delay, rotate, w, color, fall }) {
  const styles = useStyles();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.in(Easing.quad) })));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.get() * 0.4,
    transform: [
      { translateX: x + drift * t.get() },
      { translateY: -40 + fall * t.get() },
      { rotate: `${rotate * t.get()}deg` },
    ],
  }));
  return <Animated.View style={[styles.piece, { width: w, height: w * 1.6, backgroundColor: color }, style]} />;
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.accent, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  unlocked: { ...type.displayXL, fontSize: 88, lineHeight: 92, textAlign: 'center' },
  copy: { alignItems: 'center', gap: 12 },
  centerText: { textAlign: 'center' },
  actions: { gap: 10 },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
}));
