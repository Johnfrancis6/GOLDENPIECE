-- B5: scoring (features, thresholds, rules, combination), alerts lifecycle (notify, answer,
-- analyst, reminders, simulated analyst), bounded tuning, learning status. Runs on an empty
-- local stack and on dev (rolled back; pg_net requests are queued in the transaction and dropped).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
grant usage on schema extensions to anon, authenticated, batch_writer;
select plan(49);
set local gp.model_version = '-none-';             -- no Isolation Forest: deterministic scores
alter table core.transactions alter column value_date set default current_date;   -- fixtures only (rolled back)
alter table core.tx_momo alter column operator_ref set default 'REF';

-- catalogue
select is((select count(distinct id)::int from ref.fraud_rules where active), 6, 'rules R1-R6 seeded');
select ok((select bool_and(source_url like 'https://%' and source_title <> '' and source_date is not null)
           from ref.fraud_rules), 'every rule cites a dated https source');
select ok((select bool_and(weight between w_min and w_max) from ref.fraud_rules), 'weights within bounds');
select is((select count(*)::int from ops.scoring_params where scope = 'global' and key like 'w:R%'), 6, 'one weight param per rule');
select ok(core.is_scored('p2p_out', null) and core.is_scored(null, 'CCRD') and not core.is_scored(null, 'MDOP')
          and not core.is_scored('fee', null) and not core.is_scored(null, 'IDDT'), 'charges / direct debits not scored');
select is(core.payee_short('Awa Koné', 'p2p'), 'Awa K.', 'payee shortened for people');
select is(core.payee_short('Hyper Teranga', 'card'), 'Hyper Teranga', 'merchant name kept');
select is(core.op_group('cash_out', null, null), 'cash_out', 'op group');

-- a user with 60 days of regular habits (momo wallet, XOF, Dakar)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b000-0000000000b5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'b5@test.invalid', '{"language":"fr"}', false, now(), now()),
 ('00000000-0000-4000-b000-0000000000b6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'b6@test.invalid', '{"language":"fr"}', false, now(), now());
update core.profiles set timezone = 'Africa/Dakar', country = 'SN', hide_amounts_in_push = false
where user_id in ('00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-0000000000b6');
insert into core.accounts (id, user_id, kind, provider_account_id, display_name, institution, currency, operator,
                           balance_minor, balance_at)
values ('00000000-0000-4000-b000-00000000ac01', '00000000-0000-4000-b000-0000000000b5', 'momo', 'w', 'Wallet',
        'teranga_mobile', 'XOF', 'teranga_mobile', 300000, now());
insert into core.devices (id, user_id, label, platform, app_version, security_level, unlock_method, created_at)
values ('00000000-0000-4000-b000-00000000de01', '00000000-0000-4000-b000-0000000000b5', 'Tecno', 'android', '0.1.0', 'strong',
        'biometric_strong', now() - interval '90 days');
-- daily p2p 10 000 F to Awa Koné at ~10:00 local, merchant 2 000-3 000 F at ~13:00, salary in
with d as (select g, (current_date - 60 + g)::timestamp at time zone 'Africa/Dakar' day0 from generate_series(0, 58) g),
ins as (
  insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                                 booking_ts, cp_name, cp_msisdn, cp_key, category_id, category_source)
  select gen_random_uuid(), '00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-00000000ac01',
         'h-' || g || '-' || k, 'BOOK', 'DBIT',
         case k when 1 then 10000 + (g % 3) * 500 else 2000 + (g % 4) * 250 end, 'XOF',
         day0 + case k when 1 then interval '10 hours' else interval '13 hours' end + (g % 7) * interval '5 minutes',
         case k when 1 then 'Awa Koné' else 'Boutique Ndiaye' end,
         case k when 1 then '+221990000001' end,
         case k when 1 then 'm:+221990000001' else 'n:boutique ndiaye' end,
         case k when 1 then 'transfers.family' else 'groceries.shop' end, 'keyword'
  from d cross join (values (1), (2)) v(k)
  returning id, cp_name)
