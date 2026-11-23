import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  coingeckoPrices,
  finnhubQuote,
  frankfurterRange,
  fredSeries,
  redact,
  twelveDaily,
  twelveQuotes,
  VendorError,
  yearChunks,
} from "./vendors.ts";
import type { MarketDeps } from "./deps.ts";
import { refresh } from "../../market-refresh/handler.ts";
import { bars, ecb } from "../../market-eod/handler.ts";

const res = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers }));

Deno.test("finnhub quote parsed; empty quote = 404 with backoff", async () => {
  const q = await finnhubQuote(() => res({ c: 571.2, dp: 1.25, t: 1763740800 }), "k", "SPY");
  assertEquals(q, { price: 571.2, change_pct: 1.25, as_of: "2025-11-21T16:00:00.000Z" });
  const e = await assertRejects(() => finnhubQuote(() => res({ c: 0, t: 0 }), "k", "X"), VendorError);
  assertEquals(e.status, 404);
});

Deno.test("429 carries Retry-After as backoff", async () => {
  const e = await assertRejects(
    () => finnhubQuote(() => res({}, 429, { "retry-after": "30" }), "k", "SPY"),
    VendorError,
  );
  assertEquals([e.status, e.backoffS], [429, 30]);
});

Deno.test("coingecko: one call, missing coins skipped, demo key header", async () => {
  let hdr = "";
  const r = await coingeckoPrices(
    (_u, init) => {
      hdr = new Headers(init?.headers).get("x-cg-demo-api-key") ?? "";
      return res({ bitcoin: { usd: 97000.5, usd_24h_change: -1.5, last_updated_at: 1763740800 } });
    },
    "demo",
    ["bitcoin", "ethereum"],
  );
  assertEquals(hdr, "demo");
  assertEquals(Object.keys(r), ["bitcoin"]);
  assertEquals(r.bitcoin.price, 97000.5);
});

Deno.test("twelve data: batch quote with one symbol error; error body on 200", async () => {
  const r = await twelveQuotes(
    () =>
      res({
        "EUR/USD": { close: "1.0412", percent_change: "0.2", timestamp: 1763740800 },
        "XAU/USD": { status: "error", code: 404, message: "symbol not available on your plan" },
      }),
    "k",
    ["EUR/USD", "XAU/USD"],
  );
  assertEquals(r.quotes["EUR/USD"].price, 1.0412);
  assert(r.errors["XAU/USD"].includes("plan"));
  const e = await assertRejects(
    () =>
      twelveDaily(
        () => res({ status: "error", code: 429, message: "run out of API credits" }),
        "k",
        "SPY",
        "2021-01-01",
      ),
    VendorError,
  );
  assertEquals([e.status, e.backoffS], [429, 70]);
});

Deno.test("twelve data daily bars: strings → numbers, FX without volume", async () => {
  const b = await twelveDaily(
    () =>
      res({ values: [{ datetime: "2025-11-20", open: "1.05", high: "1.06", low: "1.04", close: "1.055" }] }),
    "k",
    "EUR/USD",
    "2025-11-01",
  );
  assertEquals(b, [{ d: "2025-11-20", o: 1.05, h: 1.06, l: 1.04, c: 1.055, v: null }]);
});

Deno.test("fred: '.' skipped, divisor (US cents → USD)", async () => {
  const b = await fredSeries(
    () => res({ observations: [{ date: "2025-09-01", value: "." }, { date: "2025-10-01", value: "385.5" }] }),
    "k",
    "PCOFFOTMUSDM",
    "2025-01-01",
    100,
  );
  assertEquals(b, [{ d: "2025-10-01", o: 3.855, h: 3.855, l: 3.855, c: 3.855, v: null }]);
});

