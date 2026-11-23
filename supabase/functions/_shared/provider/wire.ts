/** JSON wire format <-> bigint money (amounts stay < 2^53 in practice; checked). */
import type { ProviderBalance, ProviderEntry } from "./types.ts";
import { ProviderError } from "./errors.ts";

function toBig(v: unknown, field: string): bigint {
  if (typeof v === "number" && Number.isSafeInteger(v)) return BigInt(v);
  if (typeof v === "string" && /^-?\d+$/.test(v)) return BigInt(v);
  if (typeof v === "bigint") return v;
  throw new ProviderError("INVALID", `bad integer in ${field}`);
}

function toNum(v: bigint): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw new ProviderError("INVALID", "amount beyond 2^53");
  return n;
}

export function entryFromWire(w: any): ProviderEntry {
  const e: any = { ...w, amountMinor: toBig(w.amountMinor, "amountMinor") };
  if (w.charges) e.charges = { ...w.charges, amountMinor: toBig(w.charges.amountMinor, "charges") };
  if (w.momo) {
    e.momo = { ...w.momo };
    if (w.momo.balanceAfterMinor !== undefined && w.momo.balanceAfterMinor !== null) {
      e.momo.balanceAfterMinor = toBig(w.momo.balanceAfterMinor, "balanceAfterMinor");
    }
  }
  return e as ProviderEntry;
}

export function entryToWire(e: ProviderEntry): Record<string, unknown> {
  const w: any = { ...e, amountMinor: toNum(e.amountMinor) };
  if (e.charges) w.charges = { ...e.charges, amountMinor: toNum(e.charges.amountMinor) };
  if (e.momo) {
    w.momo = { ...e.momo };
    if (e.momo.balanceAfterMinor !== undefined) w.momo.balanceAfterMinor = toNum(e.momo.balanceAfterMinor);
  }
  return w;
}

export function balanceFromWire(w: any): ProviderBalance {
  return { ...w, amountMinor: toBig(w.amountMinor, "amountMinor") };
}

export function balanceToWire(b: ProviderBalance): Record<string, unknown> {
  return { ...b, amountMinor: toNum(b.amountMinor) };
}
