/**
 * F6 display formats (design/foundations/formats.md). Every amount, percent,
 * date and time shown by the app goes through here.
 */
import { exponent } from './money';

export type Lang = 'fr' | 'en';
export type Money = { m: number | string; c: string };

const NNBSP = ' '; // narrow no-break space (FR thousands, before % in FR)
const NBSP = ' '; // between number and unit
const MINUS = '−';
const HIDDEN = '•••';

function group(intDigits: string, lang: Lang): string {
  const sep = lang === 'fr' ? NNBSP : ',';
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Minor units → unsigned major string with grouping and decimals. */
function majorDigits(absMinor: bigint, currency: string, lang: Lang): string {
  const e = exponent(currency);
  const s = absMinor.toString().padStart(e + 1, '0');
  const int = e ? s.slice(0, -e) : s;
  const frac = e ? s.slice(-e) : '';
  const dec = lang === 'fr' ? ',' : '.';
  return group(int, lang) + (frac ? dec + frac : '');
}

function wrapCurrency(num: string, currency: string, lang: Lang, row: boolean): string {
  if (currency === 'XOF' || currency === 'XAF') return `${num}${NBSP}${row ? 'F' : 'F CFA'}`;
  const sym = currency === 'EUR' ? '€' : '$';
  return lang === 'fr' ? `${num}${NBSP}${sym}` : `${sym}${num}`;
}

export type AmountOpts = {
  row?: boolean; // list rows use the short "F"
  signed?: boolean; // force "+" on positives
  hidden?: boolean; // privacy mode: digits → •••
};

export function formatAmount(minor: number | bigint | string, currency: string, lang: Lang, o: AmountOpts = {}): string {
  const v = BigInt(minor);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const sign = neg ? MINUS : o.signed && abs > 0n ? '+' : '';
  if (o.hidden) return sign + wrapCurrency(HIDDEN, currency, lang, !!o.row).replace(/^(\$|€)/, '$1');
  // EN symbols go before the sign-less number: "−$1,234.56"
  return sign + wrapCurrency(majorDigits(abs, currency, lang), currency, lang, !!o.row);
}

export function formatMoney(x: Money, lang: Lang, o: AmountOpts = {}): string {
  return formatAmount(x.m, x.c, lang, o);
}

/** Abbreviated amount (hero overflow, widgets): 1,2 M F CFA / 3.4B F CFA. */
export function formatAmountShort(minor: number | bigint, currency: string, lang: Lang): string {
  const major = Number(BigInt(minor)) / 10 ** exponent(currency);
  const abs = Math.abs(major);
  if (abs < 1_000_000) return formatAmount(minor, currency, lang);
  let unit = abs >= 1e9 ? 1e9 : 1e6;
  let val = Math.round((abs / unit) * 10) / 10;
  if (unit === 1e6 && val >= 1000) { unit = 1e9; val = Math.round((abs / unit) * 10) / 10; }
  const suffix = unit === 1e9 ? (lang === 'fr' ? 'Md' : 'B') : 'M';
  let num = Number.isInteger(val) ? String(val) : val.toFixed(1);
  if (lang === 'fr') num = num.replace('.', ',');
  const body = lang === 'fr' ? `${num}${NNBSP}${suffix}` : `${num}${suffix}`;
  return (major < 0 ? MINUS : '') + wrapCurrency(body, currency, lang, false);
}

/** Change / return percent: 1 decimal, always signed; ≥ 100 no decimal; ~0 → "0 %". */
export function formatChangePct(pct: number, lang: Lang): string {
  const r = Math.abs(pct) >= 100 ? Math.round(pct) : Math.round(pct * 10) / 10;
  const pctSep = lang === 'fr' ? NNBSP : '';
  if (r === 0) return `0${pctSep}%`;
  const abs = Math.abs(r);
  let num = abs >= 100 ? String(abs) : abs.toFixed(1);
  if (lang === 'fr') num = num.replace('.', ',');
  return `${r < 0 ? MINUS : '+'}${num}${pctSep}%`;
}

/** Share of a whole: no sign, no decimal. */
export function formatShare(pct: number, lang: Lang): string {
  return `${Math.round(pct)}${lang === 'fr' ? NNBSP : ''}%`;
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Local wall-clock parts of an instant in an IANA zone. */
export function zoned(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

export function formatTime(d: Date, tz: string): string {
  const z = zoned(d, tz);
  return `${String(z.h).padStart(2, '0')}:${String(z.mi).padStart(2, '0')}`;
}

function dayNumber(z: { y: number; mo: number; d: number }) {
  return Date.UTC(z.y, z.mo - 1, z.d) / 86_400_000;
}

/** Relative age (F6 §5). */
export function formatAge(at: Date, now: Date, tz: string, lang: Lang): string {
  const s = (now.getTime() - at.getTime()) / 1000;
  const zA = zoned(at, tz), zN = zoned(now, tz);
  const days = dayNumber(zN) - dayNumber(zA);
  if (s < 60 && s >= 0) return lang === 'fr' ? "À l'instant" : 'Just now';
  if (s < 3600 && s >= 0) { const m = Math.floor(s / 60); return lang === 'fr' ? `Il y a ${m}${NBSP}min` : `${m}${NBSP}min ago`; }
  if (days === 0 && s >= 0) { const h = Math.floor(s / 3600); return lang === 'fr' ? `Il y a ${h}${NBSP}h` : `${h}${NBSP}h ago`; }
  if (days === 1) return lang === 'fr' ? 'Hier' : 'Yesterday';
  return formatDate(at, tz, lang, zA.y !== zN.y);
}

export function formatDate(at: Date, tz: string, lang: Lang, withYear = false): string {
  const z = zoned(at, tz);
  if (lang === 'fr') return `${z.d}${NBSP}${MONTHS_FR[z.mo - 1]}${withYear ? ' ' + z.y : ''}`;
  return `${MONTHS_EN[z.mo - 1]} ${z.d}${withYear ? ', ' + z.y : ''}`;
}

/** Countdown "0:45". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
