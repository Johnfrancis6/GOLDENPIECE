/** C18 skeletons + failed load, C19 empty state (components/loading-empty.md). */
import { useEffect, useState } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { T, useTheme } from '../theme';
import { useT } from '../i18n';
import { EASE, Icon, ND, Txt, useReducedMotion, useTk } from './base';
import { Button } from './Button';

const SK = T.component.skeleton;
const EM = T.component.emptyState;

export function SkeletonBar({ width, height = SK.bars.heights.title, radius }: { width: DimensionValue; height?: number; radius?: number }) {
  const tk = useTk();
  return <View style={{ width, height, borderRadius: radius ?? (height >= SK.bars.heights.hero ? 8 : SK.bars.radius), backgroundColor: tk(SK.bars) }} />;
}

// One clock for every connection badge (they light together); runs while ≥ 1 badge is mounted.
const clock = new Animated.Value(0);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;
function useSharedClock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (users++ === 0) {
      clock.setValue(0);
      loop = Animated.loop(Animated.timing(clock, { toValue: 1, duration: SK.connectionBadge.cycleMs, easing: Easing.linear, useNativeDriver: false }));
      loop.start();
    }
    return () => { if (--users === 0) loop?.stop(); };
  }, [active]);
}

const WIFI = ['M12 20h.01', 'M8.5 16.429a5 5 0 0 1 7 0', 'M5 12.859a10 10 0 0 1 14 0', 'M2 8.82a15 15 0 0 1 20 0'];
const AnimatedPath = Animated.createAnimatedComponent(Path);

function arcOpacity(i: number) {
  const b = SK.connectionBadge;
  const s = b.stepsPct[i] / 100, f = b.fadeInPct / 100, h = b.holdUntilPct / 100, o = b.outByPct / 100;
  const input = s === 0 ? [0, f, h, o, 1] : [0, s, s + f, h, o, 1];
  const output = s === 0 ? [0, 1, 1, 0, 0] : [0, 0, 1, 1, 0, 0];
  return clock.interpolate({ inputRange: input, outputRange: output });
}

