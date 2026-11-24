/** Queue filtering, grouping and search (D §2 queue, §3 "/"). Pure, unit-tested. */
import { sameLocalDay } from '../lib/format';
import { isDecided, isPending, type Band, type QueueItem } from '../lib/types';

export type BandKey = 'normal' | 'ask' | 'bank';
export type Filters = {
  status: 'all' | 'pending' | 'decided';
  score: 'all' | 'bank' | 'ask' | 'low';
  type: 'all' | 'anomaly' | 'fraud';
  last24h: boolean;
  q: string;
};
export const DEFAULT_FILTERS: Filters = { status: 'all', score: 'all', type: 'all', last24h: false, q: '' };

/** C15 bands: < 40 Normal, 40-70 À confirmer, > 70 Banque prévenue. */
export function bandOf(score: number, band?: Band): BandKey {
  if (band === 'bank') return 'bank';
  if (band === 'ask') return 'ask';
  if (score > 70) return 'bank';
  if (score >= 40) return 'ask';
  return 'normal';
}

function matches(it: QueueItem, q: string): boolean {
  const s = q.trim().toLowerCase().replace(/^[ua]-/, '');
  if (!s) return true;
  return it.user_ref.toLowerCase().includes(s)
    || it.alert_id.toLowerCase().startsWith(s)
    || (it.tx?.cp_name ?? '').toLowerCase().includes(s);
}

export function applyFilters(items: QueueItem[], f: Filters, now = new Date()): QueueItem[] {
  return items.filter((it) => {
    if (f.status === 'pending' && !isPending(it.status)) return false;
    if (f.status === 'decided' && !isDecided(it.status)) return false;
    const b = bandOf(it.score, it.band);
    if (f.score === 'bank' && b !== 'bank') return false;
    if (f.score === 'ask' && b !== 'ask') return false;
    if (f.score === 'low' && b !== 'normal') return false;
    if (f.type !== 'all' && it.kind !== f.type) return false;
    if (f.last24h && now.getTime() - new Date(it.created_at).getTime() > 24 * 3600_000) return false;
    return matches(it, f.q);
  });
}

export type Group = { key: 'review' | 'decided' | 'earlier'; items: QueueItem[] };

/**
 * "En analyse · {n}" (oldest first: the longest wait on top), then
 * "Décidées aujourd'hui", then "Décidées plus tôt" (newest decision first).
 */
export function groupItems(items: QueueItem[], now = new Date()): Group[] {
  const review = items.filter((i) => isPending(i.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const decided = items.filter((i) => isDecided(i.status))
    .sort((a, b) => (b.decided?.at ?? b.created_at).localeCompare(a.decided?.at ?? a.created_at));
  const today = decided.filter((i) => sameLocalDay(new Date(i.decided?.at ?? i.created_at), now));
  const earlier = decided.filter((i) => !today.includes(i));
  const out: Group[] = [];
  if (review.length) out.push({ key: 'review', items: review });
  if (today.length) out.push({ key: 'decided', items: today });
  if (earlier.length) out.push({ key: 'earlier', items: earlier });
  return out;
}

/** Visual order (J / K navigation). */
export function flat(groups: Group[]): QueueItem[] {
  return groups.flatMap((g) => g.items);
}

export function neighbour(order: QueueItem[], id: string | undefined, step: 1 | -1): string | undefined {
  if (!order.length) return undefined;
  const i = order.findIndex((x) => x.alert_id === id);
  if (i < 0) return order[0].alert_id;
  return order[Math.min(order.length - 1, Math.max(0, i + step))].alert_id;
}

/** Merge a refreshed first page into the loaded list (later pages kept). */
export function mergeFirstPage(prev: QueueItem[], page: QueueItem[]): QueueItem[] {
  const ids = new Set(page.map((i) => i.alert_id));
  const oldest = page.length ? page[page.length - 1].created_at : '';
  const rest = prev.filter((i) => !ids.has(i.alert_id) && i.created_at < oldest);
  return [...page, ...rest];
}
