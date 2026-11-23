-- B6 app RPCs: sync_transactions, save_questionnaire, update_settings,
-- record_security_event, apply_mutations, bootstrap.first_name.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
grant usage on schema extensions to anon, authenticated;
select plan(30);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b600-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b6a@test.invalid', '{}', false, now(), now()),
 ('00000000-0000-4000-b600-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b6b@test.invalid', '{}', false, now(), now());
insert into core.accounts (id, user_id, kind, display_name, currency, balance_minor) values
 ('00000000-0000-4000-b600-0000000000a1', '00000000-0000-4000-b600-00000000000a', 'bank', 'Compte A', 'XOF', 100000),
 ('00000000-0000-4000-b600-0000000000b1', '00000000-0000-4000-b600-00000000000b', 'bank', 'Compte B', 'XOF', 100000);
insert into core.transactions (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, value_date, cp_key, cp_name, category_source)
select '00000000-0000-4000-b600-00000000000a', '00000000-0000-4000-b600-0000000000a1', 'e' || g, 'BOOK',
       case when g % 3 = 0 then 'CRDT' else 'DBIT' end, 1000 * g, 'XOF', now() - make_interval(days => g), current_date - g,
       'n:shop' || g, 'Boutique ' || g, 'none'
from generate_series(1, 7) g;
insert into core.transactions (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, value_date, cp_key, cp_name, category_source)
values ('00000000-0000-4000-b600-00000000000a', '00000000-0000-4000-b600-0000000000a1', 'old', 'BOOK', 'DBIT', 5, 'XOF',
        now() - interval '25 months', current_date - 760, 'n:old', 'Ancien', 'none'),
       ('00000000-0000-4000-b600-00000000000b', '00000000-0000-4000-b600-0000000000b1', 'b1', 'BOOK', 'DBIT', 5, 'XOF',
        now(), current_date, 'n:x', 'Autre', 'none');

-- anon: no access
set local role anon;
select throws_ok('select api.sync_transactions()', '42501', null, 'anon cannot sync');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b600-00000000000a","role":"authenticated"}';

-- sync_transactions
select is(jsonb_array_length(api.sync_transactions(null, 200)->'items'), 7, 'own rows within 24 months only');
select is((api.sync_transactions(null, 3)->>'has_more')::boolean, true, 'page of 3 has more');
select is(jsonb_array_length(api.sync_transactions(api.sync_transactions(null, 3)->>'next_cursor', 3)->'items'), 3, 'second page');
select is(jsonb_array_length(api.sync_transactions(
            api.sync_transactions(api.sync_transactions(null, 3)->>'next_cursor', 3)->>'next_cursor', 3)->'items'), 1,
          'third page holds the last row');
select is((api.sync_transactions(api.sync_transactions(null, 200)->>'next_cursor', 200)->>'has_more')::boolean, false,
          'nothing after the last cursor');
select is(jsonb_array_length(api.sync_transactions(api.sync_transactions(null, 200)->>'next_cursor', 200)->'items'), 0,
          'incremental call is empty when nothing changed');
select ok((select bool_and(i ? 'amount' and i ? 'amount_ref' and i ? 'label' and i ? 'row_version')
           from jsonb_array_elements(api.sync_transactions()->'items') i), 'row shape');
select is((select (i->'amount'->>'m')::int from jsonb_array_elements(api.sync_transactions()->'items') i
           where i->>'label' = 'Boutique 2'), 2000, 'amount in minor units');
select throws_ok($$select api.sync_transactions('nope', 10)$$, 'PGRST', null, 'bad cursor rejected');

