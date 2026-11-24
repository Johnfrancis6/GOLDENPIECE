import { useLang } from '../i18n';
import { number } from '../lib/format';

/**
 * G3-style horizontal bars (charts/g3-bars.md) for Ops counts: one row per item (48 high), name 13/18, bar 16
 * thick radius 0 4 4 0 in an F1 chart series colour, value 13/18 SemiBold tabular; scale = largest row. A text
 * summary is the accessible name.
 */
export function HBars({ rows, summary }: { rows: { label: string; value: number; colour: string }[]; summary: string }) {
  const lang = useLang();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="g3" role="img" aria-label={summary}>
      {rows.map((r) => (
        <div className="g3-row" key={r.label} aria-hidden>
          <span className="g3-name">{r.label}</span>
          <span className="g3-track"><span className="g3-bar" style={{ width: `${(r.value / max) * 100}%`, background: r.colour }} /></span>
          <span className="g3-val">{number(r.value, lang)}</span>
        </div>
      ))}
    </div>
  );
}