insert into core.tx_momo (transaction_id, operator, op_type)
select id, 'teranga_mobile', case when cp_name = 'Awa Koné' then 'p2p_out' else 'merchant' end from ins;

-- 1. a new payee, 6× the usual p2p amount, usual hour → ask (A_thr explains it)
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, cp_name, cp_msisdn, cp_key, category_id, category_source)
values ('00000000-0000-4000-b000-0000000a0001', '00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-00000000ac01',
        't1', 'BOOK', 'DBIT', 60000, 'XOF', (current_date - 1 + time '10:05') at time zone 'Africa/Dakar',
        'Inconnu Diallo', '+221990000002', 'm:+221990000002', 'transfers.family', 'keyword');
insert into core.tx_momo (transaction_id, operator, op_type) values ('00000000-0000-4000-b000-0000000a0001', 'teranga_mobile', 'p2p_out');
select is((core.score_features('00000000-0000-4000-b000-0000000a0001') ->> 'f3')::int, 1, 'f3 new payee');
select ok((core.score_features('00000000-0000-4000-b000-0000000a0001') ->> 'x2')::float8 between 5 and 7, 'f2 ratio ≈ 6× the category median');
select is((core.score_features('00000000-0000-4000-b000-0000000a0001') ->> 'learning')::boolean, false, 'out of learning (59 days, 118 ops)');
select ok((select bool_or(r ->> 'code' = 'NEW_PAYEE') and bool_or(r ->> 'code' like 'AMOUNT_VS_%')
           from jsonb_array_elements(core.score_compute('00000000-0000-4000-b000-0000000a0001') -> 'reasons') r),
          'reasons: new payee + amount');
select is(core.score_compute('00000000-0000-4000-b000-0000000a0001') ->> 'band', 'ask', 'new payee ×6 → ask (40-70)');
select is((core.score_compute('00000000-0000-4000-b000-0000000a0001') ->> 'f')::float8, 0::float8, 'no fraud rule');

