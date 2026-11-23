import { assert, assertEquals } from "@std/assert";
import { runProviderContract } from "./contract.ts";
import type { ProviderAdapter, ProviderEntry } from "./types.ts";

function entry(i: number, balance: bigint): ProviderEntry {
  const ts = new Date(Date.UTC(2026, 0, 1) + i * 3600_000).toISOString().replace(".000Z", "Z");
  return {
    providerEntryId: `e${i}`,
    accountId: "w",
    status: "BOOK",
    creditDebit: "DBIT",
    amountMinor: 100n,
    currency: "XOF",
    bookingTs: ts,
    valueDate: ts.slice(0, 10),
    bankTxCode: { domain: "PMNT", family: "ICDT", subFamily: "OTHR" },
    momo: { operator: "kola_money", opType: "p2p_out", operatorRef: `R${i}`, balanceAfterMinor: balance },
  };
}

/** In-memory adapter: 23 entries, newest first, numeric cursor. */
export function fakeAdapter(opts: { oldestFirst?: boolean } = {}): ProviderAdapter {
  const all = Array.from({ length: 23 }, (_, i) => entry(i, BigInt(10000 - 100 * (i + 1)))).reverse();
  const list = opts.oldestFirst ? [...all].reverse() : all;
  return {
    id: "fake",
    capabilities: () => ({
      balances: true,
      statementHistory: true,
      pushNotifications: false,
      securityEvents: false,
      maxHistoryDays: 365,
    }),
    startLink: () => Promise.reject(new Error("n/a")),
    completeLink: () => Promise.resolve([]),
    getBalances: () =>
      Promise.resolve([{ accountId: "w", amountMinor: 7700n, currency: "XOF", at: "2026-01-02T00:00:00Z" }]),
    listEntries: ({ cursor, pageSize, bookedFrom }) => {
      const src = bookedFrom ? list.filter((e) => e.bookingTs >= bookedFrom) : list;
      const start = cursor ? Number(cursor) : 0;
      const page = src.slice(start, start + pageSize);
      return Promise.resolve({
        entries: page,
        nextCursor: start + pageSize < src.length ? String(start + pageSize) : undefined,
      });
    },
    revokeLink: () => Promise.resolve(),
  };
}

const ctx = {
  linkId: "l",
  institution: "kola_money",
  accountIds: ["w"],
  pageSize: 5,
  now: new Date("2026-02-01"),
};

Deno.test("contract: a correct adapter passes every check", async () => {
  const r = await runProviderContract(fakeAdapter(), ctx);
  assertEquals(r.filter((c) => !c.ok), []);
  assertEquals(r.length, 9);
});

Deno.test("contract: oldest-first listing is caught", async () => {
  const r = await runProviderContract(fakeAdapter({ oldestFirst: true }), ctx);
  const bad = r.filter((c) => !c.ok).map((c) => c.id);
  assert(bad.includes("newest_first"));
});
