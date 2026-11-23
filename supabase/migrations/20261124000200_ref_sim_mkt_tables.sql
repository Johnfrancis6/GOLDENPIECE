-- B1: reference (ref), simulated-bank templates (sim), market (mkt) tables.
-- DATA_MODEL.md §2.4, §2.5, §2.6 (ref.fraud_rules), §2.8, §2.9.

-- ── ref ────────────────────────────────────────────────────────────────
create table ref.countries (
  iso2 char(2) primary key check (iso2 ~ '^[A-Z]{2}$'),
  name_fr text not null,
  name_en text not null,
  dial_code text,                                   -- '+221'
  default_tz text not null,                         -- IANA
  timezones text[] not null default '{}',
  profile_id text not null check (profile_id in ('SN','CI','CM','UEMOA','CEMAC','AFRICA','DIASPORA')),
  privacy_notice_key text not null,
  operators text[] not null default '{}'            -- ref.operators ids offered in this country
);

create table ref.operators (                         -- fictitious mobile-money operators (design B21)
  id text primary key,
  name text not null,
  logo_path text,
  is_fictitious boolean not null default true
);

create table ref.banks (
  id text primary key,
  name text not null,
  country char(2) references ref.countries(iso2),
  bic text,
  iban_bank_code text,
  is_fictitious boolean not null default true
);

create table ref.card_bins (
  bin6 char(6) primary key check (bin6 ~ '^[0-9]{6}$'),
  bank_id text references ref.banks(id),
  brand text not null check (brand in ('visa','mastercard','amex','other'))
);

create table ref.legal_texts (
  kind text not null,
  lang text not null check (lang in ('fr','en')),
  version text not null,
  body_md text not null,
  published_at timestamptz not null default now(),
  primary key (kind, lang, version)
);

create table ref.categories (                        -- default tree, FR/EN names
  id text primary key check (id ~ '^[a-z_]+(\.[a-z_]+)?$'),
  parent_id text references ref.categories(id),
  name_fr text not null,
  name_en text not null,
  icon text not null,                                -- Lucide icon name (design C21)
  is_fixed_charge boolean not null default false,
  is_income boolean not null default false,
  sort int not null
);
create index on ref.categories (parent_id);

create table ref.fraud_rules (
  id text not null,
  version int not null,
  scheme text not null,
  name_fr text not null, name_en text not null,
  explanation_fr text not null, explanation_en text not null,
  params jsonb not null,
  weight smallint not null,
  w_min smallint not null, w_max smallint not null,
  source_title text not null, source_url text not null, source_date date not null,
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  primary key (id, version),
  check (w_min <= weight and weight <= w_max)
);

-- ── sim (templates; links come after core) ───────────────────────────────
create table sim.templates (
  id text primary key,                               -- 'persona_dakar_salaried', 'new_wallet'
  kind text not null check (kind in ('persona','account_profile')),
  profile_id text not null check (profile_id in ('SN','CI','CM','UEMOA','CEMAC','AFRICA','DIASPORA')),
  description text not null,
  generator_version text not null,
  seed int not null
);

create table sim.template_accounts (
  template_id text not null references sim.templates on delete cascade,
  key text not null,                                 -- 'bank', 'momo1'
  kind text not null check (kind in ('bank','momo','cash')),
  institution text not null,
  currency char(3) not null,
  opening_balance_minor bigint not null,
  primary key (template_id, key)
);

create table sim.template_entries (                  -- past AND future, as offsets
  template_id text not null,
  account_key text not null,
  seq int not null,
  offset_s bigint not null,                          -- seconds relative to anchor (negative = past)
  entry jsonb not null,                              -- ProviderEntry without ids/dates
  scenario_tag text,
  expected_band text check (expected_band in ('none','ask','bank')),
  primary key (template_id, account_key, seq),
  foreign key (template_id, account_key) references sim.template_accounts on delete cascade
);
create index on sim.template_entries (template_id, offset_s);

create table sim.template_security_events (
  template_id text not null references sim.templates on delete cascade,
  seq int not null,
  offset_s bigint not null,
  type text not null,
  details jsonb not null default '{}',
  scenario_tag text,
  primary key (template_id, seq)
);

-- ── mkt ─────────────────────────────────────────────────────────────────
create table mkt.instruments (
  id text primary key,                               -- 'SPY', 'BTC', 'EURUSD'
  name text not null,
  asset_class text not null check (asset_class in ('equity','etf','crypto','commodity','fx','index_proxy')),
  currency char(3) not null,
  country char(2),
  sector text,
  proxy_of text,
  vendor text not null check (vendor in ('twelvedata','finnhub','coingecko','fred','frankfurter')),
  vendor_symbol text not null,
  frequency text not null check (frequency in ('intraday','daily','monthly')),
  benchmark_id text references mkt.instruments(id),
  in_risk boolean not null default true,
  exchange_tz text,
  open_local time,
  close_local time
);

create table mkt.quotes_latest (
  instrument_id text primary key references mkt.instruments on delete cascade,
  price numeric(20,8) not null,
  change_pct numeric(9,4),
  as_of timestamptz not null,
  fetched_at timestamptz not null,
  vendor text not null
);

create table mkt.bars_daily (
  instrument_id text not null references mkt.instruments on delete cascade,
  d date not null,
  o numeric(20,8), h numeric(20,8), l numeric(20,8),
  c numeric(20,8) not null,
  v numeric(24,4),
  primary key (instrument_id, d)
);

create table mkt.fx_daily (                          -- base EUR (Frankfurter, G6)
  d date not null,
  quote char(3) not null check (quote not in ('XOF','XAF','EUR')),  -- pegged: never stored
  rate numeric(20,10) not null check (rate > 0),
  primary key (d, quote)
);

create table mkt.fx_latest (
  quote char(3) primary key check (quote not in ('XOF','XAF','EUR')),
  rate numeric(20,10) not null check (rate > 0),
  as_of timestamptz not null
);

create table mkt.version (
  id int primary key default 1 check (id = 1),
  etag text not null,
  updated_at timestamptz not null
);
insert into mkt.version (id, etag, updated_at) values (1, 'init', now());
