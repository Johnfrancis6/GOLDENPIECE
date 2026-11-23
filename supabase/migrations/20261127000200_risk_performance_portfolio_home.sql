-- B4: screen RPCs on batch outputs. API.md §2.2 (get_home, BACKEND_NEEDS #1-#5),
-- §2.4 (get_portfolio, upsert_debt #7), §2.7 (get_risk, set_concentration_threshold),
-- §2.8 (get_performance, get_performance_custom). Finance conventions: batch/goldenpiece/analytics/finance.py.

-- ── live values (today's quotes and rates) ─────────────────────────────────
create function core.last_price(p_instrument text) returns numeric
language sql stable set search_path = '' as $$
  select coalesce((select price from mkt.quotes_latest where instrument_id = p_instrument),
                  (select c from mkt.bars_daily where instrument_id = p_instrument order by d desc limit 1))
$$;

-- Positions of a user: weighted-average cost (core.position_of, B3) + today's price.
create function core.positions_live(p_user uuid, p_ref text)
returns table (instrument_id text, qty numeric, currency text, avg_cost_minor numeric, cost_minor numeric,
               realised_minor numeric, last_price numeric, value_minor bigint, value_ref bigint)
language sql stable security definer set search_path = '' as $$
  select t.instrument_id, (p ->> 'qty')::numeric, i.currency, (p ->> 'avg_cost_minor')::numeric,
         (p ->> 'cost_minor')::numeric, (p ->> 'realised_minor')::numeric, lp.price,
         round((p ->> 'qty')::numeric * lp.price * 10::numeric ^ core.ccy_exp(i.currency))::bigint,
         core.conv_minor((p ->> 'qty')::numeric * lp.price * 10::numeric ^ core.ccy_exp(i.currency), i.currency, p_ref)
  from (select distinct tr.instrument_id from core.trades tr where tr.user_id = p_user) t
  join mkt.instruments i on i.id = t.instrument_id
  cross join lateral core.position_of(p_user, t.instrument_id) p
  cross join lateral (select core.last_price(t.instrument_id) as price) lp
$$;

-- Not granted to users: position_of does not check the caller.
create view core.positions_v as
  select t.user_id, t.instrument_id, (p ->> 'qty')::numeric as qty, (p ->> 'avg_cost_minor')::numeric as avg_cost_minor,
         (p ->> 'realised_minor')::numeric as realised_pnl_minor, p ->> 'currency' as currency
  from (select distinct user_id, instrument_id from core.trades) t
  cross join lateral core.position_of(t.user_id, t.instrument_id) p;

create function core.networth_live(p_user uuid, p_ref text) returns jsonb
language sql stable security definer set search_path = '' as $$
  with acc as (select coalesce(sum(core.conv_minor(balance_minor, currency, p_ref)) filter (where kind = 'bank'), 0) bank,
                      coalesce(sum(core.conv_minor(balance_minor, currency, p_ref)) filter (where kind = 'momo'), 0) momo,
                      coalesce(sum(core.conv_minor(balance_minor, currency, p_ref)) filter (where kind = 'cash'), 0) cash
               from core.accounts where user_id = p_user),
       pos as (select coalesce(sum(value_ref), 0) v from core.positions_live(p_user, p_ref) where qty > 0),
       re as (select coalesce(sum(core.conv_minor(v.value_minor, r.currency, p_ref)), 0) v
              from core.real_estate r
              cross join lateral (select value_minor from core.real_estate_valuations x
                                  where x.real_estate_id = r.id and x.valued_on <= current_date
                                  order by valued_on desc, created_at desc limit 1) v
              where r.user_id = p_user),
       dbt as (select coalesce(sum(core.conv_minor(balance_minor, currency, p_ref)), 0) v
               from core.debts where user_id = p_user)
  select jsonb_build_object('assets', acc.bank + acc.momo + acc.cash + pos.v + re.v, 'liabilities', dbt.v,
                            'net', acc.bank + acc.momo + acc.cash + pos.v + re.v - dbt.v)
  from acc, pos, re, dbt
$$;

-- ── get_portfolio (P1-P2) ──────────────────────────────────────────────────
create function api.get_portfolio(p_etag text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ref text; v_lang text; v jsonb; v_pos jsonb; v_re jsonb; v_debts jsonb; v_alloc jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select ref_currency, language into v_ref, v_lang from core.profiles where user_id = uid;
  if v_ref is null then perform core.api_error('NOT_FOUND', 'profile.missing'); end if;

  create temp table if not exists _gp_pf (key text, class text, currency text, country text, value_ref bigint) on commit drop;
  truncate _gp_pf;

  select coalesce(jsonb_agg(jsonb_build_object(
      'instrument_id', p.instrument_id,
      'name', case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end,
      'class', i.asset_class, 'currency', p.currency, 'qty', round(p.qty, 10),
      'avg_cost', jsonb_build_object('m', round(p.avg_cost_minor), 'c', p.currency),
      'last_price', p.last_price, 'price_as_of', coalesce(q.as_of, (select max(d) from mkt.bars_daily b where b.instrument_id = p.instrument_id)::timestamptz),
      'freshness', mkt.freshness(i),
      'value', jsonb_build_object('m', p.value_minor, 'c', p.currency, 'r', p.value_ref),
      'value_ref', p.value_ref,
      'unrealised', jsonb_build_object('m', p.value_minor - round(p.cost_minor), 'c', p.currency,
                                       'r', core.conv_minor(p.value_minor - p.cost_minor, p.currency, v_ref)),
      'unrealised_pct', case when p.cost_minor > 0 then round((p.value_minor / p.cost_minor - 1) * 100, 2) end,
      'realised', jsonb_build_object('m', round(p.realised_minor), 'c', p.currency,
                                     'r', core.conv_minor(p.realised_minor, p.currency, v_ref)),
      'proxy_of', i.proxy_of) order by p.value_ref desc nulls last), '[]')
    into v_pos
  from core.positions_live(uid, v_ref) p
  join mkt.instruments i on i.id = p.instrument_id
  left join mkt.quotes_latest q on q.instrument_id = p.instrument_id
  where p.qty > 0 or p.realised_minor <> 0;

  insert into _gp_pf select p.instrument_id, i.asset_class, p.currency, coalesce(i.country, 'INTL'), p.value_ref
    from core.positions_live(uid, v_ref) p join mkt.instruments i on i.id = p.instrument_id where p.qty > 0;

  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'country', r.country, 'currency', r.currency,
           'value', jsonb_build_object('m', v.value_minor, 'c', r.currency, 'r', core.conv_minor(v.value_minor, r.currency, v_ref)),
           'value_ref', core.conv_minor(v.value_minor, r.currency, v_ref), 'valued_on', v.valued_on,
           'stale', v.valued_on < current_date - 365, 'row_version', r.row_version) order by r.name), '[]')
    into v_re
  from core.real_estate r
  left join lateral (select value_minor, valued_on from core.real_estate_valuations x where x.real_estate_id = r.id
                     order by valued_on desc, created_at desc limit 1) v on true
  where r.user_id = uid;
  insert into _gp_pf select 'RE:' || r.id, 'real_estate', r.currency, coalesce(r.country, 'INTL'),
         core.conv_minor(v.value_minor, r.currency, v_ref)
    from core.real_estate r
    join lateral (select value_minor from core.real_estate_valuations x where x.real_estate_id = r.id
                  order by valued_on desc, created_at desc limit 1) v on true
   where r.user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'lender', d.lender, 'currency', d.currency,
           'balance', jsonb_build_object('m', d.balance_minor, 'c', d.currency, 'r', core.conv_minor(d.balance_minor, d.currency, v_ref)),
           'balance_ref', core.conv_minor(d.balance_minor, d.currency, v_ref),
           'principal', jsonb_build_object('m', d.principal_minor, 'c', d.currency),
           'rate_bp', d.annual_rate_bp,
           'monthly_payment', case when d.monthly_payment_minor is not null then
              jsonb_build_object('m', d.monthly_payment_minor, 'c', d.currency) end,
           'start_date', d.start_date, 'end_date', d.end_date, 'row_version', d.row_version) order by d.name), '[]')
    into v_debts
  from core.debts d where d.user_id = uid;

  select jsonb_build_object(
    'class', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'value_ref', s, 'share', round(s::numeric / nullif(t, 0), 4)) order by s desc)
                       from (select class k, sum(value_ref) s, sum(sum(value_ref)) over () t from _gp_pf group by 1) a), '[]'),
    'currency', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'value_ref', s, 'share', round(s::numeric / nullif(t, 0), 4)) order by s desc)
                       from (select currency k, sum(value_ref) s, sum(sum(value_ref)) over () t from _gp_pf group by 1) a), '[]'),
    'country', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'value_ref', s, 'share', round(s::numeric / nullif(t, 0), 4)) order by s desc)
                       from (select country k, sum(value_ref) s, sum(sum(value_ref)) over () t from _gp_pf group by 1) a), '[]'))
    into v_alloc;

  v := jsonb_build_object('ref_currency', v_ref, 'positions', v_pos, 'real_estate', v_re, 'debts', v_debts,
    'allocation', v_alloc,
    'totals', jsonb_build_object(
      'positions_ref', (select coalesce(sum(value_ref), 0) from _gp_pf where class <> 'real_estate'),
      'real_estate_ref', (select coalesce(sum(value_ref), 0) from _gp_pf where class = 'real_estate'),
      'debts_ref', (select coalesce(sum(core.conv_minor(balance_minor, currency, v_ref)), 0) from core.debts where user_id = uid),
      'investments_ref', (select coalesce(sum(value_ref), 0) from _gp_pf)));
  return core.envelope(p_etag, v);
