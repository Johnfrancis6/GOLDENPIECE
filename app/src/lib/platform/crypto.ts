/** Secure random on Hermes: expo-crypto. Installs crypto.getRandomValues if missing. */
import * as Crypto from 'expo-crypto';

const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
if (!g.crypto) g.crypto = {};
if (!g.crypto.getRandomValues) {
  g.crypto.getRandomValues = (a: Uint8Array) => Crypto.getRandomValues(a);
}

export function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  g.crypto!.getRandomValues!(a);
  return Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
}
