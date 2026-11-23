/**
 * T guided tour (D13, delegated; S1 O4): the demo Home rendered from a
 * bundled payload (works offline), a scrim with a spotlight on one block and
 * a bubble: 6 steps, "Passer", "Suivant" / "Terminer". Used as O4 in the
 * onboarding and replayable from Settings (`/tour`).
 * Composed from validated pieces: S2 Home, C9 scrim colour, C7 card bubble,
 * C17 step dots, C1 buttons. Reduced motion: no fade.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../../theme';
import { Button, EASE, ND, StepDots, Txt, useReducedMotion } from '../../ui';
import { useT, type StringKey } from '../../i18n';
import { HomeScreen } from '../home/HomeScreen';
import { TourTargetsContext, measure, type Rect, type TargetView, type TourKey } from './targets';
import type { Home } from '../../lib/api';
import type { TxRow } from '../../lib/sync';
import data from '../../data/tour.json';

export const TOUR_STEPS: { k: TourKey; text: StringKey }[] = [
  { k: 'card', text: 'tour.1' },
  { k: 'dots', text: 'tour.2' },
  { k: 'alert', text: 'tour.3' },
  { k: 'actions', text: 'tour.4' },
  { k: 'tiles', text: 'tour.5' },
  { k: 'list', text: 'tour.6' },
];

/** Bundled rows dated relative to now (today, yesterday). */
export function tourRows(now = Date.now()): TxRow[] {
  const offsets = [0.4, 26, 20];
  return (data.recent as TxRow[]).map((r, i) => ({ ...r, booking_ts: new Date(now - offsets[i] * 3600_000).toISOString() }));
}

const PAD = 6;

export function Tour({ onDone, firstName }: { onDone: () => void; firstName: string | null }) {
  const { c, scheme } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: winH } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const views = useRef(new Map<TourKey, TargetView | null>()).current;
  const scrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const scrollY = useRef(0);
  const fade = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  const registry = useMemo(() => ({ set: (k: TourKey, v: TargetView | null) => { views.set(k, v); } }), [views]);
  const [now] = useState(() => Date.now());
  const rows = useMemo(() => tourRows(now), [now]);

  const place = useCallback(async (i: number) => {
    const target = views.get(TOUR_STEPS[i].k) ?? null;
    let r = await measure(target);
    if (!r) { setRect(null); return; }
    // bring the block into the upper part of the screen, the bubble goes under it
    const want = insets.top + 72;
    const room = winH - 260;
    if (r.y < insets.top || r.y + r.h > room) {
      const y = Math.max(0, scrollY.current + r.y - want);
      scrollRef.current?.scrollTo({ y, animated: false });
      scrollY.current = y;
      await new Promise((res) => setTimeout(res, 60));
      r = await measure(target);
    }
    setRect(r);
    if (!reduced) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: T.motion.duration.quick, easing: EASE.enter, useNativeDriver: ND }).start();
    }
  }, [views, insets.top, winH, reduced, fade]);

  useEffect(() => {
    const id = setTimeout(() => { void place(step); }, step === 0 ? 350 : 30);
    return () => clearTimeout(id);
  }, [step, place]);

  const last = step === TOUR_STEPS.length - 1;
  const next = () => (last ? onDone() : setStep(step + 1));
  const scrim = c.scrim;
  const { width: winW } = useWindowDimensions();
  const hole = rect ? (() => {
    const x = Math.max(4, rect.x - PAD), r = Math.min(winW - 4, rect.x + rect.w + PAD);
    return { x, y: rect.y - PAD, w: r - x, h: rect.h + 2 * PAD };
  })() : null;
  const below = hole ? hole.y + hole.h + 12 : insets.top + 120;
  const bubbleTop = hole && below + 200 > winH ? undefined : below;
  const bubbleBottom = bubbleTop === undefined && hole ? winH - hole.y + 12 : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TourTargetsContext.Provider value={registry}>
        <HomeScreen home={data.home as unknown as Home} recent={rows} loading={false} state="fresh" fetchedAt={now} now={now} txSynced
          firstName={firstName ?? t('persona.dakar_salaried.name')} demo hidden={false} tz="Africa/Dakar" frozen
          onEye={() => {}} onRetry={() => {}} onOpen={() => {}} scrollRef={scrollRef}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => { scrollY.current = e.nativeEvent.contentOffset.y; }} />
      </TourTargetsContext.Provider>
      {/* scrim with a rectangular spotlight (4 panels) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} accessibilityViewIsModal>
        {hole ? (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, hole.y), backgroundColor: scrim }} />
            <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: scrim }} />
            <View style={{ position: 'absolute', left: 0, width: Math.max(0, hole.x), top: hole.y, height: hole.h, backgroundColor: scrim }} />
            <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: scrim }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 16, borderWidth: 2, borderColor: c.brand.fill }} />
          </>
        ) : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: scrim }} />}
        <Animated.View accessibilityLiveRegion="polite"
          style={{ position: 'absolute', left: T.layout.screenMargin, right: T.layout.screenMargin, top: bubbleTop, bottom: bubbleBottom, opacity: fade,
            backgroundColor: scheme === 'dark' ? c.surface2 : '#FFFFFF', borderRadius: T.component.card.radius, padding: 16, gap: 12 }}>
          <StepDots index={step + 1} total={TOUR_STEPS.length} />
          <Txt v="body" accessibilityRole="header">{t(TOUR_STEPS[step].text)}</Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {!last ? <Button variant="text" size="small" label={t('tour.skip')} onPress={onDone} /> : <View />}
            <Button size="small" label={last ? t('tour.done') : t('tour.next')} onPress={next} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