end $$;

-- ── upsert_debt (#7 lender) ────────────────────────────────────────────────
create function api.upsert_debt(p_client_id uuid, p_id uuid, p_name text, p_currency text, p_principal_minor bigint,
                                p_balance_minor bigint, p_lender text default null, p_annual_rate_bp int default null,
                                p_monthly_payment_minor bigint default null, p_start_date date default null,
                                p_end_date date default null, p_base_version int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_res jsonb; d core.debts;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select result into v_res from ops.idempotency where client_id = p_client_id and user_id = uid;
  if found then return v_res; end if;
  if p_id is null or coalesce(length(trim(p_name)), 0) not between 1 and 80 or p_currency not in ('XOF','XAF','EUR','USD')
     or p_principal_minor is null or p_principal_minor < 0 or p_balance_minor is null or p_balance_minor < 0
     or length(coalesce(p_lender, '')) > 80 or coalesce(p_annual_rate_bp, 0) not between 0 and 10000
     or coalesce(p_monthly_payment_minor, 0) < 0 or (p_start_date is not null and p_end_date is not null and p_end_date < p_start_date) then
    perform core.api_error('INVALID', 'debt.invalid');
  end if;
  select * into d from core.debts where id = p_id for update;
  if found and d.user_id <> uid then perform core.api_error('NOT_FOUND', 'debt.not_found'); end if;
  if found and p_base_version is not null and d.row_version <> p_base_version then
    v_res := jsonb_build_object('status', 'conflict', 'current', to_jsonb(d) - 'user_id');
  elsif found then
    update core.debts set name = trim(p_name), lender = nullif(trim(p_lender), ''), currency = p_currency,
      principal_minor = p_principal_minor, balance_minor = p_balance_minor, annual_rate_bp = p_annual_rate_bp,
      monthly_payment_minor = p_monthly_payment_minor, start_date = p_start_date, end_date = p_end_date,
      row_version = row_version + 1
    where id = p_id returning * into d;
    v_res := jsonb_build_object('status', 'applied', 'id', d.id, 'row_version', d.row_version);
  else
    insert into core.debts (id, user_id, name, lender, currency, principal_minor, balance_minor, annual_rate_bp,
                            monthly_payment_minor, start_date, end_date)
    values (p_id, uid, trim(p_name), nullif(trim(p_lender), ''), p_currency, p_principal_minor, p_balance_minor,
            p_annual_rate_bp, p_monthly_payment_minor, p_start_date, p_end_date) returning * into d;
    v_res := jsonb_build_object('status', 'applied', 'id', d.id, 'row_version', d.row_version);
  end if;
  insert into ops.idempotency (client_id, user_id, rpc, result) values (p_client_id, uid, 'upsert_debt', v_res);
  return v_res;
end $$;

-- ── get_risk (P8) ──────────────────────────────────────────────────────────
create function core.risk_minimums() returns jsonb language sql immutable set search_path = '' as $$
  select '{"vol_returns": 60, "beta_returns": 120, "var_returns": 250, "var_overlap_returns": 500,
           "drawdown_days": 30, "confidence": 0.95, "month_days": 21, "lookback_years": 3}'::jsonb
$$;

create function core.concentration(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with p as (select p.concentration_threshold_pct thr, p.language lang, p.ref_currency ref from core.profiles p where p.user_id = p_user),
       pos as (select l.instrument_id as key, case when (select lang from p) = 'en' then coalesce(i.name_en, i.name) else i.name end as name,
                      l.value_ref as v
               from core.positions_live(p_user, (select ref from p)) l join mkt.instruments i on i.id = l.instrument_id
               where l.qty > 0 and l.value_ref > 0
               union all
               select 'RE:' || r.id, r.name, core.conv_minor(v.value_minor, r.currency, (select ref from p))
               from core.real_estate r
               join lateral (select value_minor from core.real_estate_valuations x where x.real_estate_id = r.id
                             order by valued_on desc, created_at desc limit 1) v on true
               where r.user_id = p_user and v.value_minor > 0),
       s as (select key, name, v, v::numeric / nullif(sum(v) over (), 0) share from pos)
  select jsonb_build_object('threshold_pct', (select thr from p),
    'breaches', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'name', name, 'share', round(share, 4), 'value_ref', v)
                                           order by share desc)
                          from s where share * 100 > (select thr from p)), '[]'))
