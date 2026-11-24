import { useEffect } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useT } from '../i18n';
import { UNDO_MS, type ToastState } from './useDecision';

/** C11 toast (components/feedback.md §3), bottom of the detail; "Annuler" while the decision is held. */
export function Toast({ toast, onUndo, onDismiss }: { toast: ToastState; onUndo: () => void; onDismiss: () => void }) {
  const t = useT();
  // Errors close by themselves; the "saved" toast is closed by the decision timer (it sends the RPC).
  useEffect(() => {
    if (!toast || toast.kind === 'saved') return;
    const h = setTimeout(onDismiss, UNDO_MS);
    return () => clearTimeout(h);
  }, [toast, onDismiss]);
  return (
    <div className="toast-zone" role="status" aria-live="polite">
      {toast ? (
        <div className={`toast toast-${toast.kind}`} key={toast.seq}>
          <span className="toast-bg" aria-hidden />
          <span className="toast-in">
            {toast.kind === 'saved' ? <CircleCheck size={20} className="toast-ok" aria-hidden /> : <CircleAlert size={20} className="toast-warn" aria-hidden />}
            <span>{t(toast.kind === 'saved' ? 'toast.saved' : toast.kind === 'already' ? 'toast.already' : 'toast.failed')}</span>
            {toast.kind === 'saved' ? <button type="button" className="toast-act" onClick={onUndo}>{t('toast.undo')}</button> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
