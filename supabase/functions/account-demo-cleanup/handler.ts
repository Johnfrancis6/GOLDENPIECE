/**
 * `account-demo-cleanup` (DATA_MODEL §5): anonymous demo users inactive 7 days (3 above 300 MB).
 * pg_cron runs `api.demo_cleanup()` in SQL nightly; this endpoint is the same job on demand.
 */
import type { Deps } from "../_shared/deps.ts";
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";

export function makeHandler(d: Deps) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const days = body.days ?? null;
    if (days !== null && (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 90)) {
      throw new ApiError("INVALID", "cleanup.days");
    }
    return json(await d.rpc("demo_cleanup", { p_days: days }));
  });
}
