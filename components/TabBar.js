// components/TabBar.js
// Floating glass pill (spec §3.1): 3 equal tabs ≥52pt, labels always visible,
// active = lime pill + dark label that morphs across on a GENTLE spring.
// The glass is a real blur + translucent fill (the Figma file renders it solid).
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { useReducedMotion } from '../lib/prefs';
import { springs } from '../theme/motion';
import { fonts, radius, size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { SCREEN_GUTTER, useBottomChrome } from './layout';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

const TABS = {
  tasks: { label: 'Tasks', icon: 'checklist' },
  wishlist: { label: 'Wishlist', icon: 'gift' },
};
const PAD = 6;

// Expo Router 58 tab bar props: `emitter` fires tabPress (useScrollToTop listens
// for it) and `navigateToTab` switches tabs. There's no `navigation` prop anymore.
export function TabBar({ state, emitter, navigateToTab }) {
  const colors = useColors();
  const styles = useStyles();
  const { tabBarBottom } = useBottomChrome();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const tabWidth = width ? (width - PAD * 2) / state.routes.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const target = state.index * tabWidth;
    x.set(reduced || !tabWidth ? target : withSpring(target, springs.GENTLE));
  }, [state.index, tabWidth, reduced, x]);

  // Hidden while the keyboard is up (spec §3.1)
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  if (keyboardUp) return null;

  return (
    <View
      style={[styles.bar, { bottom: tabBarBottom }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      <BlurView intensity={40} tint={colors.mode} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glass]} />
      {tabWidth > 0 && (
        <Animated.View style={[styles.pill, { width: tabWidth }, pillStyle]} />
      )}
      {state.routes.map((route, index) => {
        const tab = TABS[route.name] ?? { label: route.name, icon: 'checklist' };
        const focused = state.index === index;
        const fg = focused ? colors.onAccent : colors.textMuted;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic.selection();
            navigateToTab(route.key);
          }
          // Tapping the active tab: useScrollToTop in each screen handles the tabPress event
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label}, ${index + 1} of ${state.routes.length}`}
            accessibilityState={{ selected: focused }}
            style={styles.tab}
          >
            <Icon name={tab.icon} size={20} color={fg} />
            <AppText
              variant="small"
              color={focused ? colors.onAccent : colors.textMuted}
              style={focused ? styles.labelActive : styles.label}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    position: 'absolute',
    left: SCREEN_GUTTER,
    right: SCREEN_GUTTER,
    height: size.tabBarHeight,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glass: { backgroundColor: colors.glass },
  pill: {
    position: 'absolute',
    left: PAD,
    top: (size.tabBarHeight - size.tabHeight) / 2 - 1,
    height: size.tabHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  tab: {
    flex: 1,
    height: size.tabHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontFamily: fonts.sansMedium },
  labelActive: { fontFamily: fonts.sansSemiBold },
}));
