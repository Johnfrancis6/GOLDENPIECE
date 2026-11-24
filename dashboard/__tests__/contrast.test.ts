import { cssVars, type Scheme } from '../src/theme';

/** WCAG 2.2 contrast (translucent fills composited over surface1, where rows, tags and cards sit) of the D §6 pairs (+ the B9.4 settings / Ops / dialog pairs) in both themes. */
/** "#RRGGBB", or "rgba(r,g,b,a)" composited over `base` (the surface the colour sits on). */
function rgb(c: string, base = '#FFFFFF'): [number, number, number] {
  const m = /^rgba?\(([^)]+)\)$/.exec(c.replace(/\s/g, ''));
  if (m) {
    const [r, g, b, a = 1] = m[1].split(',').map(Number);
    const under = rgb(base);
    return [r, g, b].map((x, i) => Math.round(x * a + under[i] * (1 - a))) as [number, number, number];
  }
  const hex = c;
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
}
const lum = (c: [number, number, number]) => {
  const [r, g, b] = c.map((x) => { const s = x / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const ratio = (a: string, b: string, base?: string) => { const [x, y] = [lum(rgb(a, base)), lum(rgb(b, base))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [label, foreground var, background var, minimum]
const PAIRS: [string, string, string, number][] = [
  ['loss text on page (reset button)', '--loss', '--bg', 4.5],
  ['brand text on selected row', '--brt', '--selected', 4.5],
  ['secondary text on selected row', '--ts', '--selected', 4.5],
  ['label on Fraude', '--btn-danger-label', '--btn-danger', 4.5],
  ['"En direct" on top bar', '--live-text', '--s1', 4.5],
  ['secondary text on chips', '--ts', '--s3', 4.5],
  ['changed value on table card (B9.4)', '--changed', '--s1', 4.5],
  ['secondary text on card (table, log, tiles, chart labels)', '--ts', '--s1', 4.5],
  ['secondary text on page (intro, model line)', '--ts', '--bg', 4.5],
  ['dialog body', '--ts', '--dialog-fill', 4.5],
  ['"Échec" tag', '--tag-loss-text', '--tag-loss', 4.5],
  ['G1 line on card (graphic, 3:1)', '--chart-line', '--s1', 3],
];

describe.each(['light', 'dark'] as Scheme[])('contrast %s', (scheme) => {
  const v = cssVars(scheme);
  it.each(PAIRS)('%s', (_label, fg, bg, min) => {
    const r = ratio(v[fg], v[bg], v['--s1']);
    expect(r, `${fg} ${v[fg]} on ${bg} ${v[bg]} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });
});

it('prints the measured pairs', () => {
  const rows = PAIRS.map(([l, fg, bg]) => `${l}: light ${ratio(cssVars('light')[fg], cssVars('light')[bg], cssVars('light')['--s1']).toFixed(2)} · dark ${ratio(cssVars('dark')[fg], cssVars('dark')[bg], cssVars('dark')['--s1']).toFixed(2)}`);
  console.log(rows.join('\n'));
});
