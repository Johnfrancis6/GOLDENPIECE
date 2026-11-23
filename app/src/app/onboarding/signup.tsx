/** O7 Sign-up (B18 + C2): e-mail, password with eye and strength word,
 * "Déjà un compte ? Se connecter", primary pinned. Errors on blur/submit;
 * offline → C8 banner and primary disabled. */
import { useState } from 'react';
import { View } from 'react-native';
import { useApp, type Fail } from '../../state/app';
import { useT } from '../../i18n';
import { Banner, Button, Input } from '../../ui';
import { isEmail, passwordStrength } from '../../lib/security';
import { FormFrame, failText, go, useBack, useOnline, useStep } from '../../screens/frames';


export default function SignUp() {
  useStep('signup');
  const back = useBack('signup');
  const { signUp, st } = useApp();
  const t = useT();
  const online = useOnline();
  const [email, setEmail] = useState(st.email ?? '');
  const [pw, setPw] = useState('');
  const [errE, setErrE] = useState<string | null>(null);
  const [errP, setErrP] = useState<string | null>(null);
  const [fail, setFail] = useState<Fail | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = pw ? passwordStrength(pw) : null;
  const submit = async () => {
    const eBad = !isEmail(email), pBad = passwordStrength(pw) === 'weak';
    setErrE(eBad ? t('O7.err.email') : null);
    setErrP(pBad ? t('O7.err.password') : null);
    if (eBad || pBad) return;
    setBusy(true); setFail(null);
    const f = await signUp(email.trim().toLowerCase(), pw);
    setBusy(false);
    if (f?.key === 'exists') setErrE(t('O7.err.exists'));
    else if (f?.key === 'weak') setErrP(t('O7.err.password'));
    else if (f) setFail(f);
    else go('code');
  };
  return (
    <FormFrame step="signup" title={t('O7.title')} onBack={back}
      banner={!online ? <Banner kind="warning" text={t('offline.banner')} /> : fail ? <Banner kind="error" text={failText(t, fail)} /> : undefined}
      footer={<>
        <Button variant="text" label={t('O7.login')} onPress={() => go('login')} block />
        <Button label={t('O7.primary')} onPress={() => void submit()} loading={busy} disabled={!online || !email || !pw} />
      </>}>
      <View style={{ marginTop: 24, gap: 16 }}>
        <Input label={t('O7.email')} value={email} onChangeText={(v) => { setEmail(v); if (errE) setErrE(null); }}
          onBlur={() => setErrE(email && !isEmail(email) ? t('O7.err.email') : null)} error={errE}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" autoCorrect={false} />
        <Input label={t('O7.password')} value={pw} onChangeText={(v) => { setPw(v); if (errP) setErrP(null); }} password
          help={t('O7.password.help')} error={errP} strength={strength}
          strengthLabel={strength ? t(`O7.strength.${strength}`) : undefined}
          onBlur={() => setErrP(pw && passwordStrength(pw) === 'weak' ? t('O7.err.password') : null)}
          autoComplete="new-password" textContentType="newPassword" />
      </View>
    </FormFrame>
  );
}
