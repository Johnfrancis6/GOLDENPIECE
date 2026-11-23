-- B3: market data (BUILD_PLAN B3, ARCHITECTURE §5/§13, API.md §2.4-2.5, §3, §4.2).
-- Universe of 30 vendor instruments + 2 peg-derived rows, fetch state, quota
-- counters, service RPCs for the market-* Edge Functions, pg_cron scheduler,
-- screen RPCs get_markets / get_asset / search_instruments.

-- ── instrument metadata ─────────────────────────────────────────────────
alter table mkt.instruments
  add column name_en text,
  add column group_key text check (group_key in ('indices','metals','energy','agri','crypto','fx')),
  add column hist_vendor text check (hist_vendor in ('twelvedata','fred','frankfurter','coingecko')),
  add column hist_symbol text,
  add column unit text,                                  -- 'oz', 'bbl', 't', 'lb' (null = currency only)
  add column sort int not null default 0,
  add column active boolean not null default true;

-- Vendor of the live quote = vendor / vendor_symbol; daily history = hist_vendor / hist_symbol.
-- 'derived' rows (XOF peg) are computed in SQL from the peg and mkt.fx_*.
alter table mkt.instruments drop constraint instruments_vendor_check;
alter table mkt.instruments add constraint instruments_vendor_check
  check (vendor in ('twelvedata','finnhub','coingecko','fred','frankfurter','derived'));
alter table mkt.instruments drop constraint instruments_frequency_check;
alter table mkt.instruments add constraint instruments_frequency_check
  check (frequency in ('intraday','daily','monthly','peg'));

-- Fetch state per job key ('quotes', 'crypto', 'fx', 'ecb', 'fred:<id>', 'bars:<id>').
create table mkt.fetch_state (
  key text primary key,
  last_try_at timestamptz,
  last_ok_at timestamptz,
  backoff_until timestamptz,
  fails int not null default 0,
  detail jsonb
);

-- Vendor usage per UTC minute (credits as the vendor counts them).
create table mkt.quota (
  vendor text not null,
  bucket timestamptz not null,                           -- date_trunc('minute')
  credits int not null default 0,
  errors int not null default 0,
  primary key (vendor, bucket)
);

alter table mkt.fetch_state enable row level security;
alter table mkt.quota enable row level security;
create policy batch_writer_all on mkt.fetch_state for all to batch_writer using (true) with check (true);
create policy batch_writer_all on mkt.quota for all to batch_writer using (true) with check (true);
grant all on mkt.fetch_state, mkt.quota to service_role;
grant select on mkt.fetch_state, mkt.quota to batch_writer;

-- Free-tier limits (TOOLS.md, ARCHITECTURE §13). per_min is a hard limit;
-- per_day / per_month are capped at `cap` (50 % headroom rule, ARCHITECTURE §0).
insert into ops.app_config (key, value) values ('market_quotas', '{
  "twelvedata": {"per_min": 8,   "per_day": 800,     "cap": 0.5},
  "finnhub":    {"per_min": 60,  "per_day": null,    "cap": 0.5},
  "coingecko":  {"per_min": 30,  "per_month": 10000, "cap": 0.5},
  "fred":       {"per_min": 120, "per_day": null,    "cap": 0.5},
  "frankfurter":{"per_min": 30,  "per_day": null,    "cap": 1}
}'::jsonb) on conflict (key) do update set value = excluded.value;

-- ── universe (ARCHITECTURE §0: 12 ETFs, 8 crypto, 4 FX, 2 FRED daily, 2 FRED monthly, 2 spare) ──
-- Splits (G5): none of the 12 ETFs split since 2023-11 [checked in B3 from the stored
-- series: no daily close move > 35 %, see CHAIN_LOG]; USO's 1:8 reverse split was 2020-04.
insert into mkt.instruments (id, name, name_en, asset_class, currency, country, sector, proxy_of, vendor,
  vendor_symbol, frequency, benchmark_id, in_risk, exchange_tz, open_local, close_local, group_key,
  hist_vendor, hist_symbol, unit, sort) values