-- scoring stores the score and the alert; the alert queues a notification
select is(core.score_transaction('00000000-0000-4000-b000-0000000a0001') ->> 'band', 'ask', 'score_transaction stores band ask');
select is(core.score_transaction('00000000-0000-4000-b000-0000000a0001'), null, 'scored once only');
select is((select status from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'awaiting_user', 'alert awaiting the user');
select is((select type from ops.push_log l join core.alerts a on a.id = l.alert_id
           where a.transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'confirm', 'notification "C''est bien vous ?" queued');
select is((select payload #>> '{args,payee_short}' from ops.push_log l join core.alerts a on a.id = l.alert_id
           where a.transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'Inconnu D.', 'payload payee shortened');
select ok((select payload #> '{args,amount}' is not null and payload ->> 'title_key' = 'N.confirm.title'
           from ops.push_log l join core.alerts a on a.id = l.alert_id
           where a.transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'amount sent only because "Montants visibles" is on');

-- 2. SIM swap 1 h before, then 80 % of the wallet cashed out at a new agent → R1 → bank
insert into core.security_events (user_id, type, source, at, details)
values ('00000000-0000-4000-b000-0000000000b5', 'sim_swap', 'sim', now() - interval '50 minutes', '{}');
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, cp_name, cp_key, category_id, category_source)
values ('00000000-0000-4000-b000-0000000a0002', '00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-00000000ac01',
        't2', 'BOOK', 'DBIT', 160000, 'XOF', now() - interval '10 minutes', 'Agent Point 12', 'n:agent point 12', 'transfers.cash', 'keyword');
insert into core.tx_momo (transaction_id, operator, op_type, balance_after_minor)
values ('00000000-0000-4000-b000-0000000a0002', 'teranga_mobile', 'cash_out', 40000);
select ok(core.score_compute('00000000-0000-4000-b000-0000000a0002') -> 'rules' @> '[{"code": "R1"}]', 'R1 fires');
select is(core.score_transaction('00000000-0000-4000-b000-0000000a0002') ->> 'band', 'bank', 'SIM swap + drain → bank');
select is((select status from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0002'), 'escalated', 'bank band escalated at once');
select is((select type from ops.push_log l join core.alerts a on a.id = l.alert_id
           where a.transaction_id = '00000000-0000-4000-b000-0000000a0002'), 'alerted', 'notification "banque prévenue"');

-- 3. money received then sent back to the same person within 30 min → R3
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, cp_name, cp_msisdn, cp_key, remittance_info) values
 ('00000000-0000-4000-b000-0000000a0003', '00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-00000000ac01',
  't3', 'BOOK', 'CRDT', 50000, 'XOF', now() - interval '30 minutes', 'Ama Sow', '+221990000003', 'm:+221990000003', 'Envoi'),
 ('00000000-0000-4000-b000-0000000a0004', '00000000-0000-4000-b000-0000000000b5', '00000000-0000-4000-b000-00000000ac01',
  't4', 'BOOK', 'DBIT', 50000, 'XOF', now() - interval '12 minutes', 'Ama Sow', '+221990000003', 'm:+221990000003', 'Renvoi erreur de transfert');
insert into core.tx_momo (transaction_id, operator, op_type) values
 ('00000000-0000-4000-b000-0000000a0003', 'teranga_mobile', 'p2p_in'), ('00000000-0000-4000-b000-0000000a0004', 'teranga_mobile', 'p2p_out');
select ok(core.score_compute('00000000-0000-4000-b000-0000000a0004') -> 'rules' @> '[{"code": "R3"}]', 'R3 fake deposit fires');
select ok((core.score_compute('00000000-0000-4000-b000-0000000a0004') ->> 'total')::int >= 40, 'R3 → at least ask');

-- 4. learning phase: a user with 5 operations → anomaly silent, rules still active
insert into core.accounts (id, user_id, kind, provider_account_id, display_name, institution, currency, operator)
values ('00000000-0000-4000-b000-00000000ac02', '00000000-0000-4000-b000-0000000000b6', 'momo', 'w', 'Wallet', 'kola_money', 'XOF', 'kola_money');
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency, booking_ts, cp_name, cp_key)
select ('00000000-0000-4000-b000-0000000b000' || g)::uuid, '00000000-0000-4000-b000-0000000000b6', '00000000-0000-4000-b000-00000000ac02',
       'l' || g, 'BOOK', 'DBIT', case when g = 5 then 500000 else 2000 end, 'XOF', now() - (6 - g) * interval '1 day',
       'Boutique ' || g, 'n:boutique ' || g
from generate_series(1, 5) g;
insert into core.tx_momo (transaction_id, operator, op_type)
select ('00000000-0000-4000-b000-0000000b000' || g)::uuid, 'kola_money', 'merchant' from generate_series(1, 5) g;
select is((core.score_compute('00000000-0000-4000-b000-0000000b0005') ->> 'learning')::boolean, true, 'learning phase');
select is((core.score_compute('00000000-0000-4000-b000-0000000b0005') ->> 'a_thr')::float8, 0::float8, 'anomaly silent while learning');
select is((analytics.refresh_learning('00000000-0000-4000-b000-0000000000b6') ->> 'active')::boolean, false, 'learning status: not active');

-- user RPCs
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-0000000000b5","role":"authenticated"}';
select is(jsonb_array_length(api.list_alerts('open') -> 'items'), 2, 'list_alerts: 2 open alerts');
select ok(api.get_alert((select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0001'))
          -> 'score_breakdown' ? 'a_thr', 'get_alert: score breakdown');
select is(api.answer_alert('00000000-0000-4000-b000-00000000c001',
          (select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'me') ->> 'status',
          'confirmed_by_user', 'answer "Oui, c''est moi" → confirmed');
select is(api.answer_alert('00000000-0000-4000-b000-00000000c001',
          (select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'me') ->> 'status',
          'confirmed_by_user', 'same client id → same result (idempotent)');
select is(api.answer_alert('00000000-0000-4000-b000-00000000c002',
          (select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0001'), 'not_me') ->> 'already_answered',
          'true', 'second answer from another device → already answered');
select throws_ok($$select api.analyst_queue()$$, 'PGRST', null, 'a user is not an analyst');
reset role;
select ok(exists (select 1 from core.known_payees where user_id = '00000000-0000-4000-b000-0000000000b5'
                  and cp_key = 'm:+221990000002'), '"me" adds the payee to known payees');
select is((select after - before from ops.param_changes where user_id = '00000000-0000-4000-b000-0000000000b5'
           and cause = 'user_me')::numeric(4,2), 0.10, 'z0 +0.10 for that category (logged)');
select ok(core.tune('00000000-0000-4000-b000-0000000000b5', 'transfers.family', 'z0', 0.10, 'user_me', null, null) is null,
          'at most one change per category per day');
select is((core.score_features('00000000-0000-4000-b000-0000000a0001') ->> 'f3')::int, 0, 'known payee is no longer new');

-- analyst (role analyst + aal2)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-0000000000b6","role":"authenticated","aal":"aal2","app_metadata":{"role":"analyst"}}';
select ok((select bool_or(i ->> 'alert_id' = (select id::text from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0002'))
           from jsonb_array_elements(api.analyst_queue('pending') -> 'items') i), 'escalated alert in the analyst queue');
select ok((select i ? 'tx' and i ? 'band' from jsonb_array_elements(api.analyst_queue('pending') -> 'items') i limit 1),
          'queue rows carry band and tx (#9)');
select ok(api.analyst_alert((select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0002'))
          #> '{score_breakdown,rules}' @> '[{"code": "R1"}]', 'alert detail: rules with weights (#10)');
select is((select status from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0002'), 'in_review', 'opened → in review');
select is(api.analyst_decide((select id from core.alerts where transaction_id = '00000000-0000-4000-b000-0000000a0002'), 'fraud', 'ok')
          ->> 'status', 'decided_fraud', 'analyst decides fraud');
select ok(api.scoring_params() -> 'changes' @> '[{"cause": "analyst_fraud"}]', 'parameter change visible in the panel');
reset role;
select is((select type from ops.push_log l join core.alerts a on a.id = l.alert_id
           where a.transaction_id = '00000000-0000-4000-b000-0000000a0002' order by l.id desc limit 1), 'fraud', 'decision notified');

-- every minute: reminder after 15 min; simulated analyst for persona users after 10 min
insert into core.alerts (id, user_id, kind, band, score, status, reasons, transaction_id, created_at)
values ('00000000-0000-4000-b000-00000000a1e1', '00000000-0000-4000-b000-0000000000b5', 'anomaly', 'ask', 55,
        'awaiting_user', '[]', '00000000-0000-4000-b000-0000000a0004', now() - interval '20 minutes');
-- the persona template exists on dev (generator) but not on an empty CI stack
insert into sim.templates (id, kind, profile_id, description, generator_version, seed, timezone, country)
values ('persona_dakar_salaried', 'persona', 'SN', 'test', 'test', 1, 'Africa/Dakar', 'SN') on conflict (id) do nothing;
update core.profiles set demo_persona = 'persona_dakar_salaried' where user_id = '00000000-0000-4000-b000-0000000000b6';
insert into core.alerts (id, user_id, kind, band, score, status, reasons, escalated_at, created_at)
values ('00000000-0000-4000-b000-00000000a1e2', '00000000-0000-4000-b000-0000000000b6', 'anomaly', 'bank', 80,
        'escalated', '[]', now() - interval '15 minutes', now() - interval '15 minutes');
select ok((ops.cron_alerts() ->> 'reminders')::int >= 1, 'cron sends the reminder');
select is((select type from ops.push_log where alert_id = '00000000-0000-4000-b000-00000000a1e1' order by id desc limit 1),
          'reminder', 'reminder notification');
select is((select simulated from core.analyst_decisions where alert_id = '00000000-0000-4000-b000-00000000a1e2'), true,
          'simulated analyst decided the persona alert');

select * from finish();
rollback;
