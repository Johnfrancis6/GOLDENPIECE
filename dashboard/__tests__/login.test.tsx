import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import type { Client } from '../src/lib/supabase';

/** In-memory stand-in for the Supabase auth API (password, TOTP enrol/challenge, aal). */
function fakeClient(opts: { role?: string; factor?: boolean; password?: string; code?: string } = {}) {
  const role = opts.role ?? 'analyst';
  const state = { signedIn: false, aal: 'aal1', factor: opts.factor ? 'verified' : null as null | 'unverified' | 'verified' };
  const listeners: ((e: string) => void)[] = [];
  const jwt = () => `h.${Buffer.from(JSON.stringify({ aal: state.aal, app_metadata: { role } })).toString('base64url')}.s`;
  const session = () => (state.signedIn ? { access_token: jwt(), user: { email: 'a.kone@bank.test', app_metadata: { role }, user_metadata: {} } } : null);
  const emit = (e: string) => listeners.forEach((l) => l(e));
  const calls: string[] = [];
  const factors = () => (state.factor ? [{ id: 'f1', factor_type: 'totp', status: state.factor }] : []);
  const client = {
    auth: {
      getSession: async () => ({ data: { session: session() } }),
      onAuthStateChange: (cb: (e: string) => void) => { listeners.push(cb); return { data: { subscription: { unsubscribe: () => {} } } }; },
      signInWithPassword: async ({ password }: { password: string }) => {
        calls.push('signIn');
        if (password !== (opts.password ?? 'correct horse')) return { error: { status: 400, code: 'invalid_credentials' } };
        state.signedIn = true; emit('SIGNED_IN'); return { error: null };
      },
      signOut: async () => { calls.push('signOut'); state.signedIn = false; state.aal = 'aal1'; emit('SIGNED_OUT'); return { error: null }; },
      mfa: {
        listFactors: async () => ({ data: { all: factors(), totp: factors().filter((f) => f.status === 'verified') } }),
        unenroll: async () => { calls.push('unenroll'); state.factor = null; return { error: null }; },
        enroll: async () => { calls.push('enroll'); state.factor = 'unverified'; return { data: { id: 'f1', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'JBSWY3DPEHPK3PXP' } }, error: null }; },
        challengeAndVerify: async ({ code }: { code: string }) => {
          calls.push(`verify:${code}`);
          if (code !== (opts.code ?? '123456')) return { error: { message: 'invalid' } };
          state.factor = 'verified'; state.aal = 'aal2'; emit('MFA_CHALLENGE_VERIFIED'); return { error: null };
        },
      },
    },
    channel: () => { const ch = { on: () => ch, subscribe: (cb: (s: string) => void) => { cb('SUBSCRIBED'); return ch; } }; return ch; },
    rpc: async () => ({ data: { items: [], next_cursor: null }, error: null }),
    removeChannel: async () => {},
  };
  return { client: client as unknown as Client, calls, state };
}

async function signIn(password = 'correct horse') {
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText('E-mail'), 'a.kone@bank.test');
  await u.type(screen.getByLabelText('Mot de passe'), password);
  await u.click(screen.getByRole('button', { name: 'Se connecter' }));
  return u;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gp.lang', 'fr');
  window.history.pushState({}, '', '/settings');
});

describe('login + TOTP', () => {
  it('redirects a visitor from a tab to the login card', async () => {
    render(<App client={fakeClient().client} />);
    expect(await screen.findByRole('heading', { name: 'Espace analyste' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('shows the error for a wrong password', async () => {
    render(<App client={fakeClient().client} />);
    await signIn('nope');
    expect(await screen.findByText('E-mail ou mot de passe incorrect.')).toBeInTheDocument();
  });

  it('enrols TOTP on first login (QR + key), verifies, then opens the requested tab', async () => {
    const f = fakeClient();
    render(<App client={f.client} />);
    const u = await signIn();
    expect(await screen.findByRole('heading', { name: 'Activez la double vérification' })).toBeInTheDocument();
    expect(await screen.findByText(/JBSW Y3DP EHPK 3PXP/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Code à 6 chiffres'), '111111');
    expect(await screen.findByText(/Code incorrect/)).toBeInTheDocument();
    await u.type(screen.getByLabelText('Code à 6 chiffres'), '123456');
    expect(await screen.findByRole('heading', { name: 'Réglages du modèle' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/settings');
    expect(f.calls).toEqual(['signIn', 'enroll', 'verify:111111', 'verify:123456']);
    // Top bar: tabs, live state, analyst name and initials
    expect(screen.getByRole('link', { name: "File d'alertes" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Réglages du modèle' })).toHaveClass('active');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('En direct'));
    expect(screen.getByText('A. Kone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu du compte' })).toHaveTextContent('AK');
  });

  it('asks only the code when a factor already exists', async () => {
    const f = fakeClient({ factor: true });
    render(<App client={f.client} />);
    const u = await signIn();
    expect(await screen.findByRole('heading', { name: 'Code de vérification' })).toBeInTheDocument();
    await u.type(screen.getByLabelText('Code à 6 chiffres'), '123456');
    expect(await screen.findByRole('heading', { name: 'Réglages du modèle' })).toBeInTheDocument();
    expect(f.calls).not.toContain('enroll');
  });

  it('refuses and signs out an account without the analyst role', async () => {
    const f = fakeClient({ role: 'user', factor: true });
    render(<App client={f.client} />);
    await signIn();
    expect(await screen.findByText("Ce compte n'a pas accès à l'espace analyste.")).toBeInTheDocument();
    await waitFor(() => expect(f.calls).toContain('signOut'));
    expect(f.state.signedIn).toBe(false);
  });

  it('signs out from the account menu, switches theme and language', async () => {
    const f = fakeClient({ factor: true });
    render(<App client={f.client} />);
    const u = await signIn();
    await u.type(await screen.findByLabelText('Code à 6 chiffres'), '123456');
    await u.click(await screen.findByRole('button', { name: 'Menu du compte' }));
    await u.click(screen.getByRole('menuitem', { name: 'Thème sombre' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await u.click(screen.getByRole('button', { name: 'Menu du compte' }));
    await u.click(screen.getByRole('menuitem', { name: 'English' }));
    expect(await screen.findByRole('link', { name: 'Alert queue' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Account menu' }));
    await act(async () => { await u.click(screen.getByRole('menuitem', { name: 'Sign out' })); });
    expect(await screen.findByRole('heading', { name: 'Analyst workspace' })).toBeInTheDocument();
  });
});
