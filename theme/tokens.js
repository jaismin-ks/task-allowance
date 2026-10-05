// theme/tokens.js
// TaskAllowance design language v1.0 (Figma): type, spacing, radii, sizes.

// Colours live in theme/palettes.js (light/dark + accents); read them with
// useColors() / makeStyles() from theme/theme.js so they follow Settings.

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemiBold: 'Geist_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
};

// Type scale from the Figma "Type scale" page
export const type = {
  displayXL: { fontFamily: fonts.serif, fontSize: 64, lineHeight: 68 },
  displayL: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 48 },
  displayItalic: { fontFamily: fonts.serifItalic, fontSize: 40, lineHeight: 44 },
  h1: { fontFamily: fonts.sansSemiBold, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fonts.sansSemiBold, fontSize: 20, lineHeight: 26 },
  bodyLarge: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 14, letterSpacing: 0.66 }, // +6% tracking
  numeric: { fontFamily: fonts.monoMedium, fontSize: 17, lineHeight: 22, fontVariant: ['tabular-nums'] },
  numericXL: { fontFamily: fonts.monoMedium, fontSize: 48, lineHeight: 54, fontVariant: ['tabular-nums'] },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 };

// Minimum sizes from the accessibility checklist
export const size = {
  hit: 44,
  button: 56,
  field: 56,
  checkbox: 28,
  tabBarHeight: 64,
  tabHeight: 52,
  composer: 56,
};

export const MAX_FONT_SCALE = 1.6;
