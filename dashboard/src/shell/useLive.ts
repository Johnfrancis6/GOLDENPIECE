import { useEffect, useState } from 'react';
import type { Client as SupabaseClient } from '../lib/supabase';

/**
 * "En direct" / "Hors ligne" (D top bar + §5 "Realtime lost"): live while a
 * Realtime channel is SUBSCRIBED and the browser is online. B9.2 adds the
 * `core.alerts` postgres_changes listener on this same channel.
 */
export function useLive(client: SupabaseClient, enabled: boolean): boolean {
  const [subscribed, setSubscribed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

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

  useEffect(() => {
    if (!enabled) return;
    const ch = client.channel('dashboard-live').subscribe((status) => setSubscribed(status === 'SUBSCRIBED'));
    return () => {
      setSubscribed(false);
      void client.removeChannel(ch);
    };
  }, [client, enabled]);

  return subscribed && online;
}
