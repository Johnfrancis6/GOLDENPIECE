import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve as path } from 'node:path';
import { App } from '../src/App';
import type { Client } from '../src/lib/supabase';
import type { OpsDay, OpsMetrics, ParamChange, ScoringParams } from '../src/lib/types';
import { STRINGS } from '../src/i18n';

/** Signed-in analyst (aal2), in-memory scoring_params / reset_params / ops_* / legal_texts. */
function fakeClient(over: { params?: Partial<ScoringParams>; ops?: Partial<OpsMetrics>; series?: OpsDay[]; resetError?: boolean; anon?: boolean } = {}) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const jwt = `h.${Buffer.from(JSON.stringify({ aal: 'aal2', app_metadata: { role: 'analyst' } })).toString('base64url')}.s`;
  let params: ScoringParams = { ...scoring(), ...over.params };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: over.anon ? null : { access_token: jwt, user: { email: 'a@b.test', app_metadata: { role: 'analyst' }, user_metadata: { name: 'A. Koné' } } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      mfa: { listFactors: async () => ({ data: { all: [{ id: 'f1', status: 'verified' }], totp: [{ id: 'f1', status: 'verified' }] } }) },
    },
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      calls.push({ fn, args });
      if (fn === 'scoring_params') return { data: params, error: null };
      if (fn === 'reset_params') {
        if (over.resetError) return { data: null, error: { code: 'P0001', message: 'boom' } };
        params = { ...params, params: params.params.map((p) => ({ ...p, value: p.default })), user_overrides: 0 };
        return { data: { status: 'reset', global_params: 1, user_params: 14 }, error: null };
      }
      if (fn === 'ops_metrics') return { data: { ...ops(), ...over.ops }, error: null };
      if (fn === 'ops_series') return { data: over.series ?? series(), error: null };
      if (fn === 'legal_texts') return { data: legal(String(args.p_lang)), error: null };
      return { data: { items: [], next_cursor: null }, error: null };
    },
    realtime: { setAuth: async () => {} },
    channel: () => { const ch = { on: () => ch, subscribe: (cb: (s: string) => void) => { cb('SUBSCRIBED'); return ch; } }; return ch; },
    removeChannel: async () => {},
  };
  return { client: client as unknown as Client, calls };
}

const change = (i: number, o: Partial<ParamChange> = {}): ParamChange => ({
  id: 100 - i, key: 'z0', user_ref: `u${i}`, category: 'transfers.cash', before: 2.5, after: 2.25, cause: 'analyst_fraud',
  alert_id: `a${i}bcdef0-0000`, at: new Date(2026, 10, 23, 16, 5).toISOString(), by: 'bf2bd70f', simulated: false, ...o,
});

function scoring(): ScoringParams {
  const row = (key: string, value: number, def: number, min: number, max: number) => ({ key, value, default: def, min, max, version: 1, updated_at: new Date(2026, 10, 23, 6, 0).toISOString() });
  return {
    bands: { ask: 40, bank: 70 },
    params: [row('w:R4', 47, 50, 35, 65), row('z0', 2.5, 2.5, 2, 4), row('bump:new_device', 0.1, 0.1, 0, 0.2), row('z1', 4.5, 4.5, 4.5, 4.5)],
    user_overrides: 14,
    rules: [],
    rules_version: 1,
    model: { version: '2026-11-23.1', trained_at: '2026-11-23T18:35:06Z' },
    changes: [
      change(0, { key: 'w:R4', user_ref: null, category: null, before: 50, after: 47, cause: 'weekly_precision', alert_id: null, by: null }),
      change(1, { by: 'simulated', simulated: true }),
      ...Array.from({ length: 23 }, (_, i) => change(i + 2)),
    ],
  };
}

function ops(): OpsMetrics {
  return {
    as_of: new Date(2026, 10, 24, 6, 27).toISOString(),
    push_latency_ms_24h: { n: 26, p50: 653.27, p95: 3951.63 },
    ingest_to_alert_ms_24h: { n: 25, p50: 145.3, p95: 833.2 },
    score_latency_ms_24h: { n: 0, p50: null, p95: null },
    alerts_24h: { ask: 5, bank: 20, info: 35 },
    groq_backlog: 245, groq_uncategorised_all: 528,
    last_batch: { job: 'batch-nightly', status: 'failed', finished_at: new Date(2026, 10, 24, 2, 0).toISOString(), items: null },
    quotas_today: { coingecko: 39, twelvedata: 48 },
    model: { version: '2026-11-23.1', trained_at: '2026-11-23T18:35:06Z', train_rows: 703, parity_ok: true },
    model_eval: { run_at: '2026-11-23T18:36:49Z', precision_bank: 0.680851, recall_bank: 1, recall_ask_or_bank: 1, false_prompts_per_user_month: 1.20406 },
    funnel_7d: { demo_starts: 35, sign_ups: 1, answers: 2 },
  };
}

