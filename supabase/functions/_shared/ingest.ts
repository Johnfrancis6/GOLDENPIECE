/**
 * `ingest` (API.md §3): insert + rule categorisation (B2). Scoring of the
 * inserted rows (features → A_thr, A_if, F, M → alert/push) is added in B5
 * right after the insert, on `transaction_ids`.
 */
import type { Rpc } from "./supabase_env.ts";
import type { ProviderEntry, ProviderSecurityEvent } from "./provider/types.ts";
import { entryToWire } from "./provider/wire.ts";

export type IngestResult = {
  inserted: number;
  updated: number;
  categorised: number;
  uncategorised: number;
  scored: number;
  alerts: number;
  transaction_ids: string[];
};

export async function ingest(
  rpc: Rpc,
  userId: string,
  accountId: string,
  entries: ProviderEntry[],
): Promise<IngestResult> {
  if (entries.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      categorised: 0,
      uncategorised: 0,
      scored: 0,
      alerts: 0,
      transaction_ids: [],
    };
  }
  return await rpc<IngestResult>("provider_ingest", {
    p_user_id: userId,
    p_account_id: accountId,
    p_entries: entries.map(entryToWire),
  });
}

/** Same, entries already in wire format (provider-tick, HTTP callbacks). */
export async function ingestWire(
  rpc: Rpc,
  userId: string,
  accountId: string,
  entries: unknown[],
): Promise<IngestResult> {
  if (entries.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      categorised: 0,
      uncategorised: 0,
      scored: 0,
      alerts: 0,
      transaction_ids: [],
    };
  }
  return await rpc<IngestResult>("provider_ingest", {
    p_user_id: userId,
    p_account_id: accountId,
    p_entries: entries,
  });
}

export async function ingestSecurity(rpc: Rpc, userId: string, events: ProviderSecurityEvent[] | unknown[]) {
  if (events.length === 0) return 0;
  const r = await rpc<{ inserted: number }>("provider_ingest_security", {
    p_user_id: userId,
    p_events: events,
  });
  return r.inserted;
}
