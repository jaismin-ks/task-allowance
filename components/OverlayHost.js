// components/OverlayHost.js
// G2 — global Undo snackbar + toasts, floating above the tab bar and composer.
// The 5s Undo window is held open while a screen reader is running, since we
// can't detect VoiceOver focus directly (spec §7 "Time limits").
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useReducedMotion } from '../lib/prefs';
import { useUiStore } from '../store/uiStore';
import { durations } from '../theme/motion';
import { radius, size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { useBottomChrome } from './layout';
import { AppText } from './ui/AppText';

const SCREEN_READER_UNDO_MS = 30000;

export function OverlayHost() {
  const colors = useColors();
  const styles = useStyles();
  const { snackbar, toast, hideSnackbar, hideToast } = useUiStore();
  const { composerTop, tabBarTop } = useBottomChrome();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // Sit just above whatever chrome this screen has: composer + tab bar on Tasks,
  // tab bar on Wishlist, nothing elsewhere (Profile & settings, sheets)
  const bottom =
    pathname === '/tasks' ? composerTop + 12 : pathname === '/wishlist' ? tabBarTop + 12 : Math.max(insets.bottom, 16) + 8;
  const reduced = useReducedMotion();
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!snackbar) return undefined;
    if (snackbar.announcement) AccessibilityInfo.announceForAccessibility(snackbar.announcement);
    const t = setTimeout(
      () => hideSnackbar(snackbar.id),
      screenReader ? SCREEN_READER_UNDO_MS : durations.UNDO_MS
    );
    return () => clearTimeout(t);
  }, [snackbar, screenReader, hideSnackbar]);

  useEffect(() => {
    if (!toast) return undefined;
    AccessibilityInfo.announceForAccessibility(toast.message);
    const t = setTimeout(() => hideToast(toast.id), durations.TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  // Calm: fade in while rising 25pt, no spring. (SlideInDown launched the bar from the
  // bottom of the screen on a spring, so it overshot and bounced on every toast.)
  const entering = reduced
    ? FadeIn.duration(150)
    : FadeInDown.duration(220).easing(Easing.out(Easing.cubic));
  const exiting = reduced ? FadeOut.duration(150) : FadeOutDown.duration(160).easing(Easing.in(Easing.cubic));

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {toast && !snackbar && (
        <Animated.View key={`t${toast.id}`} entering={entering} exiting={exiting} style={styles.bar}>
          <AppText variant="label" style={styles.flex}>
            {toast.message}
          </AppText>
        </Animated.View>
      )}
      {snackbar && (
        <Animated.View key={`s${snackbar.id}`} entering={entering} exiting={exiting} style={styles.bar}>
          <AppText variant="numeric" color={colors.accentText} style={styles.flex}>
            {snackbar.message}
          </AppText>
          {snackbar.actionLabel && (
            <Pressable
              onPress={() => {
                hideSnackbar(snackbar.id);
                snackbar.onAction?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={snackbar.actionA11yLabel ?? snackbar.actionLabel}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.border }]}
            >
              <AppText variant="label">{snackbar.actionLabel}</AppText>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  host: { position: 'absolute', left: 16, right: 16 },
  flex: { flex: 1 },
  bar: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  action: {
    minHeight: size.hit,
    minWidth: size.hit,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
