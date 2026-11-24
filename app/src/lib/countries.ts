/** O3 country list: bundled ISO list (offline), accent-insensitive search,
 * suggestions = the phone's country first, then the F CFA zone (S1 O3). */
import data from '../data/countries.json';
import type { Lang } from './format';

export type Country = { iso2: string; fr: string; en: string; dial: string | null; profile: string; tz: string };
export const COUNTRIES = data as Country[];

/** F CFA zone in suggestion order (UEMOA then CEMAC, by app audience). */
export const CFA_ZONE = ['SN', 'CI', 'ML', 'BF', 'CM', 'BJ', 'TG', 'NE', 'GA', 'CG', 'GW', 'TD', 'CF', 'GQ'];

export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`-]/g, ' ').toLowerCase().trim();
}

export function byName(lang: Lang) {
  const coll = new Intl.Collator(lang, { sensitivity: 'base' });
  return [...COUNTRIES].sort((a, b) => coll.compare(a[lang], b[lang]));
}

/** Name (either language) or ISO code or dial code. Prefix matches of a word
 * rank before inner matches. */
export function searchCountries(q: string, lang: Lang): Country[] {
  const f = fold(q);
  if (!f) return byName(lang);
  const digits = f.replace(/[^\d]/g, '');
  const scored: { c: Country; s: number }[] = [];
  for (const c of COUNTRIES) {
    const names = [fold(c[lang]), fold(c[lang === 'fr' ? 'en' : 'fr'])];
    let s = -1;
    if (names[0].startsWith(f)) s = 0;
    else if (names[0].split(' ').some((w) => w.startsWith(f))) s = 1;
    else if (names[1].startsWith(f) || c.iso2.toLowerCase() === f) s = 2;
    else if (names.some((n) => n.includes(f))) s = 3;
    else if (digits && digits === f.replace(/^\+/, '') && (c.dial ?? '').replace('+', '').startsWith(digits)) s = 4;
    if (s >= 0) scored.push({ c, s });
  }
  const coll = new Intl.Collator(lang, { sensitivity: 'base' });
  return scored.sort((a, b) => a.s - b.s || coll.compare(a.c[lang], b.c[lang])).map((x) => x.c);
}

export function suggestions(phoneCountry: string | null | undefined, n = 5): Country[] {
  const codes = [...(phoneCountry ? [phoneCountry.toUpperCase()] : []), ...CFA_ZONE];
  const out: Country[] = [];
  for (const code of codes) {
    const c = COUNTRIES.find((x) => x.iso2 === code);
    if (c && !out.includes(c)) out.push(c);
    if (out.length === n) break;
  }
  return out;
}

export function countryByIso(iso2: string | null | undefined): Country | undefined {
  return iso2 ? COUNTRIES.find((c) => c.iso2 === iso2) : undefined;
}
