/**
 * Sync engine (ARCHITECTURE §8.2-8.4, API.md §4.4-4.5).
 *  - screen payloads cached with their etag (p_etag → not_modified ≈ 60 B)
 *  - transactions pulled with sync_transactions (keyset cursor) into SQLite
 *  - outbox of mutations replayed through apply_mutations, FIFO, ≤ 20 per call,
 *    backoff 2 s, 8 s, 30 s, 2 min, then at next app open
 */
import type { Db } from './db/types';
import { uuidv7 } from './uuid';

export class ApiError extends Error {
  constructor(public code: string, public messageKey: string, public status: number, public retryAfterS?: number) {
    super(`${code}:${messageKey}`);
  }
}
export class NetworkError extends Error {}

export type Rpc = <R = unknown>(name: string, args?: Record<string, unknown>) => Promise<R>;

export type Envelope<D> = { etag: string; as_of?: string; not_modified: boolean; data?: D };
export type Cached<D> = { data: D; etag: string | null; as_of: string | null; fetched_at: number };

export type TxRow = {
  id: string; account_id: string; booking_ts: string; status: string; cdt_dbt_ind: 'CRDT' | 'DBIT';
  amount_minor: number; currency: string; amount_ref: number | null; label: string | null; cp_name: string | null;
  category_id: string | null; category_source: string | null; op_type: string | null; alert_id: string | null;
  row_version: number; updated_at: string;
};

type ServerTx = Omit<TxRow, 'amount_minor' | 'currency'> & { amount: { m: number; c: string } };

export const BACKOFF_S = [2, 8, 30, 120];
export const OUTBOX_CAP = 500;
export const BATCH = 20;
export const CACHE_CAP_BYTES = 5 * 1024 * 1024;
/** Re-read this much before the stored cursor: rows committed late with an
 * older updated_at are not missed (upserts make the overlap harmless). */
export const CURSOR_OVERLAP_MS = 5 * 60 * 1000;

export type OutboxItem = {
  client_id: string; rpc: string; args: string; created_at: number; attempts: number; next_at: number;
  state: 'queued' | 'conflict' | 'rejected'; reason_key: string | null;
};
export type ReplayEvent =
  | { kind: 'applied'; client_id: string; rpc: string }
  | { kind: 'conflict'; client_id: string; rpc: string; current: unknown }
  | { kind: 'rejected'; client_id: string; rpc: string; reason_key: string };

