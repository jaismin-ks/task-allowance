// components/layout.js
// Bottom chrome geometry shared by the tab bar, the Tasks composer and the overlays.
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { size } from '../theme/tokens';

export const SCREEN_GUTTER = 16;

export function useBottomChrome() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 16);
  const tabBarTop = tabBarBottom + size.tabBarHeight;
  const composerTop = tabBarTop + 12 + size.composer;
  return {
    tabBarBottom,
    tabBarTop,
    composerBottom: tabBarTop + 12,
    composerTop,
    // Scroll content padding so the last row clears the floating chrome
    tabContentPadding: tabBarTop + 24,
    tasksContentPadding: composerTop + 24,
  };
}
