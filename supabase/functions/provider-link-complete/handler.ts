/** `provider-link-complete` (API.md §2.1): consent answer → accounts + first full sync. */
import type { Deps } from "../_shared/deps.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { adapterById } from "../_shared/provider/registry.ts";
import { syncLink } from "../_shared/sync.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    const caller = await d.getCaller(req);
    if (typeof body.link_id !== "string" || !UUID.test(body.link_id)) {
      throw new ApiError("INVALID", "link.id");
    }
    if (typeof body.approve !== "boolean") throw new ApiError("INVALID", "link.approve");
    const link = await d.rpc<any>("provider_link_get", { p_user_id: caller.id, p_link_id: body.link_id });
    if (!link) throw new ApiError("NOT_FOUND", "link.not_found");
    if (!body.approve) {
      await d.rpc("provider_link_revoke", { p_user_id: caller.id, p_link_id: link.id });
      return json({ status: "revoked", accounts: [] });
    }
    if (link.status !== "pending") throw new ApiError("CONFLICT", "link.not_pending");
    const adapter = adapterById(link.adapter, d.rpc);
    const provAccounts = await adapter.completeLink({ userId: caller.id, linkId: link.id });
    const accounts = await d.rpc<any[]>("provider_accounts_upsert", {
      p_user_id: caller.id,
      p_link_id: link.id,
      p_accounts: provAccounts,
    });
    const sync = await syncLink(adapter, d.rpc, caller.id, link.id, accounts, { stopWhenKnown: false });
    const bal = new Map((sync.balances as any[]).map((b) => [b.account_id, b.balance]));
    return json({
      status: "active",
      new_count: sync.inserted,
      accounts: accounts.map((a) => ({
        id: a.id,
        kind: a.kind,
        display_name: a.display_name,
        institution: a.institution,
        currency: a.currency,
        balance: bal.get(a.id) ?? null,
      })),
    });
  });
}
