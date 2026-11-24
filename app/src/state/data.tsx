/**
 * Data layer for the tab screens (B6.4, ARCHITECTURE §8.2-8.4):
 *  open → paint from the local cache → `bootstrap` + `get_home` refresh →
 *  `sync_transactions` into SQLite → recent rows re-read.
 *  Foreground: outbox replay every 30 s, Realtime on `core.alerts` (RLS),
 *  reconnect (expo-network) → replay + refresh. Background: channel closed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import { useApp } from './app';
import { getEngine } from './engine';
import { NetworkError, type SyncEngine, type TxRow } from '../lib/sync';
import type { Bootstrap, Home } from '../lib/api';
import { freshness, type Freshness } from '../lib/home';
import { useT } from '../i18n';
import { useToast } from '../ui';

export const REPLAY_EVERY_MS = 30_000;

type DataCtx = {
  home: Home | null;
  boot: Bootstrap | null;
  recent: TxRow[];
  /** First load with nothing cached yet (C18 skeletons). */
  loading: boolean;
  state: Freshness;
  fetchedAt: number | null;
  now: number;
  txSynced: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<DataCtx | null>(null);
export function useData(): DataCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData outside DataProvider');
  return c;
}
export const useDataMaybe = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { api, st, patch } = useApp();
  const t = useT();
  const toast = useToast();
  const [home, setHome] = useState<Home | null>(null);
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [recent, setRecent] = useState<TxRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [failed, setFailed] = useState(false);
  const [painted, setPainted] = useState(false);
  const [txSynced, setTxSynced] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const engineRef = useRef<SyncEngine | null>(null);
  const running = useRef<Promise<void> | null>(null);
  const stRef = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);

  const readRecent = useCallback(async () => {
    const e = engineRef.current;
    if (e) setRecent(await e.recentTransactions(3).catch(() => []));
  }, []);

  const doRefresh = useCallback(async () => {
    const e = engineRef.current;
    try {
      if (e) {
        const [b, h] = await Promise.all([e.refresh<Bootstrap>('bootstrap'), e.refresh<Home>('get_home')]);
        setBoot(b.data);
        setHome(h.data);
        setFetchedAt(h.fetched_at);
      } else {
        // no local DB (web preview without SQLite): direct calls, no cache
        const [b, h] = await Promise.all([
          api.rpc<{ data: Bootstrap }>('bootstrap', { p_etag: null }),
          api.rpc<{ data: Home }>('get_home', { p_etag: null }),
        ]);
        setBoot(b.data);
        setHome(h.data);
        setFetchedAt(Date.now());
      }
      setFailed(false);
      setOnline(true);
    } catch (err) {
      if (err instanceof NetworkError) setOnline(false);
      else setFailed(true);
      return;
    }
    if (e) {
      try { await e.syncTransactions(); setTxSynced(true); } catch { /* next refresh */ }
      await readRecent();
    }
  }, [api, readRecent]);

  const refresh = useCallback(() => {
    if (!running.current) running.current = doRefresh().finally(() => { running.current = null; setNow(Date.now()); });
    return running.current;
  }, [doRefresh]);

  const replay = useCallback(async () => {
    const e = engineRef.current;
    if (!e) return;
    await e.replay().catch(() => {});
  }, []);

  // open: cache paint first (no network wait), then refresh
  useEffect(() => {
    let live = true;
    (async () => {
      const e = await getEngine(api).catch(() => null);
      if (!live) return;
      engineRef.current = e;
      if (!e) setTxSynced(true); // no local DB: nothing to wait for
      if (e) {
        e.onReplay((ev) => {
          if (ev.kind === 'conflict') toast.show({ kind: 'conflict', text: t('conflict.toast') });
        });
        const [h, b] = await Promise.all([e.cached<Home>('get_home'), e.cached<Bootstrap>('bootstrap')]).catch(() => [null, null] as const);
        if (!live) return;
        if (h) { setHome(h.data); setFetchedAt(h.fetched_at); }
        if (b) setBoot(b.data);
        if ((await e.lastSyncAt().catch(() => null)) !== null) setTxSynced(true);
        await readRecent();
        await e.wakeOutbox().catch(() => {});
      }
      setPainted(true);
      void replay();
      void refresh();
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // profile values the phone keeps: lock delay (O18)
  useEffect(() => {
    const d = boot?.profile.lock_delay_s;
    if (typeof d === 'number' && d !== stRef.current.lockDelayS) void patch({ lockDelayS: d });
  }, [boot?.profile.lock_delay_s, patch]);

  // foreground: replay every 30 s, Realtime on alerts; back to foreground → wake + refresh
  const [active, setActive] = useState(RNAppState.currentState !== 'background');
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (a) => {
      const on = a === 'active';
      setActive(on);
      if (on) {
        void engineRef.current?.wakeOutbox().then(replay).catch(() => {});
        void refresh();
      }
    });
    return () => sub.remove();
  }, [refresh, replay]);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { void replay(); setNow(Date.now()); }, REPLAY_EVERY_MS);
    return () => clearInterval(id);
  }, [active, replay]);

  // reconnect → replay + refresh
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let was = true;
    const sub = Network.addNetworkStateListener((s) => {
      const on = s.isConnected !== false && s.isInternetReachable !== false;
      setOnline(on);
      if (on && !was) { void replay(); void refresh(); }
      was = on;
    });
    return () => sub.remove();
  }, [refresh, replay]);

  // Realtime: any change to my alerts → refresh Home (RLS limits rows to mine)
  useEffect(() => {
    if (!active) return;
    let ch: ReturnType<typeof api.sb.channel> | null = null;
    let live = true;
    api.sb.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id;
      if (!uid || !live) return;
      ch = api.sb.channel(`alerts:${uid}`)
        .on('postgres_changes', { event: '*', schema: 'core', table: 'alerts', filter: `user_id=eq.${uid}` }, () => { void refresh(); })
        .subscribe();
    }).catch(() => {});
    return () => { live = false; if (ch) void api.sb.removeChannel(ch); };
  }, [active, api, refresh]);

  const state = freshness({ fetchedAt, online, failed, now });
  const value = useMemo<DataCtx>(() => ({
    home, boot, recent, loading: !painted || (!home && !failed && online), state, fetchedAt, now, txSynced, refresh,
  }), [home, boot, recent, painted, failed, online, state, fetchedAt, now, txSynced, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
