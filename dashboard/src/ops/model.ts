/** Ops tab formats and chart geometry (pure, tested). */
import type { Lang } from '../i18n';
import { number } from '../lib/format';

const NBSP = ' ';

/** "280 ms" under one second, else "3,95 s" (2 decimals under 10 s, then 1). */
export function ms(v: number | null | undefined, lang: Lang): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (v < 1000) return `${number(Math.round(v), lang)}${NBSP}ms`;
  const s = v / 1000;
  return `${number(s, lang, s < 10 ? 2 : 1)}${NBSP}s`;
}

/** Abbreviated value label (G0: "13,3 M"); here milliseconds → seconds with one decimal ("4,0 s"). */
export function msAxis(v: number, lang: Lang): string {
  return v < 1000 ? `${number(Math.round(v), lang)}${NBSP}ms` : `${number(v / 1000, lang, 1)}${NBSP}s`;
}

export type Pt = { x: number; y: number };

/**
 * Monotone cubic (Fritsch–Carlson) path through the points: smooth, never overshooting the data (G1 §2).
 */
export function monotonePath(p: Pt[]): string {
  const n = p.length;
  if (n === 0) return '';
  if (n === 1) return `M${p[0].x},${p[0].y}`;
  const dx: number[] = []; const s: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(p[i + 1].x - p[i].x); s.push((p[i + 1].y - p[i].y) / dx[i]); }
  const m: number[] = [s[0]];
  for (let i = 1; i < n - 1; i++) m.push(s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2);
  m.push(s[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / s[i]; const b = m[i + 1] / s[i]; const h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * s[i]; m[i + 1] = k * b * s[i]; }
  }
  const f = (v: number) => Math.round(v * 100) / 100;
  let d = `M${f(p[0].x)},${f(p[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(p[i].x + h)},${f(p[i].y + m[i] * h)} ${f(p[i + 1].x - h)},${f(p[i + 1].y - m[i + 1] * h)} ${f(p[i + 1].x)},${f(p[i + 1].y)}`;
  }
  return d;
}

/** G1 area gradient stops: alpha × (1 − t)^1.8, 13 stops. */
export function areaStops(alpha: number, n = 13): { offset: number; opacity: number }[] {
  return Array.from({ length: n }, (_, i) => { const t = i / (n - 1); return { offset: t, opacity: alpha * (1 - t) ** 1.8 }; });
}

/** At most 4 time-label indexes, spread over the series (first and last always). */
export function timeTicks(n: number, max = 4): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: max }, (_, i) => Math.round((i * (n - 1)) / (max - 1)));
}
