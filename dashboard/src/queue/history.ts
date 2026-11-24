/** 90-day daily debits for the detail chart (D §2 "90 derniers jours"). Pure, unit-tested. */
import type { AlertDetail } from '../lib/types';

export type Day = { key: string; total: number; current: boolean };
export type History = { days: Day[]; median: number; maxBefore: number | null; payees: number; currency: string; withDebits: number };

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Totals in minor units per local day, 90 days ending on the operation's day. */
export function history90(h: AlertDetail['history_90d'], opTs: string | null, opAmount: number | null, currency = 'XOF'): History {
  const end = opTs ? new Date(opTs) : new Date();
  const days: Day[] = [];
  const index = new Map<string, Day>();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const day = { key: dayKey(d), total: 0, current: i === 0 };
    days.push(day);
    index.set(day.key, day);
  }
  const payees = new Set<string>();
  let maxBefore: number | null = null;
  let skippedOp = false;
  for (const x of h) {
    if (x.dc !== 'DBIT') continue;
    const day = index.get(dayKey(new Date(x.booking_ts)));
    if (day) day.total += x.amount.m;
    if (x.cp_name) payees.add(x.cp_name.trim().toLowerCase());
    const isOp = !skippedOp && opTs !== null && x.booking_ts === opTs && x.amount.m === opAmount;
    if (isOp) { skippedOp = true; continue; }
    maxBefore = Math.max(maxBefore ?? 0, x.amount.m); // the RPC returns operations up to this one only
  }
  const nonZero = days.filter((d) => d.total > 0).map((d) => d.total).sort((a, b) => a - b);
  const n = nonZero.length;
  const median = n === 0 ? 0 : n % 2 ? nonZero[(n - 1) / 2] : Math.round((nonZero[n / 2 - 1] + nonZero[n / 2]) / 2);
  return { days, median, maxBefore, payees: payees.size, currency: h[0]?.amount.c ?? currency, withDebits: n };
}
