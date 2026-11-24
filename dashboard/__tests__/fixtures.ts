import type { AlertDetail, QueueItem } from '../src/lib/types';

/** Shapes copied from dev `api.analyst_queue` / `api.analyst_alert` (2026-11-24), trimmed. */
export function item(over: Partial<QueueItem> & { alert_id: string }): QueueItem {
  return {
    created_at: '2026-11-24T05:50:00Z', score: 80, band: 'bank', kind: 'anomaly',
    reasons: [{ code: 'UNUSUAL_HOUR', params: { time: '23:41' }, weight: 100 }],
    user_ref: 'b0435c6a', country: 'CI', bank_id: 'banque_lagune', status: 'in_review', age_min: 4,
    tx: { amount: { m: 210000, c: 'XOF' }, op_type: 'card', cp_name: 'Électro Plus Sandaga' }, decided: null,
    ...over,
  };
}

export function detail(id: string, over: Partial<AlertDetail['alert']> = {}): AlertDetail {
  return {
    alert: {
      id, band: 'bank', kind: 'anomaly', score: 80, status: 'in_review', bank_id: 'banque_lagune', user_ref: 'b0435c6a',
      created_at: '2026-11-24T05:50:00Z', escalated_at: '2026-11-24T05:50:00Z', answered_at: null, user_answer: null, decision: null,
      tx: { id: 't1', amount: { m: 210000, c: 'XOF' }, cp_name: 'Électro Plus Sandaga', op_type: 'card', booking_ts: '2026-11-24T05:49:30Z', category_id: 'housing.equipment' },
      ...over,
    },
    score_breakdown: { a_thr: 0.7975, a_if: 0, f: 0, m: 1, learning: false, rules: [], bumps: [], model_version: '2026-11-23.1', rules_version: 'R1.1', params_version: 49, latency_ms: 342 },
    reasons: [
      { code: 'UNUSUAL_HOUR', params: { time: '23:41' }, weight: 100 },
      { code: 'AMOUNT_VS_CATEGORY', params: { x: 21, category: 'housing.equipment' }, weight: 100 },
      { code: 'NEW_PAYEE', params: {}, weight: 30 },
    ],
    features: { f8: 0.0301 },
    user_events: [{ at: '2026-11-24T05:50:04Z', type: 'notification_alerted', status: 'no_token' }],
    tx: {
      id: 't1', booking_ts: '2026-11-24T05:49:30Z', value_date: '2026-11-24', amount_minor: 210000, currency: 'XOF', cdt_dbt_ind: 'DBIT',
      btc_domain: 'PMNT', btc_family: 'CCRD', btc_subfamily: 'POSD', cp_name: 'Électro Plus Sandaga', cp_iban: null, cp_msisdn: null,
      category_id: 'housing.equipment', end_to_end_id: null, acct_svcr_ref: 'SIM45401D297358', tx_id: null, momo: null,
    },
    history_90d: [
      { booking_ts: '2026-11-24T05:49:30Z', amount: { m: 210000, c: 'XOF' }, dc: 'DBIT', cp_name: 'Électro Plus Sandaga', category_id: 'housing.equipment', score: 80 },
      { booking_ts: '2026-11-23T12:41:14Z', amount: { m: 5000, c: 'XOF' }, dc: 'CRDT', cp_name: 'Yao Diop', category_id: 'income.business', score: null },
      { booking_ts: '2026-11-20T10:00:00Z', amount: { m: 12000, c: 'XOF' }, dc: 'DBIT', cp_name: 'Marché Adjamé', category_id: 'groceries.market', score: 5 },
      { booking_ts: '2026-11-20T18:00:00Z', amount: { m: 8000, c: 'XOF' }, dc: 'DBIT', cp_name: 'Taxi', category_id: 'transport.taxi', score: 3 },
      { booking_ts: '2026-10-02T10:00:00Z', amount: { m: 45000, c: 'XOF' }, dc: 'DBIT', cp_name: 'Marché Adjamé', category_id: 'groceries.market', score: 9 },
    ],
    security_events_30d: [{ at: '2026-11-23T23:38:31Z', type: 'settings_changed', source: 'server' }],
    devices: [{ label: 'Tecno Spark 50', security_level: 'strong', unlock_method: 'biometric_strong', created_at: '2026-03-14T10:00:00Z', revoked_at: null }],
    previous_decisions: [],
    user_answer: null,
  };
}
