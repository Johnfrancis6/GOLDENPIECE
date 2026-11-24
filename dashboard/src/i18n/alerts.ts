/**
 * Alert copy for the dashboard, from design/copy/fr-en.md (X §1 reasons and
 * feature names, B15 bump keys, B4 outcomes) — copied verbatim, checked by
 * __tests__/alerts-copy.test.ts. The dashboard uses the `.analyst` variant
 * when one exists (only UNUSUAL_HOUR today).
 */
import categories from '../data/categories.json';
import type { Lang } from './index';
import type { Reason } from '../lib/types';

type Pair = { fr: string; en: string };

export const REASON_LONG: Record<string, Pair> = {
  AMOUNT_VS_PAYEE: { fr: 'Montant {x} fois plus élevé que d\'habitude pour ce bénéficiaire', en: 'Amount {x} times higher than usual for this payee' },
  'AMOUNT_VS_PAYEE.mild': { fr: 'Montant plus élevé que d\'habitude pour ce bénéficiaire', en: 'Amount higher than usual for this payee' },
  AMOUNT_VS_CATEGORY: { fr: 'Montant {x} fois plus élevé que d\'habitude en {catégorie}', en: 'Amount {x} times higher than usual for {category}' },
  'AMOUNT_VS_CATEGORY.mild': { fr: 'Montant plus élevé que d\'habitude en {catégorie}', en: 'Amount higher than usual for {category}' },
  NEW_PAYEE: { fr: 'Premier envoi à ce bénéficiaire', en: 'First payment to this payee' },
  UNUSUAL_HOUR: { fr: 'Opération à {heure}, une heure où vous faites rarement des opérations', en: 'Made at {time}, a time when you rarely make payments' },
  'UNUSUAL_HOUR.analyst': { fr: 'Opération à {heure}, une heure où l\'utilisateur fait rarement des opérations', en: 'Made at {time}, a time when the user rarely makes payments' },
  VELOCITY: { fr: '{n} opérations en une heure, plus que d\'habitude', en: '{n} payments within an hour, more than usual' },
  DAILY_OUTFLOW: { fr: 'Sorties du jour {x} fois plus élevées que d\'habitude', en: 'Today\'s outgoing total is {x} times your usual' },
  'DAILY_OUTFLOW.mild': { fr: 'Sorties du jour plus élevées que d\'habitude', en: 'Today\'s outgoing total is higher than usual' },
  UNUSUAL_COMBINATION: { fr: 'Combinaison inhabituelle : {élément 1} et {élément 2}', en: 'Unusual combination: {feature 1} and {feature 2}' },
  R1: { fr: 'Carte SIM ou téléphone changé il y a moins de 24 h, puis envoi important', en: 'SIM card or phone changed less than 24 h ago, then a large payment' },
  R2: { fr: 'Mot de passe ou e-mail changé il y a moins de 24 h, puis nouveau bénéficiaire', en: 'Password or email changed less than 24 h ago, then a new payee' },
  R3: { fr: 'Argent reçu puis renvoyé à la même personne, comme dans l\'arnaque au « transfert par erreur »', en: 'Money received then sent back to the same person, as in the "wrong transfer" scam' },
  R4: { fr: 'Argent reçu de nombreuses personnes puis vite renvoyé', en: 'Money received from many people and quickly sent on' },
  R5: { fr: 'Envois de plus en plus élevés à un bénéficiaire qui promet des gains', en: 'Growing payments to a payee promising returns' },
  R6: { fr: 'Retrait d\'espèces la nuit depuis un téléphone ajouté il y a moins de 24 h', en: 'Night cash withdrawal from a phone added less than 24 h ago' },
};

export const REASON_SHORT: Record<string, Pair> = {
  AMOUNT_VS_PAYEE: { fr: 'Montant inhabituel', en: 'Unusual amount' },
  AMOUNT_VS_CATEGORY: { fr: 'Montant inhabituel', en: 'Unusual amount' },
  NEW_PAYEE: { fr: 'Nouveau bénéficiaire', en: 'New payee' },
  UNUSUAL_HOUR: { fr: 'Heure inhabituelle', en: 'Unusual time' },
  VELOCITY: { fr: 'Opérations rapprochées', en: 'Many payments in a row' },
  DAILY_OUTFLOW: { fr: 'Sorties du jour élevées', en: 'High outgoing total today' },
  UNUSUAL_COMBINATION: { fr: 'Opération inhabituelle', en: 'Unusual payment' },
  R1: { fr: 'SIM ou téléphone changé', en: 'SIM or phone changed' },
  R2: { fr: 'Accès modifiés récemment', en: 'Sign-in details changed' },
  R3: { fr: 'Argent reçu puis renvoyé', en: 'Money received then returned' },
  R4: { fr: 'Argent qui ne fait que passer', en: 'Money passing straight through' },
  R5: { fr: 'Possible faux placement', en: 'Possible fake investment' },
  R6: { fr: 'Retrait de nuit', en: 'Night withdrawal' },
};

