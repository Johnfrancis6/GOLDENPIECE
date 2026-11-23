/**
 * `provider-tick` (API.md §3): called by pg_cron (sim.cron_tick, pg_net) when
 * simulated entries became due; hands them to ingest like a provider webhook.
 */
import type { Deps } from "../_shared/deps.ts";
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { ingestSecurity, ingestWire } from "../_shared/ingest.ts";

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const ids = body.link_ids ?? null;
    if (ids !== null && (!Array.isArray(ids) || ids.some((x) => typeof x !== "string"))) {
      throw new ApiError("INVALID", "tick.link_ids");
    }
    const due = await d.rpc<any[]>("sim_tick_collect", { p_link_ids: ids, p_max_links: 50 });
    let inserted = 0;
    let failed = 0;
    for (const l of due) {
      try {
        for (const a of l.accounts) {
          inserted += (await ingestWire(d.rpc, l.user_id, a.account_id, a.entries)).inserted;
        }
        await ingestSecurity(d.rpc, l.user_id, l.security_events);
        await d.rpc("sim_tick_ack", { p_link_id: l.link_id, p_until: l.until });
      } catch (e) {
        failed++; // watermark not moved: the next tick retries (ingest is idempotent)
        console.error("tick link failed", l.link_id, e);
      }
    }
    return json({ links: due.length, failed, inserted });
  });
}
