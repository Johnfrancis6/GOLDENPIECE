/** `provider-sync` (API.md §2.3, pull-to-refresh): new entries + balances for the user's links. */
import type { Deps } from "../_shared/deps.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { adapterById } from "../_shared/provider/registry.ts";
import { syncLink } from "../_shared/sync.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    const caller = await d.getCaller(req);
    const ids = body.account_ids ?? null;
    if (
      ids !== null &&
      (!Array.isArray(ids) || ids.length > 20 || ids.some((x) => typeof x !== "string" || !UUID.test(x)))
    ) {
      throw new ApiError("INVALID", "sync.account_ids");
    }
    const links = await d.rpc<any[]>("provider_user_links", { p_user_id: caller.id, p_account_ids: ids });
    let newCount = 0;
    const balances: unknown[] = [];
    for (const l of links) {
      const r = await syncLink(adapterById(l.adapter, d.rpc), d.rpc, caller.id, l.id, l.accounts ?? [], {
        stopWhenKnown: true,
      });
      newCount += r.inserted;
      balances.push(...r.balances);
    }
    return json({ new_count: newCount, balances });
  });
}
