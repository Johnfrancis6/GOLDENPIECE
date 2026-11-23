-- B1: operations (ops) and batch outputs (analytics). DATA_MODEL.md §2.6, §2.7, §2.9.

-- ── ops ─────────────────────────────────────────────────────────────────
create table ops.app_config (
  key text primary key,
  value jsonb not null
);

create table ops.job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','ok','failed','skipped')),
  items int,
  detail jsonb,
  error text
);
create index on ops.job_runs (job, started_at desc);

create table ops.audit_log (                          -- append-only (ARCHITECTURE §9.5)
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_role text not null,
  action text not null,
  target text,
  detail jsonb
);
create index on ops.audit_log (at desc);

create table ops.rate_limits (
  key text primary key,
  tokens real not null,
  refreshed_at timestamptz not null
);

create table ops.idempotency (
  client_id uuid primary key,
  user_id uuid not null,
  rpc text not null,
  result jsonb not null,
  at timestamptz not null default now()
);
create index on ops.idempotency (at);

create table ops.recompute_queue (
  user_id uuid primary key,
  reason text,
  requested_at timestamptz not null default now()
);

create table ops.push_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  alert_id uuid,
  kind text,
  ticket_id text,
  status text,
  sent_at timestamptz not null default now()
);
create index on ops.push_log (sent_at);

create table ops.scoring_params (
  key text not null,
  scope text not null check (scope in ('global','user_category')),
  user_id uuid references core.profiles on delete cascade,
  category_id text,
  value real not null,
  default_value real not null,
  min_value real not null,
  max_value real not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (key, scope, user_id, category_id),
  check (min_value <= value and value <= max_value)
);

create table ops.param_changes (
  id bigint generated always as identity primary key,
  param_key text not null,
  user_id uuid,
  category_id text,
  before real not null,
  after real not null,
  cause text not null check (cause in ('user_me','analyst_legit','analyst_fraud','weekly_precision','reset')),
  alert_id uuid,
  actor uuid,
  at timestamptz not null default now()
);

create table ops.model_artifacts (
  version text primary key,
  kind text not null check (kind = 'iforest'),
  storage_path text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  features text[] not null,
  trained_at timestamptz not null,
  train_rows int not null,
  status text not null check (status in ('candidate','active','retired')),
  parity_ok boolean not null,
  eval jsonb
);
create unique index model_artifacts_one_active on ops.model_artifacts (kind) where status = 'active';

create table ops.model_eval (                         -- G7
  id bigint generated always as identity primary key,
  model_version text,
  rules_version text,
  run_at timestamptz not null,
  precision_bank real, recall_bank real, recall_ask_or_bank real,
  false_prompts_per_user_month real,
  details jsonb
);

-- ── analytics ───────────────────────────────────────────────────────────
create table analytics.behaviour_profiles (
  user_id uuid not null references core.profiles on delete cascade,
  dim text not null check (dim in ('user','category','payee','hour','weekday')),
  key text not null,
  n int not null,
  median_ln_amount real, mad_ln_amount real, p95_amount_minor bigint, share real,
  p95_hourly_count real, p95_daily_outflow_minor bigint,
  first_seen timestamptz, last_seen timestamptz,
  computed_at timestamptz not null,
  primary key (user_id, dim, key)
);

create table analytics.learning_status (
  user_id uuid primary key references core.profiles on delete cascade,
  first_op_at timestamptz,
  ops_count int not null,
  days int not null,
  active boolean not null,
  computed_at timestamptz not null
);

create table analytics.portfolio_daily (
  user_id uuid not null references core.profiles on delete cascade,
  d date not null,
  instrument_id text not null,                        -- also 'CASH:XOF', 'RE:<uuid>'
  qty numeric(28,10) not null,
  price_local numeric(20,8),
  value_local_minor bigint not null,
  value_ref_minor bigint not null,
  flow_ref_minor bigint not null default 0,
  primary key (user_id, d, instrument_id)
);

create table analytics.networth_daily (
  user_id uuid not null references core.profiles on delete cascade,
  d date not null,
  ref_currency char(3) not null,
  assets_minor bigint not null,
  liabilities_minor bigint not null,
  net_minor bigint not null,
  by_class jsonb not null,
  primary key (user_id, d)
);

create table analytics.risk_metrics (
  user_id uuid not null references core.profiles on delete cascade,
  as_of date not null,
  metric text not null check (metric in ('vol_ann','beta','var95_1d','cvar95_1d','var95_1m','cvar95_1m','var95_1m_hist','max_drawdown')),
  scope text not null default 'portfolio',
  value numeric(20,8),
  value_ref_minor bigint,
  n_obs int not null,
  method text not null,
  status text not null check (status in ('ok','insufficient','excluded')),
  primary key (user_id, as_of, metric, scope)
);

create table analytics.drawdown_series (
  user_id uuid not null references core.profiles on delete cascade,
  d date not null,
  drawdown real not null,
  primary key (user_id, d)
);

create table analytics.exposures (
  user_id uuid not null references core.profiles on delete cascade,
  as_of date not null,
  axis text not null check (axis in ('class','currency','country','sector')),
  key text not null,
  value_ref_minor bigint not null,
  share real not null,
  primary key (user_id, as_of, axis, key)
);

create table analytics.performance (
  user_id uuid not null references core.profiles on delete cascade,
  period text not null check (period in ('1M','YTD','1Y','ITD')),
  as_of date not null,
  start_d date not null,
  twr real, irr real,
  annualised boolean not null,
  pnl_ref_minor bigint,
  status text not null,
  primary key (user_id, period, as_of)
);

create table analytics.attribution (
  user_id uuid not null references core.profiles on delete cascade,
  period text not null,
  as_of date not null,
  level text not null check (level in ('instrument','class')),
  key text not null,
  avg_weight real not null,
  return_local real, return_ref real,
  contribution real not null,
  currency_effect real not null,
  primary key (user_id, period, as_of, level, key)
);
