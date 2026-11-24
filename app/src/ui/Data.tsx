/** C17 Ring, C21 institution / category badges, G2 Sparkline. */
import { useEffect, useId, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { T, useTheme } from '../theme';
import { EASE, Icon, Txt, useReducedMotion, type IconName } from './base';

// ── C17 ring ────────────────────────────────────────────────────────────────
const RG = T.component.progress.ring;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export type RingSize = 'row' | 'mini' | 'tile' | 'learning';
const SIZES: Record<RingSize, { size: number; stroke: number; label: number }> = { ...RG.sizes, mini: { size: 44, stroke: 6, label: 11 } };

export function ringState(pct: number): 'ok' | 'near' | 'over' {
  return pct > RG.states.over.above ? 'over' : pct >= RG.states.near.from ? 'near' : 'ok';
}

/**
 * Progress ring: arc from 12 o'clock, round cap. `value` 0..∞ (percent) or
 * learning `{done, of}`. First view sweeps 1100 ms with a light backOut overshoot.
 */
export function Ring({ pct, size = 'row', learning, label, a11yLabel, colour: tint }: { pct: number; size?: RingSize; learning?: boolean; label?: string; a11yLabel?: string; colour?: string }) {
  const { scheme } = useTheme();
  const reduced = useReducedMotion();
  const S = SIZES[size];
  const r = (S.size - S.stroke) / 2;
  const C = 2 * Math.PI * r;
  const state = learning ? 'learning' : ringState(pct);
  const colour = tint ?? RG.states[state][scheme];
  const target = Math.min(1, Math.max(0, pct / 100));
  const full = target >= 1;
  const t = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  const pulse = useState(() => new Animated.Value(1))[0];
  const [counted, setShown] = useState(0);
  const shown = reduced ? Math.round(pct) : counted;
  useEffect(() => {
    if (reduced) { t.setValue(1); return; }
    const id = t.addListener(({ value }) => setShown(Math.round(Math.min(1, value) * pct)));
    const ease = full ? EASE.enter : Easing.out(Easing.back(RG.motion.overshoot.s));
    Animated.timing(t, { toValue: 1, duration: RG.motion.sweepMs, easing: ease, useNativeDriver: false }).start();
    if (full) {
      const last = RG.motion.sweepMs * RG.motion.fullRingPulse.lastFraction;
      Animated.sequence([Animated.delay(RG.motion.sweepMs - last),
        Animated.timing(pulse, { toValue: RG.motion.fullRingPulse.scale, duration: last / 2, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: last / 2, useNativeDriver: false })]).start();
    }
    return () => t.removeListener(id);
  }, [pct, reduced, full, t, pulse]);
  const offset = t.interpolate({ inputRange: [0, 1, 2], outputRange: [C, C * (1 - target), C * (1 - 2 * target)] });
  const track = RG.track[scheme];
  return (
    <Animated.View accessible accessibilityLabel={a11yLabel ?? `${Math.round(pct)} %`} style={{ width: S.size, height: S.size, flexShrink: 0, transform: [{ scale: pulse }] }}>
      <Svg width={S.size} height={S.size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={S.size / 2} cy={S.size / 2} r={r} stroke={track} strokeWidth={S.stroke} fill="none" />
        {pct > 0 ? (
          <AnimatedCircle cx={S.size / 2} cy={S.size / 2} r={r} stroke={colour} strokeWidth={S.stroke} fill="none"
            strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={offset} />
        ) : null}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Txt fixed spec={{ size: S.label, lineHeight: S.label + 4, weight: 600, tabular: true }}>{label ?? `${shown} %`}</Txt>
      </View>
    </Animated.View>
  );
}

// ── C21 badges ──────────────────────────────────────────────────────────────
const BD = T.component.badge;
type BadgeSize = keyof typeof BD.sizes;

/** Fixed colour per institution id (series palette), never changes. */
export function institutionColour(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const pal = T.colour.chart.dark.series;
  return pal[h % pal.length];
}
export function initials(name: string): string {
  const w = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  const skip = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'of', 'the']);
  const sig = w.filter((x) => !skip.has(x.toLowerCase()));
  const use = sig.length >= 2 ? sig : w;
  return ((use[0]?.[0] ?? '') + (use[1]?.[0] ?? use[0]?.[1] ?? '')).toUpperCase();
}