const series = (): OpsDay[] => Array.from({ length: 14 }, (_, i) => ({
  day: `2026-11-${String(11 + i).padStart(2, '0')}`, alerts: { info: i, ask: 1, bank: 2 },
  push_p95_ms: i < 10 ? null : 1000 + i * 300, score_p95_ms: 200,
}));

const legal = (lang: string) => [
  { kind: 'disclaimer', version: '0.1-draft', body_md: lang === 'fr' ? 'Données fictives, à titre de démonstration.' : 'Fictitious data, for demonstration.' },
  { kind: 'privacy', version: '0.1-draft', body_md: '# Confidentialité (brouillon)\n\nAucune donnée **réelle**.\n\n- un\n- deux' },
  { kind: 'terms', version: '0.1-draft', body_md: "# Conditions d'utilisation (brouillon)\n\nPrototype." },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('gp.lang', 'fr');
});

describe('Réglages du modèle (B9.4)', () => {
  it('lists the parameters in groups, marks a changed value, shows bounds / fixed and the model line', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App client={fakeClient().client} />);
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
      'Seuil de début z0 (montant)', 'Seuil plein z1 (montant)', 'Poids R4 · argent qui ne fait que passer', 'Bonus nouvel appareil']);
    const r4 = rows[2].querySelectorAll('td');
    expect([...r4].map((c) => c.textContent)).toEqual(['Règles', '47', '50', '35 – 65', '23/11 06:00']);
    expect(r4[1]).toHaveClass('chg');
    expect(rows[0].querySelectorAll('td')[1]).not.toHaveClass('chg');
    expect(rows[1].querySelectorAll('td')[3].textContent).toBe('fixe');
    expect(rows[3].querySelectorAll('td')[1].textContent).toBe('+0,10');
    expect(screen.getByText('Version du modèle : forêt d’isolement 2026-11-23.1 · règles v1')).toBeInTheDocument();
    expect(screen.getByText(/14 réglages propres à un utilisateur/)).toBeInTheDocument();
  });

  it('pages the change log by 20, newest first, with cause, alert, actor and date', async () => {
    window.history.pushState({}, '', '/settings');
    const u = userEvent.setup();
    render(<App client={fakeClient().client} />);
    const log = await screen.findByRole('list', { name: 'Journal des changements' });
    const items = within(log).getAllByRole('listitem');
    expect(items).toHaveLength(20);
    expect(items[0]).toHaveTextContent('Poids R4 : 50 → 47');
    expect(items[0]).toHaveTextContent('Lot hebdomadaire · précision des règles sur 28 jours · 23/11 16:05');
    expect(items[1]).toHaveTextContent('U-u1 · z0 Retrait : 2,5 → 2,25'.replace('Retrait', items[1].textContent!.split('z0 ')[1].split(' :')[0]));
    expect(items[1]).toHaveTextContent('Décision « fraude » · alerte A-a1bcdef0 · analyste simulé');
    expect(items[2]).toHaveTextContent('analyste A-bf2bd70f');
    expect(screen.getByText('1–20 sur 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Changements plus récents' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'Changements plus anciens' }));
    expect(within(screen.getByRole('list', { name: 'Journal des changements' })).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('21–25 sur 25')).toBeInTheDocument();
  });

  it('restores defaults through the C10 dialog: Esc cancels, Rétablir calls reset_params("all") and reloads', async () => {
    window.history.pushState({}, '', '/settings');
    const u = userEvent.setup();
    const f = fakeClient();
    render(<App client={f.client} />);
    await screen.findByRole('table');
    await u.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    const dlg = screen.getByRole('alertdialog', { name: 'Rétablir les valeurs par défaut ?' });
    expect(dlg).toHaveTextContent('Tous les paramètres reviennent à leur valeur de départ. Le journal est conservé.');
    expect(document.activeElement).toBe(within(dlg).getByRole('heading'));
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(f.calls.some((c) => c.fn === 'reset_params')).toBe(false);
    await u.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    await u.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Rétablir' }));
    await screen.findByText('Valeurs par défaut rétablies : 1 paramètres généraux, 14 réglages par utilisateur.');
    expect(f.calls.find((c) => c.fn === 'reset_params')?.args).toEqual({ p_scope: 'all' });
    await waitFor(() => expect(screen.getAllByRole('row')[3].querySelectorAll('td')[1]).not.toHaveClass('chg'));
    expect(f.calls.filter((c) => c.fn === 'scoring_params')).toHaveLength(2);
  });

  it('says so when the reset fails', async () => {
    window.history.pushState({}, '', '/settings');
    const u = userEvent.setup();
    render(<App client={fakeClient({ resetError: true }).client} />);
    await screen.findByRole('table');
    await u.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    await u.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Rétablir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Les valeurs n'ont pas été rétablies. Réessayez.");
  });
});