-- indices via ETF proxies (C4): Finnhub quote, Twelve Data daily bars
('SPY','S&P 500','S&P 500','etf','USD','US','broad','S&P 500','finnhub','SPY','intraday',null,true,'America/New_York','09:30','16:00','indices','twelvedata','SPY',null,10),
('QQQ','Nasdaq 100','Nasdaq 100','etf','USD','US','tech','Nasdaq 100','finnhub','QQQ','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','QQQ',null,11),
('DIA','Dow Jones','Dow Jones','etf','USD','US','broad','Dow Jones Industrial Average','finnhub','DIA','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','DIA',null,12),
('IWM','Russell 2000','Russell 2000','etf','USD','US','small_caps','Russell 2000','finnhub','IWM','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','IWM',null,13),
('VGK','Actions européennes','European stocks','etf','USD',null,'broad','FTSE Developed Europe','finnhub','VGK','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','VGK',null,14),
('EFA','Pays développés hors USA','Developed ex-US','etf','USD',null,'broad','MSCI EAFE','finnhub','EFA','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','EFA',null,15),
('EEM','Marchés émergents','Emerging markets','etf','USD',null,'broad','MSCI Emerging Markets','finnhub','EEM','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','EEM',null,16),
('AFK','Actions africaines','African stocks','etf','USD',null,'broad','MVIS GDP Africa','finnhub','AFK','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','AFK',null,17),
('EZA','Afrique du Sud','South Africa','etf','USD','ZA','broad','MSCI South Africa','finnhub','EZA','intraday','SPY',true,'America/New_York','09:30','16:00','indices','twelvedata','EZA',null,18),
-- metals: spot (spare slots) + ETFs
('XAU','Or','Gold','commodity','USD',null,'metals',null,'twelvedata','XAU/USD','intraday',null,true,null,null,null,'metals','twelvedata','XAU/USD','oz',20),
('XAG','Argent','Silver','commodity','USD',null,'metals',null,'twelvedata','XAG/USD','intraday',null,true,null,null,null,'metals','twelvedata','XAG/USD','oz',21),
('GLD','Or (ETF)','Gold (ETF)','etf','USD','US','metals','Or','finnhub','GLD','intraday','SPY',true,'America/New_York','09:30','16:00','metals','twelvedata','GLD',null,22),
('SLV','Argent (ETF)','Silver (ETF)','etf','USD','US','metals','Argent','finnhub','SLV','intraday','SPY',true,'America/New_York','09:30','16:00','metals','twelvedata','SLV',null,23),
-- energy
('BRENT','Pétrole Brent','Brent crude','commodity','USD',null,'energy',null,'fred','DCOILBRENTEU','daily',null,true,null,null,null,'energy','fred','DCOILBRENTEU','bbl',30),
('WTI','Pétrole WTI','WTI crude','commodity','USD',null,'energy',null,'fred','DCOILWTICO','daily',null,true,null,null,null,'energy','fred','DCOILWTICO','bbl',31),
('USO','Pétrole (ETF)','Oil (ETF)','etf','USD','US','energy','Pétrole WTI','finnhub','USO','intraday','SPY',true,'America/New_York','09:30','16:00','energy','twelvedata','USO',null,32),
-- agri: monthly reference prices (C4), never in risk
('COCOA','Cacao','Cocoa','commodity','USD',null,'agri',null,'fred','PCOCOUSDM','monthly',null,false,null,null,null,'agri','fred','PCOCOUSDM','t',40),
('COFFEE','Café arabica','Arabica coffee','commodity','USD',null,'agri',null,'fred','PCOFFOTMUSDM','monthly',null,false,null,null,null,'agri','fred','PCOFFOTMUSDM','lb',41),
-- crypto: CoinGecko live, Twelve Data daily bars (5 years; CoinGecko Demo history stops at 365 days)
('BTC','Bitcoin','Bitcoin','crypto','USD',null,'crypto',null,'coingecko','bitcoin','intraday',null,true,null,null,null,'crypto','twelvedata','BTC/USD',null,50),
('ETH','Ethereum','Ethereum','crypto','USD',null,'crypto',null,'coingecko','ethereum','intraday','BTC',true,null,null,null,'crypto','twelvedata','ETH/USD',null,51),
('SOL','Solana','Solana','crypto','USD',null,'crypto',null,'coingecko','solana','intraday','BTC',true,null,null,null,'crypto','twelvedata','SOL/USD',null,52),
('BNB','BNB','BNB','crypto','USD',null,'crypto',null,'coingecko','binancecoin','intraday','BTC',true,null,null,null,'crypto','twelvedata','BNB/USD',null,53),
('XRP','XRP','XRP','crypto','USD',null,'crypto',null,'coingecko','ripple','intraday','BTC',true,null,null,null,'crypto','twelvedata','XRP/USD',null,54),
('ADA','Cardano','Cardano','crypto','USD',null,'crypto',null,'coingecko','cardano','intraday','BTC',true,null,null,null,'crypto','twelvedata','ADA/USD',null,55),
('DOGE','Dogecoin','Dogecoin','crypto','USD',null,'crypto',null,'coingecko','dogecoin','intraday','BTC',true,null,null,null,'crypto','twelvedata','DOGE/USD',null,56),
('LTC','Litecoin','Litecoin','crypto','USD',null,'crypto',null,'coingecko','litecoin','intraday','BTC',true,null,null,null,'crypto','twelvedata','LTC/USD',null,57),
-- FX: Twelve Data hourly quotes + daily bars; XOF rows from the exact peg
('EURXOF','Euro / F CFA','Euro / CFA franc','fx','XOF',null,'fx',null,'derived','peg','peg',null,false,null,null,null,'fx','frankfurter','peg',null,60),
('USDXOF','Dollar / F CFA','Dollar / CFA franc','fx','XOF',null,'fx',null,'derived','USD','daily',null,false,null,null,null,'fx','frankfurter','USD',null,61),
('EURUSD','Euro / Dollar','Euro / Dollar','fx','USD',null,'fx',null,'twelvedata','EUR/USD','intraday',null,true,null,null,null,'fx','twelvedata','EUR/USD',null,62),
('EURGBP','Euro / Livre sterling','Euro / Pound sterling','fx','GBP',null,'fx',null,'twelvedata','EUR/GBP','intraday',null,true,null,null,null,'fx','twelvedata','EUR/GBP',null,63),
('USDNGN','Dollar / Naira','Dollar / Naira','fx','NGN','NG','fx',null,'twelvedata','USD/NGN','intraday',null,true,null,null,null,'fx','twelvedata','USD/NGN',null,64),
('USDGHS','Dollar / Cedi','Dollar / Cedi','fx','GHS','GH','fx',null,'twelvedata','USD/GHS','intraday',null,true,null,null,null,'fx','twelvedata','USD/GHS',null,65)
on conflict (id) do nothing;
-- SPY is its own benchmark row's reference; BTC likewise (benchmark null = itself).

-- ── helpers ──────────────────────────────────────────────────────────────
-- Expected date of the latest complete daily bar for an instrument (holidays retried later).
create function mkt.expected_bar_date(p_id text, p_now timestamptz default now()) returns date
language plpgsql stable set search_path = '' as $$
declare i mkt.instruments; v_local timestamp; d date;
begin
  select * into i from mkt.instruments where id = p_id;
  if i.asset_class = 'crypto' then return (p_now at time zone 'UTC')::date - 1; end if;
  if i.exchange_tz is not null then
    v_local := p_now at time zone i.exchange_tz;
    d := case when v_local::time >= i.close_local + interval '30 minutes' then v_local::date else v_local::date - 1 end;
  else
    d := (p_now at time zone 'UTC')::date - 1;        -- FX / metals: previous UTC day
  end if;
  while extract(isodow from d) > 5 loop d := d - 1; end loop;
  return d;
end $$;

-- Is the instrument's exchange open now (+ grace minutes after the close)?
create function mkt.is_open(p_id text, p_grace_min int default 0, p_now timestamptz default now()) returns boolean
language sql stable set search_path = '' as $$
  select case
    when i.exchange_tz is null then true
    else extract(isodow from (p_now at time zone i.exchange_tz)) < 6
     and (p_now at time zone i.exchange_tz)::time >= i.open_local
     and (p_now at time zone i.exchange_tz)::time <= i.close_local + make_interval(mins => p_grace_min)
  end
  from mkt.instruments i where i.id = p_id
