import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RewardedHost } from '@/src/ads/rewarded';
import { useSaveStore } from '@/src/state/useSaveStore';
import { colors } from '@/src/ui/theme';

// Keep the splash up until fonts and the save file are ready.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    LilitaOne_400Regular,
  });
  const ready = useSaveStore((s) => s.ready);
  const hydrate = useSaveStore((s) => s.hydrate);
  const flush = useSaveStore((s) => s.flush);

  useEffect(() => {
    hydrate().catch((e: unknown) => {
      console.warn('Save load failed', e);
      useSaveStore.setState({ ready: true });
    });
  }, [hydrate]);

  // Write pending changes as soon as the app leaves the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flush();
    });
    return () => sub.remove();
  }, [flush]);

  const fontsDone = fontsLoaded || !!fontError;
  useEffect(() => {
    if (fontsDone && ready) void SplashScreen.hideAsync();
  }, [fontsDone, ready]);

  if (!fontsDone || !ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgTop }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.bgTop },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="game" options={{ gestureEnabled: false }} />
            <Stack.Screen name="levels" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="shop" />
          </Stack>
          <RewardedHost />
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
