/** O9 Login (B18 + C2): e-mail, password, "Mot de passe oublié ?", primary
 * "Se connecter"; rate limit → C8 "Trop de tentatives. Réessayez dans 5 min." */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp, type Fail } from '../../state/app';
import { useT } from '../../i18n';
import { Banner, Button, Input, useToast } from '../../ui';
import { isEmail } from '../../lib/security';
import { FormFrame, failText, go, useBack, useOnline, useStep } from '../../screens/frames';

export default function Login() {
  useStep('login');
  const back = useBack('login');
  const { login, forgot, st } = useApp();
  const t = useT();
  const toast = useToast();
  const online = useOnline();
  const [email, setEmail] = useState(st.email ?? '');
  const [pw, setPw] = useState('');
  const [errE, setErrE] = useState<string | null>(null);
  const [fail, setFail] = useState<Fail | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isEmail(email)) { setErrE(t('O7.err.email')); return; }
    setBusy(true); setFail(null);
    const r = await login(email.trim().toLowerCase(), pw);
    setBusy(false);
    if (r === 'confirm') go('code');
    else if (r) setFail(r);
    // success: the store moved to O10 (security)
    else go('security');
  };
  const onForgot = async () => {
    if (!isEmail(email)) { setErrE(t('O7.err.email')); return; }
    const f = await forgot(email.trim().toLowerCase());
    if (f) setFail(f);
    else toast.show({ text: t('O9.reset.sent', { email: email.trim() }) });
  };
  return (
    <FormFrame title={t('O9.title')} onBack={back}
      banner={!online ? <Banner kind="warning" text={t('offline.banner')} /> : fail ? <Banner kind={fail.key === 'rate' ? 'warning' : 'error'} text={failText(t, fail)} /> : undefined}
      footer={<>
        <Button variant="text" label={t('O9.forgot')} onPress={() => void onForgot()} disabled={!online} block />
        <Button label={t('O9.primary')} onPress={() => void submit()} loading={busy} disabled={!online || !email || !pw} />
      </>}>
      <View style={{ marginTop: 24, gap: 16 }}>
        <Input label={t('O7.email')} value={email} onChangeText={(v) => { setEmail(v); setErrE(null); }} error={errE}
          onBlur={() => setErrE(email && !isEmail(email) ? t('O7.err.email') : null)}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" autoCorrect={false} />
        <Input label={t('O7.password')} value={pw} onChangeText={setPw} password autoComplete="current-password" textContentType="password" />
      </View>
    </FormFrame>
  );
}
