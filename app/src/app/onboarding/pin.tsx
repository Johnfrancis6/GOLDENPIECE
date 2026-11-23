/** O11 App PIN (C3 dots + C4 keypad, dots 4/5): create, then confirm;
 * trivial codes refused; the hash stays on the phone. */
import { useState } from 'react';
import { useApp } from '../../state/app';
import { useT } from '../../i18n';
import { PinDots, PinMessage } from '../../ui';
import { isTrivialPin, PIN_LENGTH } from '../../lib/security';
import { CodeFrame, go, useBack, useStep } from '../../screens/frames';

export default function Pin() {
  useStep('pin');
  const back = useBack('pin');
  const { setPin } = useApp();
  const t = useT();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [busy, setBusy] = useState(false);
  const fail = (msg: string, restart: boolean) => {
    setErr(msg); setShake((n) => n + 1);
    setTimeout(() => { setPinText(''); if (restart) setFirst(null); }, 1800);
  };
  const complete = async (p: string) => {
    if (!first) {
      if (isTrivialPin(p)) return fail(t('O11.trivial'), false);
      setFirst(p); setPinText(''); return;
    }
    if (p !== first) return fail(t('O11.mismatch'), true);
    setBusy(true);
    await setPin(p);
    go('consents');
  };
  const digit = (d: string) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    const n = pin + d;
    setPinText(n); setErr(null);
    if (n.length === PIN_LENGTH) setTimeout(() => void complete(n), 120);
  };
  return (
    <CodeFrame step="pin" title={first ? t('O11.confirm') : t('O11.title')} sub={first ? undefined : t('O11.sub')}
      onBack={first ? () => { setFirst(null); setPinText(''); setErr(null); } : back}
      entry={<PinDots length={pin.length} error={!!err} shakeKey={shake} />}
      message={<PinMessage text={err} />}
      keypad={{ variant: 'pin', onDigit: digit, onDelete: () => setPinText((s) => s.slice(0, -1)), onClear: () => setPinText(''), disabled: busy }} />
  );
}
