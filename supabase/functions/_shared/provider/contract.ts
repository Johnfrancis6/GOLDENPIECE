/**
 * Provider contract runner (shared/contract-tests/provider.contract.json).
 * Adapter-agnostic: give it an adapter and a linked account; it returns one
 * result per check id. Used by the Deno tests (fake + live/local stack).
 */
import type { ProviderAdapter, ProviderEntry } from "./types.ts";

export type CheckResult = { id: string; ok: boolean; detail?: string };

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ISO_D = /^\d{4}-\d{2}-\d{2}$/;

function entryProblem(e: ProviderEntry): string | null {
  if (!e.providerEntryId || !e.accountId) return "ids";
  if (!["BOOK", "PDNG", "RJCT"].includes(e.status)) return "status";
  if (!["CRDT", "DBIT"].includes(e.creditDebit)) return "creditDebit";
  if (typeof e.amountMinor !== "bigint" || e.amountMinor < 0n) return "amountMinor";
  if (!["XOF", "XAF", "EUR", "USD"].includes(e.currency)) return "currency";
  if (!ISO_TS.test(e.bookingTs) || !ISO_D.test(e.valueDate)) return "dates";
  if (!e.bankTxCode?.domain || !e.bankTxCode.family || !e.bankTxCode.subFamily) return "bankTxCode";
  if (e.charges && (typeof e.charges.amountMinor !== "bigint" || e.charges.amountMinor < 0n)) {
    return "charges";
  }
  if (e.momo && (!e.momo.operator || !e.momo.opType || !e.momo.operatorRef)) return "momo";
  return null;
}

async function listAll(
  a: ProviderAdapter,
  linkId: string,
  accountId: string,
  pageSize: number,
  bookedFrom?: string,
) {
  const pages: ProviderEntry[][] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 200; i++) {
    const r = await a.listEntries({ linkId, accountId, cursor, pageSize, bookedFrom });
    pages.push(r.entries);
    if (!r.nextCursor) return { pages, ended: true };
    cursor = r.nextCursor;
  }
  return { pages, ended: false };
}

const key = (e: ProviderEntry) => `${e.providerEntryId}|${e.bookingTs}|${e.amountMinor}|${e.creditDebit}`;

export async function runProviderContract(
  a: ProviderAdapter,
  ctx: { linkId: string; institution: string; accountIds: string[]; pageSize?: number; now?: Date },
): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const pageSize = ctx.pageSize ?? 50;
  const now = (ctx.now ?? new Date()).getTime();
  const c = a.capabilities(ctx.institution);
  out.push({
    id: "capabilities",
    ok: ["balances", "statementHistory", "pushNotifications", "securityEvents"].every((k) =>
      typeof (c as any)[k] === "boolean"
    ) && Number.isInteger(c.maxHistoryDays),
  });
  const balances = await a.getBalances(ctx.linkId, ctx.accountIds);
  let schemaBad: string | null = null, newest = true, disjoint = true, ended = true, notFuture = true;
  let stable = true, from = true, sizeOk = true, balOk = balances.length === ctx.accountIds.length;
  for (const acc of ctx.accountIds) {
    const l1 = await listAll(a, ctx.linkId, acc, pageSize);
    ended &&= l1.ended;
    const all = l1.pages.flat();
    sizeOk &&= l1.pages.every((p) => p.length <= pageSize);
    for (const e of all) {
      schemaBad ??= entryProblem(e) ? `${e.providerEntryId}: ${entryProblem(e)}` : null;
      if (Date.parse(e.bookingTs) > now + 1000) notFuture = false;
    }
    for (let i = 1; i < all.length; i++) if (all[i].bookingTs > all[i - 1].bookingTs) newest = false;
    disjoint &&= new Set(all.map((e) => e.providerEntryId)).size === all.length;
    const l2 = (await listAll(a, ctx.linkId, acc, pageSize * 2)).pages.flat();
    stable &&= l2.length === all.length && l2.every((e, i) => key(e) === key(all[i]));
    if (all.length > 2) {
      const mid = all[Math.floor(all.length / 2)].bookingTs;
      const f = (await listAll(a, ctx.linkId, acc, pageSize, mid)).pages.flat();
      from &&= f.length > 0 && f.length < all.length && f.every((e) => e.bookingTs >= mid.slice(0, 19));
    }
    const b = balances.find((x) => x.accountId === acc);
    balOk &&= !!b && typeof b.amountMinor === "bigint";
    const top = all[0];
    if (b && top?.momo?.balanceAfterMinor !== undefined) {
      balOk &&= top.momo.balanceAfterMinor === b.amountMinor;
    }
  }
  out.push({ id: "entries_schema", ok: schemaBad === null, detail: schemaBad ?? undefined });
  out.push({ id: "newest_first", ok: newest });
  out.push({ id: "pages_disjoint", ok: disjoint && ended });
  out.push({ id: "ids_stable", ok: stable });
  out.push({ id: "booked_not_future", ok: notFuture });
  out.push({ id: "booked_from", ok: from });
  out.push({ id: "balances", ok: balOk });
  out.push({ id: "page_size", ok: sizeOk });
  return out;
}
