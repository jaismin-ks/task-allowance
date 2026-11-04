// app/_layout.js
// Root Stack: fonts, migrations, AppState rollover check, global overlays.
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono/400Regular';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorScreen } from '../components/ErrorScreen';
import { OverlayHost } from '../components/OverlayHost';
import { db, sqlite } from '../db/client';
import migrations from '../db/migrations/migrations';
import { getProfile } from '../db/operations/userProfile';
import { cleanUpOrphanPhotos } from '../lib/itemPhotos';
import { checkMonthRollover } from '../lib/monthRollover';
import { usePoolStore } from '../store/poolStore';
import { makeStyles, useColors } from '../theme/theme';

SplashScreen.preventAutoHideAsync();

// Expo Router renders this instead of the app when anything below throws while
// rendering. Data is in SQLite, so "Try again" loses nothing.
export function ErrorBoundary({ error, retry }) {
  return (
    <ErrorScreen
      title="Something went wrong."
      body="Your tasks, wishlist and earnings are safe on this phone. Try again, and if it keeps happening, copy the details below and send them with a bug report."
      error={error}
      onRetry={retry}
    />
  );
}

// Navigation chrome follows the active palette (Settings → Appearance)
const navThemeFor = (colors) => {
  const base = colors.mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.accentText },
  };
};

// Spec: sheets are 'formSheet' on iOS and 'modal' on Android
const sheetFor = (colors) => (detents) =>
  Platform.OS === 'ios'
    ? {
        presentation: 'formSheet',
        sheetAllowedDetents: detents,
        sheetGrabberVisible: true,
        sheetCornerRadius: 28,
        contentStyle: { backgroundColor: colors.surface },
      }
    : { presentation: 'modal', contentStyle: { backgroundColor: colors.surface } };

// Voice capture / Goal reached: cross-fade, explicit button only — no swipe
const focusModal = {
  presentation: 'fullScreenModal',
  animation: 'fade',
  gestureEnabled: false,
};

export default function RootLayout() {
  const colors = useColors();
  const styles = useStyles();
  const navTheme = useMemo(() => navThemeFor(colors), [colors]);
  const sheet = useMemo(() => sheetFor(colors), [colors]);
  const { success, error } = useMigrations(db, migrations);
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });
  const ready = success && (fontsLoaded || !!fontError);
  const navReady = !!useRootNavigationState()?.key;

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  // Root window colour (shows behind sheets / during rotation) follows the theme
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  // Once per launch (no form can be open yet): delete photos no item references,
  // e.g. picked in an Add item form that was then discarded
  useEffect(() => {
    if (!ready) return;
    const inUse = sqlite
      .getAllSync(`SELECT image_url AS imageUrl FROM wishlist_item WHERE image_url IS NOT NULL`)
      .map((r) => r.imageUrl);
    cleanUpOrphanPhotos(inUse);
  }, [ready]);

  useEffect(() => {
    // Wait for the navigator too: the rollover check may push the G1 sheet
    if (!ready || !navReady) return undefined;

    // Rollover first (creates the new month's pool row), then re-derive the daily
    // guide + progress — the guide changes every day, not just monthly
    const onActive = async () => {
      const { previousMonthKey } = await checkMonthRollover();
      usePoolStore.getState().refresh();
      // G1: first foreground of a new month (never on first launch / before onboarding)
      if (previousMonthKey && getProfile()) {
        router.push({ pathname: '/month-summary', params: { month: previousMonthKey } });
      }
    };

    onActive();
    // Mount-only would miss an app left open past midnight
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') onActive();
    });
    return () => subscription.remove();
  }, [ready, navReady]);

  // A failed migration is rolled back, so the old data is intact — but the app
  // can't run on it. An update that fixes the migration is the only way forward.
  if (error) {
    return (
      <ErrorScreen
        title="TaskAllowance couldn’t open your data."
        body="Nothing has been deleted. This usually means an update didn’t install cleanly — check for an app update, then reopen the app."
        error={error}
      />
    );
  }

  if (!ready) return <View style={styles.fill} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="task/new" options={sheet([0.92])} />
          <Stack.Screen name="task/[id]" options={sheet([0.92])} />
          <Stack.Screen name="task/series/[id]" options={sheet([0.92])} />
          <Stack.Screen name="task/filters" options={sheet([0.85])} />
          <Stack.Screen name="voice" options={focusModal} />
          <Stack.Screen
            name="wishlist/new"
            options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.bg } }}
          />
          <Stack.Screen name="wishlist/[id]" options={sheet([0.92])} />
          <Stack.Screen name="next-goal" options={sheet([0.75])} />
          <Stack.Screen name="goal-reached" options={focusModal} />
          <Stack.Screen name="month-summary" options={sheet('fitToContents')} />
        </Stack>
        <OverlayHost />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { flex: 1, backgroundColor: colors.bg },
}));