describe('Ops (B9.4)', () => {
  it('shows B7 tiles from ops_metrics, the insufficient state, a failed batch and the charts with text summaries', async () => {
    window.history.pushState({}, '', '/ops');
    const f = fakeClient();
    render(<App client={f.client} />);
    expect(await screen.findByText('Notification envoyée')).toBeInTheDocument();
    const tile = (label: string) => screen.getByText(label).closest('.tile') as HTMLElement;
    expect(tile('Notification envoyée')).toHaveTextContent('95 % sous 3,95 s');
    expect(tile('Notification envoyée')).toHaveTextContent('Médiane 653 ms · 26 envois · objectif 5 s');
    expect(tile('Calcul du score')).toHaveTextContent('Données insuffisantes');
    expect(within(tile('Dernier lot de nuit')).getByText('Échec')).toHaveClass('tag-loss');
    expect(tile('Crédits de marché du jour')).toHaveTextContent('87Twelve Data 48 · CoinGecko 39');
    expect(tile('Précision « Banque prévenue »')).toHaveTextContent('68 %Rappel 100 % · 1,2 fausse alerte');
    expect(tile('Modèle')).toHaveTextContent('Entraîné le 23/11/2026 sur 703 opérations · parité vérifiée');
    expect(screen.getByRole('img', { name: /Délai des notifications sur 4 jours, 95 % sous : de 4,00 s à 4,90 s, au plus 4,90 s\./ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Alertes des dernières 24 h : Information 35, Question à l’utilisateur 5, Banque prévenue 20.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Parcours sur 7 jours : Démos lancées 35, Inscriptions 1, Réponses aux alertes 2.' })).toBeInTheDocument();
    expect(f.calls.find((c) => c.fn === 'ops_series')?.args).toEqual({ p_days: 14 });
  });

  it('scrubs the line with the arrow keys (the card head shows the point) and shows the empty chart under 2 days', async () => {
    window.history.pushState({}, '', '/ops');
    const u = userEvent.setup();
    const { unmount } = render(<App client={fakeClient().client} />);
    const chart = await screen.findByRole('img', { name: /Délai des notifications/ });
    expect(chart.closest('.chart-card')?.querySelector('.chart-hero')).toHaveTextContent('4,90 s 24 nov.');
    chart.focus();
    await u.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(chart.closest('.chart-card')?.querySelector('.chart-hero')).toHaveTextContent('4,30 s 22 nov.');
    unmount();
    render(<App client={fakeClient({ series: series().map((d, i) => ({ ...d, push_p95_ms: i === 13 ? 900 : null })) }).client} />);
    expect(await screen.findByText('Moins de deux jours avec des notifications.')).toBeInTheDocument();
  });
});

describe('/legal (B9.4)', () => {
  it('is public and renders the texts of the current language with their version', async () => {
    window.history.pushState({}, '', '/legal');
    const f = fakeClient({ anon: true });
    render(<App client={f.client} />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
    expect(await screen.findByText('Données fictives, à titre de démonstration.')).toBeInTheDocument();
    const docs = screen.getAllByRole('article');
    expect(docs.map((d) => d.getAttribute('aria-label'))).toEqual(["Conditions d'utilisation", 'Confidentialité']);
    expect(within(docs[1]).getByRole('heading', { level: 2 })).toHaveTextContent('Confidentialité (brouillon)');
    expect(within(docs[1]).getByText('réelle').tagName).toBe('STRONG');
    expect(within(docs[1]).getAllByRole('listitem')).toHaveLength(2);
    expect(within(docs[0]).getByText('Version 0.1-draft')).toBeInTheDocument();
    expect(f.calls).toEqual([{ fn: 'legal_texts', args: { p_lang: 'fr' } }]);
    expect(window.location.pathname).toBe('/legal');
  });
});

describe('B9.4 copy', () => {
  it('uses the D §4 / §7 settings copy verbatim (columns, log, dialog)', () => {
    const d = readFileSync(path(__dirname, '../../design/screens/d-bank-dashboard.md'), 'utf8').replace(/\s+/g, ' ');
    for (const l of ['fr', 'en'] as const) {
      const s = STRINGS[l];
      expect(d).toContain(['param', 'group', 'value', 'default', 'bounds', 'changed'].map((k) => s[`settings.col.${k}` as keyof typeof s]).join(' · '));
      expect(d).toContain(s['settings.log']);
    }
    for (const k of ['settings.dialog.title', 'settings.dialog.body'] as const) expect(d).toContain(STRINGS.fr[k]);
    expect(d).toContain(`${STRINGS.fr['settings.dialog.cancel']} · ${STRINGS.fr['settings.dialog.confirm']}`);
  });
});
