/** UUID v7 (time-ordered) for client ids / idempotency keys (API.md §1). */
export function uuidv7(now = Date.now(), rand: (n: number) => Uint8Array = randomBytes): string {
  const b = rand(16);
  const ts = BigInt(now);
  for (let i = 0; i < 6; i++) b[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(a);
  // expo-crypto installs getRandomValues on the phone (see src/lib/crypto.ts); never reached there.
  throw new Error('no secure random source');
}
