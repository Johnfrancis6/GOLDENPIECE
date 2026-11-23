/**
 * Root layout: Poppins GP fonts, theme (system), language (app store, else the
 * device), reduced motion, safe area, toasts, the app store, and the phase
 * gate that sends each phase to its route (S1 §1).
 * Web preview only: ?scheme=dark|light&scale=2&lang=en override for screenshots.
 */
import { useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeContext, makeTheme, useSchemeFor, type Scheme } from '../theme';
import { LangContext } from '../i18n';
import { FontScaleContext, ReducedMotionProvider, ToastProvider } from '../ui';
import { AppProvider, useAppMaybe } from '../state/app';
import { ROUTE } from '../lib/flow';
import { Splash } from '../screens/Splash';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const FONTS = {
  'PoppinsGP-Regular': require('../../assets/fonts/PoppinsGP-Regular.ttf'),
  'PoppinsGP-Medium': require('../../assets/fonts/PoppinsGP-Medium.ttf'),
  'PoppinsGP-SemiBold': require('../../assets/fonts/PoppinsGP-SemiBold.ttf'),
};

const webQuery: Record<string, string> = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(window.location.search));
})();

/** Sends the current phase to its route; the gallery (dev) is left alone. */
function PhaseGate() {
  const app = useAppMaybe();
  const segments = useSegments() as string[];
  const nav = useRootNavigationState();
  const phase = app?.phase;
  const step = phase?.kind === 'onboarding' ? phase.step : null;
  const top = segments[0] ?? '';
  useEffect(() => {
    if (!nav?.key || !phase || phase.kind === 'loading' || top === 'gallery') return;
    const want = phase.kind === 'update' ? '/update' : phase.kind === 'locked' ? '/lock'
      : phase.kind === 'ready' ? '/home' : null;
    if (want) {
      if (`/${top}` !== want) router.replace(want as never);
      return;
    }
    // onboarding: only redirect when outside the flow (resume, after lock/wipe)
    if (top !== 'onboarding' && step) router.replace(ROUTE[step] as never);
  }, [nav?.key, phase, step, top]);
  return null;
}

function Shell({ scheme }: { scheme: Scheme }) {
  const app = useAppMaybe();
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  const lang = webQuery.lang === 'en' || webQuery.lang === 'fr' ? webQuery.lang : app?.lang ?? 'fr';
  useEffect(() => {
    if (app) SplashScreen.hideAsync().catch(() => {});
  }, [app]);
  return (
    <ThemeContext.Provider value={theme}>
      <LangContext.Provider value={lang}>
        <ToastProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {app ? (
          <>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.c.bg }, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="lock" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="update" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="home" options={{ animation: 'fade' }} />
            </Stack>
            <PhaseGate />
          </>
        ) : <Splash />}
        </ToastProvider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  const sys = useSchemeFor('system');
  const scheme: Scheme = webQuery.scheme === 'light' || webQuery.scheme === 'dark' ? webQuery.scheme : sys;
  const scale = Number(webQuery.scale) > 0 ? Number(webQuery.scale) : 1;
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: makeTheme(scheme).c.bg }} />;
  return (
    <SafeAreaProvider>
      <FontScaleContext.Provider value={scale}>
        <ReducedMotionProvider value={webQuery.reduced === '1' ? true : undefined}>
          <AppProvider>
            <Shell scheme={scheme} />
          </AppProvider>
        </ReducedMotionProvider>
      </FontScaleContext.Provider>
    </SafeAreaProvider>
  );
}
