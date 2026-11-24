import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

export type Decision = 'legit' | 'fraud';
export type Held = { id: string; decision: Decision; comment: string | null; at: string };
export type ToastState = { kind: 'saved' | 'failed' | 'already'; seq: number } | null;

/** D §3: the toast stays 8 s; "Annuler" is allowed until it closes. */
export const UNDO_MS = 8000;

/**
 * Decision with undo. There is no undo RPC: `api.analyst_decide` is sent only
 * when the toast closes (8 s), when another decision replaces it, or when the
 * page is left. Until then the decision is "held" (shown, not sent).
 */
export function useDecision(onSettled?: () => void) {
  const { client, refresh } = useAuth();
  const [held, setHeld] = useState<Held | null>(null);
  /** Sent (or sending) decisions: shown in the queue until the server row says decided. */
  const [sent, setSent] = useState<Record<string, Decision>>({});
  const [toast, setToast] = useState<ToastState>(null);
  const heldRef = useRef<Held | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const settled = useRef(onSettled);
  useEffect(() => { settled.current = onSettled; }, [onSettled]);

  const show = useCallback((kind: 'saved' | 'failed' | 'already') => {
    seq.current += 1;
    setToast({ kind, seq: seq.current });
  }, []);

  const send = useCallback(async (h: Held) => {
    setSent((s) => ({ ...s, [h.id]: h.decision }));
    const { data, error } = await client.rpc('analyst_decide', { p_alert_id: h.id, p_decision: h.decision, p_comment: h.comment });
    if (error) {
      setSent((s) => { const n = { ...s }; delete n[h.id]; return n; });
      if (/analyst|forbidden|jwt/i.test(`${error.message} ${error.code}`)) await refresh();
      show('failed');
    } else if ((data as { already_decided?: boolean } | null)?.already_decided) {
      setSent((s) => { const n = { ...s }; delete n[h.id]; return n; });
      show('already');
    }
    settled.current?.();
  }, [client, refresh, show]);

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  /** Send the held decision now (toast closed, replaced, or page left). */
  const commit = useCallback(() => {
    clear();
    const h = heldRef.current;
    heldRef.current = null;
    setHeld(null);
    setToast((t) => (t?.kind === 'saved' ? null : t));
    if (h) void send(h);
  }, [send]);

  const decide = useCallback((id: string, decision: Decision, comment: string | null) => {
    if (heldRef.current) commit();               // one toast at a time: the previous decision leaves now
    const h: Held = { id, decision, comment: comment?.trim() ? comment.trim() : null, at: new Date().toISOString() };
    heldRef.current = h;
    setHeld(h);
    show('saved');
    timer.current = setTimeout(commit, UNDO_MS);
  }, [commit, show]);

  /** "Annuler": nothing was sent; returns the alert id to go back to. */
  const undo = useCallback((): string | null => {
    clear();
    const h = heldRef.current;
    heldRef.current = null;
    setHeld(null);
    setToast(null);
    return h?.id ?? null;
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  // Leaving the queue (other tab, sign-out): the held decision is sent at once.
  useEffect(() => () => { clear(); const h = heldRef.current; heldRef.current = null; if (h) void send(h); }, [send]);
  // Closing the browser tab while a decision is held: ask first (the RPC could not finish).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (heldRef.current) { e.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { held, sent, toast, decide, undo, commit, dismiss };
}
