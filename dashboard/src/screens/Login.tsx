import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useT } from '../i18n';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { CodeInput } from '../ui/CodeInput';
import { Banner } from '../ui/Banner';
import { BrandTile } from '../shell/BrandTile';

/**
 * Login + TOTP (delegated D item, composed from B18 form + C2 fields + C3
 * code boxes in a centred 400 card): password → first login enrols a TOTP
 * factor (QR) → challenge/verify → aal2.
 */
export function Login() {
  const { state, client, refresh, signOut } = useAuth();
  const t = useT();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/';
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);

  // A signed-in user without the analyst role is refused and signed out.
  useEffect(() => {
    if (state === 'notAnalyst') void signOut().then(() => setRefused(true));
  }, [state, signOut]);

  if (state === 'ok') return <Navigate to={from} replace />;

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand"><BrandTile /><span>{t('brand')}</span></div>
        {state === 'loading' ? null
          : state === 'enroll' ? <Enroll />
          : state === 'challenge' ? <Challenge />
          : <Password error={error ?? (refused ? t('login.err.role') : null)} setError={(e) => { setRefused(false); setError(e); }} onDone={refresh} client={client} />}
      </div>
    </main>
  );
}

function Password({ error, setError, onDone, client }:
  { error: string | null; setError: (e: string | null) => void; onDone: () => Promise<void>; client: ReturnType<typeof useAuth>['client'] }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError(err.status === 400 || err.code === 'invalid_credentials' ? t('login.err.invalid') : t('login.err.network'));
      else await onDone();
    } catch {
      setError(t('login.err.network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className="login-title">{t('login.title')}</h1>
      <p className="login-sub">{t('login.sub')}</p>
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Field label={t('login.email')} type="email" autoComplete="username" value={email} required
        onChange={(e) => setEmail(e.target.value)} autoFocus />
      <Field label={t('login.password')} type="password" autoComplete="current-password" value={password} required
        onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" busy={busy} disabled={!email || !password} className="btn-block">{t('login.submit')}</Button>
    </form>
  );
}

function useVerify(factorId: string | null) {
  const { client, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const [reset, setReset] = useState(0);
  async function verify(code: string) {
    if (!factorId) return;
    setBusy(true);
    setBad(false);
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) {
      setBad(true);
      setReset((n) => n + 1);
    } else {
      await refresh();
    }
  }
  return { busy, bad, reset, verify };
}

function Enroll() {
  const { client } = useAuth();
  const t = useT();
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const v = useVerify(factor?.id ?? null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      // An abandoned enrolment leaves an unverified factor: remove it first.
      const list = await client.auth.mfa.listFactors();
      for (const f of list.data?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') await client.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `GOLDENPIECE ${Date.now()}` });
      if (err || !data) setError(t('login.err.network'));
      else setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [client, t]);

  return (
    <div>
      <h1 className="login-title">{t('totp.enroll.title')}</h1>
      <p className="login-sub">{t('totp.enroll.sub')}</p>
      {error ? <Banner kind="error">{error}</Banner> : null}
      <div className="qr">{factor ? <img src={factor.qr} alt="" width={176} height={176} /> : <span className="qr-wait" />}</div>
      {factor ? <p className="secret">{t('totp.enroll.secret', { secret: factor.secret.replace(/(.{4})/g, '$1 ').trim() })}</p> : null}
      <CodeInput label={t('totp.code')} onComplete={v.verify} disabled={!factor || v.busy} error={v.bad} key={v.reset} />
      <p className="code-msg" role="alert">{v.bad ? t('totp.err') : ''}</p>
    </div>
  );
}

function Challenge() {
  const { client } = useAuth();
  const t = useT();
  const [factorId, setFactorId] = useState<string | null>(null);
  const v = useVerify(factorId);

  useEffect(() => {
    void client.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp.find((f) => f.status === 'verified')?.id ?? null));
  }, [client]);

  return (
    <div>
      <h1 className="login-title">{t('totp.challenge.title')}</h1>
      <p className="login-sub">{t('totp.challenge.sub')}</p>
      <CodeInput label={t('totp.code')} onComplete={v.verify} disabled={!factorId || v.busy} error={v.bad} key={v.reset} />
      <p className="code-msg" role="alert">{v.bad ? t('totp.err') : ''}</p>
    </div>
  );
}
