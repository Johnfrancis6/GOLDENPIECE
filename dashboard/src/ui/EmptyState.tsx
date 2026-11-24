import { ShieldCheck } from 'lucide-react';

/**
 * C19 empty state, alerts variant (delegated: C19 layout, Lucide
 * `shield-check` 3.4× in text.secondary on the C19 ground line instead of the
 * piggy bank; coins dropped — CHAIN_LOG B9.2).
 */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <svg width="168" height="88" viewBox="0 0 168 88" aria-hidden className="empty-art">
        <line x1="20" x2="148" y1="84" y2="84" strokeWidth="2.5" strokeLinecap="round" className="empty-ground" />
        <ShieldCheck x={43} y={0} size={82} strokeWidth={2.5 / 3.4} />
      </svg>
      <h2 className="empty-title">{title}</h2>
      <p className="empty-body">{body}</p>
    </div>
  );
}
