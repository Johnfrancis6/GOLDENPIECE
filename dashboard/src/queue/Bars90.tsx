import { useLang, useT } from '../i18n';
import { money, shortDate } from '../lib/format';
import type { History } from './history';

const W = 360;
const H = 112;
const PITCH = W / 90; // 4
const BAR = 2.8;
const BASE = H - 4;

/**
 * G3-style daily debit bars (D §2): 360 × 112, grey bars, this operation's
 * day in brand orange, dashed median, first/last dates; text summary for
 * screen readers (D §6).
 */
export function Bars90({ h }: { h: History }) {
  const t = useT();
  const lang = useLang();
  const max = Math.max(1, ...h.days.map((d) => d.total));
  const y = (v: number) => BASE - Math.max(v > 0 ? 2 : 0, (v / max) * (BASE - 4));
  const cur = h.days.find((d) => d.current);
  const fmt = (m: number) => money({ m, c: h.currency }, lang, { style: 'row' });
  const summary = t('hist.summary', { days: h.withDebits, median: fmt(h.median), amount: fmt(cur?.total ?? 0) });
  return (
    <figure className="bars" aria-label={summary}>
      <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={summary}>
        {h.days.map((d, i) => d.total > 0 ? (
          <rect key={d.key} x={i * PITCH} y={y(d.total)} width={BAR} height={BASE - y(d.total)} rx={1}
            className={d.current ? 'bar-cur' : 'bar'} />
        ) : null)}
        {h.median > 0 ? <line x1={0} x2={W} y1={y(h.median)} y2={y(h.median)} className="bar-median" strokeDasharray="3 3" strokeWidth={1} /> : null}
        <text x={0} y={H + 14} className="bar-label">{shortDate(h.days[0].key + 'T12:00:00', lang)}</text>
        <text x={W} y={H + 14} className="bar-label" textAnchor="end">{shortDate(h.days[89].key + 'T12:00:00', lang)}</text>
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
