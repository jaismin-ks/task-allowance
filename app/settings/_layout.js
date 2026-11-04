// app/settings/_layout.js — Profile & settings stack, opened from the profile button
// (top right of Tasks and Wishlist). Sub-pages push from the right.
import { Stack } from 'expo-router';
import { useColors } from '../../theme/theme';

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
