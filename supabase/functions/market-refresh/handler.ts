/**
 * `market-refresh` (API.md §3, §4.2): live quotes. Called by pg_cron (mkt.cron_market → pg_net)
 * with the cron secret. kind = quotes (Finnhub, US ETFs while open) | crypto (CoinGecko, one call)
 * | fx (Twelve Data batch quote: FX pairs + spot metals). Quota is taken before each vendor call;
 * on a vendor error the stale value is kept and the job key backs off.
 */
import { requireCron } from "../_shared/auth.ts";
import { ApiError, json, serve } from "../_shared/http.ts";
import { key, logRun, type MarketDeps } from "../_shared/market/deps.ts";
import {
  coingeckoPrices,
  finnhubQuote,
  type Quote,
  twelveQuotes,
  VendorError,
} from "../_shared/market/vendors.ts";

type Target = { id: string; symbol: string };
type Item = Quote & { id: string };

const VENDOR: Record<string, string> = { quotes: "finnhub", crypto: "coingecko", fx: "twelvedata" };

export function makeHandler(d: MarketDeps) {
  return serve(async (req, body) => {
    await requireCron(req, d.rpc);
    const kind = String(body.kind ?? "");
    if (!(kind in VENDOR)) throw new ApiError("INVALID", "market.kind");
    return json(await refresh(d, kind));
  });
}

export async function refresh(d: MarketDeps, kind: string) {
  const started = d.now();
  const vendor = VENDOR[kind];
  const targets = await d.rpc<Target[]>("market_targets", { p_kind: kind, p_limit: 50 });
  if (targets.length === 0) {
    await logRun(d, `market-${kind}`, started, "skipped", 0, { reason: "nothing_due" });
    return { kind, updated: 0, skipped: "nothing_due" };
  }
  const credits = kind === "crypto" ? 1 : targets.length;
  const q = await d.rpc<{ ok: boolean; reason?: string }>("market_quota_take", {
    p_vendor: vendor,
    p_credits: credits,
  });
  if (!q.ok) {
    await logRun(d, `market-${kind}`, started, "skipped", 0, { reason: `quota_${q.reason}` });
    return { kind, updated: 0, skipped: `quota_${q.reason}` };
  }
  const items: Item[] = [];
  const errors: Record<string, string> = {};
  let backoff: number | null = null;
  try {
    if (kind === "quotes") {
      const k = key(d, "FINNHUB_API_KEY");
      for (const t of targets) {
        try {
          items.push({ id: t.id, ...(await finnhubQuote(d.fetch, k, t.symbol)) });
        } catch (e) {
          if (e instanceof VendorError && e.status === 429) throw e;
          errors[t.id] = (e as Error).message.slice(0, 160);
          await d.rpc("market_vendor_error", { p_vendor: vendor });
        }
      }
    } else if (kind === "crypto") {
      const r = await coingeckoPrices(d.fetch, key(d, "COINGECKO_API_KEY"), targets.map((t) => t.symbol));
      for (const t of targets) {
        if (r[t.symbol]) items.push({ id: t.id, ...r[t.symbol] });
        else errors[t.id] = "missing";
      }
    } else {
      const r = await twelveQuotes(d.fetch, key(d, "TWELVEDATA_API_KEY"), targets.map((t) => t.symbol));
      for (const t of targets) {
        if (r.quotes[t.symbol]) items.push({ id: t.id, ...r.quotes[t.symbol] });
        else errors[t.id] = r.errors[t.symbol] ?? "missing";
      }
    }
  } catch (e) {
    backoff = e instanceof VendorError ? e.backoffS : null;
    const msg = (e as Error).message.slice(0, 300);
    if (e instanceof VendorError) await d.rpc("market_vendor_error", { p_vendor: vendor });
    await d.rpc("market_mark", { p_key: kind, p_ok: false, p_detail: { error: msg }, p_backoff_s: backoff });
    await logRun(d, `market-${kind}`, started, "failed", 0, { errors }, msg);
    return { kind, updated: 0, error: msg };
  }
  const n = items.length
    ? await d.rpc<number>("market_upsert_quotes", { p_vendor: vendor, p_items: items })
    : 0;
  const ok = items.length > 0;
  await d.rpc("market_mark", { p_key: kind, p_ok: ok, p_detail: { updated: n, errors }, p_backoff_s: null });
  await logRun(
    d,
    `market-${kind}`,
    started,
    ok ? "ok" : "failed",
    n,
    { targets: targets.length, errors },
    ok ? null : "no quote",
  );
  return { kind, updated: n, errors };
}
