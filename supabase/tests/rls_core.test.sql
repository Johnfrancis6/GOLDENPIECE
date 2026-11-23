-- RLS tests (DATA_MODEL §3): user A cannot read/update user B's rows in any
-- core table; anonymous demo clones are isolated; analyst needs aal2; anon
-- sees only the listed ref tables; batch_writer cannot delete core rows.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
-- pgTAP lives in `extensions`; let the tested roles call it (rolled back).
grant usage on schema extensions to anon, authenticated, batch_writer;
select plan(75);

-- ── fixtures (as postgres) ────────────────────────────────────────────────
create function pg_temp.cnt(q text) returns bigint language plpgsql as $$
declare n bigint; begin execute q into n; return n; end $$;
create function pg_temp.as_user(uid text, extra jsonb default '{}') returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal1') || extra)::text, true);
end $$;

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at)
values
 ('00000000-0000-4000-a000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid', '{}', '{"language":"en","country":"CI"}', false, now(), now()),
 ('00000000-0000-4000-a000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid', '{}', '{}', false, now(), now()),
 ('00000000-0000-4000-a000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', '{}', true, now(), now()),
 ('00000000-0000-4000-a000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', '{}', true, now(), now()),
 ('00000000-0000-4000-a000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@test.invalid', '{"role":"analyst"}', '{}', false, now(), now());

insert into mkt.instruments (id, name, asset_class, currency, vendor, vendor_symbol, frequency)
values ('TEST_ETF', 'Test ETF', 'etf', 'USD', 'twelvedata', 'TEST', 'daily');

-- one row per core table for A, B, C and D
do $$
declare u uuid; i int := 0; link uuid; acc uuid; tx uuid; se uuid; sc uuid; al uuid; re uuid; dev uuid;
begin
  foreach u in array array['00000000-0000-4000-a000-00000000000a','00000000-0000-4000-a000-00000000000b',
                           '00000000-0000-4000-a000-00000000000c','00000000-0000-4000-a000-00000000000d']::uuid[] loop
    i := i + 1;
    dev := gen_random_uuid(); re := gen_random_uuid();
    insert into core.devices (id, user_id, platform, app_version, security_level, unlock_method)
      values (dev, u, 'android', '0.1.0', 'weak', 'app_pin');
    insert into core.consents (user_id, kind, granted, text_version) values (u, 'terms', true, '0.1-draft');
    insert into core.questionnaire (user_id, section, answers, version) values (u, 'risk', '{}', 1);
    insert into core.cards (user_id, bin6, last4, brand, bank_id, source) values (u, '400901', '1111', 'visa', 'banque_baobab', 'manual');
    insert into core.provider_links (user_id, adapter, institution, scopes, status, history_days)
      values (u, 'sim', 'kola_money', '{balances,transactions}', 'active', 365) returning id into link;
    insert into core.accounts (user_id, link_id, kind, provider_account_id, display_name, currency, operator)
      values (u, link, 'momo', 'acc' || i, 'Kola Money', 'XOF', 'kola_money') returning id into acc;
    insert into core.transactions (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
      booking_ts, value_date, cp_key, category_id, category_source)
      values (u, acc, 'e' || i, 'BOOK', 'DBIT', 5000, 'XOF', now(), current_date, 'shop', 'groceries', 'keyword')
      returning id into tx;
    insert into core.tx_momo (transaction_id, operator, op_type, operator_ref) values (tx, 'kola_money', 'merchant', 'R' || i);
    insert into core.security_events (user_id, device_id, type, source) values (u, dev, 'login', 'app') returning id into se;
    insert into core.trades (id, user_id, instrument_id, side, trade_date, quantity, price_minor, currency, source)
      values (gen_random_uuid(), u, 'TEST_ETF', 'buy', current_date, 1, 10000, 'USD', 'manual');
    insert into core.corporate_actions (user_id, instrument_id, kind, ex_date, ratio) values (u, 'TEST_ETF', 'split', current_date, 2);
    insert into core.real_estate (id, user_id, name, currency) values (re, u, 'Maison', 'XOF');
    insert into core.real_estate_valuations (id, real_estate_id, value_minor, valued_on) values (gen_random_uuid(), re, 1000000, current_date);
    insert into core.debts (id, user_id, name, lender, currency, principal_minor, balance_minor) values (gen_random_uuid(), u, 'Prêt', 'Banque Lagune', 'XOF', 1000, 900);
    insert into core.user_categories (id, user_id, parent_id, name) values (gen_random_uuid(), u, 'groceries', 'Sub');
    insert into core.cat_rules (id, user_id, match_field, match_type, pattern, category_id, source) values (gen_random_uuid(), u, 'cp_key', 'equals', 'shop', 'groceries', 'user');
    insert into core.budgets (id, user_id, category_id, amount_minor, currency) values (gen_random_uuid(), u, 'groceries', 50000, 'XOF');
    insert into core.scores (user_id, transaction_id, total, band, a_thr, a_if, f, m, learning, features, reasons, rules_version, params_version, latency_ms)
      values (u, tx, 80, 'bank', 0.5, 0.5, 0.5, 0, false, '{}', '[]', 'r1', 1, 10) returning id into sc;
    insert into core.alerts (user_id, kind, score_id, transaction_id, score, band, status, reasons)
      values (u, 'fraud', sc, tx, 80, 'bank', case when i = 2 then 'escalated' else 'open' end, '[]') returning id into al;
    insert into core.analyst_decisions (alert_id, analyst_id, decision, comment) values (al, '00000000-0000-4000-a000-00000000000e', 'legit', 'secret comment');
    insert into analytics.learning_status (user_id, ops_count, days, active, computed_at) values (u, 10, 5, false, now());
  end loop;
  -- one global keyword rule and one global corporate action
  insert into core.cat_rules (id, user_id, match_field, match_type, pattern, category_id, source) values (gen_random_uuid(), null, 'remittance', 'contains', 'SENELEC', 'bills.electricity', 'keyword');
