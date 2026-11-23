/**
 * M14 "Le plan" (motion.md §4b): a dot draws the ring and a second the
 * sparkle over dashed guides, the 8 coins drop onto the ring and the sparkle
 * turns gold, GOLDENPIECE rises with a light bounce, 300 ms hold, the mark
 * leaves, a blank card grows at the centre and hands over to the real Home
 * card, which the Home screen moves into place while it builds around it
 * (state/opening.tsx). Cold start only; tap after 600 ms skips; reduced
 * motion = 150 ms fade from the mark.
 *
 * Built with RN Animated + react-native-svg (B6.2 decision, no Skia yet):
 * transform/opacity on the native clock, the two path trims and the dots'
 * positions on a JS clock that stops at 1350 ms.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { T, useTheme } from '../../theme';
import { EASE, ND, Txt } from '../../ui/base';
import { MARK_COIN, MARK_GOLD, markGeometry, sparklePoints } from '../../ui/BrandMark';
import { BACK, OP, markOpeningStart, seg, type Opening } from '../../state/opening';

const APath = Animated.createAnimatedComponent(Path);
const SIZE = OP.mark.size; // 144
const WORD = 'GOLDENPIECE';
const CARD = T.screen.home.card;

export function AppOpening({ opening, reduced, onDone }: { opening: Opening; reduced: boolean; onDone: () => void }) {
  const { c, scheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const clock = opening.clock;
  const [draw] = useState(() => new Animated.Value(0)); // JS clock for path trims, 0 → 1350 ms
  const [skip] = useState(() => new Animated.Value(1)); // overlay opacity on skip / reduced motion
  const skippable = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    const end = () => { if (!done.current) { done.current = true; onDone(); } };
    if (reduced) {
      clock.setValue(OP.total);
      const a = Animated.timing(skip, { toValue: 0, duration: 150, easing: EASE.standard, useNativeDriver: ND });
      a.start(end);
      return () => a.stop();
    }
    markOpeningStart();
    const total = opening.build ? OP.total : OP.mark.exit[1] + 300;
    const a = Animated.timing(clock, { toValue: total, duration: total, easing: Easing.linear, useNativeDriver: ND });
    const d = Animated.timing(draw, { toValue: OP.dot.fade[1], duration: OP.dot.fade[1], easing: Easing.linear, useNativeDriver: false });
    const s = setTimeout(() => { skippable.current = true; }, OP.skipAfter);
    a.start(({ finished }) => { if (finished) end(); });
    d.start();
    return () => { a.stop(); d.stop(); clearTimeout(s); };
  }, [clock, draw, skip, reduced, opening.build, onDone]);

  const onSkip = () => {
    if (!skippable.current || done.current) return;
    skippable.current = false;
    clock.stopAnimation();
    draw.stopAnimation();
    clock.setValue(OP.total); // Home end state
    Animated.timing(skip, { toValue: 0, duration: T.motion.duration.quick, easing: EASE.standard, useNativeDriver: ND })
      .start(() => { if (!done.current) { done.current = true; onDone(); } });
  };

  const g = useMemo(() => markGeometry(SIZE), []);
  const gold = MARK_GOLD[scheme];
  const coin = MARK_COIN[scheme];
  const ringLen = 2 * Math.PI * g.R;
  const sparkLen = 2 * Math.PI * g.h; // 4 quarter arcs of radius h
  const ringPath = `M${g.c} ${g.c - g.R} A${g.R} ${g.R} 0 1 1 ${g.c} ${g.c + g.R} A${g.R} ${g.R} 0 1 1 ${g.c} ${g.c - g.R}`;

  // ── JS-driven: trims + dot positions ──
  const p1 = seg(draw, OP.dot.dot1Draw as [number, number], [0, 1], EASE.morph);
  const p2 = seg(draw, OP.dot.dot2Draw as [number, number], [0, 1], EASE.morph);
  const N = 32;
  const steps = Array.from({ length: N + 1 }, (_, i) => i / N);
  const ringX = p1.interpolate({ inputRange: steps, outputRange: steps.map((s) => g.c + g.R * Math.sin(s * 2 * Math.PI) - 4) });
  const ringY = p1.interpolate({ inputRange: steps, outputRange: steps.map((s) => g.c - g.R * Math.cos(s * 2 * Math.PI) - 4) });
  const sp = sparklePoints(SIZE, 8);
  const spIn = sp.map((_, i) => i / (sp.length - 1));
  const spX = p2.interpolate({ inputRange: spIn, outputRange: sp.map((q) => q.x - 4) });
  const spY = p2.interpolate({ inputRange: spIn, outputRange: sp.map((q) => q.y - 4) });
  const dotFade = seg(draw, OP.dot.fade as [number, number], [1, 0], EASE.exit);
  const dot1Scale = seg(draw, OP.dot.pop as [number, number], [0, 1], BACK);
  const dot2Scale = seg(draw, [OP.dot.dot2Pop, OP.dot.dot2Pop + 300], [0, 1], BACK);

  // ── native clock ──
  const outlineOpacity = seg(clock, OP.mark.outlineFade as [number, number], [1, 0], EASE.exit);
  const fillOpacity = seg(clock, OP.mark.fill as [number, number], [0, 1], EASE.enter);
  const fillScale = seg(clock, OP.mark.fill as [number, number], [OP.mark.fillScaleFrom, 1], EASE.enter);
  const markExitScale = seg(clock, OP.mark.exit as [number, number], [1, OP.mark.exitScale], EASE.exit);
  const markExitOpacity = seg(clock, OP.mark.exit as [number, number], [1, 0], EASE.exit);
  const wordExitOpacity = seg(clock, OP.wordmark.exit as [number, number], [1, 0], EASE.exit);
  const wordExitY = seg(clock, OP.wordmark.exit as [number, number], [0, 8], EASE.exit);
  const [g0, g1] = OP.blankCard.grow;
  const blankScale = seg(clock, [g0, g1], [OP.blankCard.scaleFrom, 1], EASE.enter);
  const blankOpacity = clock.interpolate({ inputRange: [g0 - 1, g0, OP.blankCard.fadeOut[0], OP.blankCard.fadeOut[1]], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
  // the overlay's background lets the real Home card (under it) show from 2800 ms
  const bgOpacity = opening.build
    ? seg(clock, [OP.card.appear, OP.blankCard.fadeOut[1]], [1, 0], EASE.standard)
    : seg(clock, [OP.mark.exit[1], OP.mark.exit[1] + 300], [1, 0], EASE.standard);

  const guides = useMemo(() => {
    const L = g.c - g.R - g.r, Rr = g.c + g.R + g.r; // bounding box of the mark
    return [
      { x1: L, y1: L, x2: Rr, y2: L }, { x1: Rr, y1: L, x2: Rr, y2: Rr }, { x1: Rr, y1: Rr, x2: L, y2: Rr },
      { x1: L, y1: Rr, x2: L, y2: L }, { x1: L - 16, y1: g.c, x2: Rr + 16, y2: g.c },
    ];
  }, [g]);
  const guideColour = scheme === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(10,10,10,0.22)';

  const cardW = Math.min(CARD.size[0], width - 2 * T.layout.screenMargin);
  const top = height / 2 - SIZE / 2 - 24;

  if (reduced) {
    return (
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: skip, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: SIZE, height: SIZE }}><StaticMark size={SIZE} gold={gold} coin={coin} /></View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: skip }]} accessible accessibilityLabel="GOLDENPIECE">
      <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} accessibilityRole="none">
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: bgOpacity }]} />
        {/* mark */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top, left: width / 2 - SIZE / 2, width: SIZE, height: SIZE,
          opacity: markExitOpacity, transform: [{ scale: markExitScale }] }}>
          {/* guides */}
          {guides.map((l, i) => {
            const t0 = OP.guides.draw[0] + i * OP.guides.stagger;
            const sc = seg(clock, [t0, t0 + (OP.guides.draw[1] - OP.guides.draw[0])], [0, 1], EASE.standard);
            const op = clock.interpolate({ inputRange: [t0, t0 + 1, OP.guides.fade[0], OP.guides.fade[1]], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });
            const horiz = l.y1 === l.y2;
            return (
              <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity: op, transform: [horiz ? { scaleX: sc } : { scaleY: sc }] }]}>
                <Svg width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
                  <Line {...l} stroke={guideColour} strokeWidth={1} strokeDasharray="3 4" />
                </Svg>
              </Animated.View>
            );
          })}
          {/* outline being drawn */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: outlineOpacity }]}>
            <Svg width={SIZE} height={SIZE}>
              <APath d={ringPath} stroke={OP.dot.colour} strokeWidth={1.5} fill="none" strokeLinecap="round"
                strokeDasharray={`${ringLen} ${ringLen}`} strokeDashoffset={p1.interpolate({ inputRange: [0, 1], outputRange: [ringLen, 0] })} />
              <APath d={g.sparkle} stroke={OP.dot.colour} strokeWidth={1.5} fill="none" strokeLinejoin="round"
                strokeDasharray={`${sparkLen} ${sparkLen}`} strokeDashoffset={p2.interpolate({ inputRange: [0, 1], outputRange: [sparkLen, 0] })} />
            </Svg>
          </Animated.View>
          {/* filled mark: coins drop clockwise from the top, sparkle turns gold */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fillOpacity, transform: [{ scale: fillScale }] }]}>
            {g.coins.map((p, i) => {
              const t0 = OP.mark.fill[0] + i * OP.mark.coinDrop.stagger;
              const t: [number, number] = [t0, t0 + OP.mark.coinDrop.duration];
              return (
                <Animated.View key={i} style={{ position: 'absolute', left: p.x - g.r, top: p.y - g.r, width: g.r * 2, height: g.r * 2, borderRadius: g.r,
                  backgroundColor: coin.fill, opacity: seg(clock, [t0, t0 + 120], [0, coin.opacity]),
                  transform: [{ scale: seg(clock, t, [OP.mark.coinDrop.scaleFrom, 1], BACK) }] }} />
              );
            })}
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="m14gold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={gold[0]} /><Stop offset="0.45" stopColor={gold[1]} /><Stop offset="1" stopColor={gold[2]} />
                </LinearGradient>
              </Defs>
              <Path d={g.sparkle} fill="url(#m14gold)" />
            </Svg>
          </Animated.View>
          {/* drawing dots */}
          <Animated.View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: OP.dot.colour, left: 0, top: 0,
            opacity: dotFade, transform: [{ translateX: ringX }, { translateY: ringY }, { scale: dot1Scale }] }} />
          <Animated.View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: OP.dot.colour, left: 0, top: 0,
            opacity: Animated.multiply(dotFade, seg(draw, [OP.dot.dot2Pop - 1, OP.dot.dot2Pop], [0, 1])), transform: [{ translateX: spX }, { translateY: spY }, { scale: dot2Scale }] }} />
        </Animated.View>
        {/* wordmark: letters rise with a light bounce */}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: top + SIZE + 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center',
          opacity: wordExitOpacity, transform: [{ translateY: wordExitY }] }}>
          {WORD.split('').map((ch, i) => {
            const t0 = OP.wordmark.start + i * OP.wordmark.stagger;
            const d = OP.wordmark.duration, B = OP.wordmark.bounce;
            const y = clock.interpolate({
              inputRange: [t0, t0 + d * B.overshootAt, t0 + d * B.settleAt, t0 + d],
              outputRange: [B.from, B.overshoot, B.settle, 0], extrapolate: 'clamp', easing: EASE.standard,
            });
            const o = seg(clock, [t0, t0 + d * B.overshootAt], [0, 1], EASE.enter);
            return (
              <Animated.View key={i} style={{ opacity: o, transform: [{ translateY: y }] }}>
                <Txt fixed spec={{ size: 20, lineHeight: 28, weight: 600, letterSpacing: 3 }} color={c.brand.text}>{ch}</Txt>
              </Animated.View>
            );
          })}
        </Animated.View>
        {/* blank card, grows at the centre, then hands over to the Home card under it */}
        {opening.build ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - cardW / 2, top: height / 2 - CARD.size[1] / 2,
            width: cardW, height: CARD.size[1], borderRadius: CARD.radius, backgroundColor: c.surface2,
            opacity: blankOpacity, transform: [{ scale: blankScale }] }} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function StaticMark({ size, gold, coin }: { size: number; gold: [string, string, string]; coin: { fill: string; opacity: number } }) {
  const g = markGeometry(size);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="m14goldS" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gold[0]} /><Stop offset="0.45" stopColor={gold[1]} /><Stop offset="1" stopColor={gold[2]} />
        </LinearGradient>
      </Defs>
      {g.coins.map((p, i) => <Path key={i} d={`M${p.x - g.r} ${p.y} a${g.r} ${g.r} 0 1 0 ${2 * g.r} 0 a${g.r} ${g.r} 0 1 0 ${-2 * g.r} 0`} fill={coin.fill} fillOpacity={coin.opacity} />)}
      <Path d={g.sparkle} fill="url(#m14goldS)" />
    </Svg>
  );
}
