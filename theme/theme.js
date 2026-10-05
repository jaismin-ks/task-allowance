// theme/theme.js
// Appearance (System / Light / Dark) + accent, from Settings. Components read colours
// through these hooks so they re-render when either changes:
//   const colors = useColors();
//   const useStyles = makeStyles((colors) => ({ ... }));  const styles = useStyles();
import { StyleSheet, useColorScheme } from 'react-native';
import { usePrefs } from '../lib/prefs';
import { getPalette } from './palettes';

// 'dark' | 'light' after resolving "Match system"
export function useColorMode() {
  const system = useColorScheme();
  const appearance = usePrefs((s) => s.appearance);
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return system === 'light' ? 'light' : 'dark';
}

export function useColors() {
  const mode = useColorMode();
  const accent = usePrefs((s) => s.accent);
  return getPalette(mode, accent);
}

// Styles built once per palette (palettes are cached, so this is a WeakMap hit
// on every render after the first)
export function makeStyles(factory) {
  const cache = new WeakMap();
  return function useStyles() {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
