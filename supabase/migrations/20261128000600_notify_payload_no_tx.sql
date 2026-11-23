-- B5 part 2: notifications without a transaction (conc, learning) carried op_type 'other'
-- (core.op_group of nothing). op_type is now set only for transaction alerts.
create or replace function ops.notify_payload(p_alert uuid, p_type text) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  al core.alerts; p core.profiles; t core.transactions; a core.accounts; m core.tx_momo; v_grp text;
  v_reason jsonb := '{}';
begin
  select * into al from core.alerts where id = p_alert;
  select * into p from core.profiles where user_id = al.user_id;
  select * into t from core.transactions where id = al.transaction_id;
  select * into a from core.accounts where id = t.account_id;
  select * into m from core.tx_momo where transaction_id = t.id;
  v_grp := core.op_group(m.op_type, t.btc_family, t.btc_subfamily);
  if jsonb_typeof(al.reasons) = 'array' and jsonb_array_length(al.reasons) > 0 then v_reason := al.reasons -> 0 -> 'params'; end if;
  return jsonb_build_object(
    'type', p_type,
    'channel', case when p_type = 'conc' then 'markets' when p_type like 'budget%' then 'budgets' else 'security' end,
    'alert_id', al.id,
    'title_key', 'N.' || p_type || '.title',
    'silent', p_type = 'learning',
    'args', jsonb_strip_nulls(jsonb_build_object(
      'op_type', case when t.id is not null then coalesce(m.op_type, v_grp) end,
      'operator', coalesce((select name from ref.operators where id = a.operator),
                           (select name from ref.banks where id = a.bank_id), a.institution),
      'payee_short', core.payee_short(t.cp_name, v_grp),
      'time', to_char(t.booking_ts at time zone p.timezone, 'HH24:MI'),
      'bank', (select name from ref.banks where id = al.bank_id),
      'category', coalesce(v_reason ->> 'category', t.category_id),
      'asset', v_reason ->> 'asset', 'share', v_reason -> 'share', 'threshold', v_reason -> 'threshold',
      'amount', case when not p.hide_amounts_in_push and t.id is not null and p_type not in ('fraud', 'conc')
                     then jsonb_build_object('m', t.amount_minor, 'c', t.currency) end)),
    'sent_at', now());
end $$;
