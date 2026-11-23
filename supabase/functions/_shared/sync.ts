/** Pull entries from an adapter into core (link completion, pull-to-refresh). */
import type { Rpc } from "./supabase_env.ts";
import type { ProviderAdapter } from "./provider/types.ts";
import { balanceToWire } from "./provider/wire.ts";
import { ingest, ingestSecurity } from "./ingest.ts";

export type LinkAccount = { id: string; provider_account_id: string };

/**
 * Newest first, page by page (first sync shows recent data first).
 * `stopWhenKnown`: stop at the first page that brings nothing new (refresh).
 */
export async function syncAccount(
  adapter: ProviderAdapter,
  rpc: Rpc,
  userId: string,
  linkId: string,
  account: LinkAccount,
  opts: { stopWhenKnown: boolean; pageSize?: number; maxPages?: number },
): Promise<{ inserted: number; ids: string[] }> {
  let cursor: string | undefined;
  let inserted = 0;
  const ids: string[] = [];
  for (let page = 0; page < (opts.maxPages ?? 50); page++) {
    const r = await adapter.listEntries({
      linkId,
      accountId: account.provider_account_id,
      cursor,
      pageSize: opts.pageSize ?? 200,
    });
    const res = await ingest(rpc, userId, account.id, r.entries);
    inserted += res.inserted;
    ids.push(...res.transaction_ids);
    if (!r.nextCursor || (opts.stopWhenKnown && res.inserted === 0)) break;
    cursor = r.nextCursor;
  }
  return { inserted, ids };
}

export async function syncLink(
  adapter: ProviderAdapter,
  rpc: Rpc,
  userId: string,
  linkId: string,
  accounts: LinkAccount[],
  opts: { stopWhenKnown: boolean },
): Promise<{ inserted: number; balances: unknown[] }> {
  let inserted = 0;
  for (const a of accounts) inserted += (await syncAccount(adapter, rpc, userId, linkId, a, opts)).inserted;
  if (adapter.listSecurityEvents) {
    await ingestSecurity(rpc, userId, await adapter.listSecurityEvents({ linkId }));
  }
  const balances = await adapter.getBalances(linkId, accounts.map((a) => a.provider_account_id));
  const set = await rpc<unknown[]>("provider_set_balances", {
    p_user_id: userId,
    p_link_id: linkId,
    p_balances: balances.map(balanceToWire),
  });
  return { inserted, balances: set };
}
