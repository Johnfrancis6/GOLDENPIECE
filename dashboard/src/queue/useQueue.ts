import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import type { QueueItem, QueuePage } from '../lib/types';
import { isPending } from '../lib/types';
import type { Live } from '../shell/useLive';
import { mergeFirstPage } from './model';

export type QueueState = {
  items: QueueItem[];
  loading: boolean;
  error: boolean;
  cursor: string | null;
  /** Rows that arrived by Realtime (fade in once). */
  fresh: Set<string>;
  /** Pending alerts arrived by Realtime and not seen yet (page title count). */
  unseen: number;
};

/** `api.analyst_queue('all')` + Realtime refresh on `core.alerts` changes (debounced 250 ms). */
export function useQueue(live: Live) {
  const { client, refresh: refreshAuth } = useAuth();
  const [s, setS] = useState<QueueState>({ items: [], loading: true, error: false, cursor: null, fresh: new Set(), unseen: 0 });
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(async (cursor: string | null): Promise<QueuePage | null> => {
    const { data, error } = await client.rpc('analyst_queue', { p_status: 'all', p_cursor: cursor });
    if (error) {
      // FORBIDDEN (aal dropped to aal1, role removed): re-read the session; the guard redirects to login.
      if (/analyst|forbidden|jwt/i.test(`${error.message} ${error.code}`)) await refreshAuth();
      return null;
    }
    return data as QueuePage;
  }, [client, refreshAuth]);

  const reload = useCallback(async () => {
    const page = await fetchPage(null);
    setS((prev) => {
      if (!page) return { ...prev, loading: false, error: !loaded.current || prev.error };
      const known = new Set(prev.items.map((i) => i.alert_id));
      const arrived = loaded.current ? page.items.filter((i) => !known.has(i.alert_id)) : [];
      const fresh = new Set(arrived.map((i) => i.alert_id));
      const unseen = prev.unseen + arrived.filter((i) => isPending(i.status)).length;
      const items = loaded.current ? mergeFirstPage(prev.items, page.items) : page.items;
      loaded.current = true;
      return { items, loading: false, error: false, cursor: prev.cursor && loaded.current && prev.items.length > page.items.length ? prev.cursor : page.next_cursor, fresh, unseen };
    });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!s.cursor) return;
    const page = await fetchPage(s.cursor);
    if (!page) return;
    setS((prev) => {
      const ids = new Set(prev.items.map((i) => i.alert_id));
      return { ...prev, items: [...prev.items, ...page.items.filter((i) => !ids.has(i.alert_id))], cursor: page.next_cursor, fresh: new Set() };
    });
  }, [fetchPage, s.cursor]);

  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);

  useEffect(() => live.onAlert(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void reload(), 250);
  }), [live, reload]);

  // Coming back online / Realtime re-subscribed: catch up on what was missed.
  const wasLive = useRef(live.live);
  useEffect(() => {
    if (live.live && !wasLive.current && loaded.current) void Promise.resolve().then(reload);
    wasLive.current = live.live;
  }, [live.live, reload]);

  const markSeen = useCallback(() => setS((p) => (p.unseen ? { ...p, unseen: 0 } : p)), []);

  return { ...s, reload, loadMore, markSeen };
}
