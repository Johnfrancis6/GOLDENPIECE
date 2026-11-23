-- B1: user data (core) + sim.links. DATA_MODEL.md §2.1-§2.4, §2.6, §2.8.

-- Generic trigger: bump row_version + updated_at on every update (sync cursor, §8.3).
create function core.touch_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end $$;

-- category_id is either a ref.categories id or 'u:<uuid>' (core.user_categories).
create function core.check_category_id() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.category_id is null then
    return new;
  end if;
  if new.category_id like 'u:%' then
    if not exists (select 1 from core.user_categories uc
                   where 'u:' || uc.id::text = new.category_id and uc.user_id = new.user_id) then
      raise exception 'unknown user category %', new.category_id using errcode = '23503';
    end if;
  elsif not exists (select 1 from ref.categories c where c.id = new.category_id) then
    raise exception 'unknown category %', new.category_id using errcode = '23503';
  end if;
  return new;
end $$;

-- ── 2.1 users, devices, consents ─────────────────────────────────────────
create table core.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  is_anonymous boolean not null default false,
  demo_persona text references sim.templates(id),
  language text not null default 'fr' check (language in ('fr','en')),
  country char(2) not null default 'SN' references ref.countries(iso2),
  timezone text not null default 'Africa/Dakar',
  ref_currency char(3) not null default 'XOF' check (ref_currency in ('XOF','XAF','EUR','USD')),
  phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  risk_profile smallint check (risk_profile between 1 and 5),
  hide_amounts_in_push boolean not null default true,
  data_saver boolean not null default false,
  lock_delay_s int not null default 300 check (lock_delay_s between 0 and 3600),
  concentration_threshold_pct smallint not null default 25 check (concentration_threshold_pct between 5 and 100),
  notif_prefs jsonb not null default '{"security": true, "budgets": true, "markets": false}',
  learning_active_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.profiles (is_anonymous, last_active_at);
create trigger touch before update on core.profiles for each row execute function core.touch_row();

create table core.devices (
  id uuid primary key,
  user_id uuid not null references core.profiles on delete cascade,
  label text,
  platform text not null check (platform in ('android','ios')),
  os_version text,
  app_version text not null,
  security_level text not null check (security_level in ('strong','weak','secret','none')),
  unlock_method text not null check (unlock_method in ('biometric_strong','biometric_weak','device_secret','app_pin')),
  push_token text,
  push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on core.devices (user_id) where revoked_at is null;

create table core.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references core.profiles on delete cascade,
  kind text not null check (kind in ('service','ai_categorisation','notifications','crash_reports','terms','privacy')),
  granted boolean not null,
  text_version text not null,
  at timestamptz not null default now()
);
create index on core.consents (user_id, kind, at desc);

create table core.questionnaire (
  user_id uuid not null references core.profiles on delete cascade,
  section text not null check (section in ('income','goals','risk','habits')),
  answers jsonb not null,
  version int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, section)
);

create table core.cards (                            -- S2-1: bank identification only, no PAN
  user_id uuid primary key references core.profiles on delete cascade,
  bin6 char(6) not null check (bin6 ~ '^[0-9]{6}$'),
  last4 char(4) not null check (last4 ~ '^[0-9]{4}$'),
  brand text not null check (brand in ('visa','mastercard','amex','other')),
  bank_id text references ref.banks(id),
  source text not null check (source in ('ocr','manual')),
  created_at timestamptz not null default now()
);

-- ── 2.2 accounts and transactions ────────────────────────────────────────
create table core.provider_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  adapter text not null check (adapter in ('sim','mtn_momo_sandbox')),
  institution text not null,
  scopes text[] not null,
  status text not null check (status in ('active','expired','revoked')),
  history_days int not null,
  created_at timestamptz not null default now()
);
create index on core.provider_links (user_id);

create table core.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  link_id uuid references core.provider_links on delete cascade,
  kind text not null check (kind in ('bank','momo','cash')),
  provider_account_id text,
  display_name text not null,
  institution text,                                  -- ref.banks / ref.operators id
  currency char(3) not null,
  iban text, bic text, bank_id text references ref.banks(id),
  operator text references ref.operators(id),
  msisdn_masked text,
  balance_minor bigint, balance_at timestamptz,
  last_sync_at timestamptz,
  history_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (link_id, provider_account_id)
);
create index on core.accounts (user_id);

