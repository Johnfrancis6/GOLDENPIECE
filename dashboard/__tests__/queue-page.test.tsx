import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/App';
import type { Client } from '../src/lib/supabase';
import type { AlertDetail, QueueItem } from '../src/lib/types';
import { detail, item } from './fixtures';

type Change = { eventType: 'INSERT' | 'UPDATE'; new: { id: string; status: string }; old: Record<string, never> };

/** Signed-in analyst (aal2) with in-memory analyst RPCs and a controllable Realtime channel. */
function fakeClient(queue: QueueItem[], details: Record<string, AlertDetail> = {}) {
  const state = { aal: 'aal2', queue, details, rpcCalls: [] as string[], forbidden: false, order: [] as string[],
    decides: [] as Record<string, unknown>[], decideError: false };
  let onChange: ((p: Change) => void) | null = null;
  let onStatus: ((s: string) => void) | null = null;
  const listeners: ((e: string) => void)[] = [];
  const jwt = () => `h.${Buffer.from(JSON.stringify({ aal: state.aal, app_metadata: { role: 'analyst' } })).toString('base64url')}.s`;
  const client = {
    auth: {
      getSession: async () => ({ data: { session: { access_token: jwt(), user: { email: 'a.kone@bank.test', app_metadata: { role: 'analyst' }, user_metadata: { name: 'A. Koné' } } } } }),
      onAuthStateChange: (cb: (e: string) => void) => { listeners.push(cb); return { data: { subscription: { unsubscribe: () => {} } } }; },
      signOut: async () => ({ error: null }),
      mfa: { listFactors: async () => ({ data: { all: [{ id: 'f1', status: 'verified' }], totp: [{ id: 'f1', status: 'verified' }] } }) },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcCalls.push(fn === 'analyst_alert' ? `alert:${String(args.p_alert_id)}` : fn);
      if (state.forbidden) return { data: null, error: { code: 'P0001', message: 'FORBIDDEN analyst.required' } };
      if (fn === 'analyst_queue') return { data: { items: state.queue, next_cursor: null }, error: null };
      if (fn === 'analyst_decide') {
        state.decides.push(args);
        if (state.decideError) return { data: null, error: { code: 'P0001', message: 'REJECTED alert.not_decidable' } };
        return { data: { status: `decided_${String(args.p_decision)}`, param_changes: [] }, error: null };
      }
      const d = state.details[String(args.p_alert_id)] ?? detail(String(args.p_alert_id));
      return { data: d, error: null };
    },
    realtime: { setAuth: async (tok?: string) => { state.order.push(`setAuth:${tok ? JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).aal : 'none'}`); } },
    channel: () => {
      state.order.push('channel');
      const ch = {
        on: (_t: string, _f: unknown, cb: (p: Change) => void) => { onChange = cb; return ch; },
        subscribe: (cb: (s: string) => void) => { onStatus = cb; cb('SUBSCRIBED'); return ch; },
      };
      return ch;
    },
    removeChannel: async () => {},
  };
  return {
    client: client as unknown as Client,
    state,
    emit: (p: Change) => act(() => { onChange?.(p); }),
    status: (s: string) => act(() => { onStatus?.(s); }),
    authEvent: (e: string) => act(() => { listeners.forEach((l) => l(e)); }),
  };
}

const q = () => [
  item({ alert_id: 'aaaaaaaa-1', created_at: new Date(Date.now() - 4 * 60000).toISOString(), age_min: 4, score: 81, kind: 'fraud' }),
  item({ alert_id: 'bbbbbbbb-2', created_at: new Date(Date.now() - 38 * 60000).toISOString(), age_min: 38, score: 62, band: 'ask', status: 'escalated',
    reasons: [{ code: 'NEW_PAYEE', params: {}, weight: 60 }] }),
  item({ alert_id: 'cccccccc-3', created_at: new Date(Date.now() - 120 * 60000).toISOString(), age_min: 120, status: 'decided_legit',
    decided: { by: 'simulated', at: new Date().toISOString(), simulated: true, decision: 'legit' } }),
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gp.lang', 'fr');
  window.history.pushState({}, '', '/');
  document.title = 'GOLDENPIECE';
});

