// app/(tabs)/_layout.js — custom floating tab bar
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../components/TabBar';
import { useColors } from '../../theme/theme';

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { position: 'absolute' },
      }}
    >
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Wishlist' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
