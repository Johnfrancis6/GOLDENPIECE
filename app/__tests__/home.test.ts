import { badgeKey, cards, freshness, hasAccounts, rootCategory, strip, tiles, OLD_AFTER_MS, STALE_AFTER_MS } from '../src/lib/home';
import { QUESTIONS, SECTIONS, riskProfile, sectionAnswers } from '../src/lib/questionnaire';
import tour from '../src/data/tour.json';
import type { Home } from '../src/lib/api';
import { STRINGS } from '../src/i18n';

const home = tour.home as unknown as Home;

describe('Home view model (S2 v2)', () => {
  test('carousel: net-worth card first, then one per account', () => {
    const c = cards(home);
    expect(c[0]).toMatchObject({ kind: 'networth', net: home.networth.net, accounts: 3, positions: 2, dayAbs: 12300 });
    expect(c.slice(1).map((x) => x.kind)).toEqual(['account', 'account', 'account']);
    const many = { ...home, accounts: Array.from({ length: 12 }, (_, i) => ({ ...home.accounts[0], id: String(i) })) };
    expect(cards(many)).toHaveLength(8); // ≤ 8 cards (S2 §5)
  });

  test('strip: learning card while scoring is not active, else alerts', () => {
    expect(strip({ ...home, learning: { active: false, days: 12, ops: 40 } })).toEqual({ kind: 'learning', days: 12, ops: 40 });
    expect(strip(home)).toEqual({ kind: 'confirm', alertId: home.alerts.top!.id });
    const bank = { ...home, alerts: { ...home.alerts, top: { ...home.alerts.top!, band: 'bank' } } };
    expect(strip(bank)?.kind).toBe('notified');
    expect(strip({ ...home, alerts: { ...home.alerts, open_count: 3 } })).toEqual({ kind: 'many', count: 3 });
    expect(strip({ ...home, alerts: { open_count: 0, to_confirm_count: 0, top: null } })).toBeNull();
  });

  test('tiles: top mover and biggest category, empty variants', () => {
    const t = tiles(home);
    expect(t.best?.name).toBe('Bitcoin');
    expect(t.top).toEqual({ categoryId: 'housing', spent: 265000, share: 0.5742 });
    const none = tiles({ ...home, top_mover: null, top_category: null });
    expect(none).toEqual({ best: null, top: null });
  });

  test('categories map to their C21 badge by the parent French name', () => {
    expect(rootCategory('transport.taxi')?.id).toBe('transport');
    expect(badgeKey('transport.taxi')).toBe('Transport');
    expect(badgeKey('housing')).toBe('Logement');
    expect(badgeKey(null)).toBe('Autres');
    expect(badgeKey('nope')).toBe('Autres');
  });

  test('no account → empty state', () => {
    expect(hasAccounts(home)).toBe(true);
    expect(hasAccounts({ ...home, accounts: [], counts: { accounts: 0, positions: 0 } })).toBe(false);
  });

  test('freshness banner rules', () => {
    const now = 1_000_000_000_000;
    expect(freshness({ fetchedAt: now - 1000, online: true, failed: false, now })).toBe('fresh');
    expect(freshness({ fetchedAt: now - 1000, online: false, failed: false, now })).toBe('offline');
    expect(freshness({ fetchedAt: now - 1000, online: true, failed: true, now })).toBe('error');
    expect(freshness({ fetchedAt: now - STALE_AFTER_MS - 1, online: true, failed: false, now })).toBe('stale');
    expect(freshness({ fetchedAt: now - OLD_AFTER_MS - 1, online: false, failed: false, now })).toBe('old');
    expect(freshness({ fetchedAt: null, online: true, failed: false, now })).toBe('fresh');
  });
});

describe('O14 questionnaire', () => {
  test('4 sections, every question has FR/EN and ≥ 2 options', () => {
    expect(new Set(QUESTIONS.map((q) => q.section))).toEqual(new Set(SECTIONS));
    for (const q of QUESTIONS) {
      expect(q.title.fr && q.title.en).toBeTruthy();
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });
  test('risk answers r1..r5 are numbers 1-5 (server computes the profile)', () => {
    const risk = QUESTIONS.filter((q) => q.section === 'risk');
    expect(risk.map((q) => q.key)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    for (const q of risk) for (const o of q.options) expect(o.value).toEqual(expect.any(Number));
    expect(riskProfile({ r1: 1, r2: 2, r3: 3, r4: 4, r5: 5 })).toBe(3);
    expect(riskProfile({ r1: 5, r2: 5 })).toBeNull();
  });
  test('a save sends only the section answers so far', () => {
    expect(sectionAnswers({ monthly_income: 'gt_1m', r1: 4, main_goal: 'grow' }, 'income')).toEqual({ monthly_income: 'gt_1m' });
  });
});

describe('i18n for B6.4', () => {
  test('every FR key has an EN text', () => {
    const missing = Object.keys(STRINGS.fr).filter((k) => !(k in STRINGS.en));
    expect(missing).toEqual([]);
  });
});
