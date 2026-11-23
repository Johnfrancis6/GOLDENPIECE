/**
 * App store (B6.3): persisted onboarding state, phase (loading / update /
 * onboarding / locked / ready), the local DB + API singletons, and the
 * actions of S1 (O2-O18). Screens read it with `useApp()`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import * as Application from 'expo-application';
import { openDb } from '../lib/db/open';
import { wipe as wipeDb } from '../lib/db/schema';
import { makeApi, type Api } from '../lib/api';
import { NetworkError } from '../lib/sync';
import { secureDelete, secureGet, secureSet } from '../lib/platform/secure';
import { randomHex } from '../lib/platform/crypto';
import { deviceId, deviceInfo, detectSecurityLevel } from '../lib/platform/device';
import { uuidv7 } from '../lib/uuid';
import {
  INITIAL, afterSecurity, phaseOf, restore, securityDowngraded, shouldRelock,
  type AppState, type Persona, type Phase, type Step,
} from '../lib/flow';
import { hashPin, pinAttempt, planFor, planWhenLater, type PinVerdict, type SecurityLevel } from '../lib/security';
import { countryByIso } from '../lib/countries';
import { initCrashReports } from '../lib/crash';
import type { Lang } from '../lib/format';

const KEY = 'app_state_v1';
export const CONSENT_VERSION = '0.1';
export const APP_VERSION = Application.nativeApplicationVersion ?? '0.1.0';

export function deviceLang(): Lang {
  try { return getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
}
/** Country hint for O3 suggestions: the phone's region (no SIM read in B6). */
export function phoneCountry(): string | null {
  try { return getLocales()[0]?.regionCode ?? null; } catch { return null; }
}

/** Error → i18n key for screens. */
export type Fail = { key: 'offline' | 'rate' | 'invalid' | 'exists' | 'code' | 'generic' | 'weak'; retryS?: number };
function failOf(e: unknown): Fail {
  if (e instanceof NetworkError) return { key: 'offline' };
  const err = e as { status?: number; code?: string; message?: string; name?: string };
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? '');
  if (/fetch|network|abort/i.test(msg) && !err?.status) return { key: 'offline' };
  if (err?.status === 429 || /rate|too_many/i.test(code)) return { key: 'rate' };
  if (/user_already_exists|email_exists/.test(code)) return { key: 'exists' };
  if (/weak_password/.test(code)) return { key: 'weak' };
  if (/otp_expired|invalid_otp|token/i.test(code + msg)) return { key: 'code' };
  if (/invalid_credentials|invalid login/i.test(code + msg)) return { key: 'invalid' };
  return { key: 'generic' };
}

type Ctx = {
  st: AppState;
  phase: Phase;
  lang: Lang;
  api: Api;
  /** Persist a patch (and optionally the current step). */
  patch: (p: Partial<AppState>) => Promise<void>;
  setStep: (s: Step) => void;
  warmup: () => void;
  startDemo: (p: Persona, firstName: string) => Promise<Fail | null>;
  signUp: (email: string, password: string) => Promise<Fail | null>;
  verifyCode: (code: string) => Promise<Fail | null>;
  resendCode: () => Promise<Fail | null>;
  login: (email: string, password: string) => Promise<Fail | 'confirm' | null>;
  forgot: (email: string) => Promise<Fail | null>;
  /** O10: `later` = "Plus tard" (never below the device secret). Returns the next step. */
  chooseSecurity: (level: SecurityLevel, later: boolean) => Promise<Step>;
  setPin: (pin: string) => Promise<void>;
  checkPin: (pin: string) => PinVerdict;
  unlock: () => void;
  /** Lock-screen start: device lost its protection → event, wipe, re-login. */
  checkDeviceSecurity: () => Promise<boolean>;
  relogin: (reason: 'pin' | 'device') => Promise<void>;
  /** Sign out and start again at O2 (demo exit, dev). */
  reset: () => Promise<void>;
  recordConsents: (ai: boolean, crash: boolean) => Promise<Fail | null>;
  minVersion: string | null;
};

