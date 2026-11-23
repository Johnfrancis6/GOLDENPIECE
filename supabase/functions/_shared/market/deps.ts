/** Dependencies of the market-* handlers (tests inject fakes). */
import { realDeps } from "../deps.ts";
import type { Rpc } from "../supabase_env.ts";
import type { Fetch } from "./vendors.ts";

export type MarketDeps = {
  rpc: Rpc;
  fetch: Fetch;
  env: (name: string) => string | undefined;
  now: () => Date;
};

export const realMarketDeps: MarketDeps = {
  rpc: realDeps.rpc,
  fetch: (input, init) => fetch(input, init),
  env: (n) => Deno.env.get(n),
  now: () => new Date(),
};

/** Edge secret or a typed failure (the job is logged as failed, the chain keeps going). */
export function key(d: MarketDeps, name: string): string {
  const v = d.env(name);
  if (!v) throw new Error(`secret ${name} missing`);
  return v;
}

/** Logs one run in ops.job_runs (job = market-<kind>). */
export async function logRun(
  d: MarketDeps,
  job: string,
  started: Date,
  status: "ok" | "failed" | "skipped",
  items: number,
  detail: Record<string, unknown>,
  error: string | null = null,
): Promise<void> {
  await d.rpc("market_job_log", {
    p_job: job,
    p_started_at: started.toISOString(),
    p_status: status,
    p_items: items,
    p_detail: detail,
    p_error: error,
  });
}
