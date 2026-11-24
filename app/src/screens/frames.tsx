/**
 * Onboarding frames composed from the UI kit:
 *  - FormFrame: C12 top bar (back + step dots), title 24/32, line, scroll
 *    content, primary pinned (B18 / S1 O3, O6, O7, O9, O12)
 *  - CodeFrame: C3 + C4 frame (input-pin-keypad §2-3) for O8, O11, O18
 * and the step helpers (persist the step, back on a rebuilt stack, offline).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Platform, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Network from 'expo-network';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { DOTS, DOTS_TOTAL, ROUTE, prevStep, type Step } from '../lib/flow';
import { useApp, type Fail } from '../state/app';
import { errorText, type useT } from '../i18n';
import { Keypad, StepDots, TopBar, Txt, type KeypadProps } from '../ui';

const PE = T.component.pinEntry;

/** Persist the step when the screen gets focus (resume = last unfinished step). */
export function useStep(step: Step) {
  const { setStep } = useApp();
  useFocusEffect(useCallback(() => { setStep(step); }, [setStep, step]));
}

/** Forward: push the next route (the step is saved by the next screen). */
export function go(step: Step) {
  router.push(ROUTE[step] as never);
}

/** Back: pop when there is history, else the previous step (stack rebuilt on
 * resume), else leave the app (O2). Also wires the Android back button. */
export function useBack(step: Step): (() => void) | undefined {
  const { st } = useApp();
  const prev = prevStep(step, st);
  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else if (prev) router.replace(ROUTE[prev] as never);
    else if (Platform.OS === 'android') BackHandler.exitApp();
  }, [prev]);
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => sub.remove();
  }, [back]));
  return prev || router.canGoBack() ? back : undefined;
}

/** expo-network; web preview: navigator.onLine. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let live = true;
    Network.getNetworkStateAsync().then((s) => live && setOnline(s.isConnected !== false && s.isInternetReachable !== false)).catch(() => {});
    const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return () => { live = false; sub.remove(); };
  }, []);
  return online;
}

export function FormFrame({ step, title, line, children, footer, onBack, banner, scroll = true }: {
  step?: Step; title: string; line?: string; children?: ReactNode; footer?: ReactNode; onBack?: () => void;
  banner?: ReactNode; scroll?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const dots = step ? DOTS[step] : undefined;
  const head = (
    <View style={{ gap: 8, marginTop: 8 }}>
      <Txt v="titleScreen" accessibilityRole="header">{title}</Txt>
      {line ? <Txt v="caption" tone="secondary">{line}</Txt> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar onBack={onBack} center={dots ? <StepDots index={dots} total={DOTS_TOTAL} /> : undefined} />
      {banner ? <View style={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: 8 }}>{banner}</View> : null}
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: 32 }}>
          {head}
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: T.layout.screenMargin }}>{head}{children}</View>
      )}
      {footer ? (
        <View style={{ paddingHorizontal: T.layout.screenMargin, paddingTop: 8, paddingBottom: insets.bottom + T.block.stepScreen.bottom.marginBottom, gap: 8 }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function CodeFrame({ step, title, sub, entry, message, link, keypad, onBack }: {
  step?: Step; title: string; sub?: string; entry: ReactNode; message: ReactNode; link?: ReactNode;
  keypad: KeypadProps; onBack?: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const dots = step ? DOTS[step] : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar onBack={onBack} center={dots ? <StepDots index={dots} total={DOTS_TOTAL} /> : undefined} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: T.layout.screenMargin, alignItems: 'center', paddingBottom: 16 }}>
        <View style={{ marginTop: 24, gap: 8, alignSelf: 'stretch' }}>
          <Txt v="titleScreen" align="center" accessibilityRole="header">{title}</Txt>
          {sub ? <Txt v="caption" tone="secondary" align="center">{sub}</Txt> : null}
        </View>
        <View style={{ marginTop: PE.gapTop }}>{entry}</View>
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{message}</View>
        {link ? <View style={{ marginTop: 8 }}>{link}</View> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: insets.bottom + 16 }}>
        <Keypad {...keypad} />
      </View>
    </View>
  );
}

/** Store failure → banner text. */
export function failText(t: ReturnType<typeof useT>, f: Fail): string {
  switch (f.key) {
    case 'offline': return t('offline.banner');
    case 'rate': return t('O9.rate');
    case 'exists': return t('O7.err.exists');
    case 'weak': return t('O7.err.password');
    case 'invalid': return t('O9.err.invalid');
    case 'code': return t('O8.err');
    default: return errorText(t.lang, undefined);
  }
}