$$;

-- FX market (Twelve Data FX / metals): closed from Friday 22:00 to Sunday 21:00 UTC.
create function mkt.fx_open(p_now timestamptz default now()) returns boolean
language sql immutable set search_path = '' as $$
  select not (extract(isodow from (p_now at time zone 'UTC')) = 6
           or (extract(isodow from (p_now at time zone 'UTC')) = 5 and (p_now at time zone 'UTC')::time >= '22:00')
           or (extract(isodow from (p_now at time zone 'UTC')) = 7 and (p_now at time zone 'UTC')::time < '21:00'))
$$;

create function mkt.state_due(p_key text, p_ok_every interval, p_retry_every interval) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select (s.last_ok_at is null or s.last_ok_at < now() - p_ok_every)
                      and (s.last_try_at is null or s.last_try_at < now() - p_retry_every)
                      and (s.backoff_until is null or s.backoff_until < now())
                   from mkt.fetch_state s where s.key = p_key), true)
$$;

create function mkt.touch(p_key text) returns void
language sql set search_path = '' as $$
  insert into mkt.fetch_state (key, last_try_at) values (p_key, now())
  on conflict (key) do update set last_try_at = now()
$$;

-- New etag after any market write (get_markets clients revalidate with it).
create function mkt.bump_version() returns void
language sql set search_path = '' as $$
  update mkt.version set etag = md5(clock_timestamp()::text || random()::text), updated_at = now() where id = 1
$$;

-- Derived rows: EURXOF constant peg; USDXOF = 655.957 / (USD per EUR). fx_latest for NGN/GHS
-- from the Twelve Data quotes (USD/xxx × EUR/USD) when no fresher Frankfurter value exists.
create function mkt.refresh_derived() returns void
language plpgsql set search_path = '' as $$
declare v_usd numeric; v_usd_at timestamptz; v_prev numeric;
begin
  -- fx_latest from intraday FX quotes (base EUR)
  select q.price, q.as_of into v_usd, v_usd_at from mkt.quotes_latest q where q.instrument_id = 'EURUSD';
  if v_usd is not null then
    insert into mkt.fx_latest (quote, rate, as_of) values ('USD', v_usd, v_usd_at)
    on conflict (quote) do update set rate = excluded.rate, as_of = excluded.as_of
      where mkt.fx_latest.as_of <= excluded.as_of;
    insert into mkt.fx_latest (quote, rate, as_of)
    select right(q.instrument_id, 3), case when left(q.instrument_id, 3) = 'EUR' then q.price else q.price * v_usd end, q.as_of
    from mkt.quotes_latest q join mkt.instruments i on i.id = q.instrument_id
    where i.asset_class = 'fx' and i.vendor = 'twelvedata' and q.instrument_id <> 'EURUSD'
    on conflict (quote) do update set rate = excluded.rate, as_of = excluded.as_of
      where mkt.fx_latest.as_of <= excluded.as_of;
  end if;
  select rate, as_of into v_usd, v_usd_at from mkt.fx_latest where quote = 'USD';

  -- EURXOF: constant; change 0
  insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
  values ('EURXOF', 655.957, 0, coalesce(v_usd_at, now()), now(), 'derived')
  on conflict (instrument_id) do update set as_of = excluded.as_of, fetched_at = excluded.fetched_at;
  -- USDXOF
  if v_usd is not null then
    select c into v_prev from mkt.bars_daily where instrument_id = 'USDXOF'
      and d < (v_usd_at at time zone 'UTC')::date order by d desc limit 1;
    insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
    values ('USDXOF', round(655.957 / v_usd, 4),
            case when v_prev > 0 then round((655.957 / v_usd / v_prev - 1) * 100, 4) end, v_usd_at, now(), 'derived')
    on conflict (instrument_id) do update set price = excluded.price, change_pct = excluded.change_pct,
      as_of = excluded.as_of, fetched_at = excluded.fetched_at;
  end if;
  -- daily bars of the peg rows from Frankfurter history
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c)
  select 'USDXOF', f.d, round(655.957 / f.rate, 4), round(655.957 / f.rate, 4), round(655.957 / f.rate, 4),
         round(655.957 / f.rate, 4)
  from mkt.fx_daily f where f.quote = 'USD'
    and f.d > coalesce((select max(d) from mkt.bars_daily where instrument_id = 'USDXOF'), '1900-01-01')
  on conflict do nothing;
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c)
  select 'EURXOF', f.d, 655.957, 655.957, 655.957, 655.957
  from mkt.fx_daily f where f.quote = 'USD'
    and f.d > coalesce((select max(d) from mkt.bars_daily where instrument_id = 'EURXOF'), '1900-01-01')
  on conflict do nothing;
end $$;

