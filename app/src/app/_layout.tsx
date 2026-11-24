/**
 * Root layout: Poppins GP fonts, theme (system), language (app store, else the
 * device), reduced motion, safe area, toasts, the app store, and the phase
 * gate that sends each phase to its route (S1 §1).
 * Web preview only: ?scheme=dark|light&scale=2&lang=en override for screenshots.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeContext, makeTheme, useSchemeFor, type Scheme } from '../theme';
import { LangContext } from '../i18n';
import { FontScaleContext, ReducedMotionProvider, ToastProvider, useReducedMotion } from '../ui';
import { AppProvider, useAppMaybe } from '../state/app';
import { ROUTE } from '../lib/flow';
import { Splash } from '../screens/Splash';
import { AppOpening } from '../screens/opening/AppOpening';
import { OpeningContext, type Opening } from '../state/opening';

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
  // route groups such as (tabs) are not part of the path
  const top = segments.filter((s) => !s.startsWith('('))[0] ?? '';
  useEffect(() => {
    if (!nav?.key || !phase || phase.kind === 'loading' || top === 'gallery') return;
    if (phase.kind === 'update' || phase.kind === 'locked') {
      const want = phase.kind === 'update' ? 'update' : 'lock';
      if (top !== want) router.replace(`/${want}` as never);
      return;
    }
    if (phase.kind === 'ready') {
      // Home and the screens opened from it stay; the gate only leaves the flow screens
      if (['', 'index', 'onboarding', 'lock', 'update'].includes(top)) router.replace('/home' as never);
      return;
    }
    // onboarding: only redirect when outside the flow (resume, after lock/wipe)
    if (top !== 'onboarding' && step) router.replace(ROUTE[step] as never);
  }, [nav?.key, phase, step, top]);
  return null;
}

/** M14 plays once per process (cold start); a warm start keeps the process, so it never replays. */
let coldStart = true;

/**
 * Decides the M14 opening once the first phase is known: it plays on a cold
 * start that lands on Home (Home builds around the card) or on the lock screen
 * (mark only, then the lock screen); onboarding keeps O1 and no M14.
 * The native splash stays up until that decision (3 s at most).
 */
function useColdOpening(kind: string | undefined) {
  const [st, setSt] = useState<{ decided: boolean; opening: Opening | null }>({ decided: false, opening: null });
  // decided during render the first time the phase is known (React "adjust state on change" pattern)
  if (!st.decided && kind && kind !== 'loading') {
    const play = coldStart && (kind === 'ready' || kind === 'locked') && webQuery.opening !== '0';
    setSt({ decided: true, opening: play ? { clock: new Animated.Value(0), build: kind === 'ready' } : null });
  }
  useEffect(() => {
    if (st.decided) coldStart = false;
  }, [st.decided]);
  useEffect(() => {
    const t = setTimeout(() => setSt((x) => (x.decided ? x : { ...x, decided: true })), 3000);
    return () => clearTimeout(t);
  }, []);
  const end = useCallback(() => setSt((x) => ({ ...x, opening: null })), []);
  return { opening: st.opening, decided: st.decided, end };
}

function Shell({ scheme }: { scheme: Scheme }) {
  const app = useAppMaybe();
  const reduced = useReducedMotion();
  const theme = useMemo(() => makeTheme(scheme), [scheme]);
  const lang = webQuery.lang === 'en' || webQuery.lang === 'fr' ? webQuery.lang : app?.lang ?? 'fr';
  const { opening, decided, end } = useColdOpening(app?.phase.kind);
  useEffect(() => {
    if (app && decided) SplashScreen.hideAsync().catch(() => {});
  }, [app, decided]);
  return (
    <ThemeContext.Provider value={theme}>
      <LangContext.Provider value={lang}>
        <ToastProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {app ? (
          <OpeningContext.Provider value={opening}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.c.bg }, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="lock" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="update" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="tour" options={{ animation: 'fade' }} />
            </Stack>
            <PhaseGate />
            {opening ? <AppOpening opening={opening} reduced={reduced} onDone={end} /> : null}
          </OpeningContext.Provider>
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
