/**
 * Market data vendor adapters (ARCHITECTURE §5, §13; API.md §4.2). Pure HTTP + parsing,
 * `fetch` injected so tests run offline. Keys come from Edge secrets; the phone never
 * calls a vendor. Every function throws VendorError on a vendor/HTTP failure.
 */
export type Fetch = typeof fetch;
export type Quote = { price: number; change_pct: number | null; as_of: string };
export type Bar = {
  d: string;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number;
  v: number | null;
};
export type FxRow = { d: string; quote: string; rate: number };

export class VendorError extends Error {
  constructor(
    readonly vendor: string,
    readonly status: number,
    message: string,
    /** seconds to wait before the next try (429 / plan limits) */
    readonly backoffS: number | null = null,
  ) {
    super(`${vendor} ${status}: ${message}`);
  }
}

const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "" || x === ".") return null;
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
};

/** Removes API keys from text that may quote a request URL (errors are stored in mkt.fetch_state / ops.job_runs). */
export const redact = (t: string): string => t.replace(/(api_?key|token)=[^&\s)"']+/gi, "$1=***");

async function getJson(
  vendor: string,
  f: Fetch,
  url: string,
  headers: Record<string, string> = {},
): Promise<any> {
  let res: Response;
  try {
    res = await f(url, { headers: { Accept: "application/json", ...headers } });
  } catch (e) {
    throw new VendorError(vendor, 0, `network: ${redact((e as Error).message)}`);
  }
  const text = await res.text();
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after"));
    throw new VendorError(vendor, 429, "rate limited", Number.isFinite(ra) && ra > 0 ? ra : 120);
  }
  if (!res.ok) throw new VendorError(vendor, res.status, redact(text.slice(0, 200)));
  try {
    return JSON.parse(text);
  } catch {
    throw new VendorError(vendor, res.status, "invalid json");
  }
}

