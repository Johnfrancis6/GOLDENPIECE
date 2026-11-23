import { assertEquals, assertThrows } from "@std/assert";
import { allocate, convert, divRound, exponent, formatMajor, MoneyError, parse } from "./money.ts";

type Case = { op: string; args: Record<string, unknown>; expect: unknown };
const fix = JSON.parse(
  await Deno.readTextFile(new URL("../../../shared/fixtures/money.json", import.meta.url)),
) as { cases: Case[] };

function run(c: Case): unknown {
  const a = c.args as Record<string, any>;
  switch (c.op) {
    case "exponent":
      return exponent(a.currency);
    case "div_round":
      return Number(divRound(BigInt(a.n), BigInt(a.d)));
    case "parse":
      return Number(parse(a.amount, a.currency));
    case "format":
      return formatMajor(BigInt(a.minor), a.currency);
    case "convert":
      return Number(convert(BigInt(a.minor), a.from, a.to, a.usd_per_eur));
    case "allocate":
      return allocate(BigInt(a.minor), a.weights).map(Number);
  }
  throw new Error(c.op);
}

Deno.test("money fixtures (shared with SQL and Python)", () => {
  if (fix.cases.length < 200) throw new Error("fixture file too small");
  for (const [i, c] of fix.cases.entries()) {
    assertEquals(run(c), c.expect, `case ${i} ${c.op} ${JSON.stringify(c.args)}`);
  }
});

Deno.test("money errors", () => {
  assertThrows(() => exponent("GBP"), MoneyError);
  assertThrows(() => convert(1n, "EUR", "USD"), MoneyError);
  assertThrows(() => parse("1e5", "EUR"), MoneyError);
});
