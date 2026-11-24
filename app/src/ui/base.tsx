/**
 * Foundations for every UI piece: Txt (F2 type scale), Icon (F4), motion
 * helpers (F5, reduced motion) and the dev font-scale override used by the
 * gallery on web (native text scales with the system setting by itself).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Easing, Platform, Text, useWindowDimensions, type TextProps, type TextStyle } from 'react-native';
import { T, font, pick, useTheme, type Scheme } from '../theme';
import { ICONS, type IconName } from './icons';

export type { IconName };

/** Pick a {dark, light} token (or a "{colour.*.x}" ref) for the current scheme. */
export function useTk() {
  const { scheme } = useTheme();
  return <V,>(v: V | { dark: V; light: V }) => pick(v as { dark: V; light: V }, scheme) as V;
}
export const tk = <V,>(v: V | { dark: V; light: V }, scheme: Scheme) => pick(v as { dark: V; light: V }, scheme) as V;

// ── motion ──────────────────────────────────────────────────────────────────
const bez = (b: number[]) => Easing.bezier(b[0], b[1], b[2], b[3]);
export const EASE = {
  standard: bez(T.motion.easing.standard),
  enter: bez(T.motion.easing.enter),
  exit: bez(T.motion.easing.exit),
  morph: bez(T.motion.easing.morph),
};
/** Native driver is unavailable on web (react-native-web warns). */
export const ND = Platform.OS !== 'web';

const ReducedMotionContext = createContext<boolean | null>(null);
export function ReducedMotionProvider({ value, children }: { value?: boolean; children: ReactNode }) {
  const [sys, setSys] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSys).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSys);
    return () => sub.remove();
  }, []);
  return <ReducedMotionContext.Provider value={value ?? sys}>{children}</ReducedMotionContext.Provider>;
}
export const useReducedMotion = () => useContext(ReducedMotionContext) ?? false;

// ── text ────────────────────────────────────────────────────────────────────
/** Dev only: on web the gallery simulates the system font scale (200 % check). */
export const FontScaleContext = createContext(1);

/** True at ≥ 150 % text size: rows stack the value under the title (F2 §3), B19 shrinks its icon. */
export function useLargeFont(): boolean {
  const dev = useContext(FontScaleContext);
  const { fontScale } = useWindowDimensions();
  return Math.max(dev, fontScale) >= 1.5;
}

export type TypeName = keyof typeof T.typography.scale;
type Spec = { size: number; lineHeight: number; weight?: number; letterSpacing?: number; tabular?: boolean; maxFontSizeMultiplier?: number };
export type TxtTone = 'primary' | 'secondary' | 'disabled' | 'brand' | 'gain' | 'loss' | 'warning' | 'onBrand';

export type TxtProps = TextProps & {
  v?: TypeName;
  /** Explicit spec (component tokens such as 13/18 600) instead of a scale name. */
  spec?: Spec;
  tone?: TxtTone;
  color?: string;
  weight?: 400 | 500 | 600;
  align?: TextStyle['textAlign'];
  /** Graphics (ring labels, keypad digits) keep their size. */
  fixed?: boolean;
};

export function Txt({ v = 'body', spec, tone = 'primary', color, weight, align, fixed, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  const scale = useContext(FontScaleContext);
  const s = (spec ?? T.typography.scale[v]) as Spec;
  const k = fixed ? 1 : Math.min(scale, s.maxFontSizeMultiplier ?? Infinity);
  const toneColour =
    tone === 'secondary' ? c.text.secondary
    : tone === 'disabled' ? c.text.disabled
    : tone === 'brand' ? c.brand.text
    : tone === 'gain' ? c.gain
    : tone === 'loss' ? c.loss
    : tone === 'warning' ? c.warning
    : tone === 'onBrand' ? c.brand.onFill
    : c.text.primary;
  return (
    <Text
      allowFontScaling={!fixed}
      maxFontSizeMultiplier={s.maxFontSizeMultiplier}
      style={[
        {
          fontFamily: font(weight ?? s.weight ?? 400),
          fontSize: s.size * k,
          lineHeight: s.lineHeight * k,
          letterSpacing: s.letterSpacing,
          fontVariant: s.tabular ? ['tabular-nums'] : undefined,
          color: color ?? toneColour,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}

// ── icon ────────────────────────────────────────────────────────────────────
const SIZE = T.icon.size;
export type IconProps = { name: IconName; size?: number | 'sm' | 'md' | 'lg'; color?: string; stroke?: number };

/** Lucide glyph, absolute stroke width (F4): 24/2, 20/1.75, 16/1.75. Decorative by default. */
export function Icon({ name, size = 'md', color, stroke }: IconProps) {
  const { c } = useTheme();
  const px = typeof size === 'number' ? size : SIZE[size].size;
  const sw = stroke ?? (typeof size === 'number' ? (px >= 24 ? SIZE.lg.stroke : SIZE.md.stroke) : SIZE[size].stroke);
  const G = ICONS[name];
  return <G size={px} color={color ?? c.text.primary} strokeWidth={sw} absoluteStrokeWidth={T.icon.absoluteStrokeWidth} />;
}
