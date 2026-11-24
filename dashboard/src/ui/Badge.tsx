import type { ReactNode } from 'react';
import { CircleCheckBig, RotateCwFadingClock, ShieldCheck, ShieldX } from 'lucide-react';
import { useT } from '../i18n';
import type { BandKey } from '../queue/model';

const BAND_ICON = { normal: CircleCheckBig, ask: RotateCwFadingClock, bank: ShieldCheck } as const;

/** C15 score badge: icon 14 + word or number, radius 4, 12/16 SemiBold (components/tags-score.md). */
export function ScoreBadge({ band, children }: { band: BandKey; children?: ReactNode }) {
  const t = useT();
  const Icon = BAND_ICON[band];
  const word = t(band === 'normal' ? 'band.normal' : band === 'ask' ? 'band.ask' : 'band.bank');
  return (
    <span className={`badge badge-${band}`} title={word}>
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      {children ?? word}
    </span>
  );
}

/** Outcome after a decision (D queue row): Légitime in the Normal colours, Fraude in the notified colours. */
export function OutcomeBadge({ decision }: { decision: 'legit' | 'fraud' }) {
  const t = useT();
  const Icon = decision === 'legit' ? CircleCheckBig : ShieldX;
  return (
    <span className={`badge ${decision === 'legit' ? 'badge-normal' : 'badge-bank'}`}>
      <Icon size={14} strokeWidth={1.75} aria-hidden />
      {t(decision === 'legit' ? 'outcome.legit' : 'outcome.fraud')}
    </span>
  );
}

/** C14 tag (neutral by default). */
export function Tag({ children, kind = 'neutral' }: { children: ReactNode; kind?: 'neutral' | 'brand' | 'loss' }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}
