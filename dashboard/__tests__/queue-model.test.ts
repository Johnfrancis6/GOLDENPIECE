import { applyFilters, bandOf, DEFAULT_FILTERS, flat, groupItems, mergeFirstPage, neighbour } from '../src/queue/model';
import { history90 } from '../src/queue/history';
import { age, money, percent } from '../src/lib/format';
import { detail, item } from './fixtures';

const now = new Date('2026-11-24T06:00:00Z');
const items = [
  item({ alert_id: 'a1', created_at: '2026-11-24T05:56:00Z', score: 81, kind: 'fraud' }),
  item({ alert_id: 'a2', created_at: '2026-11-24T05:20:00Z', score: 62, band: 'ask', status: 'escalated' }),
  item({ alert_id: 'a3', created_at: '2026-11-24T04:00:00Z', score: 77, status: 'decided_legit',
    decided: { by: 'simulated', at: '2026-11-24T05:00:00Z', simulated: true, decision: 'legit' } }),
  item({ alert_id: 'a4', created_at: '2026-11-22T22:00:00Z', score: 92, status: 'decided_fraud', tx: { amount: { m: 1, c: 'XOF' }, op_type: 'p2p', cp_name: 'Awa K.' },
    decided: { by: '1a2b3c4d', at: '2026-11-22T23:00:00Z', simulated: false, decision: 'fraud' } }),
];

describe('queue model', () => {
  it('bands follow C15 (< 40, 40-70, > 70) and the server band when given', () => {
    expect([bandOf(39), bandOf(40), bandOf(70), bandOf(71)]).toEqual(['normal', 'ask', 'ask', 'bank']);
    expect(bandOf(30, 'bank')).toBe('bank');
  });

  it('groups: under review oldest first, decided today, decided earlier', () => {
    const g = groupItems(items, now);
    expect(g.map((x) => [x.key, x.items.map((i) => i.alert_id)])).toEqual([
      ['review', ['a2', 'a1']], ['decided', ['a3']], ['earlier', ['a4']],
    ]);
    expect(flat(g).map((i) => i.alert_id)).toEqual(['a2', 'a1', 'a3', 'a4']);
  });

  it('filters by status, score, type, 24 h and search (user, alert id, payee)', () => {
    const ids = (f: Partial<typeof DEFAULT_FILTERS>) => applyFilters(items, { ...DEFAULT_FILTERS, ...f }, now).map((i) => i.alert_id);
    expect(ids({ status: 'pending' })).toEqual(['a1', 'a2']);
    expect(ids({ status: 'decided' })).toEqual(['a3', 'a4']);
    expect(ids({ score: 'ask' })).toEqual(['a2']);
    expect(ids({ score: 'bank' })).toEqual(['a1', 'a3', 'a4']);
    expect(ids({ type: 'fraud' })).toEqual(['a1']);
    expect(ids({ last24h: true })).toEqual(['a1', 'a2', 'a3']);
    expect(ids({ q: 'awa' })).toEqual(['a4']);
    expect(ids({ q: 'A-a3' })).toEqual(['a3']);
    expect(ids({ q: 'U-b0435' })).toHaveLength(4);
  });

  it('J / K stay in bounds; merge keeps later pages', () => {
    const order = flat(groupItems(items, now));
    expect(neighbour(order, 'a2', -1)).toBe('a2');
    expect(neighbour(order, 'a4', 1)).toBe('a4');
    expect(neighbour(order, 'a1', 1)).toBe('a3');
    expect(neighbour(order, undefined, 1)).toBe('a2');
    const merged = mergeFirstPage([items[1], items[3]], [item({ alert_id: 'new', created_at: '2026-11-24T05:59:00Z' }), items[1]]);
    expect(merged.map((i) => i.alert_id)).toEqual(['new', 'a2', 'a4']);
  });
});

describe('90-day history', () => {
  it('sums debits per day, median of days with debits, largest debit before, payees', () => {
    const d = detail('x');
    const h = history90(d.history_90d, d.tx!.booking_ts, d.tx!.amount_minor);
    expect(h.days).toHaveLength(90);
    expect(h.days[89].current).toBe(true);
    expect(h.days[89].total).toBe(210000);
    expect(h.withDebits).toBe(3); // 02/10, 20/11 (12 000 + 8 000), 24/11
    expect(h.median).toBe(45000);
    expect(h.maxBefore).toBe(45000);
    expect(h.payees).toBe(3);
  });
});

describe('F6 formats', () => {
  it('amounts, percent, ages', () => {
    expect(money({ m: 210000, c: 'XOF' }, 'fr', { style: 'row', sign: -1 })).toBe('−210 000 F');
    expect(money({ m: 210000, c: 'XOF' }, 'fr', { style: 'code' })).toBe('210 000 XOF');
    expect(money({ m: 210000, c: 'XOF' }, 'en', { style: 'full' })).toBe('210,000 F CFA');
    expect(percent(0.0301, 'fr')).toBe('3 %');
    expect(age(4, '', 'fr')).toBe('4 min');
    expect(age(130, '', 'fr')).toBe('2 h');
    expect(age(3000, '2026-11-22T10:00:00Z', 'fr', now)).toBe('22 nov.');
  });
});
