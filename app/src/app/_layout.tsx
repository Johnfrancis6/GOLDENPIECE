/**
 * Root layout: Poppins GP fonts, theme (system / dark / light), language,
 * reduced motion, safe area, toasts. The app store (B6.3) will drive the
 * theme choice and the language; until then: system theme, device language.
 */
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { getLocales } from 'expo-localization';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeContext, makeTheme, useSchemeFor } from '../theme';
import { LangContext } from '../i18n';
import { ReducedMotionProvider, ToastProvider } from '../ui';
import type { Lang } from '../lib/format';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const FONTS = {
  'PoppinsGP-Regular': require('../../assets/fonts/PoppinsGP-Regular.ttf'),
  'PoppinsGP-Medium': require('../../assets/fonts/PoppinsGP-Medium.ttf'),
  'PoppinsGP-SemiBold': require('../../assets/fonts/PoppinsGP-SemiBold.ttf'),
};

function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  const scheme = useSchemeFor('system');
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  const lang = useMemo(() => deviceLang(), []);
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: theme.c.bg }} />;
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <LangContext.Provider value={lang}>
          <ReducedMotionProvider>
            <ToastProvider>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.c.bg }, animation: 'slide_from_right' }} />
            </ToastProvider>
          </ReducedMotionProvider>
        </LangContext.Provider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
