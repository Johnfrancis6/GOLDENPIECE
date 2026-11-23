/** B19 Step screen (blocks/b19-step-screen.md): one idea, one action. */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, useTheme } from '../theme';
import { EASE, Icon, ND, Txt, useLargeFont, useReducedMotion, type IconName } from './base';
import { Button } from './Button';
import { StepDots, TopBar } from './TopBar';

const SS = T.block.stepScreen;

export type StepScreenProps = {
  icon: IconName;
  tone?: 'neutral' | 'warning';
  title: string;
  text?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  secondary?: { label: string; onPress: () => void };
  progress?: { index: number; total: number };
  onBack?: () => void;
  slot?: ReactNode;
};

export function StepScreen(p: StepScreenProps) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const large = useLargeFont();
  const tone = SS.icon[p.tone ?? 'neutral'][scheme];
  const circle = large ? SS.largeFont.circle : SS.icon.circle;
  const glyph = large ? SS.largeFont.icon : SS.icon.size;

  // enter: icon fade + scale 0.92 → 1, then title / text fade + 8 dp rise, 60 ms stagger, 220 ms each
  const a = useState(() => [0, 1, 2].map(() => new Animated.Value(reduced ? 1 : 0)))[0];
  useEffect(() => {
    if (reduced) { a.forEach((v) => v.setValue(1)); return; }
    Animated.stagger(60, a.map((v) => Animated.timing(v, { toValue: 1, duration: 220, easing: EASE.enter, useNativeDriver: ND }))).start();
  }, [a, reduced]);
  const rise = (v: Animated.Value) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [T.motion.distance.enterTranslateDp, 0] }) }] });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <TopBar onBack={p.onBack} center={p.progress ? <StepDots index={p.progress.index} total={p.progress.total} /> : undefined} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: 40, alignItems: 'center' }}>
          <Animated.View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
            style={{ marginTop: large ? 24 : SS.icon.marginTop, width: circle, height: circle, borderRadius: circle / 2,
              backgroundColor: tone.circle, alignItems: 'center', justifyContent: 'center',
              opacity: a[0], transform: [{ scale: a[0].interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
            <Icon name={p.icon} size={glyph} stroke={SS.icon.stroke} color={tone.glyph} />
          </Animated.View>
          <Animated.View style={[{ marginTop: SS.title.gapAboveIcon, alignSelf: 'stretch' }, rise(a[1])]}>
            <Txt v="titleScreen" align="center" accessibilityRole="header">{p.title}</Txt>
          </Animated.View>
          {p.text ? (
            <Animated.View style={[{ marginTop: SS.text.gap, alignSelf: 'stretch' }, rise(a[2])]}>
              <Txt v="body" tone="secondary" align="center">{p.text}</Txt>
            </Animated.View>
          ) : null}
          {p.slot ? <View style={{ marginTop: SS.slotGap, alignSelf: 'stretch' }}>{p.slot}</View> : null}
        </ScrollView>
        {/* 40 dp fade to bg above the pinned buttons */}
        <LinearGradient pointerEvents="none" colors={[c.bg + '00', c.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SS.largeFont.fade }} />
      </View>
      <View style={{ paddingHorizontal: T.layout.screenMargin, paddingBottom: insets.bottom + SS.bottom.marginBottom, gap: SS.bottom.gap }}>
        {p.secondary ? (
          <Button variant="text" label={p.secondary.label} onPress={p.secondary.onPress} disabled={p.primaryLoading} block />
        ) : null}
        <Button label={p.primaryLabel} onPress={p.onPrimary} loading={p.primaryLoading} disabled={p.primaryDisabled} />
      </View>
    </View>
  );
}
