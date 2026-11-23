/**
 * `market-eod` (API.md §3, §4.2): history. Called by pg_cron (mkt.cron_market) with the cron secret.
 * kind = bars (Twelve Data daily bars: 5-year backfill or new daily bars, ≤ 8 symbols per call =
 * the per-minute credit limit) | fred (oil daily, cocoa/coffee monthly) | ecb (Frankfurter, base EUR,
 * backfill from 2020 one call per year, then daily).
 */
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { key, logRun, type MarketDeps } from "../_shared/market/deps.ts";
import {
  frankfurterRange,
  fredSeries,
  twelveDaily,
  VendorError,
  yearChunks,
} from "../_shared/market/vendors.ts";

type Target = {
  id: string;
  symbol: string;
  key: string;
  start_date: string;
  divisor?: number;
  backfill?: boolean;
};

export function makeHandler(d: MarketDeps) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const kind = String(body.kind ?? "");
    if (kind === "bars") return json(await bars(d, Math.min(Number(body.limit ?? 8) || 8, 8)));
    if (kind === "fred") return json(await fred(d));
    if (kind === "ecb") return json(await ecb(d));
    throw new ApiError("INVALID", "market.kind");
  });
}

async function markFail(d: MarketDeps, vendor: string, k: string, e: unknown): Promise<string> {
  const msg = (e as Error).message.slice(0, 300);
  const backoff = e instanceof VendorError ? e.backoffS : 3 * 3600;
  if (e instanceof VendorError) await d.rpc("market_vendor_error", { p_vendor: vendor });
  await d.rpc("market_mark", { p_key: k, p_ok: false, p_detail: { error: msg }, p_backoff_s: backoff });
  return msg;
}

export async function bars(d: MarketDeps, limit = 8) {
  const started = d.now();
  const targets = await d.rpc<Target[]>("market_targets", { p_kind: "bars", p_limit: limit });
  const done: Record<string, number> = {};
  const errors: Record<string, string> = {};
  let quota: string | null = null;
  const k = targets.length ? key(d, "TWELVEDATA_API_KEY") : "";
  for (const t of targets) {
    const q = await d.rpc<{ ok: boolean; reason?: string }>("market_quota_take", {
      p_vendor: "twelvedata",
      p_credits: 1,
    });
    if (!q.ok) {
      quota = q.reason ?? "quota";
      break;
    }
    try {
      const b = await twelveDaily(d.fetch, k, t.symbol, t.start_date);
      done[t.id] = b.length
        ? await d.rpc<number>("market_upsert_bars", { p_instrument_id: t.id, p_bars: b })
        : 0;
      await d.rpc("market_mark", {
        p_key: t.key,
        p_ok: true,
        p_detail: { rows: done[t.id], backfill: !!t.backfill },
        p_backoff_s: null,
      });
    } catch (e) {
      errors[t.id] = await markFail(d, "twelvedata", t.key, e);
      if (e instanceof VendorError && e.status === 429) break;
    }
  }
  const n = Object.values(done).reduce((a, b) => a + b, 0);
  const status = targets.length === 0 || quota && !Object.keys(done).length
    ? "skipped"
    : Object.keys(errors).length && !Object.keys(done).length
    ? "failed"
    : "ok";
  await logRun(d, "market-bars", started, status, n, { done, errors, quota });
  return { kind: "bars", instruments: Object.keys(done).length, rows: n, errors, quota };
}

export async function fred(d: MarketDeps) {
  const started = d.now();
  const targets = await d.rpc<Target[]>("market_targets", { p_kind: "fred", p_limit: 8 });
  const done: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const k = targets.length ? key(d, "FRED_API_KEY") : "";
  for (const t of targets) {
    const q = await d.rpc<{ ok: boolean }>("market_quota_take", { p_vendor: "fred", p_credits: 1 });
    if (!q.ok) break;
    try {
      const b = await fredSeries(d.fetch, k, t.symbol, t.start_date, t.divisor ?? 1);
      done[t.id] = b.length
        ? await d.rpc<number>("market_upsert_bars", { p_instrument_id: t.id, p_bars: b })
        : 0;
      await d.rpc("market_mark", {
        p_key: t.key,
        p_ok: true,
        p_detail: { rows: done[t.id] },
        p_backoff_s: null,
      });
    } catch (e) {
      errors[t.id] = await markFail(d, "fred", t.key, e);
    }
  }
  const n = Object.values(done).reduce((a, b) => a + b, 0);
  await logRun(
    d,
    "market-fred",
    started,
    targets.length === 0 ? "skipped" : Object.keys(done).length ? "ok" : "failed",
    n,
    { done, errors },
  );
  return { kind: "fred", rows: n, errors };
}

export async function ecb(d: MarketDeps) {
  const started = d.now();
  const [t] = await d.rpc<Target[]>("market_targets", { p_kind: "ecb", p_limit: 1 });
  const today = d.now().toISOString().slice(0, 10);
  let n = 0;
  try {
    if (t.start_date > today) {
      await logRun(d, "market-ecb", started, "skipped", 0, { reason: "up_to_date" });
      return { kind: "ecb", rows: 0 };
    }
    for (const [s, e] of yearChunks(t.start_date, today)) {
      const q = await d.rpc<{ ok: boolean }>("market_quota_take", { p_vendor: "frankfurter", p_credits: 1 });
      if (!q.ok) break;
      const rows = await frankfurterRange(d.fetch, s, e);
      if (rows.length) n += await d.rpc<number>("market_upsert_fx_daily", { p_rows: rows });
    }
    await d.rpc("market_mark", { p_key: "ecb", p_ok: n > 0, p_detail: { rows: n }, p_backoff_s: null });
    await logRun(d, "market-ecb", started, "ok", n, { from: t.start_date });
    return { kind: "ecb", rows: n };
  } catch (e) {
    const msg = await markFail(d, "frankfurter", "ecb", e);
    await logRun(d, "market-ecb", started, "failed", n, {}, msg);
    return { kind: "ecb", rows: n, error: msg };
  }
}
