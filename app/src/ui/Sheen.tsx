/**
 * M13 gold sheen (motion.md §4 M13, tokens colour.glow.goldSheen / motion.sheen):
 * one soft gold band crosses the card once when it first becomes visible and
 * again on each tap; fades in over the first 18 %, out after 70 %; band centre
 * travels −30 % → 130 % of the card width; no loop. Reduced motion: none (the
 * card keeps its static edge). Only translateX + opacity, native driver.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme';
import { EASE, ND, useReducedMotion } from './base';

const G = T.colour.glow.goldSheen as unknown as { angleDeg: number; layerWidthRatio: number; stops: { at: number; colour: string }[] };
const S = T.motion.sheen;
const rad = (G.angleDeg * Math.PI) / 180;
// CSS angle → gradient vector (0° = to top, 90° = to right)
const START = { x: 0.5 - Math.sin(rad) / 2, y: 0.5 + Math.cos(rad) / 2 };
const END = { x: 0.5 + Math.sin(rad) / 2, y: 0.5 - Math.cos(rad) / 2 };

export type SheenHandle = { play: () => void };

/** Absolute layer inside a card with `overflow: 'hidden'`. `visible` true the first time plays it once. */
export const Sheen = forwardRef<SheenHandle, { visible: boolean }>(function Sheen({ visible }, ref) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const [p] = useState(() => new Animated.Value(0));
  const played = useRef(false);
  const run = useRef<() => void>(() => {});
  run.current = () => {
    if (reduced || !w) return;
    p.stopAnimation();
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: S.durationMs, easing: EASE.morph, useNativeDriver: ND }).start();
  };
  useImperativeHandle(ref, () => ({ play: () => run.current() }), []);
  useEffect(() => {
    if (visible && w && !played.current) { played.current = true; run.current(); }
  }, [visible, w]);
  if (reduced) return null;
  const L = G.layerWidthRatio * w;
  // band centre sits at L/2 inside the layer: centre from -0.3w to 1.3w
  const translateX = p.interpolate({ inputRange: [0, 1], outputRange: [-0.3 * w - L / 2, 1.3 * w - L / 2] });
  const opacity = p.interpolate({ inputRange: [0, S.fade.inEnd, S.fade.outStart, 1], outputRange: [0, 1, 1, 0] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: L, opacity, transform: [{ translateX }] }}>
          <LinearGradient colors={G.stops.map((s) => s.colour) as [string, string, ...string[]]} locations={G.stops.map((s) => s.at) as [number, number, ...number[]]}
            start={START} end={END} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
});
