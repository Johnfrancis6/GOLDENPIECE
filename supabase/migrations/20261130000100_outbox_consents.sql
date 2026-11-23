-- B6.4: consents given offline (O12) are queued in the phone outbox and
-- replayed through apply_mutations. record_consents itself appends rows, so
-- the replay goes through core.record_consents_once, idempotent per client_id
-- (ops.idempotency), like the other outbox mutations.

create function core.record_consents_once(p_client_id uuid, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_res jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select result into v_res from ops.idempotency where client_id = p_client_id and user_id = uid;
  if v_res is not null then return v_res; end if;
  v_res := api.record_consents(p_items);
  insert into ops.idempotency (client_id, user_id, rpc, result) values (p_client_id, uid, 'record_consents', v_res);
  return v_res;
end $$;

-- apply_mutations: same as 20261129000100 + record_consents
create or replace function api.apply_mutations(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); it jsonb; a jsonb; v_cid uuid; v_rpc text; r jsonb; v_out jsonb := '[]'::jsonb;
        v_msg text; v_code text; v_seen boolean;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    perform core.api_error('INVALID', 'mutations.invalid');
  end if;
  for it in select value from jsonb_array_elements(p_items) loop
    v_rpc := it->>'rpc'; a := coalesce(it->'args', '{}'::jsonb);
    begin
      v_cid := (it->>'client_id')::uuid;
    exception when others then v_cid := null; end;
    if v_cid is null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('client_id', it->>'client_id', 'status', 'rejected',
                                                             'reason_key', 'mutations.invalid'));
      continue;
    end if;
    v_seen := exists (select 1 from ops.idempotency where client_id = v_cid and user_id = uid);
    begin
      r := case v_rpc
        when 'update_settings' then api.update_settings(v_cid, a->'settings')
        when 'upsert_debt' then api.upsert_debt(v_cid, (a->>'id')::uuid, a->>'name', a->>'currency',
               (a->>'principal_minor')::bigint, (a->>'balance_minor')::bigint, a->>'lender',
               (a->>'annual_rate_bp')::int, (a->>'monthly_payment_minor')::bigint, (a->>'start_date')::date,
               (a->>'end_date')::date, (a->>'base_version')::int)
        when 'save_questionnaire' then api.save_questionnaire(a->>'section', a->'answers', coalesce((a->>'version')::int, 1))
        when 'record_consents' then core.record_consents_once(v_cid, a->'items')
        else null end;
      if r is null then
        v_out := v_out || jsonb_build_array(jsonb_build_object('client_id', v_cid, 'status', 'rejected',
                                                               'reason_key', 'mutations.unknown_rpc'));
      elsif r->>'status' = 'conflict' then
        v_out := v_out || jsonb_build_array(jsonb_build_object('client_id', v_cid, 'status', 'conflict',
                                                               'current', r->'current'));
      else
        v_out := v_out || jsonb_build_array(jsonb_build_object('client_id', v_cid,
                   'status', case when v_seen then 'duplicate' else 'applied' end, 'result', r));
      end if;
    exception when others then
      get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate;
      v_out := v_out || jsonb_build_array(jsonb_build_object('client_id', v_cid, 'status', 'rejected',
                 'reason_key', case when v_code = 'PGRST' then coalesce((v_msg::jsonb)->>'message', 'mutations.rejected')
                                    else 'mutations.rejected' end));
    end;
  end loop;
  return jsonb_build_object('results', v_out);
end $$;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
revoke all on function core.record_consents_once(uuid, jsonb) from anon, authenticated;
grant execute on function api.apply_mutations(jsonb) to authenticated;
