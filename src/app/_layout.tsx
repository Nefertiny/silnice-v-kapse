import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CarsProvider } from '@/lib/cars';
import { CommuteProvider } from '@/lib/commuteStore';
import { setupNotifications } from '@/lib/reminders';
import { colors } from '@/theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Unbounded_700Bold,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    setupNotifications().catch(() => {});
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  return (
    <SafeAreaProvider>
      <CarsProvider>
        <CommuteProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground }, animation: 'fade' }} />
        </CommuteProvider>
      </CarsProvider>
    </SafeAreaProvider>
  );
}
