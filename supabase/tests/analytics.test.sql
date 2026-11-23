-- Batch analytics (B4): recompute queue, dispatch schedule, money helpers, hand-checked
-- performance in SQL (same conventions as batch/goldenpiece/analytics/finance.py), screen RPCs.
-- Runs on an empty local stack and on dev (rolled back). ops.dispatch_batch is NOT called here
-- (on dev it would really call GitHub).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
grant usage on schema extensions to anon, authenticated, batch_writer;
select plan(33);

select ok(exists (select 1 from cron.job where jobname = 'gp-batch' and schedule = '*/5 * * * *'), 'pg_cron gp-batch every 5 min');
select is((select value ->> 'nightly_workflow' from ops.app_config where key = 'batch'), 'batch-nightly.yml', 'batch config');
select has_column('analytics', 'portfolio_daily', 'flow_local_minor', 'local flows stored (currency effect)');

-- money helpers
select is(core.conv_minor(100, 'EUR', 'XOF'), 656::bigint, '1.00 EUR → 656 XOF (peg, rounded)');
select is(core.conv_minor(655957, 'XOF', 'EUR'), 100000::bigint, '655 957 XOF → 1 000.00 EUR');
select is(core.conv_minor(1234, 'XOF', 'XAF'), 1234::bigint, 'XOF = XAF');

-- IRR (annual): -100 now, +110 in a year → 10 %; -100, -100, +231 → 10 %; no sign change → null
select ok(abs(core.irr(array[0, 1]::float8[], array[-100, 110]::float8[]) - 0.10) < 1e-9, 'IRR 10 %');
select ok(abs(core.irr(array[0, 1, 2]::float8[], array[-100, -100, 231]::float8[]) - 0.10) < 1e-9, 'IRR two deposits');
select is(core.irr(array[0, 1]::float8[], array[100, 50]::float8[]), null, 'IRR not computable');
select ok(abs(core.irr(array[0, 1]::float8[], array[-100, 1]::float8[]) + 0.99) < 1e-6, 'IRR −99 % (bisection fallback)');

-- a user
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'b4@test.invalid', '{"language":"fr"}', false, now(), now());
select is((select ref_currency::text from core.profiles where user_id = '00000000-0000-4000-b000-0000000000a4'), 'XOF', 'profile ref XOF');

-- recompute queue trigger
delete from ops.recompute_queue where user_id = '00000000-0000-4000-b000-0000000000a4';
insert into core.trades (id, user_id, instrument_id, side, trade_date, quantity, price_minor, currency, source)
values ('00000000-0000-4000-b000-00000000a401', '00000000-0000-4000-b000-0000000000a4', 'SPY', 'buy', current_date - 10, 2, 50000, 'USD', 'manual');
select is((select reason from ops.recompute_queue where user_id = '00000000-0000-4000-b000-0000000000a4'), 'trades', 'new trade → recompute queued');

-- hand-checked period: buy 1000 (start of day 1) worth 1100, then 1210, then all sold 1331 at the end of day 3
-- r = 10 % each day → TWR = 1.1³ − 1 = 0.331; P/L = 1331 − 1000 = 331; IRR (period) = 0.331; local = ref × 2 → no currency effect
insert into analytics.portfolio_daily (user_id, d, instrument_id, qty, price_local, value_local_minor, value_ref_minor, flow_ref_minor, flow_local_minor) values
 ('00000000-0000-4000-b000-0000000000a4', '2026-01-10', 'SPY', 1, 11, 2200, 1100, 1000, 2000),
 ('00000000-0000-4000-b000-0000000000a4', '2026-01-11', 'SPY', 1, 12.1, 2420, 1210, 0, 0),
 ('00000000-0000-4000-b000-0000000000a4', '2026-01-12', 'SPY', 0, 13.31, 0, 0, -1331, -2662);