Deno.test("frankfurter rows + year chunks", async () => {
  const rows = await frankfurterRange(
    () => res({ rates: { "2025-11-20": { USD: 1.04, GBP: 0.83 } } }),
    "2025-11-20",
    null,
  );
  assertEquals(rows.length, 2);
  assertEquals(yearChunks("2024-06-01", "2026-11-23"), [
    ["2024-06-01", "2024-12-31"],
    ["2025-01-01", "2025-12-31"],
    ["2026-01-01", null],
  ]);
});

// ── handlers with a fake database ──────────────────────────────────────
function fakeDeps(targets: unknown, vendor: (u: string) => Promise<Response>, quotaOk = true) {
  const calls: [string, any][] = [];
  const d: MarketDeps = {
    rpc: (<T>(name: string, args: any = {}) => {
      calls.push([name, args]);
      if (name === "market_targets") return Promise.resolve(targets as T);
      if (name === "market_quota_take") return Promise.resolve({ ok: quotaOk, reason: "per_min" } as T);
      if (name.startsWith("market_upsert")) {
        return Promise.resolve((args.p_items ?? args.p_bars ?? args.p_rows).length as T);
      }
      return Promise.resolve(null as T);
    }) as any,
    fetch: ((u: string) => vendor(String(u))) as any,
    env: () => "key",
    now: () => new Date("2026-11-23T15:00:00Z"),
  };
  return { d, calls };
}

Deno.test("refresh quotes: per-symbol failure does not stop the others", async () => {
  const { d, calls } = fakeDeps(
    [{ id: "SPY", symbol: "SPY" }, { id: "AFK", symbol: "AFK" }],
    (u) => u.includes("AFK") ? res({ c: 0, t: 0 }) : res({ c: 600, dp: 0.5, t: 1763740800 }),
  );
  const r = await refresh(d, "quotes");
  assertEquals(r.updated, 1);
  assert(r.errors && "AFK" in r.errors);
  assertEquals(calls.find((c) => c[0] === "market_quota_take")![1], { p_vendor: "finnhub", p_credits: 2 });
  assertEquals(calls.find((c) => c[0] === "market_job_log")![1].p_status, "ok");
});

Deno.test("refresh skips without calling the vendor when quota refused", async () => {
  let fetched = false;
  const { d } = fakeDeps([{ id: "BTC", symbol: "bitcoin" }], () => {
    fetched = true;
    return res({});
  }, false);
  const r = await refresh(d, "crypto");
  assertEquals([r.updated, r.skipped, fetched], [0, "quota_per_min", false]);
});

Deno.test("bars: 429 stops the loop and backs off the key", async () => {
  const { d, calls } = fakeDeps([
    { id: "SPY", symbol: "SPY", key: "bars:SPY", start_date: "2021-11-16" },
    { id: "QQQ", symbol: "QQQ", key: "bars:QQQ", start_date: "2021-11-16" },
  ], () => res({ status: "error", code: 429, message: "credits" }));
  const r = await bars(d);
  assertEquals(r.instruments, 0);
  const marks = calls.filter((c) => c[0] === "market_mark");
  assertEquals(marks.length, 1);
  assertEquals(marks[0][1].p_backoff_s, 70);
});

Deno.test("ecb backfill: one call per year", async () => {
  const urls: string[] = [];
  const { d } = fakeDeps([{ key: "ecb", start_date: "2024-01-01" }], (u) => {
    urls.push(u);
    return res({ rates: { "2024-01-02": { USD: 1.09 } } });
  });
  const r = await ecb(d);
  assertEquals(urls.length, 3);
  assertEquals(r.rows, 3);
});

Deno.test("api keys are redacted from network errors", async () => {
  const e = await assertRejects(
    () =>
      twelveDaily(
        () => Promise.reject(new Error("error sending request for url (https://x/ts?apikey=SECRET1&a=1)")),
        "SECRET1",
        "SPY",
        "2025-01-01",
      ),
    VendorError,
  );
  assert(!e.message.includes("SECRET1"));
  assertEquals(redact("u?api_key=abc&file_type=json"), "u?api_key=***&file_type=json");
});