function ConnectionBadge() {
  const { c, scheme } = useTheme();
  const reduced = useReducedMotion();
  useSharedClock(!reduced);
  const b = SK.connectionBadge;
  const on = b.on[scheme];
  const sw = 2 * (24 / b.iconSize); // ≈ 2 dp stroke at 14 dp
  return (
    <View style={{ position: 'absolute', top: b.offset[0], right: b.offset[1], width: b.size, height: b.size, borderRadius: b.size / 2,
      backgroundColor: c.surface1, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={b.iconSize} height={b.iconSize} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {WIFI.map((d, i) => <Path key={`b${i}`} d={d} stroke={c.text.disabled} strokeOpacity={b.baseOpacity} strokeWidth={sw} />)}
        {reduced
          ? <Path d={WIFI[0]} stroke={on} strokeWidth={sw} />
          : WIFI.map((d, i) => <AnimatedPath key={`o${i}`} d={d} stroke={on} strokeWidth={sw} strokeOpacity={arcOpacity(i)} />)}
      </Svg>
    </View>
  );
}

/** 40 dp icon slot: grey bank icon + connection badge. */
export function SkeletonIcon({ badge = true }: { badge?: boolean }) {
  const { c } = useTheme();
  const s = SK.iconSlot;
  return (
    <View style={{ width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: c.surface3, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="landmark" size={s.iconSize} color={c.text.disabled} />
      {badge ? <ConnectionBadge /> : null}
    </View>
  );
}

/** Row skeleton matching a C6 two-line row (64 dp). */
export function SkeletonRow({ badge = true, value = true }: { badge?: boolean; value?: boolean }) {
  return (
    <View importantForAccessibility="no-hide-descendants" style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <SkeletonIcon badge={badge} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBar width="55%" />
        <SkeletonBar width="35%" height={SK.bars.heights.subtitle} />
      </View>
      {value ? <SkeletonBar width={64} /> : null}
    </View>
  );
}

function PiggyIllustration() {
  const { c, scheme } = useTheme();
  const [W, H] = EM.illustration.box;
  const ground = EM.illustration.ground[scheme];
  const gold = EM.illustration.coins[scheme];
  const sw = EM.illustration.stroke;
  const pig = 24 * EM.illustration.scale; // 81.6
  const px = (W - pig) / 2;
  return (
    <View style={{ width: W, height: H }} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', left: px, top: 0 }}>
        <Icon name="piggy-bank" size={pig} stroke={sw} color={c.text.secondary} />
      </View>
      <Svg width={W} height={H} style={{ position: 'absolute' }} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Line x1={4} y1={H - 3} x2={W - 4} y2={H - 3} stroke={ground} strokeWidth={sw} />
        {[0, 1, 2].map((i) => <Rect key={i} x={12} y={H - 11 - i * 7} width={24} height={6} rx={3} stroke={gold} strokeWidth={sw} />)}
        <Circle cx={W - 30} cy={H - 13} r={9} stroke={gold} strokeWidth={sw} />
        <Ellipse cx={W - 13} cy={H - 6} rx={8} ry={2.5} stroke={gold} strokeWidth={sw} />
      </Svg>
    </View>
  );
}

function WifiAlertIllustration() {
  const { c, scheme } = useTheme();
  const ex = SK.failed.exclamation;
  return (
    <View style={{ width: EM.illustration.box[0], height: EM.illustration.box[1], alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
      importantForAccessibility="no-hide-descendants">
      <Svg width={82} height={56} viewBox="1 5 22 16" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {WIFI.map((d, i) => <Path key={i} d={d} stroke={c.text.secondary} strokeWidth={EM.illustration.stroke * (16 / 56)} />)}
      </Svg>
      <Svg width={12} height={56} fill="none" strokeLinecap="round">
        <Line x1={6} y1={10} x2={6} y2={36} stroke={ex[scheme]} strokeWidth={ex.stroke} />
        <Line x1={6} y1={47} x2={6} y2={47.01} stroke={ex[scheme]} strokeWidth={ex.stroke} />
      </Svg>
    </View>
  );
}

export type EmptyStateProps = {
  title: string;
  text: string;
  action?: { label: string; onPress: () => void; icon?: 'plus' | 'rotate-cw' };
  illustration?: 'piggy' | 'wifi';
};

/** C19 empty state; illustration 'wifi' = the failed-load ("Connexion instable") variant. */
export function EmptyState({ title, text, action, illustration = 'piggy' }: EmptyStateProps) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  useEffect(() => {
    if (!reduced) Animated.timing(v, { toValue: 1, duration: SK.failed.stateInMs, easing: EASE.enter, useNativeDriver: ND }).start();
  }, [v, reduced]);
  return (
    <Animated.View style={{ opacity: v, alignItems: 'center', paddingTop: EM.topGap, paddingHorizontal: T.layout.screenMargin }}>
      {illustration === 'wifi' ? <WifiAlertIllustration /> : <PiggyIllustration />}
      <Txt spec={EM.title} align="center" accessibilityRole="header" style={{ marginTop: EM.title.gapTop }}>{title}</Txt>
      <Txt spec={EM.text} tone="secondary" align="center" style={{ marginTop: 8 }}>{text}</Txt>
      {action ? (
        <Button label={action.label} icon={action.icon} onPress={action.onPress} block={false} padX={EM.button.paddingX}
          style={{ marginTop: EM.button.gapTop, alignSelf: 'center' }} />
      ) : null}
    </Animated.View>
  );
}

/** Failed load without cache: wifi + "!" , "Connexion instable", Réessayer. */
export function FailedState({ what, onRetry }: { what: string; onRetry: () => void }) {
  const t = useT();
  return <EmptyState illustration="wifi" title={t('failed.title')} text={t('failed.text', { what })}
    action={{ label: t('failed.retry'), icon: 'rotate-cw', onPress: onRetry }} />;
}

