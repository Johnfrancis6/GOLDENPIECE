/**
 * App phase machine (S1 §1). Pure: the provider (src/state/app.tsx) persists
 * `AppState` and calls these functions; tests cover every path.
 *
 * loading → update (O17, blocking) → onboarding step (persisted, resumes) →
 * locked (O18, account users) → ready.
 */
import type { Lang } from './format';
import type { Plan, SecurityLevel } from './security';

export type Step =
  | 'language' | 'country' | 'tour' | 'choice' // everyone (O2, O3, O4, O5)
  | 'persona' // demo (O6)
  | 'signup' | 'code' | 'login' // account (O7, O8, O9)
  | 'security' | 'pin' | 'consents'; // account (O10, O11, O12)

export type Mode = 'demo' | 'account';

export type Persona = 'dakar_salaried' | 'abidjan_trader' | 'diaspora_investor';

/** Persisted (secure store, small JSON). Never holds amounts or tokens. */
export type AppState = {
  v: 1;
  lang: Lang | null;
  country: string | null;
  step: Step;
  mode: Mode | null;
  persona: Persona | null;
  email: string | null;
  /** Device security decided on O10 (account users). */
  security: { level: SecurityLevel; plan: Plan } | null;
  /** App PIN: salted PBKDF2 hash (O11), never sent. */
  pin: { salt: string; hash: string } | null;
  pinState: { failures: number; lockedUntil: number };
  deviceRegistered: boolean;
  /** Onboarding finished (Home reachable). */
  done: boolean;
  /** Seconds before re-lock after the app goes to background (profile.lock_delay_s). */
  lockDelayS: number;
  consents: { ai: boolean; crash: boolean } | null;
  /** C20 eye: amounts hidden (persisted; a reveal lasts until the app closes). */
  hideAmounts: boolean;
  /** T guided tour seen once (replayable later from Settings). */
  tourSeen: boolean;
};

export const INITIAL: AppState = {
  v: 1, lang: null, country: null, step: 'language', mode: null, persona: null, email: null,
  security: null, pin: null, pinState: { failures: 0, lockedUntil: 0 }, deviceRegistered: false,
  done: false, lockDelayS: 300, consents: null, hideAmounts: false, tourSeen: false,
};

/** Step dots (S1 §1): O2 1/5, O3 2/5, O7-O8 3/5, O10-O11 4/5, O12 5/5. */
export const DOTS: Partial<Record<Step, number>> = {
  language: 1, country: 2, signup: 3, code: 3, security: 4, pin: 4, consents: 5,
};
export const DOTS_TOTAL = 5;

export const ROUTE: Record<Step, string> = {
  language: '/onboarding/language', country: '/onboarding/country', tour: '/onboarding/tour',
  choice: '/onboarding/choice', persona: '/onboarding/persona', signup: '/onboarding/signup',
  code: '/onboarding/code', login: '/onboarding/login', security: '/onboarding/security',
  pin: '/onboarding/pin', consents: '/onboarding/consents',
};

/** The step before `s` (top-bar back when the stack was rebuilt on resume). */
export function prevStep(s: Step, st: Pick<AppState, 'security' | 'email'>): Step | null {
  switch (s) {
    case 'language': return null; // back leaves the app
    case 'country': return 'language';
    case 'tour': return 'country';
    case 'choice': return 'country'; // the tour is skipped going back
    case 'persona': case 'signup': case 'login': return 'choice';
    case 'code': return 'signup';
    case 'security': return null; // signed in: no way back to the forms
    case 'pin': return 'security';
    case 'consents': return st.security?.plan.needsAppPin ? 'pin' : 'security';
  }
}

/** After O10: O11 when the plan needs an app PIN (or the user chose one). */
export function afterSecurity(plan: Plan): Step {
  return plan.needsAppPin ? 'pin' : 'consents';
}

export type Phase =
  | { kind: 'loading' }
  | { kind: 'update'; current: string; min: string }
  | { kind: 'onboarding'; step: Step }
  | { kind: 'locked' }
  | { kind: 'ready' };

export function phaseOf(st: AppState | null, o: { appVersion: string; minVersion: string | null; locked: boolean }): Phase {
  if (!st) return { kind: 'loading' };
  if (o.minVersion && compareVersion(o.appVersion, o.minVersion) < 0) return { kind: 'update', current: o.appVersion, min: o.minVersion };
  if (!st.done) return { kind: 'onboarding', step: st.step };
  if (o.locked && needsLock(st)) return { kind: 'locked' };
  return { kind: 'ready' };
}

/** O18 runs on every opening after sign-up (account users), never in demo. */
export function needsLock(st: AppState): boolean {
  return st.mode === 'account' && st.done && st.security !== null;
}

/** Re-lock after `lockDelayS` in background (0 = immediately). */
export function shouldRelock(st: AppState, backgroundAt: number | null, now: number): boolean {
  if (!needsLock(st) || backgroundAt === null) return false;
  return now - backgroundAt >= st.lockDelayS * 1000;
}

/** Semver-ish compare of "a.b.c" (missing parts = 0, non-numeric = 0). */
export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** The device lost the protection the plan relies on (lock removed, finger
 * deleted) → `device_security_changed`, wipe, re-login (§1.2b). */
export function securityDowngraded(plan: Plan, now: SecurityLevel): boolean {
  const rank: Record<SecurityLevel, number> = { none: 0, secret: 1, weak: 2, strong: 3 };
  const needed: Record<Plan['unlock'], number> = { app_pin: 0, device_secret: 1, biometric_weak: 2, biometric_strong: 3 };
  return rank[now] < needed[plan.unlock];
}

/** Merge a persisted JSON blob with defaults (older versions, partial writes). */
export function restore(raw: string | null): AppState {
  if (!raw) return { ...INITIAL };
  try {
    const j = JSON.parse(raw) as Partial<AppState>;
    if (j.v !== 1) return { ...INITIAL };
    return { ...INITIAL, ...j, pinState: { ...INITIAL.pinState, ...(j.pinState ?? {}) } };
  } catch {
    return { ...INITIAL };
  }
}
