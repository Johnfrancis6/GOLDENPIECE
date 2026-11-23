-- B2 contract tests: ingest (idempotent, PDNG→BOOK, rule categorisation),
-- simulated provider (listEntries paging newest first, balances, ticks,
-- security events), demo clone/reset/cleanup, link flow, grants.
-- Self-contained: a mini persona + mini account profile are created here.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select plan(41);

-- ── fixtures ─────────────────────────────────────────────────────────────
insert into sim.templates (id, kind, profile_id, description, generator_version, seed, timezone, country)
values ('persona_test_mini', 'persona', 'SN', 'test', 'test', 1, 'Africa/Dakar', 'SN');
insert into sim.template_accounts values
  ('persona_test_mini', 'bank', 'bank', 'banque_baobab', 'XOF', 100000),
  ('persona_test_mini', 'momo1', 'momo', 'teranga_mobile', 'XOF', 5000);
insert into sim.template_entries (template_id, account_key, seq, offset_s, entry, scenario_tag, expected_band, cum_minor) values
 ('persona_test_mini','bank',1,-864000,'{"status":"BOOK","creditDebit":"CRDT","amountMinor":500000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"RCDT","subFamily":"ESCT"},"counterparty":{"name":"Employeur Test","iban":"SN08SN9010010100000000000112"},"remittanceInfo":"SALAIRE OCT 2026","purposeCode":"SALA"}',null,null,500000),
 ('persona_test_mini','bank',2,-432000,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":12000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"CCRD","subFamily":"POSD"},"counterparty":{"name":"Pharmacie du Plateau","merchantCode":"5912"},"remittanceInfo":"PAIEMENT CB PHARMACIE"}',null,null,488000),
 ('persona_test_mini','bank',3,-86400,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":30000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"CCRD","subFamily":"POSD"},"counterparty":{"name":"Supermarché Baobab","merchantCode":"5411"},"remittanceInfo":"PAIEMENT CB SUPERMARCHÉ BAOBAB"}',null,null,458000),
 ('persona_test_mini','bank',4,2592000,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":7000,"currency":"XOF","bankTxCode":{"domain":"ACMT","family":"MDOP","subFamily":"CHRG"},"remittanceInfo":"FRAIS DE TENUE DE COMPTE"}',null,null,451000),
 ('persona_test_mini','momo1',1,-700000,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":1000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"ICDT","subFamily":"OTHR"},"remittanceInfo":"Achat crédit téléphonique","momo":{"operator":"teranga_mobile","opType":"airtime"}}',null,null,-1000),
 ('persona_test_mini','momo1',2,-600000,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":2000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"ICDT","subFamily":"OTHR"},"counterparty":{"name":"Awa Test","msisdn":"+2219912345"},"remittanceInfo":"Envoi","momo":{"operator":"teranga_mobile","opType":"p2p_out"}}','anomaly_amount','ask',-3000),
 ('persona_test_mini','momo1',3,-300000,'{"status":"BOOK","creditDebit":"CRDT","amountMinor":3000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"RCDT","subFamily":"OTHR"},"counterparty":{"name":"Moussa Test","msisdn":"+2219954321"},"remittanceInfo":"Remboursement","momo":{"operator":"teranga_mobile","opType":"p2p_in"}}',null,null,0),
 ('persona_test_mini','momo1',4,3000000,'{"status":"BOOK","creditDebit":"DBIT","amountMinor":500,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"MCOP","subFamily":"OTHR"},"counterparty":{"name":"Taxi Rapide","merchantCode":"4121"},"remittanceInfo":"Course taxi","momo":{"operator":"teranga_mobile","opType":"merchant"}}',null,null,-500);
insert into sim.template_security_events values
  ('persona_test_mini', 1, -650000, 'sim_swap', '{"accountKey":"momo1","signal":"operator_sim_swap"}', 'R1_sim_swap'),
  ('persona_test_mini', 2, 2900000, 'sim_swap', '{"accountKey":"momo1","signal":"operator_sim_swap"}', 'R1_sim_swap');
insert into sim.template_wealth values
  ('persona_test_mini', 1, '{"kind":"debt","name":"Prêt test","lender":"banque_baobab","currency":"XOF","principal":100000,"balance":50000,"annual_rate_bp":900,"monthly_payment":5000,"start_days":-100,"end_days":100}'),
  ('persona_test_mini', 2, '{"kind":"trade","instrument_id":"NOPE_TEST","side":"buy","days":-10,"quantity":"1","price_minor":100,"currency":"USD"}');
-- account profile used by the link flow (exists on dev; created here for the local stack)
insert into sim.templates (id, kind, profile_id, description, generator_version, seed, timezone, country)
values ('acct_momo_uemoa', 'account_profile', 'UEMOA', 'test', 'test', 1, 'Africa/Dakar', 'SN') on conflict do nothing;
insert into sim.template_accounts values ('acct_momo_uemoa', 'main', 'momo', '*', 'XOF', 0) on conflict do nothing;
insert into sim.template_entries (template_id, account_key, seq, offset_s, entry, cum_minor)
select 'acct_momo_uemoa', 'main', 1, -999999, '{"status":"BOOK","creditDebit":"CRDT","amountMinor":10000,"currency":"XOF","bankTxCode":{"domain":"PMNT","family":"CNTR","subFamily":"CDPT"},"momo":{"operator":"*","opType":"cash_in"}}', 10000
where not exists (select 1 from sim.template_entries where template_id = 'acct_momo_uemoa');

insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000b2a01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-4000-8000-0000000b2a02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());

-- ── demo clone ───────────────────────────────────────────────────────────
create temp table r as select api.demo_start('00000000-0000-4000-8000-0000000b2a01', 'test_mini', 'en', 'SN', '203.0.113.7') j;
select is((select (j ->> 'accounts_count')::int from r), 2, 'demo: one account per template account');
select is((select (j ->> 'transactions_count')::int from r), 6, 'demo: only past entries copied');
select is((select (j ->> 'trades_skipped')::int from r), 1, 'demo: trade skipped while its instrument does not exist');
select is((select balance_minor from core.accounts where user_id = '00000000-0000-4000-8000-0000000b2a01' and provider_account_id = 'bank'),
          558000::bigint, 'demo: bank balance = opening + past entries');
select is((select balance_minor from core.accounts where user_id = '00000000-0000-4000-8000-0000000b2a01' and provider_account_id = 'momo1'),
          5000::bigint, 'demo: wallet balance = opening + past entries');
select is((select m.balance_after_minor from core.transactions t join core.tx_momo m on m.transaction_id = t.id
           where t.user_id = '00000000-0000-4000-8000-0000000b2a01' and t.provider_entry_id like '%-S2'),
          2000::bigint, 'demo: tx_momo.balance_after from template running sum');
select ok((select iban ~ '^SN[0-9]{2}SN901[0-9]{19}$' and length(iban) = 28 from core.accounts
           where user_id = '00000000-0000-4000-8000-0000000b2a01' and kind = 'bank'), 'demo: UEMOA IBAN, 28 chars, bank code');
select ok((select msisdn_masked ~ '^\+221 99 ••• •• [0-9]{2}$' from core.accounts
           where user_id = '00000000-0000-4000-8000-0000000b2a01' and kind = 'momo'), 'demo: masked fictitious MSISDN');
select is((select language || '/' || demo_persona from core.profiles where user_id = '00000000-0000-4000-8000-0000000b2a01'),
          'en/persona_test_mini', 'demo: profile marked with the persona');
select ok((select active and ops_count = 6 from analytics.learning_status where user_id = '00000000-0000-4000-8000-0000000b2a01'),
          'demo: learning done at once (imported history counts)');
select is((select count(*)::int from core.security_events where user_id = '00000000-0000-4000-8000-0000000b2a01' and source = 'sim'),
          1, 'demo: past simulated SIM swap copied');
select is((select count(*)::int from core.debts where user_id = '00000000-0000-4000-8000-0000000b2a01' and lender = 'Banque Baobab'),
          1, 'demo: debt with lender (BACKEND_NEEDS #7)');
select is((select array_agg(x.scenario_tag order by x.seq) from sim.link_entries x join core.provider_links p on p.id = x.link_id
           where p.user_id = '00000000-0000-4000-8000-0000000b2a01'),
          array['first_session_ask','first_session_bank','first_session_reversal'], 'demo: first-session guarantee scheduled');
select ok((select bool_and(x.offset_s = floor(extract(epoch from now() + interval '3 minutes' - l.anchor_at)))
           from sim.link_entries x join sim.links l using (link_id) where x.scenario_tag = 'first_session_ask'
             and l.link_id in (select id from core.provider_links where user_id = '00000000-0000-4000-8000-0000000b2a01')),
          'demo: ask event due 3 minutes after the start');

-- categorisation
select is((select category_id || '/' || category_source from core.transactions
           where user_id = '00000000-0000-4000-8000-0000000b2a01' and remittance_info = 'PAIEMENT CB PHARMACIE'),
          'health.pharmacy/keyword', 'categorise: keyword rule');
select is((select category_id from core.transactions where user_id = '00000000-0000-4000-8000-0000000b2a01'
           and remittance_info like '%SUPERMARCH%'), 'groceries.supermarket', 'categorise: accents folded, specific rule first');
select is((select category_id from core.transactions t join core.tx_momo m on m.transaction_id = t.id
           where t.user_id = '00000000-0000-4000-8000-0000000b2a01' and m.op_type = 'airtime'), 'bills.airtime', 'categorise: op_type rule');
select is((select category_source from core.transactions where user_id = '00000000-0000-4000-8000-0000000b2a01'
           and remittance_info = 'Envoi'), 'none', 'categorise: unknown left for the LLM backlog');

select throws_like($$ select api.demo_start('00000000-0000-4000-8000-0000000b2a01', 'test_mini') $$,
                   '%CONFLICT%', 'demo: second start refused');
select throws_like($$ select api.demo_start('00000000-0000-4000-8000-0000000b2a02', 'nobody') $$,
                   '%demo.unknown_persona%', 'demo: unknown persona refused');

-- ── ingest ───────────────────────────────────────────────────────────────
create temp table acc as select id, link_id, provider_account_id k from core.accounts where user_id = '00000000-0000-4000-8000-0000000b2a01';
select is((core.ingest_entries('00000000-0000-4000-8000-0000000b2a01', (select id from acc where k = 'bank'),
           sim.entries_between((select link_id from acc where k = 'bank'), 'bank', now() - interval '60 days', now())) ->> 'inserted')::int,
          0, 'ingest: replay inserts nothing (idempotent)');
insert into core.cat_rules (id, user_id, match_field, match_type, pattern, category_id, priority, source)
values (gen_random_uuid(), '00000000-0000-4000-8000-0000000b2a01', 'cp_key', 'equals', 'n:pharmacie du plateau', 'health.doctor', 500, 'user');
select is((core.ingest_entries('00000000-0000-4000-8000-0000000b2a01', (select id from acc where k = 'bank'),
  '[{"providerEntryId":"t-pdng-1","accountId":"bank","status":"PDNG","creditDebit":"DBIT","amountMinor":4000,"currency":"XOF","bookingTs":"2026-11-20T10:00:00Z","valueDate":"2026-11-20","bankTxCode":{"domain":"PMNT","family":"CCRD","subFamily":"POSD"},"counterparty":{"name":"Pharmacie du Plateau"},"remittanceInfo":"PAIEMENT CB PHARMACIE"}]') ->> 'inserted')::int,
  1, 'ingest: pending entry inserted');
select is((select category_id || '/' || category_source from core.transactions where provider_entry_id = 't-pdng-1'),
          'health.doctor/user_rule', 'categorise: user rule beats keyword rule despite priority');
select is((core.ingest_entries('00000000-0000-4000-8000-0000000b2a01', (select id from acc where k = 'bank'),
  '[{"providerEntryId":"t-pdng-1","accountId":"bank","status":"BOOK","creditDebit":"DBIT","amountMinor":4000,"currency":"XOF","bookingTs":"2026-11-20T10:00:00Z","valueDate":"2026-11-20","bankTxCode":{"domain":"PMNT","family":"CCRD","subFamily":"POSD"}}]') ->> 'updated')::int,
  1, 'ingest: same id PDNG → BOOK updates the status');
select is((select status from core.transactions where provider_entry_id = 't-pdng-1'), 'BOOK', 'ingest: status is BOOK');
select throws_like($$ select core.ingest_entries('00000000-0000-4000-8000-0000000b2a01', (select id from acc where k = 'bank'),
  '[{"providerEntryId":"bad","status":"BOOK","creditDebit":"DBIT","amountMinor":-5,"currency":"XOF","bookingTs":"2026-11-20T10:00:00Z","valueDate":"2026-11-20"}]') $$,
  '%INVALID%', 'ingest: invalid entry refused with INVALID');
select throws_like($$ select core.ingest_entries('00000000-0000-4000-8000-0000000b2a02', (select id from acc where k = 'bank'), '[]') $$,
  '%NOT_FOUND%', 'ingest: another user''s account refused');

-- ── listEntries paging ───────────────────────────────────────────────────
create temp table p1 as select api.sim_list_entries((select link_id from acc where k = 'momo1'), 'momo1', null, null, 2) j;
create temp table p2 as select api.sim_list_entries((select link_id from acc where k = 'momo1'), 'momo1', (select j ->> 'next_cursor' from p1), null, 2) j;
select is((select jsonb_array_length(j -> 'entries') + (select jsonb_array_length(j -> 'entries') from p2) from p1), 3,
          'listEntries: pages cover every booked entry');
select ok((select (j #>> '{entries,0,bookingTs}') > (j #>> '{entries,1,bookingTs}') from p1), 'listEntries: newest first');
select ok((select j ->> 'next_cursor' is null from p2), 'listEntries: last page has no cursor');
select is((select j #>> '{entries,0,momo,operatorRef}' from p1),
          (select j #>> '{entries,0,momo,operatorRef}' from p1 p), 'listEntries: stable ids/refs');

-- ── ticks (time passing): 40 days later = anchor and watermark 40 days back ──
update sim.links set anchor_at = anchor_at - interval '40 days', delivered_until = delivered_until - interval '40 days'
where link_id in (select link_id from acc);
select ok(sim.link_has_due((select link_id from acc where k = 'bank'), now()), 'tick: future entry became due');
select ok(sim.deliver_due_sql() >= 2, 'tick: due entries delivered to core');
select is(sim.deliver_due_sql(), 0, 'tick: watermark moved, nothing delivered twice');
select is((select count(*)::int from core.security_events where user_id = '00000000-0000-4000-8000-0000000b2a01' and source = 'sim'),
          3, 'tick: each simulated SIM swap delivered once (past, template future, first-session)');
select is((select balance_minor from core.accounts where id = (select id from acc where k = 'bank')),
          (select sim.balance(link_id, 'bank', now()) from acc where k = 'bank'), 'tick: balance follows the simulated bank');

-- ── reset and cleanup ────────────────────────────────────────────────────
select is((api.demo_reset('00000000-0000-4000-8000-0000000b2a01') ->> 'transactions_count')::int, 6, 'reset: same persona cloned again');
select is((select count(*)::int from core.cat_rules where user_id = '00000000-0000-4000-8000-0000000b2a01'), 0, 'reset: user rules removed');
update core.profiles set last_active_at = now() - interval '8 days' where user_id = '00000000-0000-4000-8000-0000000b2a01';
select is((api.demo_cleanup() ->> 'deleted')::int >= 1, true, 'cleanup: inactive anonymous clone deleted');

-- ── link flow (account profile) and grants ───────────────────────────────
create temp table ls as select api.sim_link_start('00000000-0000-4000-8000-0000000b2a02', 'kola_money', '{balances,transactions}', 'SN') j;
select is((select api.provider_accounts_upsert('00000000-0000-4000-8000-0000000b2a02', (j ->> 'link_id')::uuid,
            api.sim_link_complete('00000000-0000-4000-8000-0000000b2a02', (j ->> 'link_id')::uuid)) #>> '{0,institution}' from ls),
          'kola_money', 'link: template account takes the linked institution');
select ok(not has_function_privilege('authenticated', 'api.demo_start(uuid, text, text, text, text)', 'execute')
          and not has_function_privilege('anon', 'api.provider_ingest(uuid, uuid, jsonb)', 'execute'),
          'grants: provider/demo RPCs are service-role only');

select * from finish();
rollback;