/** X §1 icons (Lucide names). */
export const REASON_ICON: Record<string, string> = {
  AMOUNT_VS_PAYEE: 'chart-no-axes-column-increasing', AMOUNT_VS_CATEGORY: 'chart-no-axes-column-increasing',
  NEW_PAYEE: 'user-plus', UNUSUAL_HOUR: 'moon', VELOCITY: 'repeat', DAILY_OUTFLOW: 'repeat',
  UNUSUAL_COMBINATION: 'shuffle', R1: 'smartphone', R2: 'key-round', R3: 'arrow-left-right', R4: 'users',
  R5: 'trending-up', R6: 'moon',
};

export const FEATURE: Record<string, Pair> = {
  f1: { fr: 'le montant', en: 'the amount' }, f2: { fr: 'le montant', en: 'the amount' },
  f3: { fr: 'le bénéficiaire', en: 'the payee' }, f4: { fr: 'l\'heure', en: 'the time' },
  f5: { fr: 'le jour de la semaine', en: 'the day of the week' }, f6: { fr: 'le rythme des opérations', en: 'the pace of payments' },
  f7: { fr: 'le total du jour', en: 'today\'s total' }, f8: { fr: 'la part du solde', en: 'the share of your balance' },
  f9: { fr: 'le canal (banque ou mobile money)', en: 'the channel (bank or mobile money)' },
  f10: { fr: 'le type d\'opération', en: 'the type of operation' },
};

/** Score bumps → B15 keys (X §1 note, B15 table §5). */
export const BUMP: Record<string, Pair> = {
  new_device: { fr: 'Opération faite depuis un nouvel appareil', en: 'Made from a new device' },
  no_lock: { fr: 'Téléphone non verrouillé par un code', en: 'Phone not locked with a code' },
  weak_biometric: { fr: 'Déverrouillage par le visage peu sûr sur ce modèle', en: 'Face unlock is weak on this model' },
  amount_large: { fr: 'Montant d\'au moins la moitié de votre solde', en: 'At least half of your balance' },
};

type Cat = { id: string; parent: string | null; fr: string; en: string };
const CATS = new Map((categories as Cat[]).map((c) => [c.id, c]));

export function categoryName(id: string | null | undefined, lang: Lang): string {
  if (!id) return lang === 'fr' ? 'Non classé' : 'Uncategorised';
  const c = CATS.get(id);
  return c ? c[lang] : id;
}

function fill(s: string, args: Record<string, string>): string {
  return s.replace(/\{([^}]+)\}/g, (m, k: string) => args[k] ?? m);
}

const asNum = (v: unknown) => (typeof v === 'number' ? v : Number(v));

/** Long sentence (`.analyst` variant when it exists). X §1 number rule: x < 2 → `.mild`. */
export function reasonLong(r: Reason, lang: Lang): string {
  const p = r.params ?? {};
  let key = r.code;
  if (REASON_LONG[`${key}.analyst`]) key = `${key}.analyst`;
  const x = asNum(p.x);
  if ((r.code === 'AMOUNT_VS_PAYEE' || r.code === 'AMOUNT_VS_CATEGORY' || r.code === 'DAILY_OUTFLOW') && !(x >= 2)) key = `${r.code}.mild`;
  if (r.code === 'UNUSUAL_COMBINATION') {
    const a = FEATURE[String(p.f1)]?.[lang];
    const b = FEATURE[String(p.f2)]?.[lang];
    if (!a || !b || a === b) return REASON_SHORT.UNUSUAL_COMBINATION[lang]; // X §1: f1 + f2 → short form
  }
  const tpl = REASON_LONG[key]?.[lang];
  if (!tpl) return r.code;
  const cat = categoryName(p.category as string | undefined, lang).toLowerCase();
  const xs = Number.isFinite(x) ? String(Math.round(x)) : '';
  const time = String(p.time ?? '');
  const f1 = FEATURE[String(p.f1)]?.[lang] ?? '';
  const f2 = FEATURE[String(p.f2)]?.[lang] ?? '';
  return fill(tpl, {
    x: xs, n: String(p.n ?? ''), heure: time, time, 'catégorie': cat, category: cat,
    'élément 1': f1, 'élément 2': f2, 'feature 1': f1, 'feature 2': f2,
  });
}

export function reasonShort(r: Reason | undefined, lang: Lang): string {
  if (!r) return '';
  return REASON_SHORT[r.code]?.[lang] ?? r.code;
}
