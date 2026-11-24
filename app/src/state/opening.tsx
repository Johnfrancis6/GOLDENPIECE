/**
 * M14 app opening timeline (motion.md §4b, tokens motion.appOpening) shared by
 * the overlay (screens/opening/AppOpening) and the Home build. One native
 * clock in ms (0 → 4300); every piece is an interpolation of it, so the
 * overlay and Home stay in step and nothing runs on the JS thread except the
 * two path trims (dot drawing) and the count-up.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, type EasingFunction, type StyleProp, type ViewStyle } from 'react-native';
import { T } from '../theme';
import { EASE } from '../ui/base';

export const OP = T.motion.appOpening;
const b = OP.easingBack;
export const BACK = Easing.bezier(b[0], b[1], b[2], b[3]);

export type Opening = {
  /** Native-driven clock, ms since the first frame of the opening. */
  clock: Animated.Value;
  /** Home builds around the card (false when the opening ends on the lock screen). */
  build: boolean;
};

/** When the overlay started the clock (0 before); read by the count-up at each frame. */
let startedAt = 0;
export const markOpeningStart = () => { startedAt = Date.now(); };
const openingElapsed = () => (startedAt ? Date.now() - startedAt : -1);

export const OpeningContext = createContext<Opening | null>(null);
export const useOpening = () => useContext(OpeningContext);

/** clamp-interpolates `clock` between two times. */
export function seg(clock: Animated.Value | Animated.AnimatedInterpolation<number>, t: readonly [number, number], out: readonly [number, number], easing?: EasingFunction) {
  return (clock as Animated.Value).interpolate<number>({ inputRange: [t[0], t[1]], outputRange: [out[0], out[1]], easing, extrapolate: 'clamp' });
}

type EntryOpts = { dy?: number; dx?: number; scaleFrom?: number; dur?: number; easing?: EasingFunction };

/**
 * Home build entry style for a block starting at `start` ms (§4b last row):
 * fade + rise/slide/scale over ~500 ms. Undefined when no opening plays, so
 * the screen renders static (also the end state: identity transforms).
 */
export function useOpeningEntry(start: number, o: EntryOpts = {}) {
  const op = useOpening();
  return useMemo(() => {
    if (!op || !op.build) return undefined;
    const dur = o.dur ?? 500;
    const t: [number, number] = [start, start + dur];
    const ease = o.easing ?? EASE.enter;
    const transform: ({ translateY: Animated.AnimatedInterpolation<number> } | { translateX: Animated.AnimatedInterpolation<number> } | { scale: Animated.AnimatedInterpolation<number> })[] = [];
    if (o.dy) transform.push({ translateY: seg(op.clock, t, [o.dy, 0], ease) });
    if (o.dx) transform.push({ translateX: seg(op.clock, t, [o.dx, 0], ease) });
    if (o.scaleFrom != null) transform.push({ scale: seg(op.clock, t, [o.scaleFrom, 1], BACK) });
    return { opacity: seg(op.clock, [start, start + Math.min(dur, 320)], [0, 1], EASE.standard), transform };
  }, [op, start, o.dy, o.dx, o.scaleFrom, o.dur, o.easing]);
}

/** Times of the Home build (ms), §4b. */
export const BUILD = {
  header: 3450, banner: 3500, carouselAppear: OP.card.appear, carouselMove: OP.card.moveUp, dots: 3600,
  actions: 3550, tiles: 3550, listHead: 3650, list: 3700, tabBar: 3750,
} as const;

/** easeOutQuint (tokens motion.easing.countUp). */
export const countUpEase = (x: number) => 1 - Math.pow(1 - x, 5);

/** A block of the Home build: same element before, during and after the opening (no remount). */
export function Enter({ at, dy, dx, scaleFrom, dur, style, children }: EntryOpts & { at: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const e = useOpeningEntry(at, { dy, dx, scaleFrom, dur });
  return <Animated.View style={[style, e]}>{children}</Animated.View>;
}

/**
 * M7 count-up of the Home card amount during the opening (§4b: 2950-4050 ms,
 * easeOutQuint). Returns `target` at once when no opening plays.
 */
export function useOpeningCountUp(target: number): number {
  const op = useOpening();
  const active = !!op?.build;
  const [v, setV] = useState(() => (active ? 0 : target));
  useEffect(() => {
    if (!op?.build) return;
    let raf = 0;
    const [a, z] = OP.card.countUp;
    const tick = () => {
      const e = openingElapsed();
      const x = e < 0 ? 0 : Math.min(1, Math.max(0, (e - a) / (z - a)));
      setV(Math.round(target * countUpEase(x)));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [op, target]);
  return active ? v : target;
}