-- ── service RPCs (Edge market-* only) ────────────────────────────────────
-- Take vendor credits: per-minute hard limit, daily/monthly capped at `cap` × limit.
-- → {ok, retry_after_s?, reason?}
create function api.market_quota_take(p_vendor text, p_credits int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := (select value -> p_vendor from ops.app_config where key = 'market_quotas');
  v_min timestamptz := date_trunc('minute', now());
  v_used_min int; v_used_day int; v_used_month int;
begin
  if cfg is null then return jsonb_build_object('ok', true); end if;
  perform pg_advisory_xact_lock(hashtext('mkt.quota:' || p_vendor));
  select coalesce(sum(credits), 0) into v_used_min from mkt.quota where vendor = p_vendor and bucket = v_min;
  if (cfg ->> 'per_min') is not null and v_used_min + p_credits > (cfg ->> 'per_min')::int then
    return jsonb_build_object('ok', false, 'reason', 'per_min',
                              'retry_after_s', 61 - extract(second from now())::int);
  end if;
  if (cfg ->> 'per_day') is not null then
    select coalesce(sum(credits), 0) into v_used_day from mkt.quota
      where vendor = p_vendor and bucket >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
    if v_used_day + p_credits > (cfg ->> 'per_day')::int * (cfg ->> 'cap')::numeric then
      return jsonb_build_object('ok', false, 'reason', 'per_day');
    end if;
  end if;
  if (cfg ->> 'per_month') is not null then
    select coalesce(sum(credits), 0) into v_used_month from mkt.quota
      where vendor = p_vendor and bucket >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
    if v_used_month + p_credits > (cfg ->> 'per_month')::int * (cfg ->> 'cap')::numeric then
      return jsonb_build_object('ok', false, 'reason', 'per_month');
    end if;
  end if;
  insert into mkt.quota (vendor, bucket, credits) values (p_vendor, v_min, p_credits)
  on conflict (vendor, bucket) do update set credits = mkt.quota.credits + excluded.credits;
  return jsonb_build_object('ok', true);
end $$;

-- Instruments to fetch for a job kind → [{id, symbol, hist_symbol, start_date?, key}]
--   quotes: Finnhub intraday rows whose exchange is open (+20 min grace) or have no quote yet
--   crypto: CoinGecko rows;  fx: Twelve Data intraday rows (FX + spot metals)
--   bars:   Twelve Data history rows needing a backfill or a new daily bar (≤ p_limit)
--   fred:   FRED rows due (daily check)
create function api.market_targets(p_kind text, p_limit int default 8) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  case p_kind
  when 'quotes' then
    select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'symbol', i.vendor_symbol) order by i.sort), '[]')
      into v from mkt.instruments i
     where i.active and i.vendor = 'finnhub'
       and (mkt.is_open(i.id, 20) or not exists (select 1 from mkt.quotes_latest q where q.instrument_id = i.id));
  when 'crypto' then
    select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'symbol', i.vendor_symbol) order by i.sort), '[]')
      into v from mkt.instruments i where i.active and i.vendor = 'coingecko';
  when 'fx' then
    select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'symbol', i.vendor_symbol) order by i.sort), '[]')
      into v from mkt.instruments i where i.active and i.vendor = 'twelvedata' and i.frequency = 'intraday';
  when 'bars' then
    select coalesce(jsonb_agg(t.o order by t.backfill desc, t.sort), '[]') into v from (
      select jsonb_build_object('id', i.id, 'symbol', i.hist_symbol, 'key', 'bars:' || i.id,
               'start_date', case when b.last_d is null then (current_date - interval '5 years' - interval '7 days')::date
                                  else b.last_d - 7 end,
               'backfill', b.last_d is null) as o,
             b.last_d is null as backfill, i.sort
      from mkt.instruments i
      left join lateral (select max(d) as last_d from mkt.bars_daily where instrument_id = i.id) b on true
      where i.active and i.hist_vendor = 'twelvedata'
        and (b.last_d is null or b.last_d < mkt.expected_bar_date(i.id))
        and mkt.state_due('bars:' || i.id, interval '0', interval '3 hours')
      order by b.last_d is null desc, i.sort limit p_limit) t;
  when 'fred' then
    select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'symbol', i.hist_symbol, 'key', 'fred:' || i.id,
             'start_date', coalesce((select max(d) - 40 from mkt.bars_daily where instrument_id = i.id),
                                    (current_date - interval '5 years' - interval '40 days')::date),
             'divisor', case when i.id = 'COFFEE' then 100 else 1 end) order by i.sort), '[]')
      into v from mkt.instruments i
     where i.active and i.hist_vendor = 'fred' and mkt.state_due('fred:' || i.id, interval '20 hours', interval '30 minutes');
  when 'ecb' then
    select jsonb_build_array(jsonb_build_object('key', 'ecb',
             'start_date', coalesce((select max(d) + 1 from mkt.fx_daily), '2020-01-01'::date)))
      into v;
  else
    perform core.api_error('INVALID', 'market.kind');
  end case;
  return v;
end $$;

-- Mark a job key tried / ok / failed (backoff on vendor errors, 429 → p_backoff_s).
create function api.market_mark(p_key text, p_ok boolean, p_detail jsonb default null, p_backoff_s int default null)
returns void language sql security definer set search_path = '' as $$
  insert into mkt.fetch_state as s (key, last_try_at, last_ok_at, fails, backoff_until, detail)
  values (p_key, now(), case when p_ok then now() end, case when p_ok then 0 else 1 end,
          case when p_backoff_s is not null then now() + make_interval(secs => p_backoff_s) end, p_detail)
  on conflict (key) do update set last_try_at = now(),
    last_ok_at = case when p_ok then now() else s.last_ok_at end,
    fails = case when p_ok then 0 else s.fails + 1 end,
    backoff_until = case when p_backoff_s is not null then now() + make_interval(secs => p_backoff_s) else null end,
    detail = coalesce(p_detail, s.detail)
$$;

-- Count a vendor error (quota dashboard) without failing the caller.
create function api.market_vendor_error(p_vendor text) returns void
language sql security definer set search_path = '' as $$
  insert into mkt.quota (vendor, bucket, credits, errors) values (p_vendor, date_trunc('minute', now()), 0, 1)
  on conflict (vendor, bucket) do update set errors = mkt.quota.errors + 1
$$;

