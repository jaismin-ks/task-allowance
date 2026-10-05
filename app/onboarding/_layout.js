// app/onboarding/_layout.js — Stack, no header, no tab bar
import { Stack } from 'expo-router';
import { useColors } from '../../theme/theme';

export default function OnboardingLayout() {
  const colors = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