const AppCtx = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
/** Screens that may render outside the provider (gallery) read null. */
export const useAppMaybe = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<AppState | null>(null);
  const stRef = useRef<AppState | null>(null);
  const [locked, setLocked] = useState(false);
  const [minVersion, setMinVersion] = useState<string | null>(null);
  const bgAt = useRef<number | null>(null);
  const api = useMemo(() => makeApi(openDb), []);

  // load persisted state (secure store: fast, no network wait — O1 ≤ 3 s)
  useEffect(() => {
    let live = true;
    secureGet(KEY).then((raw) => {
      if (!live) return;
      const s = restore(raw);
      stRef.current = s;
      setLocked(s.mode === 'account' && s.done && s.security !== null);
      setSt(s);
      if (s.done && s.consents?.crash) initCrashReports();
    }).catch(() => { stRef.current = { ...INITIAL }; setSt({ ...INITIAL }); });
    // O17: minimum version, in the background (anon)
    api.rpc<{ min_version: { android?: string } }>('health_public', {}, 0)
      .then((h) => live && setMinVersion(h?.min_version?.android ?? null))
      .catch(() => {});
    return () => { live = false; };
  }, [api]);

  const patch = useCallback(async (p: Partial<AppState>) => {
    const next = { ...(stRef.current ?? INITIAL), ...p };
    stRef.current = next;
    setSt(next);
    await secureSet(KEY, JSON.stringify(next)).catch(() => {});
  }, []);
  const setStep = useCallback((s: Step) => { if (stRef.current?.step !== s) void patch({ step: s }); }, [patch]);

  // O18 re-lock after lock_delay_s in background
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (a) => {
      const s = stRef.current;
      if (!s) return;
      if (a === 'background') bgAt.current = Date.now();
      else if (a === 'active') {
        if (shouldRelock(s, bgAt.current, Date.now())) setLocked(true);
        bgAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  // a device registration that failed offline is retried at the next start
  const registerDevice = useCallback(async () => {
    const s = stRef.current;
    if (!s?.security || s.mode !== 'account') return;
    try {
      const info = deviceInfo();
      await api.rpc('register_device', {
        p_device_id: await deviceId(), p_platform: info.platform, p_app_version: info.app_version,
        p_security_level: s.security.level, p_unlock_method: s.security.plan.unlock,
        ...(info.label ? { p_label: info.label } : {}), ...(info.os_version ? { p_os_version: info.os_version } : {}),
      });
      await patch({ deviceRegistered: true });
    } catch { /* retried later */ }
  }, [api, patch]);
  useEffect(() => {
    if (st?.done && st.mode === 'account' && !st.deviceRegistered) void registerDevice();
  }, [st?.done, st?.mode, st?.deviceRegistered, registerDevice]);

  const warmup = useCallback(() => { api.fn('account-demo-start', { warmup: true }, 5000).catch(() => {}); }, [api]);

  /** language / country / timezone / first name to the profile (account and demo). */
  const pushProfile = useCallback(async (extra: Record<string, unknown> = {}) => {
    const s = stRef.current!;
    const settings: Record<string, unknown> = { ...extra };
    if (s.lang) settings.language = s.lang;
    if (s.country) settings.country = s.country;
    const tz = countryByIso(s.country)?.tz;
    if (tz) settings.timezone = tz;
    await api.rpc('update_settings', { p_client_id: uuidv7(), p_settings: settings });
  }, [api]);

  const startDemo = useCallback(async (persona: Persona, firstName: string) => {
    const s = stRef.current!;
    try {
      const { data } = await api.sb.auth.getSession();
      if (!data.session) {
        const r = await api.sb.auth.signInAnonymously();
        if (r.error) throw r.error;
      }
      await api.fn('account-demo-start', { persona, lang: s.lang ?? 'fr', country: s.country ?? 'SN' }, 20_000);
      await pushProfile({ first_name: firstName }).catch(() => {});
      await patch({ mode: 'demo', persona, done: true });
      return null;
    } catch (e) {
      return failOf(e);
    }
  }, [api, patch, pushProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const r = await api.sb.auth.signUp({ email, password });
      if (r.error) return failOf(r.error);
      // confirmation on: an existing address comes back with no identity
      if (r.data.user && (r.data.user.identities ?? []).length === 0) return { key: 'exists' } as Fail;
      await patch({ email, mode: 'account', step: 'code' });
      return null;
    } catch (e) { return failOf(e); }
  }, [api, patch]);

  const afterSignedIn = useCallback(async () => {
    await pushProfile().catch(() => {});
    await patch({ mode: 'account', step: 'security' });
  }, [patch, pushProfile]);

  const verifyCode = useCallback(async (code: string) => {
    try {
      const r = await api.sb.auth.verifyOtp({ email: stRef.current!.email!, token: code, type: 'signup' });
      if (r.error) return failOf(r.error);
      await afterSignedIn();
      return null;
    } catch (e) { return failOf(e); }
  }, [api, afterSignedIn]);

  const resendCode = useCallback(async () => {
    try {
      const r = await api.sb.auth.resend({ type: 'signup', email: stRef.current!.email! });
      return r.error ? failOf(r.error) : null;
    } catch (e) { return failOf(e); }
  }, [api]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const r = await api.sb.auth.signInWithPassword({ email, password });
      if (r.error) {
        if (/email_not_confirmed/.test(String(r.error.code))) {
          await patch({ email, mode: 'account', step: 'code' });
          await api.sb.auth.resend({ type: 'signup', email }).catch(() => {});
          return 'confirm' as const;
        }
        return failOf(r.error);
      }
      await patch({ email, pinState: { failures: 0, lockedUntil: 0 } });
      await afterSignedIn();
      return null;
    } catch (e) { return failOf(e); }
  }, [api, patch, afterSignedIn]);

  const forgot = useCallback(async (email: string) => {
    try {
      const r = await api.sb.auth.resetPasswordForEmail(email);
      return r.error ? failOf(r.error) : null;
    } catch (e) { return failOf(e); }
  }, [api]);

  const chooseSecurity = useCallback(async (level: SecurityLevel, later: boolean) => {
    const plan = later ? planWhenLater(level) : planFor(level);
    await patch({ security: { level, plan } });
    const next = afterSecurity(plan);
    await patch({ step: next });
    return next;
  }, [patch]);

  const setPin = useCallback(async (pin: string) => {
    const salt = randomHex(16);
    await patch({ pin: { salt, hash: hashPin(pin, salt) }, pinState: { failures: 0, lockedUntil: 0 }, step: 'consents' });
  }, [patch]);

  const checkPin = useCallback((pin: string) => {
    const s = stRef.current!;
    const ok = !!s.pin && hashPin(pin, s.pin.salt) === s.pin.hash;
    const v = pinAttempt(s.pinState, ok, Date.now());
    void patch({ pinState: v.state });
    if (!v.ok && !v.waitS) api.rpc('record_security_event', { p_type: 'pin_failed', p_details: { failures: v.state.failures } }).catch(() => {});
    return v;
  }, [api, patch]);

  const relogin = useCallback(async (reason: 'pin' | 'device') => {
    const s = stRef.current!;
    if (reason === 'device') {
      await api.rpc('record_security_event', { p_type: 'device_security_changed', p_details: { level: s.security?.level ?? null } }).catch(() => {});
    }
    await api.sb.auth.signOut({ scope: 'local' }).catch(() => {});
    if (Platform.OS !== 'web') await openDb().then(wipeDb).catch(() => {});
    await secureDelete(KEY).catch(() => {});
    await patch({ ...INITIAL, lang: s.lang, country: s.country, email: s.email, mode: 'account', step: 'login' });
    setLocked(false);
  }, [api, patch]);

  const reset = useCallback(async () => {
    const s = stRef.current!;
    await api.rpc('record_security_event', { p_type: 'sign_out', p_details: {} }).catch(() => {});
    await api.sb.auth.signOut({ scope: 'local' }).catch(() => {});
    if (Platform.OS !== 'web') await openDb().then(wipeDb).catch(() => {});
    await patch({ ...INITIAL, lang: s.lang });
    setLocked(false);
  }, [api, patch]);

  const checkDeviceSecurity = useCallback(async () => {
    const s = stRef.current;
    if (!s?.security || Platform.OS === 'web') return true;
    const now = await detectSecurityLevel();
    if (securityDowngraded(s.security.plan, now)) { await relogin('device'); return false; }
    return true;
  }, [relogin]);

  const recordConsents = useCallback(async (ai: boolean, crash: boolean) => {
    try {
      await api.rpc('record_consents', { p_items: [
        { kind: 'service', granted: true, text_version: CONSENT_VERSION },
        { kind: 'ai_categorisation', granted: ai, text_version: CONSENT_VERSION },
        { kind: 'crash_reports', granted: crash, text_version: CONSENT_VERSION },
      ] });
    } catch (e) {
      const f = failOf(e);
      if (f.key !== 'offline') return f;
      // offline: kept locally, sent by B6.4's outbox at the next connection
    }
    if (crash) initCrashReports();
    await patch({ consents: { ai, crash }, done: true });
    setLocked(false);
    return null;
  }, [api, patch]);

  const unlock = useCallback(() => setLocked(false), []);

  const lang: Lang = st?.lang ?? deviceLang();
  const phase = phaseOf(st, { appVersion: APP_VERSION, minVersion, locked });
  const value = useMemo<Ctx | null>(() => st && ({
    st, phase, lang, api, patch, setStep, warmup, startDemo, signUp, verifyCode, resendCode, login, forgot,
    chooseSecurity, setPin, checkPin, unlock, checkDeviceSecurity, relogin, reset, recordConsents, minVersion,
  }), [st, phase, lang, api, patch, setStep, warmup, startDemo, signUp, verifyCode, resendCode, login, forgot,
    chooseSecurity, setPin, checkPin, unlock, checkDeviceSecurity, relogin, reset, recordConsents, minVersion]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
