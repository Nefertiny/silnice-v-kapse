import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/GlassTabBar';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Domů' }} />
      <Tabs.Screen name="jizda" options={{ title: 'Jízda' }} />
      <Tabs.Screen name="auta" options={{ title: 'Auta' }} />
      <Tabs.Screen name="premium" options={{ title: 'Premium' }} />
    </Tabs>
  );
}
