// theme/palettes.js
// Colour palettes: a base per mode (dark from the Figma design language, light from
// its "Light theme" note) plus 5 accents. Every accent passes WCAG AA in both modes:
//  - `accent` is a FILL (buttons, pills, checkboxes) with `onAccent` text on it
//  - `accentText` is the accent used as text / icons / progress on the background —
//    the fill itself on dark; a deeper ink on light (lime fails as text on light)

const BASE = {
  dark: {
    bg: '#0B0B0C',
    surface: '#151517',
    surfaceRaised: '#1E1E21',
    border: '#2C2C30',
    track: '#2C2C30',
    text: '#F3F2ED',
    textMuted: '#A3A29C',
    warning: '#FFB547',
    onWarning: '#0B0B0C',
    danger: '#FF6B5B',
    ai: '#B9A2FF',
    focus: '#7CC4FF',
    // Translucent values — the Figma file renders these solid (paint opacity bug)
    warningTint: 'rgba(255, 181, 71, 0.12)',
    warningBorder: 'rgba(255, 181, 71, 0.35)',
    dangerTint: 'rgba(255, 107, 91, 0.12)',
    dangerBorder: 'rgba(255, 107, 91, 0.35)',
    glass: 'rgba(30, 30, 33, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    scrim: 'rgba(0, 0, 0, 0.6)',
    shadow: '#000000',
  },
  light: {
    bg: '#F5F4EF',
    surface: '#FFFFFF',
    surfaceRaised: '#EDECE6',
    border: '#DAD8D0',
    track: '#E2E0D8',
    text: '#111112',
    textMuted: '#5A5954',
    warning: '#8A5200',
    onWarning: '#FFFFFF',
    danger: '#B3261E',
    ai: '#5A3FD0',
    focus: '#0B63CE',
    warningTint: 'rgba(138, 82, 0, 0.08)',
    warningBorder: 'rgba(138, 82, 0, 0.30)',
    dangerTint: 'rgba(179, 38, 30, 0.07)',
    dangerBorder: 'rgba(179, 38, 30, 0.30)',
    glass: 'rgba(255, 255, 255, 0.78)',
    glassBorder: 'rgba(17, 17, 18, 0.08)',
    scrim: 'rgba(17, 17, 18, 0.45)',
    shadow: '#5A5954',
  },
};

// fill / ink-on-light; Mono flips per mode (light pill on dark, dark pill on light)
export const ACCENTS = [
  { key: 'lime', name: 'Lime', dark: { fill: '#C6FF3D' }, light: { fill: '#C6FF3D', ink: '#3B6300' } },
  { key: 'mint', name: 'Mint', dark: { fill: '#4FE0B0' }, light: { fill: '#4FE0B0', ink: '#006B4E' } },
  // Sky sits next to the blue focus ring, so the ring uses the text colour instead
  { key: 'sky', name: 'Sky', dark: { fill: '#6EB6FF' }, light: { fill: '#6EB6FF', ink: '#0B5BB5' }, focusIsText: true },
  { key: 'rose', name: 'Rose', dark: { fill: '#FF7EB3' }, light: { fill: '#FF7EB3', ink: '#A6144F' } },
  {
    key: 'mono',
    name: 'Mono',
    dark: { fill: '#F3F2ED', on: '#0B0B0C' },
    light: { fill: '#111112', on: '#F5F4EF', ink: '#111112' },
  },
];

export const DEFAULT_ACCENT = 'lime';

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const cache = new Map();

// Stable object per (mode, accent) — identity is the cache key for makeStyles
export function getPalette(mode, accentKey) {
  const key = `${mode}:${accentKey}`;
  if (cache.has(key)) return cache.get(key);
  const base = BASE[mode];
  const accent = ACCENTS.find((a) => a.key === accentKey) ?? ACCENTS[0];
  const spec = accent[mode];
  const accentText = spec.ink ?? spec.fill;
  const palette = Object.freeze({
    ...base,
    mode,
    accentKey: accent.key,
    accent: spec.fill,
    onAccent: spec.on ?? '#0B0B0C',
    // Unselected bars/glyphs drawn on an accent fill
    onAccentMuted: rgba(spec.on ?? '#0B0B0C', 0.28),
    accentText,
    // Tints are made from the text-safe colour so they read on both backgrounds
    accentTint: rgba(accentText, mode === 'dark' ? 0.12 : 0.1),
    accentRing: rgba(accentText, mode === 'dark' ? 0.18 : 0.16),
    accentGlow: rgba(accentText, 0.35),
    focus: accent.focusIsText ? base.text : base.focus,
  });
  cache.set(key, palette);
  return palette;
}
