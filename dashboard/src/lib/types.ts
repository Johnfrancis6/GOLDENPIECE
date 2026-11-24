/** Payloads of the analyst RPCs (docs/API.md §2.12, shared/schemas/analyst_*.json). */
export type Money = { m: number; c: string };
export type Reason = { code: string; params: Record<string, unknown>; weight?: number };
export type AlertStatus = 'open' | 'awaiting_user' | 'confirmed_by_user' | 'escalated' | 'in_review'
  | 'decided_legit' | 'decided_fraud' | 'closed';
export type Band = 'ask' | 'bank' | 'info' | 'none' | null;

export type QueueItem = {
  alert_id: string;
  created_at: string;
  score: number;
  band: Band;
  kind: 'anomaly' | 'fraud';
  reasons: Reason[];
  user_ref: string;
  country: string | null;
  bank_id: string | null;
  status: AlertStatus;
  age_min: number;
  tx: { amount: Money; op_type: string | null; cp_name: string | null } | null;
  decided: { by: string; at: string; simulated: boolean; decision: 'legit' | 'fraud' } | null;
};
export type QueuePage = { items: QueueItem[]; next_cursor: string | null };

export type Tx = {
  id: string; booking_ts: string; value_date: string | null; amount_minor: number; currency: string;
  cdt_dbt_ind: 'DBIT' | 'CRDT'; btc_domain: string | null; btc_family: string | null; btc_subfamily: string | null;
  cp_name: string | null; cp_iban: string | null; cp_msisdn: string | null; category_id: string | null;
  end_to_end_id: string | null; acct_svcr_ref: string | null; tx_id: string | null;
  momo: { op_type?: string; operator?: string; agent_id?: string } | null;
};

export type AlertDetail = {
  alert: {
    id: string; band: Band; kind: 'anomaly' | 'fraud'; score: number; status: AlertStatus; bank_id: string | null;
    user_ref: string; created_at: string; escalated_at: string | null; answered_at: string | null;
    user_answer: 'yes' | 'no' | null; decision: { at: string; value: 'legit' | 'fraud' } | null;
    tx: { id: string; amount: Money; cp_name: string | null; op_type: string | null; booking_ts: string; category_id: string | null } | null;
  };
  score_breakdown: {
    a_thr: number; a_if: number; f: number; m: number; learning: boolean;
    rules: { code: string; weight?: number; value?: number }[]; bumps: { code: string; value: number }[];
    model_version: string | null; rules_version: string | null; params_version: number | null; latency_ms: number | null;
  };
  reasons: Reason[];
  features: Record<string, unknown>;
  user_events: { type: string; at: string; status?: string }[];
  tx: Tx | null;
  history_90d: { booking_ts: string; amount: Money; dc: 'DBIT' | 'CRDT'; cp_name: string | null; category_id: string | null; score: number | null }[];
  security_events_30d: { type: string; at: string; source: string }[];
  devices: { label: string | null; security_level: string; unlock_method: string; created_at: string; revoked_at: string | null }[];
  previous_decisions: { alert_id: string; created_at: string; decision: 'legit' | 'fraud'; simulated: boolean; at: string }[];
  user_answer: 'yes' | 'no' | null;
};

export function isPending(s: AlertStatus): boolean {
  return s === 'escalated' || s === 'in_review';
}
export function isDecided(s: AlertStatus): boolean {
  return s === 'decided_legit' || s === 'decided_fraud';
}
