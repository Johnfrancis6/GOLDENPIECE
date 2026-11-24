/**
 * F6 formats (design/foundations/formats.md) for the dashboard: narrow
 * no-break space thousands (FR), U+00A0 before the currency, U+2212 minus,
 * 24 h times in the browser's time zone.
 */
import type { Lang } from '../i18n';
import type { Money } from './types';

const NNBSP = ' ';
const NBSP = ' ';
const MINUS = '−';
const DECIMALS: Record<string, number> = { XOF: 0, XAF: 0, EUR: 2, USD: 2 };
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function number(n: number, lang: Lang, decimals = 0): string {
  const s = Math.abs(n).toFixed(decimals);
  const [int, dec] = s.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? NNBSP : ',');
  const body = dec ? `${grouped}${lang === 'fr' ? ',' : '.'}${dec}` : grouped;
  return n < 0 && Number(s) !== 0 ? `${MINUS}${body}` : body;
}

/**
 * Amount from minor units. style 'row' → "210 000 F" (list rows), 'full' →
 * "210 000 F CFA", 'code' → "210 000 XOF" (detail key-value, D §2).
 */
export function money(a: Money, lang: Lang, opts: { style?: 'row' | 'full' | 'code'; sign?: -1 | 1 } = {}): string {
  const d = DECIMALS[a.c] ?? 2;
  const v = (a.m / 10 ** d) * (opts.sign ?? 1);
  const cur = opts.style === 'code' ? a.c
    : a.c === 'XOF' || a.c === 'XAF' ? (opts.style === 'row' ? 'F' : 'F CFA')
      : a.c === 'EUR' ? '€' : a.c === 'USD' ? '$' : a.c;
  return `${number(v, lang, d)}${NBSP}${cur}`;
}

export function percent(x: number, lang: Lang): string {
  return `${number(Math.round(x * 100), lang)}${lang === 'fr' ? `${NNBSP}%` : '%'}`;
}

/** "0,80" / "0.80" (score components, 2 decimals). */
export function decimal(x: number, lang: Lang, d = 2): string {
  return number(x, lang, d);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const time = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const dateTimeSec = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
export const dayMonth = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
export const fullDate = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

/** "18 nov." / "Nov 18" (+ year when not the current one). */
export function shortDate(iso: string, lang: Lang, now = new Date()): string {
  const d = new Date(iso);
  const y = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return lang === 'fr' ? `${d.getDate()} ${MONTHS_FR[d.getMonth()]}${y}` : `${MONTHS_EN[d.getMonth()]} ${d.getDate()}${y ? `,${y}` : ''}`;
}

/** Queue age (D preview): "4 min", "2 h", then the short date. */
export function age(minutes: number, createdAt: string, lang: Lang, now = new Date()): string {
  if (minutes < 1) return lang === 'fr' ? 'À l’instant' : 'Just now';
  if (minutes < 60) return `${minutes}${NBSP}min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}${NBSP}h`;
  return shortDate(createdAt, lang, now);
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "banque_lagune" → "Banque Lagune" (no bank name table on the analyst side yet). */
export function bankName(id: string | null): string | null {
  if (!id) return null;
  return id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