create table core.user_categories (
  id uuid primary key,
  user_id uuid not null references core.profiles on delete cascade,
  parent_id text not null references ref.categories(id),
  name text not null,
  icon text,
  hidden boolean not null default false,
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.user_categories (user_id);
create trigger touch before update on core.user_categories for each row execute function core.touch_row();

create table core.transactions (                     -- camt.053 Ntry + TxDtls, flattened
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  account_id uuid not null references core.accounts on delete cascade,
  provider_entry_id text not null,
  status text not null check (status in ('BOOK','PDNG','RJCT')),
  cdt_dbt_ind text not null check (cdt_dbt_ind in ('CRDT','DBIT')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null,
  booking_ts timestamptz not null,
  value_date date not null,
  btc_domain text, btc_family text, btc_subfamily text,
  end_to_end_id text, tx_id text, acct_svcr_ref text,
  cp_name text, cp_iban text, cp_msisdn text, cp_bic text, cp_merchant_code text,
  cp_key text not null,
  remittance_info text,
  purpose_code text,
  charges_minor bigint, charges_currency char(3),
  category_id text,
  category_source text check (category_source in ('user_rule','keyword','ai','user','none')),
  category_version int not null default 0,
  ingested_at timestamptz not null default now(),
  row_version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (account_id, provider_entry_id)
);
create index on core.transactions (user_id, booking_ts desc);
create index on core.transactions (account_id, booking_ts desc);
create index on core.transactions (user_id, cp_key, booking_ts desc);
create index on core.transactions (user_id, updated_at, id);
create index on core.transactions (user_id, category_id, booking_ts) where status = 'BOOK';
create index on core.transactions (category_source) where category_source = 'none';
create trigger touch before update on core.transactions for each row execute function core.touch_row();
create trigger check_category before insert or update of category_id on core.transactions
  for each row execute function core.check_category_id();

create table core.tx_momo (
  transaction_id uuid primary key references core.transactions on delete cascade,
  operator text not null,
  op_type text not null check (op_type in ('cash_in','cash_out','p2p_in','p2p_out','merchant','bill','airtime','bank_in','bank_out','fee','reversal')),
  agent_id text,
  balance_after_minor bigint,
  operator_ref text not null
);

create table core.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  device_id uuid references core.devices on delete set null,
  type text not null check (type in ('login','login_failed','new_device','device_security_changed',
    'pin_failed','sign_out','sign_out_all','password_changed','email_changed','settings_changed',
    'sim_swap','device_revoked','export','mfa_enabled')),
  source text not null check (source in ('app','server','sim')),
  at timestamptz not null default now(),
  ip_country char(2),
  details jsonb not null default '{}'
);
create index on core.security_events (user_id, at desc);

-- ── 2.3 wealth ───────────────────────────────────────────────────────────
create table core.trades (
  id uuid primary key,                               -- client UUID v7
  user_id uuid not null references core.profiles on delete cascade,
  instrument_id text not null references mkt.instruments(id),
  side text not null check (side in ('buy','sell')),
  trade_date date not null,
  quantity numeric(28,10) not null check (quantity > 0),
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null,
  fees_minor bigint not null default 0 check (fees_minor >= 0),
  source text not null check (source in ('manual','demo')),
  created_at timestamptz not null default now()
);
create index on core.trades (user_id, instrument_id, trade_date);

create table core.corporate_actions (                -- G5
  id uuid primary key default gen_random_uuid(),
  user_id uuid references core.profiles on delete cascade,   -- null = global (seeded)
  instrument_id text not null references mkt.instruments(id),
  kind text not null check (kind in ('split','cash_dividend')),
  ex_date date not null,
  ratio numeric(12,6),
  amount_minor bigint,
  currency char(3),
  check ((kind = 'split' and ratio > 0) or (kind = 'cash_dividend' and amount_minor is not null and currency is not null))
);
create index on core.corporate_actions (instrument_id, ex_date);

create table core.real_estate (
  id uuid primary key,
  user_id uuid not null references core.profiles on delete cascade,
  name text not null,
  country char(2),
  currency char(3) not null,
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.real_estate (user_id);
create trigger touch before update on core.real_estate for each row execute function core.touch_row();

create table core.real_estate_valuations (           -- append-only
  id uuid primary key,
  real_estate_id uuid not null references core.real_estate on delete cascade,
  value_minor bigint not null check (value_minor >= 0),
  valued_on date not null,
  created_at timestamptz not null default now()
);
create index on core.real_estate_valuations (real_estate_id, valued_on desc);

create table core.debts (
  id uuid primary key,
  user_id uuid not null references core.profiles on delete cascade,
  name text not null,
  lender text,                                       -- BACKEND_NEEDS #7
  currency char(3) not null,
  principal_minor bigint not null check (principal_minor >= 0),
  balance_minor bigint not null check (balance_minor >= 0),
  annual_rate_bp int check (annual_rate_bp between 0 and 100000),
  monthly_payment_minor bigint,
  start_date date, end_date date,
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.debts (user_id);
create trigger touch before update on core.debts for each row execute function core.touch_row();

-- ── 2.4 spending ─────────────────────────────────────────────────────────
create table core.cat_rules (
  id uuid primary key,
  user_id uuid references core.profiles on delete cascade,  -- null = global keyword rule
  match_field text not null check (match_field in ('cp_key','remittance','merchant_code','op_type')),
  match_type text not null check (match_type in ('equals','contains','regex')),
  pattern text not null,
  category_id text not null,
  priority int not null default 100,
  source text not null check (source in ('user','keyword','ai')),
  created_from_tx uuid,
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.cat_rules (user_id, priority);
create trigger touch before update on core.cat_rules for each row execute function core.touch_row();
create trigger check_category before insert or update of category_id on core.cat_rules
  for each row execute function core.check_category_id();

create table core.budgets (
  id uuid primary key,
  user_id uuid not null references core.profiles on delete cascade,
  category_id text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  recurring boolean not null default true,
  month date check (month is null or extract(day from month) = 1),
  notified_80 date, notified_100 date,
  row_version int not null default 1,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, category_id, month)
);
create trigger touch before update on core.budgets for each row execute function core.touch_row();
create trigger check_category before insert or update of category_id on core.budgets
  for each row execute function core.check_category_id();

-- ── 2.6 scores, alerts, decisions ────────────────────────────────────────
create table core.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  transaction_id uuid references core.transactions on delete cascade,
  security_event_id uuid references core.security_events on delete cascade,
  total smallint not null check (total between 0 and 100),
  band text not null check (band in ('none','ask','bank')),
  a_thr real not null, a_if real not null, f real not null, m real not null,
  learning boolean not null,
  features jsonb not null,
  reasons jsonb not null,
  model_version text,
  rules_version text not null,
  params_version int not null,
  latency_ms int not null,
  computed_at timestamptz not null default now(),
  check (transaction_id is not null or security_event_id is not null)
);
create index on core.scores (user_id, computed_at desc);
create index on core.scores (transaction_id);

create table core.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references core.profiles on delete cascade,
  kind text not null check (kind in ('anomaly','fraud','budget','concentration','learning_done')),
  score_id uuid references core.scores on delete set null,
  transaction_id uuid references core.transactions on delete set null,
  score smallint check (score between 0 and 100),
  band text check (band in ('ask','bank','info')),
  status text not null check (status in ('open','awaiting_user','confirmed_by_user','escalated',
    'in_review','decided_legit','decided_fraud','closed')),
  reasons jsonb not null default '[]',
  bank_id text references ref.banks(id),
  user_answer text check (user_answer in ('me','not_me')),
  answered_at timestamptz,
  reminder_sent_at timestamptz, escalated_at timestamptz, push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  row_version int not null default 1,
  updated_at timestamptz not null default now()
);
create index on core.alerts (user_id, created_at desc);
create index on core.alerts (status, created_at) where status in ('escalated','in_review');
create index on core.alerts (status, created_at) where status = 'awaiting_user';
create trigger touch before update on core.alerts for each row execute function core.touch_row();

create table core.analyst_decisions (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references core.alerts on delete cascade,
  analyst_id uuid references auth.users on delete set null,
  decision text not null check (decision in ('fraud','legit')),
  comment text,
  simulated boolean not null default false,
  decided_at timestamptz not null default now()
);
create index on core.analyst_decisions (alert_id);

-- ── sim.links (needs core.provider_links) ────────────────────────────────
create table sim.links (
  link_id uuid primary key references core.provider_links on delete cascade,
  template_id text not null references sim.templates,
  account_keys text[] not null,
  anchor_at timestamptz not null,
  delivered_until timestamptz not null
);
create index on sim.links (delivered_until);

-- ── profile created with the auth user ───────────────────────────────────
-- Reads optional raw_user_meta_data {language, country, timezone}; falls
-- back to the country's default zone, then to fr/SN/Africa/Dakar.
create function core.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_lang text := coalesce(new.raw_user_meta_data->>'language', 'fr');
  v_country text := upper(coalesce(new.raw_user_meta_data->>'country', 'SN'));
  v_tz text;
begin
  if v_lang not in ('fr','en') then v_lang := 'fr'; end if;
  select c.iso2, c.default_tz into v_country, v_tz from ref.countries c where c.iso2 = v_country;
  if v_country is null then
    v_country := 'SN'; v_tz := 'Africa/Dakar';
  end if;
  v_tz := coalesce(new.raw_user_meta_data->>'timezone', v_tz);
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Africa/Dakar';
  end if;
  insert into core.profiles (user_id, is_anonymous, language, country, timezone)
  values (new.id, coalesce(new.is_anonymous, false), v_lang, v_country, v_tz)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function core.handle_new_user();

-- Anonymous demo user upgraded to a real account keeps its data (API.md §4.6).
create function core.handle_user_upgrade() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update core.profiles set is_anonymous = coalesce(new.is_anonymous, false)
  where user_id = new.id and is_anonymous is distinct from coalesce(new.is_anonymous, false);
  return new;
end $$;

create trigger on_auth_user_updated after update of is_anonymous on auth.users
  for each row execute function core.handle_user_upgrade();