describe('queue + detail', () => {
  it('lists groups, opens the longest-waiting alert and shows the detail sections', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    const list = await screen.findByRole('listbox', { name: 'Alertes' });
    expect(within(list).getByText('En analyse · 2')).toBeInTheDocument();
    expect(within(list).getByText("Décidées aujourd'hui")).toBeInTheDocument();
    expect(within(list).getByText('Décision simulée')).toBeInTheDocument();
    expect(within(list).getByText('Nouveau bénéficiaire')).toBeInTheDocument();
    // oldest under review first → bbbbbbbb opened
    expect(await screen.findByRole('heading', { level: 1, name: 'Paiement carte chez Électro Plus Sandaga' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/alerts/bbbbbbbb-2');
    expect(screen.getByRole('option', { selected: true })).toHaveAttribute('id', 'row-bbbbbbbb-2');
    for (const s of ['Opération', 'Pourquoi', 'Score', "Réponse de l'utilisateur", '90 derniers jours', 'Événements de sécurité', 'Appareils']) {
      expect(screen.getByRole('heading', { level: 3, name: s })).toBeInTheDocument();
    }
    expect(screen.getByText("Opération à 23:41, une heure où l'utilisateur fait rarement des opérations")).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
    expect(screen.getByText('Électro Plus Sandaga · nouvelle')).toBeInTheDocument();
    expect(screen.getByText('Réglages modifiés')).toBeInTheDocument();
    expect(screen.getByText(/Tecno Spark 50 · empreinte ou visage/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /jours avec débits sur 90/ })).toBeInTheDocument();
    expect(screen.getByText('Pas de réponse')).toBeInTheDocument();
  });

  it('J / K move through the queue; shortcuts are off while typing; "/" opens search', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    const u = userEvent.setup();
    await u.keyboard('j');
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/aaaaaaaa-1'));
    await u.keyboard('k');
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/bbbbbbbb-2'));
    await u.keyboard('/');
    const search = await screen.findByRole('searchbox', { name: 'Rechercher dans la file' });
    await waitFor(() => expect(search).toHaveFocus());
    await u.keyboard('j');
    expect(window.location.pathname).toBe('/alerts/bbbbbbbb-2');
    expect(search).toHaveValue('j');
    await u.clear(search);
    await u.type(search, 'U-zzzz');
    expect(screen.getByText('Aucune alerte pour ces filtres.')).toBeInTheDocument();
  });

  it('filter chips narrow the list', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Statut' }));
    await u.click(screen.getByRole('menuitemradio', { name: 'Décidées' }));
    expect(screen.queryByText('En analyse · 2')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Statut : Décidées' })).toHaveClass('on');
  });

  it('a new alert arrives by Realtime: row fades in, title count while the window is unfocused', async () => {
    const f = fakeClient(q());
    const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    f.state.queue = [item({ alert_id: 'dddddddd-4', created_at: new Date().toISOString(), age_min: 0, status: 'escalated' }), ...f.state.queue];
    f.emit({ eventType: 'INSERT', new: { id: 'dddddddd-4', status: 'escalated' }, old: {} });
    const row = await screen.findByRole('option', { name: /À l’instant/ }, { timeout: 2000 });
    expect(row).toHaveClass('fresh');
    expect(screen.getByText('En analyse · 3')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('(1) GOLDENPIECE'));
    focus.mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(document.title).toBe('GOLDENPIECE');
    focus.mockRestore();
  });

  it('decided by another analyst: banner + outcome instead of the decision bar', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    const at = new Date('2026-11-24T05:58:00').toISOString();
    f.state.details['bbbbbbbb-2'] = detail('bbbbbbbb-2', { status: 'decided_fraud', decision: { at, value: 'fraud' } });
    f.state.queue = f.state.queue.map((i) => i.alert_id === 'bbbbbbbb-2'
      ? { ...i, status: 'decided_fraud', decided: { by: '1a2b3c4d', at, simulated: false, decision: 'fraud' } } : i);
    f.emit({ eventType: 'UPDATE', new: { id: 'bbbbbbbb-2', status: 'decided_fraud' }, old: {} });
    expect(await screen.findByText("Décidée par l'analyste A-1a2b3c4d à 05:58", {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('Décision : Fraude')).toBeInTheDocument();
  });

  it('Realtime lost: "Hors ligne" and the detail warns that decisions are off', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('En direct')).toBeInTheDocument();
    f.status('CHANNEL_ERROR');
    expect(screen.getAllByText('Hors ligne').length).toBeGreaterThan(0);
    expect(screen.getByText(/les décisions sont désactivées/)).toBeInTheDocument();
  });

  it('Realtime gets the aal2 token before the channel joins (supabase-js skips MFA_CHALLENGE_VERIFIED)', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    const i = f.state.order.indexOf('channel');
    expect(i).toBeGreaterThan(0);
    expect(f.state.order.slice(0, i)).toContain('setAuth:aal2');
  });

  it('empty queue shows the C19 state', async () => {
    const f = fakeClient([]);
    render(<App client={f.client} />);
    expect(await screen.findByText('Aucune alerte en analyse')).toBeInTheDocument();
    expect(screen.getByText('Les nouvelles alertes arrivent ici en direct.')).toBeInTheDocument();
  });

  it('session drops to aal1: the next RPC refusal sends the analyst to login + TOTP', async () => {
    const f = fakeClient(q());
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1 });
    f.state.aal = 'aal1';
    f.state.forbidden = true;
    f.emit({ eventType: 'INSERT', new: { id: 'eeeeeeee-5', status: 'escalated' }, old: {} });
    expect(await screen.findByRole('heading', { name: 'Code de vérification' }, { timeout: 2000 })).toBeInTheDocument();
  });
});