end $$;

-- ── profile trigger ───────────────────────────────────────────────────────
select is((select language || '/' || country || '/' || timezone from core.profiles where user_id = '00000000-0000-4000-a000-00000000000a'),
          'en/CI/Africa/Abidjan', 'profile created from auth metadata');
select is((select is_anonymous from core.profiles where user_id = '00000000-0000-4000-a000-00000000000c'), true, 'anonymous flag copied');

-- ── user A ────────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');

-- every user-owned core table: A sees only A's rows
select is(pg_temp.cnt('select count(*) from core.' || t || ' where user_id <> ''00000000-0000-4000-a000-00000000000a'''), 0::bigint, 'A cannot read others in core.' || t)
from unnest(array['profiles','devices','consents','questionnaire','cards','provider_links','accounts','transactions',
  'security_events','trades','real_estate','debts','user_categories','budgets','scores','alerts']) t;
select cmp_ok(pg_temp.cnt('select count(*) from core.' || t), '>', 0::bigint, 'A reads own core.' || t)
from unnest(array['profiles','devices','consents','questionnaire','cards','provider_links','accounts','transactions',
  'security_events','trades','real_estate','debts','user_categories','budgets','scores','alerts']) t;

select is(pg_temp.cnt('select count(*) from core.tx_momo'), 1::bigint, 'A reads only own tx_momo');
select is(pg_temp.cnt('select count(*) from core.real_estate_valuations'), 1::bigint, 'A reads only own valuations');
select is(pg_temp.cnt('select count(*) from core.analyst_decisions'), 1::bigint, 'A reads only own alert decisions');
select throws_ok('select analyst_id from core.analyst_decisions', '42501', null, 'A cannot read the analyst id');
select throws_ok('select comment from core.analyst_decisions', '42501', null, 'A cannot read the analyst comment');
-- B2 seeds global keyword rules: count own + the test's global rule
select is(pg_temp.cnt('select count(*) from core.cat_rules where user_id is not null or pattern = ''SENELEC'''), 2::bigint, 'A reads own + global rules');
select is(pg_temp.cnt('select count(*) from core.corporate_actions'), 1::bigint, 'A reads own corporate actions');
select is(pg_temp.cnt('select count(*) from analytics.learning_status'), 1::bigint, 'A reads only own analytics');

-- updates on B's rows affect nothing
select is(pg_temp.cnt('with u as (update core.' || t || ' set name = ''x'' where user_id = ''00000000-0000-4000-a000-00000000000b'' returning 1) select count(*) from u'),
          0::bigint, 'A cannot update B in core.' || t)
from unnest(array['real_estate','debts','user_categories']) t;
select is(pg_temp.cnt('with u as (update core.profiles set language = ''fr'' where user_id = ''00000000-0000-4000-a000-00000000000b'' returning 1) select count(*) from u'),
          0::bigint, 'A cannot update B profile');
select is(pg_temp.cnt('with u as (update core.budgets set amount_minor = 1 where user_id = ''00000000-0000-4000-a000-00000000000b'' returning 1) select count(*) from u'),
          0::bigint, 'A cannot update B budget');
select is(pg_temp.cnt('with u as (delete from core.trades where user_id = ''00000000-0000-4000-a000-00000000000b'' returning 1) select count(*) from u'),
          0::bigint, 'A cannot delete B trades');
