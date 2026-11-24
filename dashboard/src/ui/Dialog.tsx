import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * C10 dialog (components/feedback.md §2): centred card over the scrim, radius 20, padding 24/20/20, title
 * 18/26 SemiBold, body 15/22 secondary, buttons in a row (48): Annuler (secondary) left, action right.
 * Focus moves to the title; Esc and a click on the scrim close it (not while busy).
 */
export function Dialog({ title, body, cancel, confirm, busy, onCancel, onConfirm, children }: {
  title: string; body: string; cancel: string; confirm: string; busy?: boolean;
  onCancel: () => void; onConfirm: () => void; children?: ReactNode;
}) {
  const id = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) { e.preventDefault(); onCancel(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="dlg-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={`${id}-b`}>
        <h2 id={`${id}-t`} ref={titleRef} tabIndex={-1} className="dlg-title">{title}</h2>
        <p id={`${id}-b`} className="dlg-body">{body}</p>
        {children}
        <div className="dlg-btns">
          <Button kind="secondary" className="btn-decide" onClick={onCancel} disabled={busy}>{cancel}</Button>
          <Button kind="primary" className="btn-decide" onClick={onConfirm} busy={busy}>{confirm}</Button>
        </div>
      </div>
    </div>
  );
}
