-- Market data (B3): universe, schedule helpers, quotas, service upserts, screen RPCs
-- (API.md §2.4-2.5, ARCHITECTURE §13). Runs on an empty local stack and on dev (rolled back).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
grant usage on schema extensions to anon, authenticated;
select plan(40);

-- universe
select is((select count(*) from mkt.instruments where vendor <> 'derived'), 30::bigint, '30 vendor instruments (ARCHITECTURE §0)');
select is((select count(*) from mkt.instruments where active), 31::bigint, '31 active rows (XAG off: not on the free plan) incl. 2 peg rows');
select ok((select bool_and(exists (select 1 from mkt.instruments i where i.id = x)) from unnest(array['SPY','QQQ','BTC','ETH','GLD']) x),
          'demo trade instruments exist (B2 sim.template_wealth)');
select is((select count(*) from mkt.instruments where active and group_key is null), 0::bigint, 'every active instrument has a group');
select is((select array_agg(distinct asset_class order by asset_class) from mkt.instruments where vendor = 'finnhub'),
          array['etf'], 'Finnhub serves the 12 ETFs only');
select is((select count(*) from mkt.instruments where vendor = 'finnhub'), 12::bigint, '12 ETFs');
select is((select count(*) from mkt.instruments where asset_class = 'crypto'), 8::bigint, '8 crypto');

-- schedule helpers
select is(mkt.expected_bar_date('SPY', '2026-11-23 20:00+00'), '2026-11-20'::date, 'SPY Monday before close+30 → Friday');
select is(mkt.expected_bar_date('SPY', '2026-11-23 22:00+00'), '2026-11-23'::date, 'SPY Monday after 16:30 NY → Monday');
select is(mkt.expected_bar_date('BTC', '2026-11-23 01:00+00'), '2026-11-22'::date, 'crypto → previous UTC day (Sunday)');
select is(mkt.expected_bar_date('EURUSD', '2026-11-23 10:00+00'), '2026-11-20'::date, 'FX → previous weekday');
select ok(mkt.is_open('SPY', 0, '2026-11-23 15:00+00'), 'NYSE open Monday 10:00 NY');
select ok(not mkt.is_open('SPY', 0, '2026-11-22 15:00+00'), 'NYSE closed Sunday');
select ok(mkt.is_open('SPY', 20, '2026-11-23 21:15+00') and not mkt.is_open('SPY', 0, '2026-11-23 21:15+00'), 'grace after close');
select ok(mkt.is_open('BTC', 0, '2026-11-22 03:00+00'), 'crypto always open');
select ok(not mkt.fx_open('2026-11-21 12:00+00') and mkt.fx_open('2026-11-23 12:00+00'), 'FX closed Saturday, open Monday');

-- quotas: per-minute hard limit, daily cap at 50 %
update ops.app_config set value = value || '{"testv": {"per_min": 3, "per_day": 10, "cap": 0.5}}' where key = 'market_quotas';
select ok((api.market_quota_take('testv', 3) ->> 'ok')::boolean, '3 credits fit the minute');
select is(api.market_quota_take('testv', 1) ->> 'reason', 'per_min', '4th credit in the minute refused');
update mkt.quota set bucket = bucket - interval '2 minutes' where vendor = 'testv';
select ok((api.market_quota_take('testv', 2) ->> 'ok')::boolean, 'next minute: 5 of 10 per day (cap 50 %)');
update mkt.quota set bucket = bucket - interval '2 minutes' where vendor = 'testv';
select is(api.market_quota_take('testv', 1) ->> 'reason', 'per_day', 'daily cap reached at 50 %');

-- service upserts on a test instrument
insert into mkt.instruments (id, name, asset_class, currency, vendor, vendor_symbol, frequency, group_key, hist_vendor, hist_symbol, sort, exchange_tz, open_local, close_local)
values ('TSTX', 'Test ETF', 'etf', 'USD', 'finnhub', 'TSTX', 'intraday', 'indices', 'twelvedata', 'TSTX', 999, 'America/New_York', '09:30', '16:00');
select is(api.market_upsert_bars('TSTX', (select jsonb_agg(jsonb_build_object('d', d, 'o', 100, 'h', 101, 'l', 99, 'c', 100 + n))
            from (select (current_date - 400 + n) as d, n from generate_series(0, 401) n) s
            where extract(isodow from d) < 6)) > 250, true, 'bars upserted');
