/**
 * Money arithmetic (ARCHITECTURE G3). Same contract as batch/goldenpiece/money.py
 * and the SQL ref.money_* functions; checked by shared/fixtures/money.json.
 *
 * Amounts are integer minor units (bigint) + ISO currency. Exponents: XOF 0,
 * XAF 0, EUR 2, USD 2. XOF/XAF <-> EUR through the exact peg 655.957; USD
 * through EUR (rate = USD per 1 EUR, decimal string). Half-even rounding at
 * the last step only. Exact integer arithmetic with native BigInt (no
 * dependency; replaces big.js named in ARCHITECTURE G3).
 */

export type Currency = "XOF" | "XAF" | "EUR" | "USD";

export const EXPONENTS: Readonly<Record<Currency, number>> = { XOF: 0, XAF: 0, EUR: 2, USD: 2 };
export const PEG_PER_EUR = "655.957";

export class MoneyError extends Error {}

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

export function exponent(currency: string): number {
  if (!(currency in EXPONENTS)) throw new MoneyError(`unsupported currency ${currency}`);
  return EXPONENTS[currency as Currency];
}

const pow10 = (e: number): bigint => 10n ** BigInt(e);

/** n / d rounded half-even (exact). */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new MoneyError("division by zero");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  let q = n / d; // truncates toward zero
  let r = n % d;
  if (r < 0n) { // make it floor division: 0 <= r < d
    q -= 1n;
    r += d;
  }
  const twice = 2n * r;
  if (twice > d || (twice === d && q % 2n !== 0n)) q += 1n;
  return q;
}

/** Decimal string -> [integer, 10^scale]. */
function scaled(s: string): [bigint, bigint] {
  if (!DECIMAL_RE.test(s)) throw new MoneyError(`invalid decimal ${s}`);
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [int, frac = ""] = body.split(".");
  const v = BigInt(int + frac);
  return [neg ? -v : v, pow10(frac.length)];
}

export function parse(amount: string, currency: string): bigint {
  const [n, d] = scaled(amount);
  return divRound(n * pow10(exponent(currency)), d);
}

export function formatMajor(minor: bigint, currency: string): string {
  const e = exponent(currency);
  const sign = minor < 0n ? "-" : "";
  const a = minor < 0n ? -minor : minor;
  if (e === 0) return `${sign}${a}`;
  const p = pow10(e);
  return `${sign}${a / p}.${(a % p).toString().padStart(e, "0")}`;
}

function perEur(currency: string, usdPerEur: string | null | undefined): [bigint, bigint] {
  if (currency === "EUR") return [1n, 1n];
  if (currency === "XOF" || currency === "XAF") return scaled(PEG_PER_EUR);
  if (currency === "USD") {
    if (usdPerEur == null) throw new MoneyError("USD conversion needs usdPerEur");
    return scaled(usdPerEur);
  }
  throw new MoneyError(`unsupported currency ${currency}`);
}

/** Convert minor units of `from` into minor units of `to`. */
export function convert(minor: bigint, from: string, to: string, usdPerEur?: string | null): bigint {
  const es = exponent(from);
  const ed = exponent(to);
  if (from === to) return minor;
  const [fp, fq] = perEur(from, usdPerEur);
  const [tp, tq] = perEur(to, usdPerEur);
  return divRound(minor * pow10(ed) * tp * fq, pow10(es) * tq * fp);
}

/** Split minor by integer weights; largest remainder, ties to the lower index. */
export function allocate(minor: bigint, weights: number[]): bigint[] {
  if (weights.length === 0 || weights.some((w) => w < 0 || !Number.isInteger(w))) {
    throw new MoneyError("weights must be non-negative integers");
  }
  const ws = weights.map(BigInt);
  const total = ws.reduce((a, b) => a + b, 0n);
  if (total === 0n) throw new MoneyError("weights must have a positive sum");
  const floorDiv = (n: bigint, d: bigint) => {
    const q = n / d;
    return n % d !== 0n && (n < 0n) !== (d < 0n) ? q - 1n : q;
  };
  const base = ws.map((w) => floorDiv(minor * w, total));
  const rems = ws.map((w, i) => minor * w - base[i] * total);
  let left = minor - base.reduce((a, b) => a + b, 0n);
  const order = ws.map((_, i) => i).sort((i, j) => (rems[j] > rems[i] ? 1 : rems[j] < rems[i] ? -1 : i - j));
  for (const i of order) {
    if (left <= 0n) break;
    base[i] += 1n;
    left -= 1n;
  }
  return base;
}
