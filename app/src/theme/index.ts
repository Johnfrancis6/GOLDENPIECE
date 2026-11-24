/**
 * App theme built from design/tokens.json (copied as is to ./tokens.json;
 * a test checks the copy is identical). Never invent a value here: read it
 * from the tokens, and raise a missing one in CHAIN_LOG instead.
 */
import { createContext, useContext } from 'react';
import { TextStyle, useColorScheme } from 'react-native';
import tokens from './tokens.json';

export type Scheme = 'dark' | 'light';
export const T = tokens;

type Palette = typeof tokens.colour.dark;

/** Resolve "{a.b.c}" and "{colour.*.x}" references for one scheme. */
export function resolve<V = unknown>(value: V, scheme: Scheme): V {
  if (typeof value !== 'string') return value;
  const m = /^\{([^}]+)\}$/.exec(value);
  if (!m) return value;
  const path = m[1].replace('*', scheme).split('.');
  let cur: unknown = tokens;
  for (const p of path) cur = (cur as Record<string, unknown>)?.[p];
  return resolve(cur as V, scheme);
}

/** A token pair {dark, light} or a single value → the scheme's value. */
export function pick<V>(v: { dark: V; light: V } | V, scheme: Scheme): V {
  if (v && typeof v === 'object' && 'dark' in (v as object) && 'light' in (v as object)) {
    return resolve((v as { dark: V; light: V })[scheme], scheme);
  }
  return resolve(v as V, scheme);
}

const FAMILY: Record<number, string> = { 400: 'PoppinsGP-Regular', 500: 'PoppinsGP-Medium', 600: 'PoppinsGP-SemiBold' };

export function font(weight: number): string {
  return FAMILY[weight] ?? FAMILY[400];
}

type Scale = keyof typeof tokens.typography.scale;
export function type(name: Scale): TextStyle {
  const s = tokens.typography.scale[name] as { size: number; lineHeight: number; weight: number; letterSpacing?: number; tabular?: boolean };
  return {
    fontFamily: font(s.weight),
    fontSize: s.size,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    fontVariant: s.tabular ? ['tabular-nums'] : undefined,
  };
}

export function textStyle(s: { size: number; lineHeight: number; weight: number }): TextStyle {
  return { fontFamily: font(s.weight), fontSize: s.size, lineHeight: s.lineHeight };
}

export type Theme = {
  scheme: Scheme;
  c: Palette & { score: { low: string; mid: string; high: string } };
};

export function makeTheme(scheme: Scheme): Theme {
  const p = tokens.colour[scheme];
  return {
    scheme,
    c: { ...p, score: { low: p.gain, mid: p.warning, high: p.loss } } as Theme['c'],
  };
}

export const ThemeContext = createContext<Theme>(makeTheme('dark'));
export const useTheme = () => useContext(ThemeContext);

export type ThemeChoice = 'system' | 'dark' | 'light';
export function useSchemeFor(choice: ThemeChoice): Scheme {
  const sys = useColorScheme();
  if (choice === 'system') return sys === 'light' ? 'light' : 'dark';
  return choice;
}

export const S = tokens.spacing;
export const L = tokens.layout;
export const R = tokens.radius;
export const M = tokens.motion;