-- Upsert latest quotes: p_items [{id, price, change_pct?, as_of}] → count
create function api.market_upsert_quotes(p_vendor text, p_items jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
  select x.id, x.price, round(x.change_pct, 4), x.as_of, now(), p_vendor
  from jsonb_to_recordset(p_items) as x(id text, price numeric, change_pct numeric, as_of timestamptz)
  join mkt.instruments i on i.id = x.id
  where x.price > 0 and x.as_of is not null
  on conflict (instrument_id) do update set price = excluded.price, change_pct = excluded.change_pct,
    as_of = excluded.as_of, fetched_at = excluded.fetched_at, vendor = excluded.vendor
    where mkt.quotes_latest.as_of <= excluded.as_of;
  get diagnostics n = row_count;
  if exists (select 1 from jsonb_to_recordset(p_items) as x(id text) join mkt.instruments i on i.id = x.id
             where i.asset_class = 'fx') then
    perform mkt.refresh_derived();
  end if;
  perform mkt.bump_version();
  return n;
end $$;

-- Upsert daily bars: p_bars [{d, o?, h?, l?, c, v?}] → count. For a monthly/daily FRED series
-- with no live vendor quote, the latest bar also becomes the quote (as_of = bar date).
create function api.market_upsert_bars(p_instrument_id text, p_bars jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int; i mkt.instruments; v_last record; v_prev numeric;
begin
  select * into i from mkt.instruments where id = p_instrument_id;
  if i.id is null then perform core.api_error('NOT_FOUND', 'market.instrument'); end if;
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c, v)
  select p_instrument_id, x.d, x.o, x.h, x.l, x.c, x.v
  from jsonb_to_recordset(p_bars) as x(d date, o numeric, h numeric, l numeric, c numeric, v numeric)
  where x.c > 0
  on conflict (instrument_id, d) do update set o = excluded.o, h = excluded.h, l = excluded.l,
    c = excluded.c, v = excluded.v;
  get diagnostics n = row_count;
  if i.vendor = 'fred' then
    select d, c into v_last from mkt.bars_daily where instrument_id = i.id order by d desc limit 1;
    select c into v_prev from mkt.bars_daily where instrument_id = i.id and d < v_last.d order by d desc limit 1;
    if v_last.d is not null then
      insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
      values (i.id, v_last.c, case when v_prev > 0 then round((v_last.c / v_prev - 1) * 100, 4) end,
              v_last.d::timestamptz, now(), 'fred')
      on conflict (instrument_id) do update set price = excluded.price, change_pct = excluded.change_pct,
        as_of = excluded.as_of, fetched_at = excluded.fetched_at, vendor = excluded.vendor;
    end if;
  end if;
  perform mkt.bump_version();
  return n;
end $$;

-- Frankfurter (ECB) daily rates, base EUR: p_rows [{d, quote, rate}] → count; updates fx_latest
-- when the ECB value is newer than the hourly one, then the peg rows.
create function api.market_upsert_fx_daily(p_rows jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into mkt.fx_daily (d, quote, rate)
  select x.d, x.quote, x.rate from jsonb_to_recordset(p_rows) as x(d date, quote text, rate numeric)
  where x.rate > 0 and x.quote not in ('XOF','XAF','EUR')
  on conflict (d, quote) do update set rate = excluded.rate;
  get diagnostics n = row_count;
  -- ECB reference at 16:00 CET of day d
  insert into mkt.fx_latest (quote, rate, as_of)
  select distinct on (f.quote) f.quote, f.rate, (f.d + time '15:00') at time zone 'UTC'
  from mkt.fx_daily f order by f.quote, f.d desc
  on conflict (quote) do update set rate = excluded.rate, as_of = excluded.as_of
    where mkt.fx_latest.as_of < excluded.as_of;
  perform mkt.refresh_derived();
  perform mkt.bump_version();
  return n;
end $$;

-- ── scheduler (pg_cron every minute → pg_net → Edge) ─────────────────────
-- quotes */15 while a US exchange is open (+20 min), crypto */10, FX + spot metals hourly
-- (:05, FX market open), daily bars / backfill every 2 min while any is due (≤ 8 symbols per
-- call = Twelve Data per-minute limit), FRED when due (~daily), ECB weekdays after 15:30 UTC.
create function mkt.dispatch(p_fn text, p_body jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  v_url := (select value ->> 'url' from ops.app_config where key = 'functions');
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'gp_cron_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(url := v_url || '/' || p_fn, body := p_body,
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-gp-cron', v_secret),
                        timeout_milliseconds := 140000);
end $$;

create function mkt.cron_market(p_now timestamptz default now()) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_min int := extract(minute from p_now at time zone 'UTC')::int;
  v_utc timestamp := p_now at time zone 'UTC';
  out text[] := '{}';
begin
  if (select value ->> 'url' from ops.app_config where key = 'functions') is null then return 'no_edge'; end if;
  if v_min % 15 = 0 and exists (select 1 from mkt.instruments i where i.active and i.vendor = 'finnhub'
                                and mkt.is_open(i.id, 20, p_now)) then
    perform mkt.dispatch('market-refresh', '{"kind":"quotes"}'); out := out || 'quotes';
  end if;
  if v_min % 10 = 0 then
    perform mkt.dispatch('market-refresh', '{"kind":"crypto"}'); out := out || 'crypto';
  end if;
  if v_min = 5 and mkt.fx_open(p_now) then
    perform mkt.dispatch('market-refresh', '{"kind":"fx"}'); out := out || 'fx';
  end if;
  if v_min % 2 = 1 and jsonb_array_length(api.market_targets('bars', 1)) > 0 then
    perform mkt.dispatch('market-eod', '{"kind":"bars"}'); out := out || 'bars';
  end if;
  if v_min % 10 = 3 and jsonb_array_length(api.market_targets('fred', 4)) > 0 then
    perform mkt.dispatch('market-eod', '{"kind":"fred"}'); out := out || 'fred';
  end if;
  if v_min % 10 = 7
     and (not exists (select 1 from mkt.fx_daily)
          or (extract(isodow from v_utc) < 6 and v_utc::time >= '15:30'
              and (select max(d) from mkt.fx_daily) < v_utc::date))
     and mkt.state_due('ecb', interval '0', interval '30 minutes') then
    perform mkt.touch('ecb');
    perform mkt.dispatch('market-eod', '{"kind":"ecb"}'); out := out || 'ecb';
  end if;
  -- keep 35 days of quota counters
  if v_min = 59 then delete from mkt.quota where bucket < p_now - interval '35 days'; end if;
  return coalesce(nullif(array_to_string(out, ','), ''), 'idle');
end $$;

select cron.schedule('gp-market', '* * * * *', 'select mkt.cron_market()');

-- ── screen RPCs ──────────────────────────────────────────────────────────
-- Vendor attributions (G13): text keys, prose lives in shared/i18n.
create function mkt.attribution_key(p_vendor text) returns text
language sql immutable set search_path = '' as $$
  select case p_vendor when 'coingecko' then 'attr.coingecko' when 'fred' then 'attr.fred'
    when 'twelvedata' then 'attr.twelvedata' when 'finnhub' then 'attr.finnhub'
    when 'frankfurter' then 'attr.frankfurter' when 'derived' then 'attr.peg' end
$$;

create function mkt.freshness(i mkt.instruments) returns text
language sql immutable set search_path = '' as $$
  select case i.frequency when 'intraday' then 'delayed' when 'peg' then 'peg' else i.frequency end
$$;

-- Round to 6 significant digits (payload size; display needs ≤ 6).
create function mkt.sig6(x numeric) returns numeric
language sql immutable parallel safe set search_path = '' as $$
  select case when x is null or x = 0 then x
    else round(x, greatest(0, 5 - floor(log(10, abs(x)))::int)) end
$$;

-- Markets screen (P7) and Home strip: API.md §2.5 + B9 (spark_30d, change_30d_pct).
create function api.get_markets(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_lang text; v jsonb; v_as_of timestamptz;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  v_lang := coalesce((select language from core.profiles where user_id = uid), 'fr');
  with items as (
    select i.group_key, i.sort, i.vendor, jsonb_build_object(
        'instrument_id', i.id,
        'name', case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end,
        'class', i.asset_class, 'currency', i.currency, 'unit', i.unit,
        'price', mkt.sig6(q.price), 'change_pct', q.change_pct,
        'change_30d_pct', case when b.c30 > 0 and q.price is not null then round((q.price / b.c30 - 1) * 100, 2) end,
        'spark_30d', coalesce(b.spark, '[]'::jsonb),
        'as_of', q.as_of, 'freshness', mkt.freshness(i), 'proxy_of', i.proxy_of) as item
    from mkt.instruments i
    left join mkt.quotes_latest q on q.instrument_id = i.id
    left join lateral (
      select (select jsonb_agg(mkt.sig6(s.c) order by s.d) from (
                select d, c from mkt.bars_daily where instrument_id = i.id
                  and d > case when i.frequency = 'monthly' then current_date - 400 else current_date - 31 end
                order by d desc limit 30) s) as spark,
             (select c from mkt.bars_daily where instrument_id = i.id
                and d <= case when i.frequency = 'monthly' then current_date - 60 else current_date - 30 end
              order by d desc limit 1) as c30
    ) b on true
    where i.active and i.group_key is not null)
  select jsonb_build_object(
      'groups', (select jsonb_agg(jsonb_build_object('key', g.key, 'items', g.items) order by g.ord)
                 from (select group_key as key,
                              jsonb_agg(item order by sort) as items,
                              array_position(array['indices','metals','energy','agri','crypto','fx'], group_key) as ord
                       from items group by group_key) g),
      'attributions', (select jsonb_agg(distinct mkt.attribution_key(vendor)) from items))
    into v;
  select min(q.as_of) into v_as_of from mkt.quotes_latest q join mkt.instruments i on i.id = q.instrument_id
   where i.frequency = 'intraday' and i.active;
  return core.envelope(p_etag, v, coalesce(v_as_of, now()));
end $$;

-- Weighted-average position of the caller in one instrument (splits from core.corporate_actions).
create function core.position_of(p_user uuid, p_instrument text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r record; v_qty numeric := 0; v_cost numeric := 0; v_realised numeric := 0; v_ccy text; v_f numeric;
begin
  for r in select t.*, coalesce((select exp(sum(ln(ca.ratio))) from core.corporate_actions ca
                                  where ca.instrument_id = t.instrument_id and ca.kind = 'split'
                                    and ca.ex_date > t.trade_date
                                    and (ca.user_id is null or ca.user_id = p_user)), 1) as split_f
           from core.trades t where t.user_id = p_user and t.instrument_id = p_instrument
           order by t.trade_date, t.created_at loop
    v_ccy := r.currency;
    v_f := r.split_f;
    if r.side = 'buy' then
      v_cost := v_cost + r.quantity * r.price_minor + r.fees_minor;
      v_qty := v_qty + r.quantity * v_f;
    elsif v_qty > 0 then
      v_realised := v_realised + least(r.quantity * v_f, v_qty) * (r.price_minor / v_f - v_cost / v_qty) - r.fees_minor;
      v_cost := v_cost * (1 - least(r.quantity * v_f, v_qty) / v_qty);
      v_qty := greatest(v_qty - r.quantity * v_f, 0);
    end if;
  end loop;
  if v_ccy is null then return null; end if;
  return jsonb_build_object('qty', round(v_qty, 10), 'currency', v_ccy,
    'avg_cost_minor', case when v_qty > 0 then round(v_cost / v_qty) end,
    'cost_minor', round(v_cost), 'realised_minor', round(v_realised));
end $$;

-- Asset detail (P6): API.md §2.4. Ranges 3M / 1Y daily candles (≤ 260), 5Y monthly (≤ 60, #8).
create function api.get_asset(p_instrument_id text, p_range text default '1Y', p_etag text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); i mkt.instruments; q mkt.quotes_latest; v_lang text;
  v_candles jsonb; v_stats jsonb; v_pos jsonb; v jsonb; v_ann numeric; v_prev numeric; v_1y numeric;
  v_vol numeric; v_beta numeric; v_n int; v_nb int;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_range not in ('3M','1Y','5Y') then perform core.api_error('INVALID', 'asset.range'); end if;
  select * into i from mkt.instruments where id = p_instrument_id;
  if i.id is null then perform core.api_error('NOT_FOUND', 'asset.not_found'); end if;
  select * into q from mkt.quotes_latest where instrument_id = i.id;
  v_lang := coalesce((select language from core.profiles where user_id = uid), 'fr');

  if p_range = '5Y' or i.frequency = 'monthly' then
    select coalesce(jsonb_agg(jsonb_build_array(m.d, mkt.sig6(m.o), mkt.sig6(m.h), mkt.sig6(m.l), mkt.sig6(m.c))
                              order by m.d), '[]') into v_candles
    from (select date_trunc('month', d)::date as d,
                 (array_agg(coalesce(o, c) order by d))[1] as o, max(coalesce(h, c)) as h,
                 min(coalesce(l, c)) as l, (array_agg(c order by d desc))[1] as c
          from mkt.bars_daily where instrument_id = i.id
            and d >= date_trunc('month', current_date - case p_range when '3M' then interval '3 months'
                                    when '1Y' then interval '1 year' else interval '5 years' end)
          group by 1 order by 1 desc limit 60) m;
  else
    select coalesce(jsonb_agg(jsonb_build_array(b.d, mkt.sig6(coalesce(b.o, b.c)), mkt.sig6(coalesce(b.h, b.c)),
                              mkt.sig6(coalesce(b.l, b.c)), mkt.sig6(b.c)) order by b.d), '[]') into v_candles
    from (select * from mkt.bars_daily where instrument_id = i.id
            and d > current_date - case p_range when '3M' then interval '3 months' else interval '1 year' end
          order by d desc limit 260) b;
  end if;

  -- stats over the last year of daily closes
  v_ann := case when i.asset_class = 'crypto' then 365 else 252 end;
  select c into v_prev from mkt.bars_daily where instrument_id = i.id and d < current_date order by d desc offset 1 limit 1;
  select c into v_1y from mkt.bars_daily where instrument_id = i.id and d <= current_date - 365 order by d desc limit 1;
  if i.frequency <> 'monthly' then
    with r as (select d, ln(c / lag(c) over (order by d)) as lr from mkt.bars_daily
               where instrument_id = i.id and d > current_date - 366)
    select stddev_samp(lr) * sqrt(v_ann), count(lr) into v_vol, v_n from r where lr is not null;
    if v_n < 60 then v_vol := null; end if;
    if i.benchmark_id is not null then
      with a as (select d, ln(c / lag(c) over (order by d)) as ra from mkt.bars_daily
                 where instrument_id = i.id and d > current_date - 366),
           b as (select d, ln(c / lag(c) over (order by d)) as rb from mkt.bars_daily
                 where instrument_id = i.benchmark_id and d > current_date - 366)
      select covar_samp(ra, rb) / nullif(var_samp(rb), 0), count(*) into v_beta, v_nb
      from a join b using (d) where ra is not null and rb is not null;
      if v_nb < 120 then v_beta := null; end if;
    end if;
  end if;
  v_stats := jsonb_build_object(
    'last', mkt.sig6(q.price), 'as_of', q.as_of, 'freshness', mkt.freshness(i),
    'change_1d', q.change_pct,
    'change_1y', case when v_1y > 0 and q.price is not null then round((q.price / v_1y - 1) * 100, 2) end,
    'vol_ann', round(v_vol, 4), 'beta', round(v_beta, 3),
    'benchmark', coalesce(i.benchmark_id, case when i.asset_class in ('etf') then 'SPY'
                                               when i.asset_class = 'crypto' then 'BTC' end));

  v_pos := core.position_of(uid, i.id);
  if v_pos is not null and q.price is not null then
    v_pos := v_pos || jsonb_build_object('value_minor',
      round((v_pos ->> 'qty')::numeric * q.price * 10::numeric ^ ref.money_exponent(v_pos ->> 'currency')));
  end if;

  v := jsonb_build_object(
    'instrument', jsonb_build_object('id', i.id,
        'name', case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end,
        'class', i.asset_class, 'currency', i.currency, 'unit', i.unit, 'proxy_of', i.proxy_of,
        'group', i.group_key),
    'range', p_range, 'interval', case when p_range = '5Y' or i.frequency = 'monthly' then 'month' else 'day' end,
    'candles', v_candles, 'stats', v_stats, 'my_position', v_pos,
    'attribution_text_key', mkt.attribution_key(coalesce(case when i.vendor = 'derived' then 'frankfurter' end, i.vendor)),
    'history_attribution_text_key', mkt.attribution_key(i.hist_vendor));
  return core.envelope(p_etag, v, coalesce(q.as_of, now()));
end $$;

-- Instrument search (P3): API.md §2.4, ≤ 20, accent-insensitive on id / names / proxy.
create function api.search_instruments(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_q text := core.norm_text(coalesce(p_q, '')); v_lang text;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  v_lang := coalesce((select language from core.profiles where user_id = uid), 'fr');
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'class', s.asset_class,
                     'currency', s.currency, 'proxy_of', s.proxy_of) order by s.rank, s.sort)
                   from (select i.id, i.asset_class, i.currency, i.proxy_of, i.sort,
                                case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end as name,
                                case when lower(i.id) = v_q then 0 when lower(i.id) like v_q || '%' then 1 else 2 end as rank
                         from mkt.instruments i
                         where i.active and i.frequency <> 'peg' and i.asset_class <> 'fx'
                           and (v_q = '' or lower(i.id) like v_q || '%'
                                or core.norm_text(i.name) like '%' || v_q || '%'
                                or core.norm_text(coalesce(i.name_en, '')) like '%' || v_q || '%'
                                or core.norm_text(coalesce(i.proxy_of, '')) like '%' || v_q || '%')
                         order by 7, i.sort limit 20) s), '[]'::jsonb);
end $$;

-- Freshness report for the B3 done criterion ("quotes ≤ 30 min old in exchange hours for
-- 3 days") and the Ops tab: per day, intraday quote job runs and the worst lag.
create function api.market_report(p_days int default 3) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'quota', (select jsonb_object_agg(vendor, jsonb_build_object('today', today, 'month', month, 'errors_today', err))
              from (select vendor,
                      sum(credits) filter (where bucket >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') as today,
                      sum(credits) filter (where bucket >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC') as month,
                      sum(errors) filter (where bucket >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') as err
                    from mkt.quota group by vendor) u),
    'limits', (select value from ops.app_config where key = 'market_quotas'),
    'jobs', (select jsonb_object_agg(job, x) from (
               select job, jsonb_build_object('runs', count(*), 'ok', count(*) filter (where status = 'ok'),
                        'max_gap_min', round(max(gap) / 60.0, 1)) as x
               from (select job, status, extract(epoch from started_at - lag(started_at) over (partition by job order by started_at)) as gap
                     from ops.job_runs where job like 'market-%' and started_at > now() - make_interval(days => p_days)) j
               group by job) s),
    'quotes', (select jsonb_agg(jsonb_build_object('id', i.id, 'as_of', q.as_of, 'fetched_at', q.fetched_at,
                 'age_min', round(extract(epoch from now() - q.as_of) / 60), 'open', mkt.is_open(i.id))
                 order by i.sort)
               from mkt.instruments i left join mkt.quotes_latest q on q.instrument_id = i.id where i.active),
    'bars', (select jsonb_object_agg(id, jsonb_build_object('n', n, 'first', f, 'last', l)) from (
               select i.id, count(b.d) as n, min(b.d) as f, max(b.d) as l
               from mkt.instruments i left join mkt.bars_daily b on b.instrument_id = i.id group by i.id) s),
    'fx_daily', (select jsonb_build_object('n', count(*), 'first', min(d), 'last', max(d), 'quotes', count(distinct quote))
                 from mkt.fx_daily),
    'state', (select jsonb_object_agg(key, jsonb_build_object('ok', last_ok_at, 'try', last_try_at, 'fails', fails,
                 'backoff_until', backoff_until, 'detail', detail)) from mkt.fetch_state))
$$;

-- Split check (G5): daily closes moving more than p_pct % in one bar (non-crypto).
create function api.market_split_check(p_years int default 2, p_pct numeric default 35) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', instrument_id, 'd', d, 'move_pct', round(mv, 1))
                  order by instrument_id, d), '[]')
  from (select b.instrument_id, b.d, (b.c / lag(b.c) over (partition by b.instrument_id order by b.d) - 1) * 100 as mv
        from mkt.bars_daily b join mkt.instruments i on i.id = b.instrument_id
        where i.asset_class <> 'crypto' and b.d > current_date - make_interval(years => p_years)) s
  where abs(mv) > p_pct
$$;

-- quotes health: per exchange (B1 simplified to weekdays 14:00-20:00 UTC) — only instruments
-- whose exchange is open count, and only after 45 min of opening.
create or replace function ops.health_check() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select value from ops.app_config where key = 'health'), '{}');
  checks jsonb := jsonb_build_object('db', 'ok');
  failing text[] := '{}';
  warnings text[] := '{}';
  v_ts timestamptz; v_n bigint; v_mb numeric;
begin
  if exists (select 1 from mkt.quotes_latest) then
    select min(q.fetched_at) into v_ts from mkt.quotes_latest q
      join mkt.instruments i on i.id = q.instrument_id
     where i.frequency = 'intraday' and i.active and mkt.is_open(i.id)
       and (i.exchange_tz is null or (now() at time zone i.exchange_tz)::time >= i.open_local + interval '45 minutes')
       and i.vendor in ('finnhub', 'coingecko');           -- FX / spot metals are hourly by design
    if v_ts is not null and v_ts < now() - make_interval(mins => coalesce((cfg->>'quotes_max_age_min')::int, 45)) then
      failing := failing || 'quotes_stale'; checks := checks || '{"quotes": "failing"}';
    else checks := checks || '{"quotes": "ok"}'; end if;
  else checks := checks || '{"quotes": "not_applicable"}'; end if;

  select max(started_at) into v_ts from ops.job_runs where job = 'batch-nightly' and status = 'ok';
  if v_ts is null then checks := checks || '{"batch": "not_applicable"}';
  elsif v_ts < now() - make_interval(hours => coalesce((cfg->>'batch_max_age_h')::int, 26)) then
    failing := failing || 'batch_late'; checks := checks || '{"batch": "failing"}';
  else checks := checks || '{"batch": "ok"}'; end if;

  if exists (select 1 from ops.job_runs where job = 'dispatch-batch') then
    if (select bool_and(status = 'failed') from (select status from ops.job_runs where job = 'dispatch-batch'
         order by started_at desc limit 2) s) and
       (select count(*) from ops.job_runs where job = 'dispatch-batch') >= 2 then
      failing := failing || 'dispatch_failed'; checks := checks || '{"dispatch": "failing"}';
    else checks := checks || '{"dispatch": "ok"}'; end if;
  else checks := checks || '{"dispatch": "not_applicable"}'; end if;

  if exists (select 1 from ops.job_runs where job = 'categorise-llm') then
    select count(*) into v_n from core.transactions where category_source = 'none';
    if v_n > coalesce((cfg->>'groq_backlog_max')::int, 500) then
      failing := failing || 'groq_backlog'; checks := checks || '{"groq_backlog": "failing"}';
    else checks := checks || '{"groq_backlog": "ok"}'; end if;
  else checks := checks || '{"groq_backlog": "not_applicable"}'; end if;

  -- market quota above the cap today (warning only)
  if exists (select 1 from mkt.quota q
             join lateral (select (value -> q.vendor) as c from ops.app_config where key = 'market_quotas') l on true
             where q.bucket >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
               and (l.c ->> 'per_day') is not null
             group by q.vendor, l.c
             having sum(q.credits) > (l.c ->> 'per_day')::int * (l.c ->> 'cap')::numeric) then
    warnings := warnings || 'market_quota';
  end if;

  v_mb := round(pg_catalog.pg_database_size(pg_catalog.current_database()) / 1048576.0, 1);
  if v_mb > coalesce((cfg->>'db_size_warn_mb')::numeric, 300) then warnings := warnings || 'db_size'; end if;

  return jsonb_build_object('ok', cardinality(failing) = 0, 'failing', to_jsonb(failing),
    'warnings', to_jsonb(warnings), 'checks', checks, 'db_size_mb', v_mb, 'at', now());
end $$;

-- ── grants ───────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
revoke all on function api.market_quota_take(text, int), api.market_targets(text, int),
  api.market_mark(text, boolean, jsonb, int), api.market_vendor_error(text),
  api.market_upsert_quotes(text, jsonb), api.market_upsert_bars(text, jsonb),
  api.market_upsert_fx_daily(jsonb), api.market_report(int), api.market_split_check(int, numeric)
  from anon, authenticated;
grant execute on function api.market_quota_take(text, int), api.market_targets(text, int),
  api.market_mark(text, boolean, jsonb, int), api.market_vendor_error(text),
  api.market_upsert_quotes(text, jsonb), api.market_upsert_bars(text, jsonb),
  api.market_upsert_fx_daily(jsonb), api.market_report(int), api.market_split_check(int, numeric)
  to service_role;
grant execute on function api.get_markets(text), api.get_asset(text, text, text), api.search_instruments(text)
  to authenticated, service_role;
revoke all on function api.get_markets(text), api.get_asset(text, text, text), api.search_instruments(text) from anon;
grant execute on function ops.health_check() to service_role;
