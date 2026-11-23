/** O8 E-mail code (C3 boxes + C4 code keypad, dots 3/5): 6 digits submit by
 * themselves; "Renvoyer le code (0:24)" active when the countdown ends. */
import { useEffect, useState } from 'react';
import { useApp } from '../../state/app';
import { useT } from '../../i18n';
import { Button, CodeBoxes, PinMessage } from '../../ui';
import { formatCountdown } from '../../lib/format';
import { CodeFrame, failText, go, useBack, useStep } from '../../screens/frames';

const RESEND_S = 30;

export default function Code() {
  useStep('code');
  const back = useBack('code');
  const { st, verifyCode, resendCode } = useApp();
  const t = useT();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_S);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const submit = async (c: string) => {
    setBusy(true);
    const f = await verifyCode(c);
    setBusy(false);
    if (f) { setErr(failText(t, f)); setTimeout(() => setCode(''), 1800); }
    else go('security');
  };
  const digit = (d: string) => {
    if (busy || code.length >= 6) return;
    const n = code + d;
    setCode(n); setErr(null);
    if (n.length === 6) void submit(n);
  };
  const resend = async () => {
    setLeft(RESEND_S);
    const f = await resendCode();
    if (f) setErr(failText(t, f));
  };
  return (
    <CodeFrame step="code" title={t('O8.title')} sub={t('O8.sub', { email: st.email ?? '' })} onBack={back}
      entry={<CodeBoxes value={code} error={!!err} />}
      message={<PinMessage text={err} />}
      link={<Button variant="text" size="small" disabled={left > 0}
        label={left > 0 ? t('O8.resendIn', { t: formatCountdown(left) }) : t('O8.resend')} onPress={() => void resend()} />}
      keypad={{ variant: 'code', onDigit: digit, onDelete: () => setCode((s) => s.slice(0, -1)), onClear: () => setCode(''), disabled: busy }} />
  );
}