-- save_questionnaire
select is(api.save_questionnaire('risk', '{"r1":4,"r2":4,"r3":5,"r4":3,"r5":4}', 1)->>'risk_profile', '4', 'risk profile = rounded mean');
select is((select risk_profile from core.profiles where user_id = '00000000-0000-4000-b600-00000000000a'), 4::smallint, 'profile stored');
select is(api.save_questionnaire('goals', '{"goal":"house"}', 1)->>'ok', 'true', 'other section saved');
select is(api.save_questionnaire('goals', '{"goal":"retire"}', 1)->>'ok', 'true', 'section re-saved (upsert)');
select is((select answers->>'goal' from core.questionnaire where section = 'goals'), 'retire', 'last answer kept');
select throws_ok($$select api.save_questionnaire('nope', '{}', 1)$$, 'PGRST', null, 'unknown section rejected');

-- update_settings
select is(api.update_settings('00000000-0000-7000-8000-000000000001', '{"first_name":"Awa","language":"en"}')->>'status',
          'applied', 'settings applied');
select is(api.bootstrap()->'data'->'profile'->>'first_name', 'Awa', 'bootstrap returns first_name');
select is(api.bootstrap()->'data'->'questionnaire'->'risk'->>'version', '1', 'bootstrap lists questionnaire sections');
select is(api.update_settings('00000000-0000-7000-8000-000000000001', '{"first_name":"Other"}')->>'status', 'applied',
          'replay returns the stored result');
select is((select first_name from core.profiles where user_id = '00000000-0000-4000-b600-00000000000a'), 'Awa', 'replay not re-applied');
select throws_ok($$select api.update_settings('00000000-0000-7000-8000-000000000002', '{"is_admin":true}')$$, 'PGRST', null,
                 'unknown setting key rejected');

-- record_security_event
select is(api.record_security_event('pin_failed', '{"count":1}')->>'ok', 'true', 'whitelisted event recorded');
select throws_ok($$select api.record_security_event('sim_swap')$$, 'PGRST', null, 'server-only event type refused');

-- apply_mutations
select is((select string_agg(r->>'status', ',' order by o) from jsonb_array_elements(api.apply_mutations(
  '[{"client_id":"00000000-0000-7000-8000-000000000010","rpc":"update_settings","args":{"settings":{"data_saver":true}}},
    {"client_id":"00000000-0000-7000-8000-000000000001","rpc":"update_settings","args":{"settings":{"first_name":"X"}}},
    {"client_id":"00000000-0000-7000-8000-000000000011","rpc":"update_settings","args":{"settings":{"ref_currency":"GBP"}}},
    {"client_id":"00000000-0000-7000-8000-000000000012","rpc":"drop_table","args":{}},
    {"client_id":"bad","rpc":"update_settings","args":{}}]')->'results') with ordinality x(r, o)),
  'applied,duplicate,rejected,rejected,rejected', 'per-item results: applied, duplicate, rejected (invalid, unknown, bad id)');
select is((select data_saver from core.profiles where user_id = '00000000-0000-4000-b600-00000000000a'), true,
          'applied item persisted although another item failed');
select is((select ref_currency::text from core.profiles where user_id = '00000000-0000-4000-b600-00000000000a'), 'XOF',
          'rejected item rolled back');

-- record_consents through the outbox (B6.4): idempotent per client_id
select is((select r->>'status' from jsonb_array_elements(api.apply_mutations(
  '[{"client_id":"00000000-0000-7000-8000-000000000020","rpc":"record_consents","args":{"items":[{"kind":"service","granted":true,"text_version":"0.1"},{"kind":"ai_categorisation","granted":false,"text_version":"0.1"}]}}]')->'results') r),
  'applied', 'record_consents replayed from the outbox');
select is((select r->>'status' from jsonb_array_elements(api.apply_mutations(
  '[{"client_id":"00000000-0000-7000-8000-000000000020","rpc":"record_consents","args":{"items":[{"kind":"service","granted":true,"text_version":"0.1"},{"kind":"ai_categorisation","granted":false,"text_version":"0.1"}]}}]')->'results') r),
  'duplicate', 'same client_id again is a duplicate');
select is((select count(*)::int from core.consents where user_id = '00000000-0000-4000-b600-00000000000a' and text_version = '0.1'
           and kind in ('service', 'ai_categorisation')), 2, 'replayed consents recorded once');

select * from finish();
rollback;
