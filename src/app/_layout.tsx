import '../../global.css';

import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
  Literata_700Bold,
} from '@expo-google-fonts/literata';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_400Regular_Italic,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAutoBills } from '@/budget/useAutoBills';
import { useCalendarSync } from '@/calendarSync/useCalendarSync';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { Overlays } from '@/features/sheets/Overlays';
import { Tour } from '@/features/tour/Tour';
import { useOrientation } from '@/features/useOrientation';
import { useReminders } from '@/reminders/useReminders';
import { useBankTexts } from '@/sms/useBankTexts';
import { ThemeProvider } from '@/features/ThemeProvider';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Keeps reminders scheduled, bills paid on time, payments from bank texts added and the phone's
 * calendars matched (needs the database, so it lives inside DatabaseProvider).
 */
function Reminders() {
  useReminders();
  useAutoBills();
  useBankTexts();
  useCalendarSync();
  return null;
}

/** The screens, on the theme's paper. */
function Screens() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}

export default function RootLayout() {
  // tablets turn with the device; phones stay upright (D20)
  useOrientation();
  const [fontsLoaded, fontError] = useFonts({
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    Literata_600SemiBold,
    Literata_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_400Regular_Italic,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PatrickHand_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // If fonts fail, carry on with system fonts rather than a blank screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DatabaseProvider>
          <ThemeProvider>
            <StatusBar style="dark" />
            <Screens />
            <Overlays />
            <Tour />
            <Reminders />
          </ThemeProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
