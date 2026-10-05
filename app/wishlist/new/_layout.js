// app/wishlist/new/_layout.js — modal Stack for Add item (S8 → S9).
// Android back = previous step (native stack default).
import { Stack } from 'expo-router';
import { useColors } from '../../../theme/theme';

export default function AddItemLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
    </Stack>
  );
}