export function hashParams(p: Record<string, unknown> | undefined): string {
  const s = JSON.stringify(p ?? {}, Object.keys(p ?? {}).sort());
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function overlapCursor(cursor: string): string {
  const [ts] = cursor.split('|');
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return cursor;
  return `${new Date(t - CURSOR_OVERLAP_MS).toISOString()}|00000000-0000-0000-0000-000000000000`;
}

export class SyncEngine {
  private listeners = new Set<(e: ReplayEvent) => void>();
  private replaying: Promise<number> | null = null;

  constructor(private db: Db, private rpc: Rpc, private now: () => number = Date.now) {}

  onReplay(fn: (e: ReplayEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── screen payloads ───────────────────────────────────────────────────────
  async cached<D>(rpc: string, params?: Record<string, unknown>): Promise<Cached<D> | null> {
    const r = await this.db.getFirstAsync<{ body: string; etag: string | null; as_of: string | null; fetched_at: number }>(
      'select body, etag, as_of, fetched_at from payload_cache where rpc = ? and params_hash = ?', rpc, hashParams(params));
    return r ? { data: JSON.parse(r.body) as D, etag: r.etag, as_of: r.as_of, fetched_at: r.fetched_at } : null;
  }

  /** Fetch a screen RPC with the cached etag; returns the fresh or cached payload. */
  async refresh<D>(rpc: string, params?: Record<string, unknown>): Promise<Cached<D>> {
    const ph = hashParams(params);
    const prev = await this.cached<D>(rpc, params);
    const env = await this.rpc<Envelope<D>>(rpc, { ...(params ?? {}), p_etag: prev?.etag ?? null });
    const now = this.now();
    if (env.not_modified && prev) {
      await this.db.runAsync('update payload_cache set fetched_at = ? where rpc = ? and params_hash = ?', now, rpc, ph);
      return { ...prev, fetched_at: now };
    }
    const body = JSON.stringify(env.data ?? null);
    await this.db.runAsync(
      `insert into payload_cache (rpc, params_hash, etag, as_of, fetched_at, body, bytes) values (?, ?, ?, ?, ?, ?, ?)
       on conflict (rpc, params_hash) do update set etag = excluded.etag, as_of = excluded.as_of,
         fetched_at = excluded.fetched_at, body = excluded.body, bytes = excluded.bytes`,
      rpc, ph, env.etag, env.as_of ?? null, now, body, body.length);
    await this.evictCache();
    return { data: env.data as D, etag: env.etag, as_of: env.as_of ?? null, fetched_at: now };
  }

  private async evictCache(): Promise<void> {
    const t = await this.db.getFirstAsync<{ n: number }>('select coalesce(sum(bytes), 0) as n from payload_cache');
    let total = t?.n ?? 0;
    if (total <= CACHE_CAP_BYTES) return;
    const rows = await this.db.getAllAsync<{ rpc: string; params_hash: string; bytes: number }>(
      'select rpc, params_hash, bytes from payload_cache order by fetched_at asc');
    for (const r of rows) {
      if (total <= CACHE_CAP_BYTES) break;
      await this.db.runAsync('delete from payload_cache where rpc = ? and params_hash = ?', r.rpc, r.params_hash);
      total -= r.bytes;
    }
  }

  // ── transactions ─────────────────────────────────────────────────────────
  /** Pull every changed row since the stored cursor. Returns rows written. */
  async syncTransactions(maxPages = 50): Promise<number> {
    const st = await this.db.getFirstAsync<{ cursor: string | null }>("select cursor from sync_state where stream = 'tx'");
    let cursor: string | null = st?.cursor ? overlapCursor(st.cursor) : null;
    let written = 0;
    for (let page = 0; page < maxPages; page++) {
      const r = await this.rpc<{ items: ServerTx[]; next_cursor: string | null; has_more: boolean }>(
        'sync_transactions', { p_cursor: cursor, p_limit: 200 });
      if (r.items.length) {
        await this.db.withTransactionAsync(async () => {
          for (const x of r.items) {
            await this.db.runAsync(
              `insert into transactions (id, account_id, booking_ts, status, cdt_dbt_ind, amount_minor, currency, amount_ref,
                 label, cp_name, category_id, category_source, op_type, alert_id, row_version, updated_at)
               values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               on conflict (id) do update set account_id = excluded.account_id, booking_ts = excluded.booking_ts,
                 status = excluded.status, cdt_dbt_ind = excluded.cdt_dbt_ind, amount_minor = excluded.amount_minor,
                 currency = excluded.currency, amount_ref = excluded.amount_ref, label = excluded.label,
                 cp_name = excluded.cp_name, category_id = excluded.category_id, category_source = excluded.category_source,
                 op_type = excluded.op_type, alert_id = excluded.alert_id, row_version = excluded.row_version,
                 updated_at = excluded.updated_at
               where excluded.row_version >= transactions.row_version`,
              x.id, x.account_id, x.booking_ts, x.status, x.cdt_dbt_ind, Number(x.amount.m), x.amount.c, x.amount_ref,
              x.label, x.cp_name, x.category_id, x.category_source, x.op_type, x.alert_id, x.row_version, x.updated_at);
          }
          // the cursor only moves forward with the rows it covers (crash-safe)
          await this.saveCursor(r.next_cursor);
        });
        written += r.items.length;
      }
      cursor = r.next_cursor;
      if (!r.has_more) break;
    }
    await this.db.runAsync("update sync_state set synced_at = ? where stream = 'tx'", this.now());
    return written;
  }

  private async saveCursor(cursor: string | null) {
    await this.db.runAsync(
      `insert into sync_state (stream, cursor, synced_at) values ('tx', ?, null)
       on conflict (stream) do update set cursor = excluded.cursor`, cursor);
  }

  /** After a demo reset the server rows are new: start over. */
  async resetTransactions(): Promise<void> {
    await this.db.runAsync('delete from transactions');
    await this.db.runAsync("delete from sync_state where stream = 'tx'");
  }

  async recentTransactions(limit = 3): Promise<TxRow[]> {
    return this.db.getAllAsync<TxRow>(
      "select * from transactions where status <> 'RJCT' order by booking_ts desc, id desc limit ?", limit);
  }

  async lastSyncAt(): Promise<number | null> {
    const r = await this.db.getFirstAsync<{ synced_at: number | null }>("select synced_at from sync_state where stream = 'tx'");
    return r?.synced_at ?? null;
  }

  // ── outbox ───────────────────────────────────────────────────────────────
  async enqueue(rpc: string, args: Record<string, unknown>): Promise<string> {
    const n = await this.db.getFirstAsync<{ n: number }>("select count(*) as n from outbox where state = 'queued'");
    if ((n?.n ?? 0) >= OUTBOX_CAP) throw new ApiError('REJECTED', 'outbox.full', 0);
    const id = uuidv7(this.now());
    await this.db.runAsync('insert into outbox (client_id, rpc, args, created_at) values (?, ?, ?, ?)',
      id, rpc, JSON.stringify(args), this.now());
    return id;
  }

  async pending(): Promise<OutboxItem[]> {
    return this.db.getAllAsync<OutboxItem>('select * from outbox order by rowid');
  }

  async discard(clientId: string): Promise<void> {
    await this.db.runAsync('delete from outbox where client_id = ?', clientId);
  }

  /** App open: items parked after the last backoff step become due again. */
  async wakeOutbox(): Promise<void> {
    await this.db.runAsync("update outbox set next_at = 0 where state = 'queued'");
  }

  /** Replay due items; returns how many were settled. Concurrent calls share one run. */
  replay(): Promise<number> {
    if (!this.replaying) this.replaying = this.replayOnce().finally(() => { this.replaying = null; });
    return this.replaying;
  }

  private async replayOnce(): Promise<number> {
    let settled = 0;
    for (;;) {
      const now = this.now();
      const items = await this.db.getAllAsync<OutboxItem>(
        "select * from outbox where state = 'queued' and next_at <= ? order by rowid limit ?", now, BATCH);
      if (!items.length) return settled;
      let res: { results: { client_id: string; status: string; reason_key?: string; current?: unknown }[] };
      try {
        res = await this.rpc('apply_mutations', {
          p_items: items.map((i) => ({ client_id: i.client_id, rpc: i.rpc, args: JSON.parse(i.args) })),
        });
      } catch (e) {
        if (e instanceof ApiError && e.status < 500 && e.code !== 'RATE_LIMITED') throw e;
        // network / server: back off every item of the batch
        for (const i of items) {
          const step = BACKOFF_S[i.attempts];
          const next = step === undefined ? Number.MAX_SAFE_INTEGER : now + step * 1000;
          await this.db.runAsync('update outbox set attempts = attempts + 1, next_at = ? where client_id = ?', next, i.client_id);
        }
        return settled;
      }
      const byId = new Map(items.map((i) => [i.client_id, i]));
      for (const r of res.results) {
        const it = byId.get(r.client_id);
        if (!it) continue;
        byId.delete(r.client_id);
        settled++;
        if (r.status === 'applied' || r.status === 'duplicate') {
          await this.discard(r.client_id);
          this.emit({ kind: 'applied', client_id: r.client_id, rpc: it.rpc });
        } else if (r.status === 'conflict') {
          // server wins (§8.3): drop the item, the screen reloads the server value
          await this.discard(r.client_id);
          this.emit({ kind: 'conflict', client_id: r.client_id, rpc: it.rpc, current: r.current });
        } else {
          await this.db.runAsync("update outbox set state = 'rejected', reason_key = ? where client_id = ?",
            r.reason_key ?? 'mutations.rejected', r.client_id);
          this.emit({ kind: 'rejected', client_id: r.client_id, rpc: it.rpc, reason_key: r.reason_key ?? 'mutations.rejected' });
        }
      }
      // items the server did not answer for stay queued; avoid a tight loop on them
      if (byId.size) {
        for (const i of byId.values()) {
          await this.db.runAsync('update outbox set attempts = attempts + 1, next_at = ? where client_id = ?',
            now + (BACKOFF_S[i.attempts] ?? 120) * 1000, i.client_id);
        }
      }
    }
  }

  private emit(e: ReplayEvent) {
    for (const l of this.listeners) l(e);
  }
}
