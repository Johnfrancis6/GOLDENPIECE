/**
 * Home S2 v2 view model (pure, tested): what each block shows from the
 * `get_home` payload, the local rows and the connection state.
 */
import type { Home } from './api';
import categories from '../data/categories.json';

export type Freshness = 'fresh' | 'offline' | 'stale' | 'old' | 'error';

/** C8 banner under the header (S2 §3, same rules as v1). */
export const STALE_AFTER_MS = 15 * 60 * 1000;
export const OLD_AFTER_MS = 7 * 24 * 3600 * 1000;

export function freshness(o: { fetchedAt: number | null; online: boolean; failed: boolean; now: number }): Freshness {
  if (o.fetchedAt !== null && o.now - o.fetchedAt > OLD_AFTER_MS) return 'old';
  if (!o.online) return 'offline';
  if (o.failed) return 'error';
  if (o.fetchedAt !== null && o.now - o.fetchedAt > STALE_AFTER_MS) return 'stale';
  return 'fresh';
}

/** Place 4 of S2 §1: learning card, one alert, several alerts, or nothing. */
export type Strip =
  | { kind: 'learning'; days: number; ops: number }
  | { kind: 'confirm'; alertId: string }
  | { kind: 'notified'; alertId: string }
  | { kind: 'many'; count: number }
  | null;

export const LEARNING_DAYS = 30;
export const LEARNING_OPS = 30;

export function strip(h: Pick<Home, 'alerts' | 'learning'>): Strip {
  const open = h.alerts.open_count;
  // `learning.active` = scoring active (CHAIN_LOG B6.1): the B5 card shows while it is false
  if (!h.learning.active) return { kind: 'learning', days: h.learning.days, ops: h.learning.ops };
  if (open >= 2) return { kind: 'many', count: open };
  const top = h.alerts.top;
  if (open === 1 && top) return top.band === 'bank' ? { kind: 'notified', alertId: top.id } : { kind: 'confirm', alertId: top.id };
  return null;
}

/** Carousel: the net-worth card first, then one card per account (≤ 8 in all). */
export type CardVM =
  | { kind: 'networth'; net: number; dayAbs: number | null; dayPct: number | null; accounts: number; positions: number }
  | { kind: 'account'; id: string; name: string; institution: string | null; accKind: string; balanceMinor: number; currency: string };

export function cards(h: Home): CardVM[] {
  const nw: CardVM = {
    kind: 'networth', net: h.networth.net, dayAbs: h.networth.change_day?.abs ?? null,
    dayPct: h.networth.change_day?.pct ?? null, accounts: h.counts.accounts, positions: h.counts.positions,
  };
  const acc = h.accounts.slice(0, 7).map<CardVM>((a) => ({
    kind: 'account', id: a.id, name: a.display_name, institution: a.institution, accKind: a.kind,
    balanceMinor: Number(a.balance.m), currency: a.balance.c,
  }));
  return [nw, ...acc];
}

type Cat = { id: string; parent: string | null; fr: string; en: string; icon: string };
const CATS = categories as Cat[];
const BY_ID = new Map(CATS.map((c) => [c.id, c]));

/** Top-level category of an id ("transport.taxi" → transport). */
export function rootCategory(id: string | null | undefined): Cat | null {
  let c = id ? BY_ID.get(id) : undefined;
  while (c?.parent) c = BY_ID.get(c.parent);
  return c ?? null;
}
export function categoryName(id: string | null | undefined, lang: 'fr' | 'en'): string | null {
  const c = id ? BY_ID.get(id) : undefined;
  return c ? c[lang] : null;
}
/** C21 badge key = the parent's French name ("Logement"), "Autres" otherwise. */
export function badgeKey(id: string | null | undefined): string {
  return rootCategory(id)?.fr ?? 'Autres';
}

/** Tiles (S2 §1 #6, §3). */
export type Tiles = {
  best: { name: string; pct: number; spark: number[] } | null; // null → "Placements / Ajoutez un achat"
  top: { categoryId: string; spent: number; share: number } | null; // null → "Ce mois / Pas encore de dépense"
};
export function tiles(h: Home): Tiles {
  return {
    best: h.top_mover ? { name: h.top_mover.name, pct: h.top_mover.change_30d_pct, spark: h.top_mover.spark_30d } : null,
    top: h.top_category && h.top_category.spent_ref > 0
      ? { categoryId: h.top_category.category_id, spent: h.top_category.spent_ref, share: h.top_category.share } : null,
  };
}

/** No account: C19 piggy bank, only the "Compte" action, no tiles, no list. */
export const hasAccounts = (h: Home) => h.accounts.length > 0 || h.counts.accounts > 0;