$$;

create function api.get_risk(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_asof date; v jsonb; v_n int; v_step int; v_lang text;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select language into v_lang from core.profiles where user_id = uid;
  select max(as_of) into v_asof from analytics.risk_metrics where user_id = uid;
  select count(*) into v_n from analytics.drawdown_series where user_id = uid;
  v_step := greatest(1, ceil(v_n / 260.0)::int);
  v := jsonb_build_object(
    'as_of', v_asof,
    'status', case when v_asof is null then 'pending' else 'ok' end,
    'figures', coalesce((select jsonb_agg(jsonb_build_object('metric', m.metric, 'value', m.value,
                  'value_ref', m.value_ref_minor, 'n_obs', m.n_obs, 'method_key', m.method, 'status', m.status)
                  order by array_position(array['vol_ann','beta','var95_1d','cvar95_1d','var95_1m','cvar95_1m','max_drawdown'], m.metric))
               from analytics.risk_metrics m where m.user_id = uid and m.as_of = v_asof and m.scope = 'portfolio'
                 and m.metric in ('vol_ann','beta','var95_1d','cvar95_1d','var95_1m','cvar95_1m','max_drawdown')), '[]'),
    'var_details', (select jsonb_build_object('var95_1m_hist', m.value, 'value_ref', m.value_ref_minor, 'n_windows', m.n_obs)
                    from analytics.risk_metrics m where m.user_id = uid and m.as_of = v_asof and m.scope = 'portfolio'
                      and m.metric = 'var95_1m_hist' and m.status = 'ok'),
    'betas', coalesce((select jsonb_agg(jsonb_build_object('instrument_id', m.scope, 'beta', m.value, 'n_obs', m.n_obs) order by m.scope)
                       from analytics.risk_metrics m where m.user_id = uid and m.as_of = v_asof and m.metric = 'beta'
                         and m.scope <> 'portfolio'), '[]'),
    'drawdown', coalesce((select jsonb_agg(jsonb_build_array(d, round(drawdown::numeric, 4)) order by d)
                          from (select d, drawdown, row_number() over (order by d desc) rn
                                from analytics.drawdown_series where user_id = uid) x
                          where (rn - 1) % v_step = 0), '[]'),
    'exposures', (select jsonb_object_agg(axis, items) from (
                    select axis, jsonb_agg(jsonb_build_object('key', key, 'value_ref', value_ref_minor, 'share', round(share::numeric, 4))
                                           order by share desc) items
                    from analytics.exposures where user_id = uid and as_of = (select max(as_of) from analytics.exposures where user_id = uid)
                    group by axis) e),
    'concentration', core.concentration(uid),
    'excluded', coalesce((select jsonb_agg(jsonb_build_object(
                    'key', m.scope,
                    'name', coalesce(case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end,
                                     (select r.name from core.real_estate r where 'RE:' || r.id = m.scope), m.scope),
                    'value_ref', m.value_ref_minor,
                    'reason', case m.method when 'risk.excluded.real_estate' then 'real_estate'
                                            when 'risk.excluded.monthly_price' then 'monthly_price'
                                            else 'insufficient_history' end) order by m.value_ref_minor desc)
                  from analytics.risk_metrics m left join mkt.instruments i on i.id = m.scope
                  where m.user_id = uid and m.as_of = v_asof and m.metric = 'excluded'), '[]'),
    'minimums', core.risk_minimums());
  return core.envelope(p_etag, v, coalesce(v_asof::timestamptz, now()));
end $$;

create function api.set_concentration_threshold(p_pct int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_pct is null or p_pct not between 5 and 100 then perform core.api_error('INVALID', 'concentration.threshold'); end if;
  update core.profiles set concentration_threshold_pct = p_pct where user_id = uid;
  return jsonb_build_object('status', 'applied', 'threshold_pct', p_pct, 'concentration', core.concentration(uid));
end $$;

-- ── performance ────────────────────────────────────────────────────────────
create function core.instrument_name(p_id text, p_lang text) returns text
language sql stable set search_path = '' as $$
  select case when p_lang = 'en' then coalesce(name_en, name) else name end from mkt.instruments where id = p_id
$$;

create function api.get_performance(p_period text default '1Y', p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_lang text; v_ref text; p analytics.performance; v jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_period not in ('1M','YTD','1Y','ITD') then perform core.api_error('INVALID', 'performance.period'); end if;
  select language, ref_currency into v_lang, v_ref from core.profiles where user_id = uid;
  select * into p from analytics.performance where user_id = uid and period = p_period order by as_of desc limit 1;
  if p.user_id is null then
    v := jsonb_build_object('period', p_period, 'status', 'pending', 'ref_currency', v_ref);
    return core.envelope(p_etag, v);
  end if;
  v := jsonb_build_object('period', p_period, 'start', p.start_d, 'end', p.as_of, 'ref_currency', v_ref,
    'twr', p.twr, 'irr', p.irr, 'annualised', p.annualised, 'pnl_ref', p.pnl_ref_minor, 'status', p.status,
    'contributions', jsonb_build_object(
      'instrument', coalesce((select jsonb_agg(jsonb_build_object('key', a.key, 'name', core.instrument_name(a.key, v_lang),
                        'avg_weight', a.avg_weight, 'return_local', a.return_local, 'return_ref', a.return_ref,
                        'contribution', a.contribution, 'currency_effect', a.currency_effect) order by a.contribution desc)
                      from analytics.attribution a where a.user_id = uid and a.period = p_period and a.as_of = p.as_of
                        and a.level = 'instrument'), '[]'),
      'class', coalesce((select jsonb_agg(jsonb_build_object('key', a.key, 'name', a.key,
                        'avg_weight', a.avg_weight, 'return_local', a.return_local, 'return_ref', a.return_ref,
                        'contribution', a.contribution, 'currency_effect', a.currency_effect) order by a.contribution desc)
                      from analytics.attribution a where a.user_id = uid and a.period = p_period and a.as_of = p.as_of
                        and a.level = 'class'), '[]')),
    'currency_effect_total', (select sum(a.currency_effect) from analytics.attribution a where a.user_id = uid
                                and a.period = p_period and a.as_of = p.as_of and a.level = 'class'));
  return core.envelope(p_etag, v, p.as_of::timestamptz);
end $$;

-- Annual IRR of dated flows (t in years). Newton ≤ 50 iterations from 10 %, then bisection
-- on [-0.9999, 10]; null when no sign change. Same algorithm as finance.irr (Python).
create function core.irr(p_t float8[], p_cf float8[]) returns float8
language plpgsql immutable set search_path = '' as $$
declare r float8 := 0.1; nr float8; val float8; der float8; b float8; i int; k int;
        lo float8 := -0.9999; hi float8 := 10; flo float8 := 0; fhi float8 := 0; fm float8; mid float8;
begin
  if not (exists (select 1 from unnest(p_cf) c where c > 0) and exists (select 1 from unnest(p_cf) c where c < 0)) then
    return null;
  end if;
  for k in 1..50 loop
    b := 1 + r;
    exit when b <= 0;
    val := 0; der := 0;
    for i in 1..cardinality(p_t) loop
      val := val + p_cf[i] * b ^ (-p_t[i]);
      der := der - p_t[i] * p_cf[i] * b ^ (-p_t[i] - 1);
    end loop;
    exit when der = 0;
    nr := r - val / der;
    exit when nr <= -0.9999 or nr = 'NaN'::float8 or abs(nr) = 'Infinity'::float8;
    if abs(nr - r) < 1e-10 then return nr; end if;
    r := nr;
  end loop;
  for i in 1..cardinality(p_t) loop
    flo := flo + p_cf[i] * (1 + lo) ^ (-p_t[i]);
    fhi := fhi + p_cf[i] * (1 + hi) ^ (-p_t[i]);
  end loop;
  if flo * fhi > 0 then return null; end if;
  for k in 1..200 loop
    mid := (lo + hi) / 2; fm := 0;
    for i in 1..cardinality(p_t) loop fm := fm + p_cf[i] * (1 + mid) ^ (-p_t[i]); end loop;
    if fm = 0 or hi - lo < 1e-10 then return mid; end if;
    if flo * fm < 0 then hi := mid; else lo := mid; flo := fm; end if;
  end loop;
  return (lo + hi) / 2;
exception when numeric_value_out_of_range or floating_point_exception then
  return null;
end $$;

-- Performance between two dates from analytics.portfolio_daily (market instruments only).
-- Shared by api.get_performance_custom and the parity test (Python batch vs SQL).
create function core.performance_between(p_user uuid, p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_lang text; v_ref text; v_n int := p_to - p_from + 1; v jsonb; v_twr float8; v_vs float8; v_ve float8;
        v_f float8; v_t float8[]; v_cf float8[]; v_irr float8; v_has boolean;
begin
  select language, ref_currency into v_lang, v_ref from core.profiles where user_id = p_user;
  create temp table if not exists _gp_perf (instrument_id text, cls text, d date, den float8, rr float8, rl float8,
                                            vr float8, fr float8) on commit drop;
  truncate _gp_perf;
  insert into _gp_perf
  with inst as (select distinct p.instrument_id, i.asset_class from analytics.portfolio_daily p
                join mkt.instruments i on i.id = p.instrument_id
                where p.user_id = p_user and p.d between p_from - 1 and p_to),
       days as (select generate_series(p_from - 1, p_to, interval '1 day')::date d),
       g as (select i.instrument_id, i.asset_class, dd.d,
                    coalesce(p.value_ref_minor, 0)::float8 vr, coalesce(p.flow_ref_minor, 0)::float8 fr,
                    coalesce(p.value_local_minor, 0)::float8 vl, coalesce(p.flow_local_minor, 0)::float8 fl
             from inst i cross join days dd
             left join analytics.portfolio_daily p on p.user_id = p_user and p.instrument_id = i.instrument_id and p.d = dd.d),
       l as (select g.*, lag(vr) over w pvr, lag(vl) over w pvl from g window w as (partition by instrument_id order by d))
  select instrument_id, asset_class, d, pvr + greatest(fr, 0),
         case when pvr + greatest(fr, 0) > 1e-9 then (vr - pvr - fr) / (pvr + greatest(fr, 0)) else 0 end,
         case when pvl + greatest(fl, 0) > 1e-9 then (vl - pvl - fl) / (pvl + greatest(fl, 0)) else 0 end,
         vr, fr
  from l where d >= p_from;

  select bool_or(den > 1e-9) into v_has from _gp_perf;
  if not coalesce(v_has, false) then
    return jsonb_build_object('period', 'custom', 'start', p_from, 'end', p_to, 'ref_currency', v_ref,
      'status', 'insufficient', 'twr', null, 'irr', null, 'annualised', v_n >= 365, 'pnl_ref', null,
      'contributions', jsonb_build_object('instrument', '[]'::jsonb, 'class', '[]'::jsonb), 'currency_effect_total', null);
  end if;

  -- TWR
  with t as (select d, sum(den) dt from _gp_perf group by d),
       rp as (select x.d, sum(case when t.dt > 1e-9 then x.den / t.dt * x.rr else 0 end) r
              from _gp_perf x join t using (d) group by x.d)
  select exp(sum(ln(greatest(1 + r, 1e-12)))) - 1 into v_twr from rp;

  -- IRR flows: buys at the start of their day, sells at its end (finance.period_irr)
  select coalesce(sum(p.value_ref_minor), 0) into v_vs from analytics.portfolio_daily p
   join mkt.instruments i on i.id = p.instrument_id where p.user_id = p_user and p.d = p_from - 1;
  select coalesce(sum(vr), 0) into v_ve from _gp_perf where d = p_to;
  select coalesce(sum(fr), 0) into v_f from _gp_perf;
  select array[0::float8] || coalesce(array_agg(case when f > 0 then (d - p_from)::float8 else (d - p_from + 1)::float8 end / 365 order by d), '{}')
                          || array[v_n::float8 / 365],
         array[-v_vs] || coalesce(array_agg(-f order by d), '{}') || array[v_ve]
    into v_t, v_cf
  from (select d, sum(fr) f from _gp_perf group by d having sum(fr) <> 0) x;
  v_irr := core.irr(v_t, v_cf);
  if v_irr is not null and v_n < 365 then v_irr := (1 + v_irr) ^ (v_n / 365.0) - 1; end if;

  with t as (select d, sum(den) dt from _gp_perf group by d),
       w as (select x.*, case when t.dt > 1e-9 then x.den / t.dt else 0 end wt, t.dt > 1e-9 act
             from _gp_perf x join t using (d)),
       ins as (select instrument_id k, cls, avg(wt) filter (where act) aw,
                      exp(sum(ln(greatest(1 + rl, 1e-12)))) - 1 rlo, exp(sum(ln(greatest(1 + rr, 1e-12)))) - 1 rre,
                      sum(wt * rr) c, sum(wt * (rr - rl)) ce, bool_or(den > 0) held
               from w group by instrument_id, cls),
       cd as (select cls, d, sum(den) dc, sum(wt) wsum, sum(wt * rr) c, sum(wt * (rr - rl)) ce,
                     bool_or(act) act, sum(den * rr) nrr, sum(den * rl) nrl from w group by cls, d),
       cl as (select cls k, avg(wsum) filter (where act) aw,
                      exp(sum(ln(greatest(1 + case when dc > 1e-9 then nrl / dc else 0 end, 1e-12)))) - 1 rlo,
                      exp(sum(ln(greatest(1 + case when dc > 1e-9 then nrr / dc else 0 end, 1e-12)))) - 1 rre,
                      sum(c) c, sum(ce) ce, bool_or(dc > 0) held
               from cd group by cls)
  select jsonb_build_object(
      'instrument', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'name', core.instrument_name(k, v_lang),
                       'avg_weight', round(aw::numeric, 6), 'return_local', round(rlo::numeric, 6), 'return_ref', round(rre::numeric, 6),
                       'contribution', round(c::numeric, 6), 'currency_effect', round(ce::numeric, 6)) order by c desc)
                     from ins where held), '[]'),
      'class', coalesce((select jsonb_agg(jsonb_build_object('key', k, 'name', k,
                       'avg_weight', round(aw::numeric, 6), 'return_local', round(rlo::numeric, 6), 'return_ref', round(rre::numeric, 6),
                       'contribution', round(c::numeric, 6), 'currency_effect', round(ce::numeric, 6)) order by c desc)
                     from cl where held), '[]'),
      'ce_total', (select round(sum(ce)::numeric, 6) from cl))
    into v;

  return jsonb_build_object('period', 'custom', 'start', p_from, 'end', p_to, 'ref_currency', v_ref, 'status', 'ok',
    'twr', round((case when v_n >= 365 then (1 + v_twr) ^ (365.0 / v_n) - 1 else v_twr end)::numeric, 8),
    'irr', round(v_irr::numeric, 8), 'annualised', v_n >= 365,
    'pnl_ref', round(v_ve - v_vs - v_f)::bigint,
    'contributions', v - 'ce_total', 'currency_effect_total', v -> 'ce_total');