// ── Finnhub: GET /quote → {c, d, dp, h, l, o, pc, t} ─────────────────────
export async function finnhubQuote(f: Fetch, key: string, symbol: string): Promise<Quote> {
  const j = await getJson(
    "finnhub",
    f,
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`,
    { "X-Finnhub-Token": key },
  );
  const price = num(j?.c);
  const t = num(j?.t);
  if (!price || !t) throw new VendorError("finnhub", 404, `no quote for ${symbol}`, 86400);
  return { price, change_pct: num(j.dp), as_of: new Date(t * 1000).toISOString() };
}

// ── CoinGecko Demo: one /simple/price call for all coins ─────────────────
export async function coingeckoPrices(f: Fetch, key: string, ids: string[]): Promise<Record<string, Quote>> {
  const u = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}` +
    "&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
  const j = await getJson("coingecko", f, u, { "x-cg-demo-api-key": key });
  const out: Record<string, Quote> = {};
  for (const id of ids) {
    const r = j?.[id];
    const price = num(r?.usd);
    const t = num(r?.last_updated_at);
    if (price && t) {
      out[id] = { price, change_pct: num(r.usd_24h_change), as_of: new Date(t * 1000).toISOString() };
    }
  }
  return out;
}

// ── Twelve Data ──────────────────────────────────────────────────────────
// Errors come as HTTP 200 {status:"error", code, message}; 429 = credits for the minute/day used.
function tdCheck(j: any, what: string): void {
  if (j && j.status === "error") {
    const code = Number(j.code) || 400;
    const msg = String(j.message ?? "error");
    const plan = /plan|upgrade|exclusive|not available|not found|invalid/i.test(msg);
    throw new VendorError(
      "twelvedata",
      code,
      `${what}: ${msg.slice(0, 160)}`,
      code === 429 ? 70 : plan ? 7 * 86400 : null,
    );
  }
}

/** Batch /quote (1 credit per symbol) → per symbol quote (missing / errored symbols left out). */
export async function twelveQuotes(
  f: Fetch,
  key: string,
  symbols: string[],
): Promise<{ quotes: Record<string, Quote>; errors: Record<string, string> }> {
  const j = await getJson(
    "twelvedata",
    f,
    `https://api.twelvedata.com/quote?symbol=${symbols.map(encodeURIComponent).join(",")}&apikey=${key}`,
  );
  if (symbols.length === 1) tdCheck(j, symbols[0]);
  const by = symbols.length === 1 ? { [symbols[0]]: j } : j;
  if (symbols.length > 1 && by?.status === "error") tdCheck(by, "quote");
  const quotes: Record<string, Quote> = {};
  const errors: Record<string, string> = {};
  for (const s of symbols) {
    const r = by?.[s];
    if (!r || r.status === "error") {
      errors[s] = String(r?.message ?? "missing").slice(0, 160);
      continue;
    }
    const price = num(r.close);
    const t = num(r.last_quote_at) ?? num(r.timestamp);
    if (price && t) {
      quotes[s] = { price, change_pct: num(r.percent_change), as_of: new Date(t * 1000).toISOString() };
    } else errors[s] = "no price";
  }
  return { quotes, errors };
}

/** Daily bars since start_date (1 credit), ascending. */
export async function twelveDaily(f: Fetch, key: string, symbol: string, startDate: string): Promise<Bar[]> {
  const j = await getJson(
    "twelvedata",
    f,
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day` +
      `&start_date=${startDate}&outputsize=5000&order=asc&apikey=${key}`,
  );
  tdCheck(j, symbol);
  const values: any[] = Array.isArray(j?.values) ? j.values : [];
  return values.map((v) => ({
    d: String(v.datetime).slice(0, 10),
    o: num(v.open),
    h: num(v.high),
    l: num(v.low),
    c: num(v.close) as number,
    v: num(v.volume),
  })).filter((b) => b.c !== null && b.c > 0 && /^\d{4}-\d{2}-\d{2}$/.test(b.d));
}

// ── FRED: observations (value "." = missing) ─────────────────────────────
export async function fredSeries(
  f: Fetch,
  key: string,
  series: string,
  startDate: string,
  divisor = 1,
): Promise<Bar[]> {
  const j = await getJson(
    "fred",
    f,
    `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(series)}` +
      `&api_key=${key}&file_type=json&observation_start=${startDate}`,
  );
  const obs: any[] = Array.isArray(j?.observations) ? j.observations : [];
  const out: Bar[] = [];
  for (const o of obs) {
    const c = num(o.value);
    if (c === null || c <= 0) continue;
    const v = c / divisor;
    out.push({ d: String(o.date), o: v, h: v, l: v, c: v, v: null });
  }
  return out;
}

// ── Frankfurter (ECB reference rates, base EUR, no key) ──────────────────
export async function frankfurterRange(f: Fetch, start: string, end: string | null): Promise<FxRow[]> {
  const j = await getJson("frankfurter", f, `https://api.frankfurter.dev/v1/${start}..${end ?? ""}?base=EUR`);
  const rows: FxRow[] = [];
  const rates = j?.rates ?? {};
  for (const d of Object.keys(rates)) {
    for (const [quote, rate] of Object.entries(rates[d] as Record<string, unknown>)) {
      const r = num(rate);
      if (r && r > 0 && /^[A-Z]{3}$/.test(quote)) rows.push({ d, quote, rate: r });
    }
  }
  return rows;
}

/** Year chunks [start, end] from start to today (Frankfurter backfill, one call per year). */
export function yearChunks(start: string, today: string): [string, string | null][] {
  const out: [string, string | null][] = [];
  let y = Number(start.slice(0, 4));
  const last = Number(today.slice(0, 4));
  let s = start;
  while (y < last) {
    out.push([s, `${y}-12-31`]);
    y++;
    s = `${y}-01-01`;
  }
  out.push([s, null]);
  return out;
}
