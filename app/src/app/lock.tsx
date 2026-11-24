/** O18 Lock (S1 §2): no back, no dots. The system prompt opens first when the
 * plan uses the phone (biometric / device code); this screen is the
 * fallback. App PIN: 5 failures → 1 min wait, 10 → full re-login (O9).
 * On arrival the device security is re-checked (§1.2b): lost protection →
 * `device_security_changed`, wipe, re-login. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, BackHandler, Platform } from 'react-native';
import { useApp } from '../state/app';
import { useT } from '../i18n';
import { Button, PinDots, PinMessage, StepScreen, useToast } from '../ui';
import { PIN_LENGTH } from '../lib/security';
import { formatCountdown } from '../lib/format';
import { systemAuthenticate } from '../lib/platform/device';
import { CodeFrame } from '../screens/frames';

export default function Lock() {
  const { st, unlock, checkPin, checkDeviceSecurity, relogin } = useApp();
  const t = useT();
  const toast = useToast();
  const plan = st.security?.plan;
  const usesPhone = plan ? plan.unlock !== 'app_pin' : false;
  const hasPin = !!st.pin;
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<{ text: string; kind: 'error' | 'locked' } | null>(null);
  const [shake, setShake] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const prompting = useRef(false);
  const lockedUntil = st.pinState.lockedUntil;
  const waitS = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const prompt = useCallback(async () => {
    if (!usesPhone || prompting.current || Platform.OS === 'web') return;
    prompting.current = true;
    const ok = await systemAuthenticate(t('bio.prompt'), hasPin ? t('bio.cancel') : t('back'), plan?.unlock === 'biometric_weak');
    prompting.current = false;
    if (ok) unlock();
  }, [usesPhone, hasPin, plan?.unlock, t, unlock]);

  useEffect(() => {
    let live = true;
    checkDeviceSecurity().then((fine) => { if (live && fine) void prompt(); });
    return () => { live = false; };
  }, [checkDeviceSecurity, prompt]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true); // no back
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!waitS) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waitS]);
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (a) => { if (a === 'active') setNow(Date.now()); });
    return () => sub.remove();
  }, []);

  const digit = (d: string) => {
    if (waitS || pin.length >= PIN_LENGTH) return;
    const n = pin + d;
    setPin(n); setErr(null);
    if (n.length < PIN_LENGTH) return;
    setTimeout(() => {
      const v = checkPin(n);
      if (v.ok) { unlock(); return; }
      if (v.relogin) { toast.show({ text: t('pin.relogin') }); void relogin('pin'); return; }
      setShake((s) => s + 1);
      setNow(Date.now());
      setErr(v.waitS ? null : { text: t('pin.wrong', { n: v.left }), kind: 'error' });
      setTimeout(() => setPin(''), v.waitS ? 0 : 1800);
    }, 120);
  };

  if (!hasPin) {
    // phone-only plan (strong biometric or device code): the prompt is the lock
    return (
      <StepScreen icon={plan?.unlock === 'device_secret' ? 'smartphone' : 'fingerprint'} title={t('O18.title')} text={t('O18.sub')}
        primaryLabel={t('O18.unlock')} onPrimary={() => void prompt()}
        secondary={{ label: t('O18.forgot'), onPress: () => void relogin('pin') }} />
    );
  }
  const msg = waitS ? { text: t('pin.locked', { t: formatCountdown(waitS) }), kind: 'locked' as const } : err;
  return (
    <CodeFrame title={t('O18.title')} sub={t('O18.sub')}
      entry={<PinDots length={pin.length} error={!!err && !waitS} shakeKey={shake} locked={!!waitS} />}
      message={<PinMessage text={msg?.text} kind={msg?.kind} />}
      link={<Button variant="text" size="small" label={t('O18.forgot')} onPress={() => void relogin('pin')} />}
      keypad={{ variant: 'pin', onDigit: digit, onDelete: () => setPin((s) => s.slice(0, -1)), onClear: () => setPin(''),
        onBiometric: usesPhone ? () => void prompt() : undefined, disabled: !!waitS }} />
  );
}
