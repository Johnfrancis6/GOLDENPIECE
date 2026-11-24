import { useId, useState } from 'react';
import { useLang } from '../i18n';
import { shortDate } from '../lib/format';
import { areaStops, monotonePath, msAxis, timeTicks, type Pt } from './model';

const W = 1120; const H = 200; const LEFT = 20; const GUTTER = 56; const TOP = 10; const BOTTOM = 24;

/**
 * G1 line + area (charts/g0-g1-g2.md) on the web: no grid, 3 value labels right (11/14 secondary), ≤ 4 time
 * labels, monotone cubic line 2.5 in the line colour, area alpha × (1 − t)^1.8. Hover/arrow keys = scrub: the
 * card head shows the touched point (G0 "drives the hero"); no tooltip bubble. Days without data are skipped.
 */
export function LineChart({ days, values, summary, onScrub, alpha }: {
  days: string[]; values: (number | null)[]; summary: string; alpha: number;
  onScrub: (i: number | null) => void;
}) {
  const lang = useLang();
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const idx = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  const vals = idx.map((i) => values[i] as number);
  const max = Math.max(...vals) * 1.1 || 1;
  const pw = W - LEFT - GUTTER; const ph = H - TOP - BOTTOM;
  const x = (i: number) => LEFT + (days.length < 2 ? 0 : (i * pw) / (days.length - 1));
  const y = (v: number) => TOP + ph - (v / max) * ph;
  const pts: Pt[] = idx.map((i) => ({ x: x(i), y: y(values[i] as number) }));
  const line = monotonePath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${TOP + ph} L${pts[0].x},${TOP + ph} Z` : '';
  const labels = [max / 1.1, max / 2.2, 0];
  const set = (i: number | null) => { setHover(i); onScrub(i); };
  const near = (px: number) => idx.reduce((b, i) => (Math.abs(x(i) - px) < Math.abs(x(b) - px) ? i : b), idx[0]);

  return (
    <svg className="g1" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} tabIndex={0}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        set(near(((e.clientX - r.left) / r.width) * W));
      }}
      onMouseLeave={() => set(null)}
      onBlur={() => set(null)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const k = (hover == null ? idx.length - 1 : idx.indexOf(hover)) + (e.key === 'ArrowRight' ? 1 : -1);
        set(idx[Math.max(0, Math.min(idx.length - 1, k))]);
      }}>
      <defs>
        <linearGradient id={`${gid}-a`} x1="0" x2="0" y1="0" y2="1">
          {areaStops(alpha).map((s) => <stop key={s.offset} offset={s.offset} stopColor="var(--chart-line)" stopOpacity={s.opacity} />)}
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid}-a)`} className="g1-area" />
      <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="g1-line" />
      {labels.map((v) => <text key={v} x={W - 4} y={y(v) + 4} textAnchor="end" className="g-lbl">{msAxis(v, lang)}</text>)}
      {timeTicks(days.length).map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} className="g-lbl">{shortDate(days[i], lang)}</text>
      ))}
      {hover != null && values[hover] != null ? (
        <g aria-hidden>
          <line x1={x(hover)} x2={x(hover)} y1={TOP} y2={TOP + ph} className="g1-scrub" />
          <circle cx={x(hover)} cy={y(values[hover] as number)} r={6} fill="var(--chart-line)" stroke="var(--s1)" strokeWidth={2.5} />
        </g>
      ) : null}
    </svg>
  );
}
