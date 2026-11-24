import { useCallback, useEffect, useRef, useState } from 'react';
import type { Client as SupabaseClient } from '../lib/supabase';

/** A `core.alerts` change as Realtime sends it (RLS: analyst + aal2 sees bank-side statuses). */
export type AlertChange = { event: 'INSERT' | 'UPDATE' | 'DELETE'; id: string; status: string | null };
export type AlertListener = (c: AlertChange) => void;

export type Live = {
  /** "En direct" while the channel is SUBSCRIBED and the browser is online. */
  live: boolean;
  /** Register a listener for core.alerts changes; returns the unsubscribe function. */
  onAlert: (fn: AlertListener) => () => void;
};

/**
 * One Realtime channel for the shell (D top bar + §5 "Realtime lost"),
 * carrying the `core.alerts` postgres_changes the queue listens to.
 */
export function useLive(client: SupabaseClient, enabled: boolean, token?: string): Live {
  const [subscribed, setSubscribed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const listeners = useRef(new Set<AlertListener>());

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // supabase-js re-authenticates Realtime on SIGNED_IN / TOKEN_REFRESHED but not on
  // MFA_CHALLENGE_VERIFIED: without this the socket keeps the aal1 token and the
  // analyst RLS policy (aal2) filters out every core.alerts event.
  useEffect(() => {
    if (enabled && token) void client.realtime?.setAuth(token);
  }, [client, enabled, token]);

  useEffect(() => {
    if (!enabled) return;
    let ch: ReturnType<SupabaseClient['channel']> | null = null;
    let cancelled = false;
    void (async () => {
      if (token) await client.realtime?.setAuth(token);
      if (cancelled) return;
      ch = client
        .channel('dashboard-live')
        .on('postgres_changes', { event: '*', schema: 'core', table: 'alerts' }, (p) => {
          const row = (p.new && Object.keys(p.new).length ? p.new : p.old) as { id?: string; status?: string };
          if (!row?.id) return;
          const change: AlertChange = { event: p.eventType, id: row.id, status: row.status ?? null };
          listeners.current.forEach((fn) => fn(change));
        })
        .subscribe((status) => setSubscribed(status === 'SUBSCRIBED'));
    })();
    return () => {
      cancelled = true;
      setSubscribed(false);
      if (ch) void client.removeChannel(ch);
    };
    // The channel is joined once per sign-in; later tokens go through the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, enabled]);

  const onAlert = useCallback((fn: AlertListener) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  return { live: subscribed && online, onAlert };
}
