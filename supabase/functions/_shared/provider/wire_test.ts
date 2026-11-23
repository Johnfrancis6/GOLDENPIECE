import { assertEquals, assertThrows } from "@std/assert";
import { entryFromWire, entryToWire } from "./wire.ts";

const w = {
  providerEntryId: "x",
  accountId: "momo1",
  status: "BOOK",
  creditDebit: "DBIT",
  amountMinor: 2500,
  currency: "XOF",
  bookingTs: "2026-11-23T10:15:00Z",
  valueDate: "2026-11-23",
  bankTxCode: { domain: "PMNT", family: "MCOP", subFamily: "OTHR" },
  charges: { amountMinor: 25, currency: "XOF" },
  momo: { operator: "kola_money", opType: "merchant", operatorRef: "K1", balanceAfterMinor: 9000 },
};

Deno.test("wire: integers become bigint and back, losslessly", () => {
  const e = entryFromWire(w);
  assertEquals(e.amountMinor, 2500n);
  assertEquals(e.charges?.amountMinor, 25n);
  assertEquals(e.momo?.balanceAfterMinor, 9000n);
  assertEquals(entryToWire(e), w);
});

Deno.test("wire: floats and unsafe integers are refused", () => {
  assertThrows(() => entryFromWire({ ...w, amountMinor: 12.5 }));
  assertThrows(() => entryToWire({ ...entryFromWire(w), amountMinor: 2n ** 60n }));
});