select is((select count(*) from mkt.bars_daily where instrument_id = 'TSTX' and d > mkt.expected_bar_date('TSTX')), 0::bigint,
          'partial (live) bars are not stored');
select is(api.market_upsert_quotes('finnhub', '[{"id":"TSTX","price":512,"change_pct":1.23456,"as_of":"2026-11-23T15:00:00Z"},{"id":"NOPE","price":1,"as_of":"2026-11-23T15:00:00Z"}]'),
          1, 'unknown instrument ignored');
select is(api.market_upsert_quotes('finnhub', '[{"id":"TSTX","price":400,"as_of":"2026-11-23T14:00:00Z"}]'), 0, 'older quote does not overwrite');
select is((select change_pct from mkt.quotes_latest where instrument_id = 'TSTX'), 1.2346, 'change rounded to 4 decimals');
select is(api.market_upsert_fx_daily('[{"d":"2026-11-20","quote":"USD","rate":1.25},{"d":"2026-11-20","quote":"XOF","rate":655}]'),
          1, 'pegged currencies never stored');
select ok((select price from mkt.quotes_latest where instrument_id = 'EURXOF') = 655.957, 'EUR/XOF quote = peg');

-- screen RPCs need a user
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mkt@test.invalid', '{"language":"en"}', false, now(), now());
select throws_ok($$set local role anon; select api.get_markets()$$, '42501', null, 'anon cannot read markets');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-0000000000e1","role":"authenticated"}';
select is((select array_agg(g ->> 'key' order by ord) from jsonb_array_elements(api.get_markets() -> 'data' -> 'groups') with ordinality as t(g, ord)),
          array['indices','metals','energy','agri','crypto','fx'], 'groups in screen order');
select is((select jsonb_array_length(i -> 'spark_30d') between 15 and 30 from jsonb_array_elements(api.get_markets() #> '{data,groups,0,items}') i
           where i ->> 'instrument_id' = 'TSTX'), true, 'spark_30d: ≤ 30 daily closes');
select ok((select (i ->> 'change_30d_pct')::numeric > 0 from jsonb_array_elements(api.get_markets() #> '{data,groups,0,items}') i
           where i ->> 'instrument_id' = 'TSTX'), 'change_30d_pct computed');
select is((select i ->> 'name' from jsonb_array_elements(api.get_markets() #> '{data,groups,1,items}') i where i ->> 'instrument_id' = 'XAU'),
          'Gold', 'names in the profile language');
select is((api.get_markets((api.get_markets() ->> 'etag')) ->> 'not_modified')::boolean, true, 'etag → not_modified');
select is(jsonb_array_length(api.get_asset('TSTX', '1Y') #> '{data,candles}') between 240 and 260, true, '1Y: daily candles ≤ 260');
select ok(jsonb_array_length(api.get_asset('TSTX', '5Y') #> '{data,candles}') <= 60
          and api.get_asset('TSTX', '5Y') #>> '{data,interval}' = 'month', '5Y: monthly candles ≤ 60 (BACKEND_NEEDS #8)');
select ok((api.get_asset('TSTX', '1Y') #>> '{data,stats,vol_ann}') is not null, 'vol_ann with ≥ 60 returns');
select throws_ok($$select api.get_asset('TSTX', '2Y')$$, 'PGRST', null, 'invalid range rejected');
select is((select array_agg(e ->> 'id') from jsonb_array_elements(api.search_instruments('bitc')) e), array['BTC'], 'search by name prefix');

reset role;
insert into core.trades (id, user_id, instrument_id, side, trade_date, quantity, price_minor, currency, source) values
 ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000e1', 'TSTX', 'buy', current_date - 100, 2, 1, 'USD', 'demo'),
 ('00000000-0000-4000-b000-0000000000f2', '00000000-0000-4000-b000-0000000000e1', 'TSTX', 'buy', current_date - 100, 2, 1, 'USD', 'manual');
select is((select price_minor from core.trades where id = '00000000-0000-4000-b000-0000000000f1'),
          (select round(c * 100)::bigint from mkt.bars_daily where instrument_id = 'TSTX' and d <= current_date - 100 order by d desc limit 1),
          'demo trade priced at the close on its date');
select is((select price_minor from core.trades where id = '00000000-0000-4000-b000-0000000000f2'), 1::bigint, 'manual trade price kept');

select * from finish();
rollback;
