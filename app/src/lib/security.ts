/**
 * Device security matrix (TECH_ANALYSIS §1.2b) and app PIN rules.
 * Pure functions here; the expo-local-authentication / secure-store calls are
 * in src/lib/device.ts so this file is unit-tested.
 */
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export type SecurityLevel = 'strong' | 'weak' | 'secret' | 'none';
export type UnlockMethod = 'biometric_strong' | 'biometric_weak' | 'device_secret' | 'app_pin';
export type O10Variant = 'strong' | 'weak' | 'secret' | 'none';

/** expo-local-authentication SecurityLevel: 0 NONE, 1 SECRET, 2 BIOMETRIC_WEAK, 3 BIOMETRIC_STRONG */
export function levelFrom(enrolledLevel: number): SecurityLevel {
  switch (enrolledLevel) {
    case 3: return 'strong';
    case 2: return 'weak';
    case 1: return 'secret';
    default: return 'none';
  }
}

export type Plan = {
  level: SecurityLevel;
  variant: O10Variant; // which O10 screen
  unlock: UnlockMethod; // how the app opens
  sensitive: UnlockMethod; // how sensitive actions are confirmed
  needsAppPin: boolean; // O11 must run
};

/** Matrix of §1.2b. Weak biometric opens the app but sensitive actions need a
 * secret: the device secret when there is one, else the app PIN. On Android a
 * weak-biometric phone always has a device secret (biometrics require one),
 * but B6 still asks for an app PIN so sensitive actions never depend on face
 * unlock (O10 weak → "Créer un code"). */
export function planFor(level: SecurityLevel): Plan {
  switch (level) {
    case 'strong': return { level, variant: 'strong', unlock: 'biometric_strong', sensitive: 'biometric_strong', needsAppPin: false };
    case 'weak': return { level, variant: 'weak', unlock: 'biometric_weak', sensitive: 'app_pin', needsAppPin: true };
    case 'secret': return { level, variant: 'secret', unlock: 'device_secret', sensitive: 'device_secret', needsAppPin: false };
    default: return { level, variant: 'none', unlock: 'app_pin', sensitive: 'app_pin', needsAppPin: true };
  }
}

/** "Plus tard" on O10: the user may go weaker only down to the device secret,
 * never "no protection" — a phone without a lock always gets the app PIN. */
export function planWhenLater(level: SecurityLevel): Plan {
  if (level === 'none') return planFor('none');
  if (level === 'weak') return { ...planFor('weak'), unlock: 'device_secret', sensitive: 'device_secret', needsAppPin: false };
  return { ...planFor(level), unlock: 'device_secret', sensitive: 'device_secret' };
}

// ── app PIN ─────────────────────────────────────────────────────────────────
export const PIN_LENGTH = 6;

/** Trivial codes refused (TECH_ANALYSIS §1.2b): repeated, ascending/descending
 * runs, 1-2 digit patterns, and years 1900-2029 (birth years: 19xxDD/DD19xx). */
export function isTrivialPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true;
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const d = pin.split('').map(Number);
  const asc = d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10);
  const desc = d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10);
  if (asc || desc) return true;
  if (/^(\d\d)\1\1$/.test(pin) || /^(\d{3})\1$/.test(pin)) return true;
  const yearAt = (s: string) => { const y = Number(s); return y >= 1900 && y <= 2029; };
  if (yearAt(pin.slice(0, 4)) || yearAt(pin.slice(2))) return true;
  return false;
}

export const PIN_ITERATIONS = 20_000;

/** Salted PBKDF2-SHA256, derived on device, never sent. */
export function hashPin(pin: string, saltHex: string, iterations = PIN_ITERATIONS): string {
  return bytesToHex(pbkdf2(sha256, utf8ToBytes(pin), utf8ToBytes(saltHex), { c: iterations, dkLen: 32 }));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** 5 failures → wait 1 min, 10 → full re-login (C3, O18). */
export type PinState = { failures: number; lockedUntil: number };
export type PinVerdict = { ok: boolean; state: PinState; waitS: number; relogin: boolean; left: number };

export function pinAttempt(state: PinState, correct: boolean, now: number): PinVerdict {
  if (state.lockedUntil > now) {
    return { ok: false, state, waitS: Math.ceil((state.lockedUntil - now) / 1000), relogin: false, left: 0 };
  }
  if (correct) return { ok: true, state: { failures: 0, lockedUntil: 0 }, waitS: 0, relogin: false, left: 5 };
  const failures = state.failures + 1;
  if (failures >= 10) return { ok: false, state: { failures, lockedUntil: 0 }, waitS: 0, relogin: true, left: 0 };
  const lockedUntil = failures === 5 ? now + 60_000 : 0;
  const left = failures < 5 ? 5 - failures : 10 - failures;
  return { ok: false, state: { failures, lockedUntil }, waitS: lockedUntil ? 60 : 0, relogin: false, left };
}

/** O7 password rule: ≥ 10 characters + common-list check (no breached-password API free). */
const COMMON = new Set(['motdepasse', 'password12', 'azertyuiop', 'qwertyuiop', '1234567890', '0123456789',
  'password123', 'motdepasse1', 'azerty1234', 'qwerty1234', 'iloveyou12', 'soleil1234', 'bonjour123', 'goldenpiece']);
export function passwordStrength(pw: string): 'weak' | 'medium' | 'strong' {
  if (pw.length < 10 || COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return 'weak';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return pw.length >= 14 || classes >= 3 ? 'strong' : 'medium';
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}
