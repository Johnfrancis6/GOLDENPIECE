/** `ingest` over HTTP (API.md §3): for provider callbacks and ops; cron secret required. */
import type { Deps } from "../_shared/deps.ts";
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { ingestWire } from "../_shared/ingest.ts";

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const { user_id, account_id, entries } = body as any;
    if (
      typeof user_id !== "string" || typeof account_id !== "string" || !Array.isArray(entries) ||
      entries.length > 1000
    ) {
      throw new ApiError("INVALID", "ingest.body");
    }
    return json(await ingestWire(d.rpc, user_id, account_id, entries));
  });
}
