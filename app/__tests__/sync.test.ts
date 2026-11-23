import { memoryDb } from './nodeDb';
import { migrate, wipe } from '../src/lib/db/schema';
import { ApiError, NetworkError, SyncEngine, BACKOFF_S, CURSOR_OVERLAP_MS } from '../src/lib/sync';

type Call = { name: string; args: Record<string, unknown> };

function tx(i: number, updated: string, rv = 1) {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, account_id: 'a1', booking_ts: `2026-11-${String(10 + (i % 15)).padStart(2, '0')}T10:00:00Z`,
    status: 'BOOK', cdt_dbt_ind: 'DBIT', amount: { m: 1000 * i, c: 'XOF' }, amount_ref: 1000 * i, label: `Shop ${i}`,
    cp_name: `Shop ${i}`, category_id: null, category_source: 'none', op_type: null, alert_id: null, row_version: rv, updated_at: updated,
  };
}

async function setup(server: (c: Call) => unknown, now = { t: 1_000_000 }) {
  const db = memoryDb();
  await migrate(db);
  const calls: Call[] = [];
  const rpc = async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    return server({ name, args }) as never;
  };
  return { db, calls, now, eng: new SyncEngine(db, rpc, () => now.t) };
}

describe('screen payload cache', () => {
  it('stores the payload with its etag and sends it back', async () => {
    let n = 0;
    const { eng, calls } = await setup(({ args }) => {
      n++;
      return args.p_etag === 'e1' ? { etag: 'e1', not_modified: true } : { etag: 'e1', as_of: 'x', not_modified: false, data: { v: 1 } };
    });
    expect((await eng.refresh('get_home')).data).toEqual({ v: 1 });
    expect((await eng.refresh('get_home')).data).toEqual({ v: 1 });
    expect(calls[0].args.p_etag).toBeNull();
    expect(calls[1].args.p_etag).toBe('e1');
    expect(n).toBe(2);
    expect((await eng.cached('get_home'))?.data).toEqual({ v: 1 });
  });

  it('evicts least recently fetched payloads above 5 MB', async () => {
    const big = 'x'.repeat(2 * 1024 * 1024);
    const { eng, now } = await setup(({ args }) => ({ etag: String(args.k), not_modified: false, data: big }));
    for (let k = 0; k < 4; k++) { now.t += 1; await eng.refresh('r', { k }); }
    expect(await eng.cached('r', { k: 0 })).toBeNull();
    expect(await eng.cached('r', { k: 1 })).toBeNull();
    expect(await eng.cached('r', { k: 3 })).not.toBeNull();
  });
});

describe('transactions sync', () => {
  it('pages until has_more is false, stores the cursor, then pulls incrementally with overlap', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => tx(i + 1, new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString()));
    const { eng, calls, db } = await setup(({ name, args }) => {
      if (name !== 'sync_transactions') throw new Error(name);
      const c = args.p_cursor as string | null;
      const after = c ? rows.filter((r) => `${r.updated_at}|${r.id}` > c) : rows;
      const page = after.slice(0, 200);
      const last = page[page.length - 1];
      return { items: page, next_cursor: last ? `${last.updated_at}|${last.id}` : c, has_more: after.length > 200 };
    });
    expect(await eng.syncTransactions()).toBe(450);
    expect(calls).toHaveLength(3);
    expect((await db.getFirstAsync<{ n: number }>('select count(*) n from transactions'))!.n).toBe(450);
    // incremental call starts 5 min before the stored cursor
    calls.length = 0;
    await eng.syncTransactions();
    const sent = (calls[0].args.p_cursor as string).split('|')[0];
    expect(Date.parse(rows[449].updated_at) - Date.parse(sent)).toBe(CURSOR_OVERLAP_MS);
    expect((await db.getFirstAsync<{ n: number }>('select count(*) n from transactions'))!.n).toBe(450);
  });

  it('never overwrites a newer local row_version and returns recent rows newest first', async () => {
    let rv = 3;
    const { eng } = await setup(() => ({ items: [tx(1, '2026-11-01T00:00:00Z', rv), tx(2, '2026-11-01T00:00:01Z')], next_cursor: 'c', has_more: false }));
    await eng.syncTransactions();
    rv = 2;
    await eng.syncTransactions();
    const r = await eng.recentTransactions(5);
    expect(r.map((x) => x.label)).toEqual(['Shop 2', 'Shop 1']);
    expect(r[1].row_version).toBe(3);
  });

  it('keeps cursor and rows consistent when a page fails mid-way', async () => {
    let first = true;
    const { eng, db } = await setup(() => {
      if (first) { first = false; return { items: [tx(1, '2026-11-01T00:00:00Z')], next_cursor: '2026-11-01T00:00:00Z|x', has_more: true }; }
      throw new NetworkError('down');
    });
    await expect(eng.syncTransactions()).rejects.toThrow('down');
    expect((await db.getFirstAsync<{ cursor: string }>("select cursor from sync_state where stream='tx'"))!.cursor)
      .toBe('2026-11-01T00:00:00Z|x');
  });

  it('wipe clears all local data', async () => {
    const { eng, db } = await setup(() => ({ items: [tx(1, '2026-11-01T00:00:00Z')], next_cursor: 'c', has_more: false }));
    await eng.syncTransactions();
    await eng.enqueue('update_settings', { settings: {} });
    await wipe(db);
    expect(await eng.recentTransactions()).toHaveLength(0);
    expect(await eng.pending()).toHaveLength(0);
  });
});

