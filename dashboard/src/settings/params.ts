/**
 * "Réglages du modèle" (D §4): labels, groups and formats of the global scoring parameters, and the change-log
 * lines. Labels of R1-R6 and "Bonus nouvel appareil" are the D preview's; the other labels are composed (B9.4,
 * CHAIN_LOG) from ARCHITECTURE §7.3-7.4.
 */
import { categoryName } from '../i18n/alerts';
import type { Lang } from '../i18n';
import { dayMonth, number, time } from '../lib/format';
import type { ParamChange, ParamRow } from '../lib/types';

export type Group = 'habits' | 'combination' | 'rules' | 'context';
type Def = { group: Group; fr: string; en: string; kind: 'weight' | 'bump' | 'real' };

export const PARAMS: Record<string, Def> = {
  z0: { group: 'habits', kind: 'real', fr: 'Seuil de début z0 (montant)', en: 'Start threshold z0 (amount)' },
  z1: { group: 'habits', kind: 'real', fr: 'Seuil plein z1 (montant)', en: 'Full threshold z1 (amount)' },
  x0: { group: 'habits', kind: 'real', fr: 'Début x0 (fois le montant habituel)', en: 'Start x0 (times the usual amount)' },
  x1: { group: 'habits', kind: 'real', fr: 'Plein x1 (fois le montant habituel)', en: 'Full x1 (times the usual amount)' },
  mad_floor: { group: 'habits', kind: 'real', fr: 'Dispersion minimale des montants', en: 'Minimum amount spread' },
  ratio_r0: { group: 'habits', kind: 'real', fr: 'Début rythme et sorties du jour (fois)', en: 'Start pace and daily outflow (times)' },
  hour_r0: { group: 'habits', kind: 'real', fr: 'Début heure inhabituelle', en: 'Start unusual hour' },
  new_payee_s: { group: 'habits', kind: 'real', fr: 'Poids nouveau bénéficiaire', en: 'New payee weight' },
  min_amount_eur: { group: 'habits', kind: 'real', fr: 'Montant minimum analysé (€)', en: 'Minimum amount checked (€)' },
  check_cap: { group: 'combination', kind: 'real', fr: "Plafond d'un contrôle seul", en: 'Cap of a single check' },
  if_weight: { group: 'combination', kind: 'real', fr: "Poids de la forêt d'isolement", en: 'Isolation Forest weight' },
  'w:R1': { group: 'rules', kind: 'weight', fr: 'Poids R1 · SIM ou téléphone changé', en: 'R1 weight · SIM or phone changed' },
  'w:R2': { group: 'rules', kind: 'weight', fr: 'Poids R2 · accès modifiés', en: 'R2 weight · credentials changed' },
  'w:R3': { group: 'rules', kind: 'weight', fr: 'Poids R3 · argent reçu puis renvoyé', en: 'R3 weight · money received then sent back' },
  'w:R4': { group: 'rules', kind: 'weight', fr: 'Poids R4 · argent qui ne fait que passer', en: 'R4 weight · money just passing through' },
  'w:R5': { group: 'rules', kind: 'weight', fr: 'Poids R5 · faux placement', en: 'R5 weight · fake investment' },
  'w:R6': { group: 'rules', kind: 'weight', fr: 'Poids R6 · retrait de nuit', en: 'R6 weight · night cash-out' },
  'bump:new_device': { group: 'context', kind: 'bump', fr: 'Bonus nouvel appareil', en: 'New device bonus' },
  'bump:no_lock': { group: 'context', kind: 'bump', fr: 'Bonus sans verrouillage', en: 'No screen lock bonus' },
  'bump:weak_biometric': { group: 'context', kind: 'bump', fr: 'Bonus biométrie peu sûre', en: 'Weak biometric bonus' },
  'bump:amount_large': { group: 'context', kind: 'bump', fr: 'Bonus gros montant', en: 'Large amount bonus' },
  'bump:integrity_fail': { group: 'context', kind: 'bump', fr: 'Bonus intégrité refusée (inactif)', en: 'Integrity failure bonus (inactive)' },
};

const GROUP_ORDER: Group[] = ['habits', 'combination', 'rules', 'context'];
const KEY_ORDER = Object.keys(PARAMS);

/** Table order: group, then the order above; unknown keys last (they still show, with their raw key). */
export function sortParams(rows: ParamRow[]): ParamRow[] {
  const rank = (k: string) => {
    const d = PARAMS[k];
    return d ? GROUP_ORDER.indexOf(d.group) * 100 + KEY_ORDER.indexOf(k) : 10_000;
  };
  return [...rows].sort((a, b) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key));
}

export const paramLabel = (key: string, lang: Lang) => PARAMS[key]?.[lang] ?? key;
export const paramGroup = (key: string): Group | null => PARAMS[key]?.group ?? null;

/** Weights "47", bonuses "+0,10", other values with 1 or 2 decimals ("3,0", "2,25", "0,95"). */
export function paramValue(key: string, v: number, lang: Lang): string {
  const kind = PARAMS[key]?.kind ?? (key.startsWith('w:') ? 'weight' : key.startsWith('bump:') ? 'bump' : 'real');
  if (kind === 'weight') return number(Math.round(v), lang);
  if (kind === 'bump') return `${v > 0 ? '+' : ''}${number(v, lang, 2)}`;
  const two = Math.abs(Math.round(v * 100) - Math.round(v * 10) * 10) > 0;
  return number(v, lang, two ? 2 : 1);
}

export function bounds(p: ParamRow, lang: Lang, fixed: string): string {
  if (p.min === p.max) return fixed;
  return `${paramValue(p.key, p.min, lang)} – ${paramValue(p.key, p.max, lang)}`;
}

export const isChanged = (p: ParamRow) => Math.abs(p.value - p.default) > 1e-9;

/** "23/11 06:00" (browser time zone). */
export const when = (iso: string) => `${dayMonth(iso)} ${time(iso)}`;

/** Short key used in log titles: "Poids R4", "z0 Restaurant", "Bonus nouvel appareil". */
function logKey(c: ParamChange, lang: Lang): string {
  if (c.key.startsWith('w:')) return lang === 'fr' ? `Poids ${c.key.slice(2)}` : `${c.key.slice(2)} weight`;
  if (c.category && c.category !== '_') return `${c.key} ${categoryName(c.category, lang)}`;
  return PARAMS[c.key] ? paramLabel(c.key, lang) : c.key;
}

/** Log title (D preview): "U-1930 · z0 Restaurant : 3,0 → 3,25" / "Poids R4 : 50 → 47". */
export function changeTitle(c: ParamChange, lang: Lang): string {
  const who = c.user_ref ? `U-${c.user_ref} · ` : '';
  const sep = lang === 'fr' ? ' : ' : ': ';
  return `${who}${logKey(c, lang)}${sep}${paramValue(c.key, c.before, lang)} → ${paramValue(c.key, c.after, lang)}`;
}
