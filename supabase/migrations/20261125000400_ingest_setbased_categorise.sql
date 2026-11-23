-- B2: rule categorisation set-based (one join of the batch against the rules)
-- instead of one rule lookup per row: 639 rows went from ~450 ms to a few ms.
-- Same rule order as core.pick_category: the user's rules first, then global
-- keyword rules, then priority, then id.

-- Best rule per row of p_rows [{id, cp_key, text, mcc, op}] → [{id, category_id, is_user}].
create function core.match_categories(p_user uuid, p_rows jsonb)
returns table (id text, category_id text, is_user boolean)
language sql stable set search_path = '' as $$
  select distinct on (f.id) f.id, r.category_id, r.user_id is not null
  from jsonb_to_recordset(p_rows) as f(id text, cp_key text, text text, mcc text, op text)
  join core.cat_rules r on (r.user_id = p_user or r.user_id is null)
   and core.rule_matches(r.match_field, r.match_type, r.pattern, f.cp_key, f.text, f.mcc, f.op)
  order by f.id, (r.user_id is null), r.priority, r.id
$$;

create or replace function core.categorise(p_user uuid, p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with rows_ as (
    select jsonb_agg(jsonb_build_object('id', s.id, 'cp_key', s.cp_key,
             'text', core.norm_text(coalesce(s.remittance_info, '') || ' ' || coalesce(s.cp_name, '')),
             'mcc', s.cp_merchant_code, 'op', m.op_type)) j
    from core.transactions s left join core.tx_momo m on m.transaction_id = s.id
    where s.user_id = p_user and s.category_source = 'none' and (p_ids is null or s.id = any(p_ids))
  )
  update core.transactions t
     set category_id = c.category_id, category_source = case when c.is_user then 'user_rule' else 'keyword' end
    from rows_, core.match_categories(p_user, rows_.j) c
   where rows_.j is not null and t.id = c.id::uuid;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function core.ingest_entries(p_user uuid, p_account uuid, p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ins uuid[]; v_upd int; v_cat int; v_none int;
begin
  if not exists (select 1 from core.accounts where id = p_account and user_id = p_user) then
    perform core.api_error('NOT_FOUND', 'account.not_found');
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' then
    perform core.api_error('INVALID', 'ingest.entries_not_array');
  end if;
  begin
    with src as (
      select distinct on (e ->> 'providerEntryId') e ->> 'providerEntryId' as pid, e, e -> 'counterparty' cp
      from jsonb_array_elements(p_entries) with ordinality x(e, ord)
      where (e ->> 'providerEntryId') is not null
      order by e ->> 'providerEntryId', ord desc
    ), cat as (
      select * from core.match_categories(p_user, (
        select jsonb_agg(jsonb_build_object('id', pid, 'cp_key', core.cp_key(e),
                 'text', core.norm_text(coalesce(e ->> 'remittanceInfo', '') || ' ' || coalesce(cp ->> 'name', '')),
                 'mcc', cp ->> 'merchantCode', 'op', e #>> '{momo,opType}')) from src))
    ), up as (
      insert into core.transactions as t (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor,
        currency, booking_ts, value_date, btc_domain, btc_family, btc_subfamily, end_to_end_id, tx_id,
        acct_svcr_ref, cp_name, cp_iban, cp_msisdn, cp_bic, cp_merchant_code, cp_key, remittance_info,
        purpose_code, charges_minor, charges_currency, category_id, category_source)
      select p_user, p_account, src.pid, e ->> 'status', e ->> 'creditDebit',
        (e ->> 'amountMinor')::bigint, e ->> 'currency', (e ->> 'bookingTs')::timestamptz,
        (e ->> 'valueDate')::date, e #>> '{bankTxCode,domain}', e #>> '{bankTxCode,family}',
        e #>> '{bankTxCode,subFamily}', e ->> 'endToEndId', e ->> 'txId', e ->> 'acctSvcrRef',
        cp ->> 'name', cp ->> 'iban', cp ->> 'msisdn', cp ->> 'bic', cp ->> 'merchantCode', core.cp_key(e),
        e ->> 'remittanceInfo', e ->> 'purposeCode', (e #>> '{charges,amountMinor}')::bigint,
        e #>> '{charges,currency}', cat.category_id,
        case when cat.category_id is null then 'none' when cat.is_user then 'user_rule' else 'keyword' end
      from src left join cat on cat.id = src.pid
      on conflict (account_id, provider_entry_id) do update set status = excluded.status
        where t.status = 'PDNG' and excluded.status <> 'PDNG'
      returning t.id, t.provider_entry_id, (xmax = 0) as inserted, t.category_source
    ), mo as (
      insert into core.tx_momo (transaction_id, operator, op_type, agent_id, balance_after_minor, operator_ref)
      select up.id, src.e #>> '{momo,operator}', src.e #>> '{momo,opType}', src.e #>> '{momo,agentId}',
             (src.e #>> '{momo,balanceAfterMinor}')::bigint, src.e #>> '{momo,operatorRef}'
      from up join src on src.pid = up.provider_entry_id
      where up.inserted and src.e ? 'momo'
      returning 1
    )
    select array_agg(id) filter (where inserted),
           count(*) filter (where not inserted),
           count(*) filter (where inserted and category_source <> 'none'),
           count(*) filter (where inserted and category_source = 'none')
      into v_ins, v_upd, v_cat, v_none
    from up;
  exception
    when invalid_text_representation or not_null_violation or check_violation or datetime_field_overflow
         or invalid_datetime_format or numeric_value_out_of_range or foreign_key_violation then
      perform core.api_error('INVALID', 'ingest.invalid_entry');
  end;
  return jsonb_build_object('inserted', coalesce(cardinality(v_ins), 0), 'updated', v_upd,
    'categorised', v_cat, 'uncategorised', v_none, 'scored', 0, 'alerts', 0,
    'transaction_ids', to_jsonb(coalesce(v_ins, '{}'::uuid[])));
end $$;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