end $$;

create function api.get_performance_custom(p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_last date;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select max(d) into v_last from analytics.portfolio_daily where user_id = uid;
  if p_from is null or p_to is null or p_from >= p_to or p_to - p_from > 731 or p_to > current_date then
    perform core.api_error('INVALID', 'performance.custom_range');
  end if;
  if not ops.rate_limit('perf_custom:' || uid, 20, 3600) then
    perform core.api_error('RATE_LIMITED', 'performance.rate_limited', 180);
  end if;
  return jsonb_build_object('as_of', v_last, 'data', core.performance_between(uid, p_from, least(p_to, coalesce(v_last, p_to))));
end $$;

-- ── get_home (§2.2 + BACKEND_NEEDS #1-#5) ───────────────────────────────────
create function api.get_home(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pr core.profiles; v jsonb; v_nw jsonb; v_month date; v_m0 timestamptz; v_m1 timestamptz;
        v_prev_day bigint; v_prev_month bigint; v_net bigint; v_usd numeric;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select * into pr from core.profiles where user_id = uid;
  if pr.user_id is null then perform core.api_error('NOT_FOUND', 'profile.missing'); end if;
  v_month := date_trunc('month', now() at time zone pr.timezone)::date;
  v_m0 := v_month::timestamp at time zone pr.timezone;
  v_m1 := (v_month + interval '1 month')::timestamp at time zone pr.timezone;
  v_nw := core.networth_live(uid, pr.ref_currency);
  v_net := (v_nw ->> 'net')::bigint;
  select net_minor into v_prev_day from analytics.networth_daily
   where user_id = uid and ref_currency = pr.ref_currency and d < (now() at time zone pr.timezone)::date order by d desc limit 1;
  select net_minor into v_prev_month from analytics.networth_daily
   where user_id = uid and ref_currency = pr.ref_currency and d <= (now() at time zone pr.timezone)::date - 30 order by d desc limit 1;
  v_usd := (select rate from mkt.fx_latest where quote = 'USD');

  v := jsonb_build_object(
    'ref_currency', pr.ref_currency,
    'networth', jsonb_build_object('net', v_net, 'assets', (v_nw ->> 'assets')::bigint,
        'liabilities', (v_nw ->> 'liabilities')::bigint,
        'change_day', case when v_prev_day is not null then jsonb_build_object('abs', v_net - v_prev_day,
            'pct', case when v_prev_day <> 0 then round((v_net - v_prev_day)::numeric / abs(v_prev_day) * 100, 2) end) end,
        'change_month', case when v_prev_month is not null then jsonb_build_object('abs', v_net - v_prev_month,
            'pct', case when v_prev_month <> 0 then round((v_net - v_prev_month)::numeric / abs(v_prev_month) * 100, 2) end) end,
        'series_as_of', (select max(d) from analytics.networth_daily where user_id = uid)),
    'spark_30d', coalesce((select jsonb_agg(jsonb_build_array(d, net_minor) order by d) from (
                   select d, net_minor from analytics.networth_daily where user_id = uid and ref_currency = pr.ref_currency
                   order by d desc limit 30) s), '[]'),
    'alerts', jsonb_build_object(
        'open_count', (select count(*) from core.alerts where user_id = uid and status in ('open', 'awaiting_user', 'escalated', 'in_review')),
        'to_confirm_count', (select count(*) from core.alerts where user_id = uid and status = 'awaiting_user'),
        'top', (select jsonb_build_object('id', a.id, 'kind', a.kind, 'band', a.band, 'score', a.score, 'status', a.status,
                       'reason', a.reasons -> 0, 'created_at', a.created_at)
                from core.alerts a where a.user_id = uid and a.status in ('open', 'awaiting_user', 'escalated', 'in_review')
                order by (a.status = 'awaiting_user') desc, a.score desc nulls last, a.created_at desc limit 1)),
    'budget', (with b as (select distinct on (category_id) category_id, core.conv_minor(amount_minor, currency, pr.ref_currency) amt
                          from core.budgets where user_id = uid and (month = v_month or (month is null and recurring))
                          order by category_id, month nulls last),
                    s as (select b.category_id, b.amt, coalesce((select sum(core.conv_minor(t.amount_minor, t.currency, pr.ref_currency))
                            from core.transactions t where t.user_id = uid and t.status = 'BOOK' and t.cdt_dbt_ind = 'DBIT'
                              and t.booking_ts >= v_m0 and t.booking_ts < v_m1
                              and (t.category_id = b.category_id or t.category_id like b.category_id || '.%')), 0) spent from b)
               select case when count(*) = 0 then null else jsonb_build_object('month', v_month, 'spent', sum(spent),
                        'budgeted', sum(amt), 'left', sum(amt) - sum(spent),
                        'worst', (select jsonb_build_object('category_id', category_id, 'pct', round(spent::numeric / amt * 100))
                                  from s order by spent::numeric / amt desc limit 1)) end from s),
    'market_strip', coalesce((select jsonb_agg(jsonb_build_object('instrument_id', i.id,
                       'name', case when pr.language = 'en' then coalesce(i.name_en, i.name) else i.name end,
                       'price', q.price, 'change_pct', q.change_pct, 'as_of', q.as_of, 'delayed', true,
                       'freshness', mkt.freshness(i), 'proxy_of', i.proxy_of) order by x.ord)
                     from unnest(array['SPY','XAU','COCOA','BTC','EURXOF']) with ordinality x(id, ord)
                     join mkt.instruments i on i.id = x.id join mkt.quotes_latest q on q.instrument_id = i.id), '[]'),
    'learning', coalesce((select jsonb_build_object('active', l.active, 'days', l.days, 'ops', l.ops_count)
                          from analytics.learning_status l where l.user_id = uid), '{"active": false, "days": 0, "ops": 0}'::jsonb),
    'fx', jsonb_build_object('XOF', 1, 'XAF', 1, 'EUR', 655.957,
                             'USD', case when v_usd is not null then round(655.957 / v_usd, 4) end),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'display_name', a.display_name,
                       'institution', a.institution, 'currency', a.currency,
                       'balance', jsonb_build_object('m', a.balance_minor, 'c', a.currency),
                       'balance_ref', core.conv_minor(a.balance_minor, a.currency, pr.ref_currency)) order by a.created_at, a.id)
                     from (select * from core.accounts where user_id = uid order by created_at, id limit 8) a), '[]'),
    'counts', jsonb_build_object('accounts', (select count(*) from core.accounts where user_id = uid),
                                 'positions', (select count(*) from core.positions_live(uid, pr.ref_currency) where qty > 0)),
    'top_mover', (select jsonb_build_object('instrument_id', i.id,
                     'name', case when pr.language = 'en' then coalesce(i.name_en, i.name) else i.name end,
                     'change_30d_pct', round((p1.c / p0.c - 1) * 100, 2),
                     'spark_30d', (select jsonb_agg(c order by d) from (select d, c from mkt.bars_daily b
                                     where b.instrument_id = i.id order by d desc limit 30) s))
                  from core.positions_live(uid, pr.ref_currency) l
                  join mkt.instruments i on i.id = l.instrument_id
                  cross join lateral (select c from mkt.bars_daily b where b.instrument_id = i.id order by d desc limit 1) p1
                  cross join lateral (select c from mkt.bars_daily b where b.instrument_id = i.id
                                        and b.d <= current_date - 30 order by d desc limit 1) p0
                  where l.qty > 0 and p0.c > 0
                  order by abs(p1.c / p0.c - 1) desc limit 1),
    'top_category', (with m as (select split_part(t.category_id, '.', 1) cat,
                                       sum(core.conv_minor(t.amount_minor, t.currency, pr.ref_currency)) spent
                                from core.transactions t where t.user_id = uid and t.status = 'BOOK' and t.cdt_dbt_ind = 'DBIT'
                                  and t.booking_ts >= v_m0 and t.booking_ts < v_m1 and t.category_id is not null
                                  and split_part(t.category_id, '.', 1) not in ('income', 'savings', 'transfers')
                                group by 1)
                     select jsonb_build_object('category_id', cat, 'spent_ref', spent,
                              'share', round(spent::numeric / nullif((select sum(spent) from m), 0), 4))
                     from m order by spent desc limit 1),
    'uncategorised_count', (select count(*) from core.transactions t where t.user_id = uid and t.category_source = 'none'
                              and t.booking_ts >= v_m0 and t.booking_ts < v_m1));
  return core.envelope(p_etag, v);
end $$;

-- ── grants ─────────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function api.get_portfolio(text), api.upsert_debt(uuid, uuid, text, text, bigint, bigint, text, int, bigint, date, date, int),
  api.get_risk(text), api.set_concentration_threshold(int), api.get_performance(text, text),
  api.get_performance_custom(date, date), api.get_home(text) to authenticated;
revoke all on function api.get_portfolio(text), api.upsert_debt(uuid, uuid, text, text, bigint, bigint, text, int, bigint, date, date, int),
  api.get_risk(text), api.set_concentration_threshold(int), api.get_performance(text, text),
  api.get_performance_custom(date, date), api.get_home(text) from anon;
grant execute on function core.performance_between(uuid, date, date), core.irr(float8[], float8[]),
  core.positions_live(uuid, text), core.networth_live(uuid, text), core.concentration(uuid) to service_role;
grant execute on function core.last_price(text), core.instrument_name(text, text), core.risk_minimums() to authenticated, service_role;