describe('decision (B9.3)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const setup = async (queue = q()) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const f = fakeClient(queue);
    render(<App client={f.client} />);
    await screen.findByRole('heading', { level: 1, name: 'Paiement carte chez Électro Plus Sandaga' });
    await waitFor(() => expect(screen.getByRole('button', { name: /Légitime/ })).toBeEnabled());
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    return { f, u };
  };

  it('L: toast with Annuler, next alert opens, the RPC leaves only when the toast closes (8 s)', async () => {
    const { f, u } = await setup();
    expect(screen.getByRole('group', { name: 'Décision' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ajouter un commentaire (obligatoire pour « Fraude »)…')).toBeInTheDocument();
    await u.keyboard('l');
    expect(await screen.findByText('Décision enregistrée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/aaaaaaaa-1'));
    expect(screen.getByText('En analyse · 1')).toBeInTheDocument();
    expect(f.state.decides).toEqual([]);
    await act(async () => { vi.advanceTimersByTime(7900); });
    expect(f.state.decides).toEqual([]);
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(f.state.decides).toEqual([{ p_alert_id: 'bbbbbbbb-2', p_decision: 'legit', p_comment: null }]);
    await waitFor(() => expect(screen.queryByText('Décision enregistrée')).not.toBeInTheDocument());
  });

  it('F without a comment focuses the comment; Enter confirms; Annuler sends nothing and goes back', async () => {
    const { f, u } = await setup();
    await u.keyboard('f');
    const box = screen.getByRole('textbox', { name: 'Commentaire' });
    expect(box).toHaveFocus();
    expect(screen.getByText(/Ajoutez un commentaire pour décider « Fraude »/)).toBeInTheDocument();
    expect(screen.queryByText('Décision enregistrée')).not.toBeInTheDocument();
    await u.type(box, 'Bénéficiaire signalé{Enter}');
    expect(await screen.findByText('Décision enregistrée')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/aaaaaaaa-1'));
    await u.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/bbbbbbbb-2'));
    expect(screen.getByText('En analyse · 2')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(9000); });
    expect(f.state.decides).toEqual([]);
  });

  it('Fraude button with a comment; a second decision sends the first at once', async () => {
    const { f, u } = await setup();
    await u.type(screen.getByRole('textbox', { name: 'Commentaire' }), 'Usurpation');
    // typing "l" / "f" in the comment never decides
    expect(screen.queryByText('Décision enregistrée')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Fraude/ }));
    await waitFor(() => expect(window.location.pathname).toBe('/alerts/aaaaaaaa-1'));
    await screen.findByRole('group', { name: 'Décision' });
    await u.keyboard('l');
    await waitFor(() => expect(f.state.decides).toEqual([{ p_alert_id: 'bbbbbbbb-2', p_decision: 'fraud', p_comment: 'Usurpation' }]));
    await act(async () => { vi.advanceTimersByTime(8100); });
    expect(f.state.decides[1]).toEqual({ p_alert_id: 'aaaaaaaa-1', p_decision: 'legit', p_comment: null });
  });

  it('a refused decision is reported and the alert returns under review', async () => {
    const { f, u } = await setup();
    f.state.decideError = true;
    await u.keyboard('l');
    await act(async () => { vi.advanceTimersByTime(8100); });
    expect(await screen.findByText('Décision non enregistrée. Réessayez.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('En analyse · 2')).toBeInTheDocument());
  });

  it('offline: decision buttons and keys are off', async () => {
    const { f, u } = await setup();
    f.status('CHANNEL_ERROR');
    expect(screen.getByRole('button', { name: /Légitime/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Fraude/ })).toBeDisabled();
    await u.keyboard('l');
    expect(screen.queryByText('Décision enregistrée')).not.toBeInTheDocument();
  });

  it('"?" opens the shortcut sheet, Esc closes it; C focuses the comment', async () => {
    const { u } = await setup();
    await u.keyboard('?');
    expect(screen.getByRole('dialog', { name: 'Raccourcis clavier' })).toBeInTheDocument();
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await u.keyboard('c');
    const box = screen.getByRole('textbox', { name: 'Commentaire' });
    expect(box).toHaveFocus();
    expect(box).toHaveValue('');
    await u.keyboard('{Escape}');
    expect(box).not.toHaveFocus();
  });
});
