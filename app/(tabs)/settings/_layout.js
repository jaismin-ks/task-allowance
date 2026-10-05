// app/(tabs)/settings/_layout.js — Stack inside the Settings tab (push, tab bar stays visible)
import { Stack } from 'expo-router';
import { useColors } from '../../../theme/theme';

export default function SettingsLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
