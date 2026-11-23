/** Supabase client + typed calls (API.md). The app reads only schema `api`
 * (ARCHITECTURE §1.2). Session tokens live in the encrypted local DB. */
import { createClient } from '@supabase/supabase-js';
import env from '../data/env.dev.json';
import { ApiError, NetworkError } from './sync';
import type { Db } from './db/types';

export const TIMEOUT_MS = 15_000;

/** Supabase auth storage backed by the SQLCipher kv table. */
function dbStorage(getDb: () => Promise<Db>) {
  return {
    async getItem(key: string) {
      const db = await getDb();
      return (await db.getFirstAsync<{ value: string }>('select value from kv where key = ?', `auth:${key}`))?.value ?? null;
    },
    async setItem(key: string, value: string) {
      const db = await getDb();
      await db.runAsync('insert into kv (key, value) values (?, ?) on conflict (key) do update set value = excluded.value', `auth:${key}`, value);
    },
    async removeItem(key: string) {
      const db = await getDb();
      await db.runAsync('delete from kv where key = ?', `auth:${key}`);
    },
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init?.signal ?? ctl.signal });
  } catch (e) {
    throw new NetworkError(String(e));
  } finally {
    clearTimeout(t);
  }
}

export type Api = ReturnType<typeof makeApi>;

export function makeApi(getDb: () => Promise<Db>) {
  const sb = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    db: { schema: 'api' },
    auth: { storage: dbStorage(getDb), autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });

  async function rpc<R>(name: string, args: Record<string, unknown> = {}, retries = 2): Promise<R> {
    for (let attempt = 0; ; attempt++) {
      try {
        const { data, error, status } = await sb.rpc(name, args);
        if (error) {
          const s = status || 0;
          if ((s === 0 || s >= 500) && attempt < retries) { await sleep(1000 * 2 ** attempt); continue; }
          if (s === 0) throw new NetworkError(error.message);
          throw new ApiError(error.code || 'INVALID', error.message, s, error.hint ? Number(error.hint) : undefined);
        }
        return data as R;
      } catch (e) {
        if (e instanceof NetworkError && attempt < retries) { await sleep(1000 * 2 ** attempt); continue; }
        if (e instanceof ApiError || e instanceof NetworkError) throw e;
        throw new NetworkError(String(e));
      }
    }
  }

  async function fn<R>(name: string, body: Record<string, unknown>): Promise<R> {
    const { data: s } = await sb.auth.getSession();
    const res = await fetchWithTimeout(`${env.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: env.supabasePublishableKey, 'Content-Type': 'application/json',
        ...(s.session ? { Authorization: `Bearer ${s.session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(j.code || 'INVALID', j.message || 'generic', res.status);
    return j as R;
  }

  return { sb, rpc, fn };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── payload types (shared/schemas) ──────────────────────────────────────────
export type MoneyJ = { m: number; c: string };
export type Bootstrap = {
  profile: {
    language: 'fr' | 'en'; country: string; timezone: string; ref_currency: string; risk_profile: number | null;
    first_name: string | null; hide_amounts_in_push: boolean; data_saver: boolean; lock_delay_s: number;
    is_demo: boolean; demo_persona: string | null;
  };
  min_version: { android?: string } | null;
  learning: { active: boolean; days: number; ops: number };
  consents_current: { kind: string; granted: boolean; text_version: string }[];
  questionnaire: Record<string, { version: number }>;
};
export type Home = {
  ref_currency: string;
  networth: { net: number; assets: number; liabilities: number; change_day: { abs: number; pct: number } | null; series_as_of?: string };
  spark_30d: [string, number][];
  alerts: { open_count: number; to_confirm_count: number; top: { id: string; kind: string; band: string; status: string } | null };
  accounts: { id: string; kind: string; display_name: string; institution: string | null; balance: MoneyJ; balance_ref: number; currency: string }[];
  counts: { accounts: number; positions: number };
  top_mover: { instrument_id: string; name: string; change_30d_pct: number; spark_30d: number[] } | null;
  top_category: { category_id: string; spent_ref: number; share: number } | null;
  uncategorised_count: number;
  learning: { active: boolean; days: number; ops: number };
  fx: Record<string, number>;
};
