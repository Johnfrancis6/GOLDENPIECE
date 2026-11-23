-- B5 part 2: the Groq backlog counts only rows `categorise-llm` can send (consent, not given up).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select plan(4);
alter table core.transactions alter column value_date set default current_date;   -- fixture only (rolled back)

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b000-0000000011a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'llm@test.invalid', '{"language":"fr"}', false, now(), now());
insert into core.accounts (id, user_id, kind, provider_account_id, display_name, institution, currency, balance_minor, balance_at)
values ('00000000-0000-4000-b000-0000000011ac', '00000000-0000-4000-b000-0000000011a1', 'momo', 'w', 'Wallet',
        'teranga_mobile', 'XOF', 1000, now());
create temp table b0 on commit drop as select core.llm_backlog_count() n;
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency,
                               booking_ts, cp_name, cp_key, remittance_info, category_source)
select gen_random_uuid(), '00000000-0000-4000-b000-0000000011a1', '00000000-0000-4000-b000-0000000011ac', 'llm-' || g, 'BOOK',
       'DBIT', 1000 * g, 'XOF', now() - make_interval(hours => g), 'Boutique Inconnue', 'n:boutique inconnue', 'achat', 'none'
from generate_series(1, 3) g;

select is(core.llm_backlog_count() - (select n from b0), 0::bigint, 'no consent: rows are not in the Groq backlog');
insert into core.consents (user_id, kind, granted, text_version, at)
values ('00000000-0000-4000-b000-0000000011a1', 'ai_categorisation', true, 'v1', now());
select is(core.llm_backlog_count() - (select n from b0), 3::bigint, 'consent granted: rows counted');
insert into ops.llm_seen (user_id, cp_key, text_hash, attempts, last_at)
values ('00000000-0000-4000-b000-0000000011a1', 'n:boutique inconnue',
        md5(core.norm_text('achat|Boutique Inconnue')), 2, now());
select is(core.llm_backlog_count() - (select n from b0), 0::bigint, 'label tried twice this week: not counted');
select is(ops.health_check() -> 'checks' ->> 'db', 'ok', 'health_check still runs');
select * from finish();
rollback;
