/** Local database (ARCHITECTURE §8.1). Versioned with PRAGMA user_version. */
import type { Db } from './types';

export const SCHEMA_VERSION = 1;

const V1 = `
create table if not exists kv (key text primary key, value text not null);
create table if not exists payload_cache (
  rpc text not null, params_hash text not null, etag text, as_of text, fetched_at integer not null,
  body text not null, bytes integer not null, primary key (rpc, params_hash));
create table if not exists accounts (id text primary key, body text not null);
create table if not exists transactions (
  id text primary key, account_id text not null, booking_ts text not null, status text not null,
  cdt_dbt_ind text not null, amount_minor integer not null, currency text not null, amount_ref integer,
  label text, cp_name text, category_id text, category_source text, op_type text, alert_id text,
  row_version integer not null, updated_at text not null);
create index if not exists tx_account on transactions (account_id, booking_ts desc);
create index if not exists tx_booking on transactions (booking_ts desc);
create index if not exists tx_category on transactions (category_id);
create table if not exists alerts (id text primary key, created_at text not null, body text not null);
create table if not exists outbox (
  client_id text primary key, rpc text not null, args text not null, created_at integer not null,
  attempts integer not null default 0, next_at integer not null default 0,
  state text not null default 'queued', reason_key text);
create table if not exists sync_state (stream text primary key, cursor text, synced_at integer);
`;

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('pragma user_version');
  const v = row?.user_version ?? 0;
  if (v < 1) {
    await db.execAsync(V1);
    await db.execAsync(`pragma user_version = ${SCHEMA_VERSION}`);
  }
}

/** Wipe everything (sign-out, 10 failed PINs — TECH_ANALYSIS §1.2). */
export async function wipe(db: Db): Promise<void> {
  await db.execAsync(`delete from payload_cache; delete from accounts; delete from transactions;
    delete from alerts; delete from outbox; delete from sync_state; delete from kv;`);
}