select ok(abs((core.performance_between('00000000-0000-4000-b000-0000000000a4', '2026-01-10', '2026-01-12') ->> 'twr')::numeric - 0.331) < 1e-8, 'TWR = 0.331');
select ok(abs((core.performance_between('00000000-0000-4000-b000-0000000000a4', '2026-01-10', '2026-01-12') ->> 'irr')::numeric - 0.331) < 1e-6, 'IRR (period) = 0.331');
select is((core.performance_between('00000000-0000-4000-b000-0000000000a4', '2026-01-10', '2026-01-12') ->> 'pnl_ref')::bigint, 331::bigint, 'P/L = 331');
select ok(abs((core.performance_between('00000000-0000-4000-b000-0000000000a4', '2026-01-10', '2026-01-12') #>> '{contributions,instrument,0,contribution}')::numeric - 0.3) < 1e-6,
          'contribution = Σ w·r = 0.3');
select ok(abs((core.performance_between('00000000-0000-4000-b000-0000000000a4', '2026-01-10', '2026-01-12') #>> '{contributions,instrument,0,currency_effect}')::numeric) < 1e-6,
          'no currency effect when FX is constant');
select is(core.performance_between('00000000-0000-4000-b000-0000000000a4', '2025-01-01', '2025-02-01') ->> 'status', 'insufficient', 'no position → insufficient');

-- batch_writer privileges
set local role batch_writer;
insert into analytics.risk_metrics (user_id, as_of, metric, scope, value, value_ref_minor, n_obs, method, status) values
 ('00000000-0000-4000-b000-0000000000a4', current_date, 'vol_ann', 'portfolio', 0.2, null, 300, 'risk.method.vol_hist', 'ok'),
 ('00000000-0000-4000-b000-0000000000a4', current_date, 'excluded', 'COCOA', null, 1000, 0, 'risk.excluded.monthly_price', 'excluded');
select is((select count(*) from analytics.risk_metrics where user_id = '00000000-0000-4000-b000-0000000000a4'), 2::bigint, 'batch_writer writes analytics');
select throws_ok($$delete from core.trades$$, '42501', null, 'batch_writer cannot delete core rows');
reset role;

-- screen RPCs
select throws_ok($$set local role anon; select api.get_risk()$$, '42501', null, 'anon cannot read risk');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-0000000000a4","role":"authenticated"}';
select is(api.get_risk() #>> '{data,figures,0,metric}', 'vol_ann', 'get_risk figures from risk_metrics');
select is(api.get_risk() #>> '{data,excluded,0,reason}', 'monthly_price', 'excluded with reason');
select is((api.get_risk() #>> '{data,minimums,var_returns}')::int, 250, 'minimums (ARCHITECTURE §14)');
select is(api.get_performance('1M') #>> '{data,status}', 'pending', 'no batch output yet → pending');
select throws_ok($$select api.get_performance('2Y')$$, 'PGRST', null, 'invalid period rejected');
select throws_ok($$select api.get_performance_custom('2020-01-01', current_date)$$, 'PGRST', null, 'custom period > 2 years rejected');
select is(jsonb_array_length(api.get_portfolio() #> '{data,positions}'), 1, 'portfolio: one position');
select is((api.upsert_debt('00000000-0000-4000-b000-00000000a4d1', '00000000-0000-4000-b000-00000000a4d2', 'Prêt', 'XOF', 100000, 80000, 'Banque Lagune')
          ->> 'status'), 'applied', 'upsert_debt applied');
select is(api.get_portfolio() #>> '{data,debts,0,lender}', 'Banque Lagune', 'debt lender (BACKEND_NEEDS #7)');
select is((api.upsert_debt('00000000-0000-4000-b000-00000000a4d1', '00000000-0000-4000-b000-00000000a4d2', 'X', 'XOF', 1, 1)
          ->> 'status'), 'applied', 'same client id → stored result (idempotent)');
select throws_ok($$select api.set_concentration_threshold(3)$$, 'PGRST', null, 'threshold below 5 % rejected');
select is((api.get_home((api.get_home() ->> 'etag')) ->> 'not_modified')::boolean, true, 'get_home etag → not_modified');
reset role;

select * from finish();
rollback;