select is(pg_temp.cnt('with u as (update core.cat_rules set pattern = ''x'' where user_id is null returning 1) select count(*) from u'),
          0::bigint, 'A cannot update global keyword rules');

-- inserting rows for B is refused (with check)
select throws_ok($$insert into core.debts (id, user_id, name, currency, principal_minor, balance_minor)
  values (gen_random_uuid(), '00000000-0000-4000-a000-00000000000b', 'x', 'XOF', 1, 1)$$, '42501', null, 'A cannot insert a debt for B');
select throws_ok($$insert into core.consents (user_id, kind, granted, text_version)
  values ('00000000-0000-4000-a000-00000000000b', 'terms', true, 'x')$$, '42501', null, 'A cannot insert a consent for B');

-- columns and tables the user may not write
select throws_ok($$update core.profiles set is_anonymous = true$$, '42501', null, 'A cannot change is_anonymous');
select throws_ok($$update core.alerts set status = 'closed'$$, '42501', null, 'A cannot update alerts directly');
select throws_ok($$insert into core.security_events (user_id, type, source) values ('00000000-0000-4000-a000-00000000000a', 'sim_swap', 'sim')$$,
                 '42501', null, 'A cannot insert security events directly');
select throws_ok($$insert into core.transactions (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency, booking_ts, value_date, cp_key)
  select user_id, id, 'x', 'BOOK', 'DBIT', 1, 'XOF', now(), current_date, 'k' from core.accounts limit 1$$, '42501', null, 'A cannot insert transactions');
select throws_ok('select count(*) from sim.templates', '42501', null, 'A cannot read sim');
select throws_ok('select count(*) from ops.audit_log', '42501', null, 'A cannot read ops');
select throws_ok('select count(*) from mkt.instruments', '42501', null, 'A cannot read mkt directly');
select lives_ok('select count(*) from ref.categories', 'A reads ref');

-- analyst claim without aal2: no bank-side rows
select is(pg_temp.cnt('select count(*) from core.alerts where user_id <> ''00000000-0000-4000-a000-00000000000a'''), 0::bigint,
          'non-analyst sees no escalated alerts of others');

-- ── demo clones C / D ───────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-00000000000c', '{"is_anonymous": true}');
select is(pg_temp.cnt('select count(*) from core.transactions where user_id = ''00000000-0000-4000-a000-00000000000d'''), 0::bigint,
          'demo clone C cannot read clone D transactions');
select is(pg_temp.cnt('select count(*) from core.accounts'), 1::bigint, 'demo clone C reads only its account');
select is(pg_temp.cnt('select count(*) from core.profiles'), 1::bigint, 'demo clone C reads only its profile');

-- ── analyst E ───────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-4000-a000-00000000000e', '{"app_metadata": {"role": "analyst"}, "aal": "aal1"}');
select is(pg_temp.cnt('select count(*) from core.alerts'), 0::bigint, 'analyst without aal2 gets 0 alerts');
select is(pg_temp.cnt('select count(*) from core.analyst_decisions'), 0::bigint, 'analyst without aal2 gets 0 decisions');
select pg_temp.as_user('00000000-0000-4000-a000-00000000000e', '{"app_metadata": {"role": "analyst"}, "aal": "aal2"}');
select is(pg_temp.cnt('select count(*) from core.alerts where user_id::text like ''00000000-0000-4000-a000-%'''), 1::bigint, 'analyst aal2 sees only the escalated alert');
select is(pg_temp.cnt('select count(*) from core.transactions'), 0::bigint, 'analyst has no direct transaction access');

-- ── anon ────────────────────────────────────────────────────────────────
reset role;
set local role anon;
select cmp_ok(pg_temp.cnt('select count(*) from ref.countries'), '>=', 249::bigint, 'anon reads countries');
select cmp_ok(pg_temp.cnt('select count(*) from ref.legal_texts'), '>', 0::bigint, 'anon reads legal texts');
select throws_ok('select count(*) from ref.categories', '42501', null, 'anon cannot read categories');
select throws_ok('select count(*) from ref.banks', '42501', null, 'anon cannot read banks');
select throws_ok('select count(*) from core.profiles', '42501', null, 'anon cannot read core');

-- ── batch_writer ────────────────────────────────────────────────────────
reset role;
set local role batch_writer;
select cmp_ok(pg_temp.cnt('select count(*) from core.transactions'), '>=', 4::bigint, 'batch_writer reads core');
select throws_ok('delete from core.transactions', '42501', null, 'batch_writer cannot delete core rows');
select throws_ok('update ops.audit_log set action = ''x''', '42501', null, 'batch_writer cannot rewrite the audit log');

reset role;
select * from finish();
rollback;