export function InstitutionBadge({ id, name, size = 'row', generic }: { id?: string; name: string; size?: BadgeSize; generic?: boolean }) {
  const { c } = useTheme();
  const S = BD.sizes[size];
  if (generic || !id) {
    return (
      <View accessibilityLabel={name} style={{ width: S.circle, height: S.circle, borderRadius: S.circle / 2, backgroundColor: c.surface3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="landmark" size={S.icon} color={c.text.secondary} />
      </View>
    );
  }
  return (
    <View accessibilityLabel={name} style={{ width: S.circle, height: S.circle, borderRadius: S.circle / 2, backgroundColor: institutionColour(id), alignItems: 'center', justifyContent: 'center' }}>
      <Txt fixed spec={{ size: S.initials, lineHeight: S.initials + 4, weight: 600 }} color={BD.institution.text}>{initials(name)}</Txt>
    </View>
  );
}

export type CategoryKey = keyof typeof BD.category.items;
export function CategoryBadge({ category, size = 'row' }: { category: CategoryKey | string; size?: BadgeSize }) {
  const { scheme } = useTheme();
  const S = BD.sizes[size];
  const item = (BD.category.items as Record<string, { icon: string; dark: { icon: string; fill: string }; light: { icon: string; fill: string } }>)[category] ?? BD.category.items.Autres;
  return (
    <View accessibilityLabel={category} style={{ width: S.circle, height: S.circle, borderRadius: S.circle / 2, backgroundColor: item[scheme].fill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={item.icon as IconName} size={S.icon} color={item[scheme].icon} />
    </View>
  );
}

/** Home profile circle (C12): initials on the institution palette, 32 dp. */
export function ProfileCircle({ id, name }: { id: string; name: string }) {
  const s = T.component.navigation.header.homeProfile.size;
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: institutionColour(id), alignItems: 'center', justifyContent: 'center' }}>
      <Txt fixed spec={{ size: 12, lineHeight: 16, weight: 600 }} color={BD.institution.text}>{initials(name)}</Txt>
    </View>
  );
}

// ── G2 sparkline ────────────────────────────────────────────────────────────
const SP = T.chart.sparkline;

/** 56 × 32: line in the top 24 dp, light area below; colour by direction.
 * `size` for other frames (Home tile 126 × 24: the line uses the full height). */
export function Sparkline({ values, flat, size }: { values: number[]; flat?: boolean; size?: [number, number] }) {
  const { c, scheme } = useTheme();
  const [W, H] = size ?? (SP.size as [number, number]);
  const id = 'sp' + useId().replace(/[^a-zA-Z0-9]/g, '');
  if (values.length < 2) return <View style={{ width: W, height: H }} />;
  const first = values[0], last = values[values.length - 1];
  const dir = flat ? 'flat' : last > first ? 'up' : last < first ? 'down' : 'flat';
  const colour = dir === 'up' ? c.gain : dir === 'down' ? c.loss : c.text.secondary;
  const min = Math.min(...values), max = Math.max(...values);
  const band = Math.min(SP.lineBand, H), pad = SP.width / 2;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (W - 2 * pad), pad + (max === min ? band / 2 : (1 - (v - min) / (max - min)) * (band - 2 * pad))]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${H}L${pts[0][0].toFixed(1)},${H}Z`;
  const a0 = SP.area.alphaTop[scheme];
  const stops = Array.from({ length: SP.area.stops }, (_, i) => i / (SP.area.stops - 1));
  return (
    <Svg width={W} height={H} importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map((t) => <Stop key={t} offset={t} stopColor={colour} stopOpacity={a0 * Math.pow(1 - t, 1.8)} />)}
        </LinearGradient>
      </Defs>
      {dir !== 'flat' ? <Path d={area} fill={`url(#${id})`} /> : null}
      <Path d={line} stroke={colour} strokeWidth={SP.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
