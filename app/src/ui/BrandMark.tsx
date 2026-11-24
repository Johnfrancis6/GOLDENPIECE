/**
 * Brand mark (icons.md §11, direction A "Cœur doré"): 8 translucent coins on a
 * ring around a gold four-point sparkle. Same geometry as
 * scripts/export-brand.mjs (launcher, splash, notification icon). `markGeometry`
 * also feeds M14 (screens/opening), which draws it at 144 dp.
 */
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import type { Scheme } from '../theme';

export const MARK_GOLD: Record<Scheme, [string, string, string]> = {
  dark: ['#FFE3A3', '#FFC97A', '#FF9A45'],
  light: ['#FFB45C', '#F2602B', '#E8452A'],
};
export const MARK_COIN: Record<Scheme, { fill: string; opacity: number }> = {
  dark: { fill: '#FFFFFF', opacity: 0.62 },
  light: { fill: '#0A0A0A', opacity: 0.42 },
};

/** Geometry for a mark of `size` dp (144: ring R 42, coin r 18, sparkle half-side 20). */
export function markGeometry(size: number) {
  const k = size / 144;
  const c = size / 2, R = 42 * k, r = 18 * k, h = 20 * k;
  const coins = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4; // clockwise from 12 o'clock
    return { x: c + R * Math.sin(a), y: c - R * Math.cos(a) };
  });
  const sparkle = `M${c} ${c - h} A${h} ${h} 0 0 0 ${c + h} ${c} A${h} ${h} 0 0 0 ${c} ${c + h} A${h} ${h} 0 0 0 ${c - h} ${c} A${h} ${h} 0 0 0 ${c} ${c - h}Z`;
  return { c, R, r, h, coins, sparkle };
}

/** Points along the sparkle outline (4 concave quarter arcs), for the M14 drawing dot. */
export function sparklePoints(size: number, perArc = 8): { x: number; y: number }[] {
  const { c, h } = markGeometry(size);
  // arc centres are the square's corners; each arc runs from one tip to the next, concave
  const corners = [[c + h, c - h], [c + h, c + h], [c - h, c + h], [c - h, c - h]];
  const start = [Math.PI, Math.PI / 2, 0, -Math.PI / 2]; // angle of the starting tip seen from its corner (y up)
  const pts: { x: number; y: number }[] = [];
  for (let q = 0; q < 4; q++) {
    for (let i = 0; i < perArc; i++) {
      const a = start[q] + (i / perArc) * (Math.PI / 2);
      pts.push({ x: corners[q][0] + h * Math.cos(a), y: corners[q][1] - h * Math.sin(a) });
    }
  }
  pts.push(pts[0]);
  return pts;
}

export function BrandMark({ size = 144, scheme: forced }: { size?: number; scheme?: Scheme }) {
  const { scheme: s } = useTheme();
  const scheme = forced ?? s;
  const g = markGeometry(size);
  const gold = MARK_GOLD[scheme];
  const coin = MARK_COIN[scheme];
  return (
    <Svg width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="gpMarkGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gold[0]} /><Stop offset="0.45" stopColor={gold[1]} /><Stop offset="1" stopColor={gold[2]} />
        </LinearGradient>
      </Defs>
      {g.coins.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={g.r} fill={coin.fill} fillOpacity={coin.opacity} />)}
      <Path d={g.sparkle} fill="url(#gpMarkGold)" />
    </Svg>
  );
}