describe('outbox replay', () => {
  it('applies FIFO in batches of 20, deletes applied/duplicate, keeps rejected with its reason', async () => {
    const { eng, calls } = await setup(({ args }) => ({
      results: (args.p_items as { client_id: string; args: { k: number } }[]).map((i) => ({
        client_id: i.client_id,
        status: i.args.k === 3 ? 'rejected' : i.args.k === 4 ? 'duplicate' : 'applied',
        reason_key: i.args.k === 3 ? 'settings.invalid' : undefined,
      })),
    }));
    const events: string[] = [];
    eng.onReplay((e) => events.push(e.kind));
    for (let k = 0; k < 25; k++) await eng.enqueue('update_settings', { k });
    expect(await eng.replay()).toBe(25);
    expect(calls).toHaveLength(2);
    expect((calls[0].args.p_items as unknown[]).length).toBe(20);
    expect((calls[0].args.p_items as { args: { k: number } }[]).map((i) => i.args.k)).toEqual([...Array(20).keys()]);
    const left = await eng.pending();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ state: 'rejected', reason_key: 'settings.invalid' });
    expect(events.filter((e) => e === 'rejected')).toHaveLength(1);
  });

  it('server wins on conflict: item dropped and the current value reported', async () => {
    const { eng } = await setup(({ args }) => ({
      results: (args.p_items as { client_id: string }[]).map((i) => ({ client_id: i.client_id, status: 'conflict', current: { v: 9 } })),
    }));
    const ev: unknown[] = [];
    eng.onReplay((e) => ev.push(e));
    await eng.enqueue('upsert_debt', { id: 'd' });
    await eng.replay();
    expect(await eng.pending()).toHaveLength(0);
    expect(ev[0]).toMatchObject({ kind: 'conflict', current: { v: 9 } });
  });

  it('backs off 2 s, 8 s, 30 s, 2 min on network errors, then waits for the next app open', async () => {
    let up = false;
    const { eng, now, calls } = await setup(({ args }) => {
      if (!up) throw new NetworkError('offline');
      return { results: (args.p_items as { client_id: string }[]).map((i) => ({ client_id: i.client_id, status: 'applied' })) };
    });
    await eng.enqueue('update_settings', {});
    const t0 = now.t;
    const gaps: number[] = [];
    for (const s of BACKOFF_S) {
      await eng.replay();
      const it = (await eng.pending())[0];
      gaps.push((it.next_at - now.t) / 1000);
      now.t = it.next_at;
      expect(s).toBe(gaps[gaps.length - 1]);
    }
    await eng.replay();
    expect((await eng.pending())[0].next_at).toBe(Number.MAX_SAFE_INTEGER);
    const before = calls.length;
    now.t = t0 + 10 * 3600_000;
    await eng.replay();
    expect(calls.length).toBe(before); // parked
    up = true;
    await eng.wakeOutbox();
    await eng.replay();
    expect(await eng.pending()).toHaveLength(0);
  });

  it('client errors other than rate limits surface to the caller', async () => {
    const { eng } = await setup(() => { throw new ApiError('FORBIDDEN', 'auth.required', 403); });
    await eng.enqueue('update_settings', {});
    await expect(eng.replay()).rejects.toBeInstanceOf(ApiError);
    expect(await eng.pending()).toHaveLength(1);
  });

  it('concurrent replays share one run (no double send)', async () => {
    const { eng, calls } = await setup(async ({ args }) => {
      await new Promise((r) => setTimeout(r, 5));
      return { results: (args.p_items as { client_id: string }[]).map((i) => ({ client_id: i.client_id, status: 'applied' })) };
    });
    await eng.enqueue('update_settings', {});
    await Promise.all([eng.replay(), eng.replay(), eng.replay()]);
    expect(calls).toHaveLength(1);
  });
});
