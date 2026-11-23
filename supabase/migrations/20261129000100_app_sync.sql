-- B6: RPCs the app shell needs (API.md §2.1, §2.3, §2.10, §2.11).
--   sync_transactions  — offline cache feed, keyset on (updated_at, id)
--   save_questionnaire — O14, one section at a time, risk profile 1-5
--   update_settings    — S7 settings + first name (last write wins)
--   record_security_event — app-side events (whitelist)
--   apply_mutations    — outbox replay (≤ 20 items, per-item result)
-- bootstrap now also returns profile.first_name.

alter table core.profiles add column if not exists first_name text
  check (first_name is null or length(first_name) between 1 and 40);

-- ── bootstrap (+ first_name) ───────────────────────────────────────────────
create or replace function api.bootstrap(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select jsonb_build_object(
    'profile', jsonb_build_object('language', p.language, 'country', p.country, 'timezone', p.timezone,
       'ref_currency', p.ref_currency, 'risk_profile', p.risk_profile, 'first_name', p.first_name,
       'hide_amounts_in_push', p.hide_amounts_in_push, 'data_saver', p.data_saver,
       'lock_delay_s', p.lock_delay_s, 'notif_prefs', p.notif_prefs,
       'is_demo', p.is_anonymous, 'demo_persona', p.demo_persona, 'row_version', p.row_version),
    'min_version', (select value from ops.app_config where key = 'min_version'),
    'learning', coalesce((select jsonb_build_object('active', l.active, 'days', l.days, 'ops', l.ops_count)
                          from analytics.learning_status l where l.user_id = uid),
                         '{"active": false, "days": 0, "ops": 0}'::jsonb),
    'consents_current', coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted,
                                   'text_version', c.text_version, 'at', c.at) order by c.kind)
                                  from (select distinct on (kind) kind, granted, text_version, at
                                        from core.consents where user_id = uid order by kind, at desc, id desc) c),
                                 '[]'::jsonb),
    'questionnaire', coalesce((select jsonb_object_agg(q.section, jsonb_build_object('version', q.version,
                                 'updated_at', q.updated_at)) from core.questionnaire q where q.user_id = uid),
                              '{}'::jsonb),
    'card', (select jsonb_build_object('brand', k.brand, 'last4', k.last4, 'bank_name', b.name)
             from core.cards k left join ref.banks b on b.id = k.bank_id where k.user_id = uid),
    'devices_count', (select count(*) from core.devices d where d.user_id = uid and d.revoked_at is null),
    'flags', coalesce((select value from ops.app_config where key = 'flags'), '{}'::jsonb))
  into v
  from core.profiles p where p.user_id = uid;
  if v is null then perform core.api_error('NOT_FOUND', 'profile.missing'); end if;
  return core.envelope(p_etag, v);
end $$;

-- ── sync_transactions (ARCHITECTURE §8.2) ──────────────────────────────────
-- Cursor = '<updated_at ISO>|<id>'; rows strictly after it, ascending, so a
-- later call with the last cursor returns only what changed since. Rows older
-- than 24 months (booking) are not sent (§8.1 cap). The phone keeps the cursor
-- in sync_state; after a demo reset it starts again from null.
create function api.sync_transactions(p_cursor text default null, p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ts timestamptz; v_id uuid; v_lim int := least(greatest(coalesce(p_limit, 200), 1), 500);
        v_ref text; v_items jsonb; v_n int; v_last jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_cursor is not null then
    begin
      v_ts := split_part(p_cursor, '|', 1)::timestamptz;
      v_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then
      perform core.api_error('INVALID', 'sync.bad_cursor');
    end;
  end if;
  select ref_currency into v_ref from core.profiles where user_id = uid;
  with page as (
    select t.*, m.op_type, m.operator
    from core.transactions t left join core.tx_momo m on m.transaction_id = t.id
    where t.user_id = uid
      and t.booking_ts >= now() - interval '24 months'
      and (p_cursor is null or (t.updated_at, t.id) > (v_ts, v_id))
    order by t.updated_at, t.id
    limit v_lim + 1)
  select jsonb_agg(jsonb_build_object(
           'id', p.id, 'account_id', p.account_id, 'booking_ts', p.booking_ts, 'value_date', p.value_date,
           'status', p.status, 'cdt_dbt_ind', p.cdt_dbt_ind,
           'amount', jsonb_build_object('m', p.amount_minor, 'c', p.currency),
           'amount_ref', core.conv_minor(p.amount_minor, p.currency, v_ref),
           'label', coalesce(nullif(p.cp_name, ''), nullif(p.remittance_info, ''), p.btc_subfamily),
           'cp_name', p.cp_name, 'remittance', p.remittance_info,
           'category_id', p.category_id, 'category_source', p.category_source,
           'category_version', p.category_version, 'op_type', p.op_type, 'operator', p.operator,
           'alert_id', (select a.id from core.alerts a where a.transaction_id = p.id order by a.created_at desc limit 1),
           'row_version', p.row_version, 'updated_at', p.updated_at) order by p.updated_at, p.id),
         count(*)
    into v_items, v_n
  from (select * from page order by updated_at, id limit v_lim) p;
  v_items := coalesce(v_items, '[]'::jsonb);
  v_last := v_items -> (jsonb_array_length(v_items) - 1);
  return jsonb_build_object(
    'items', v_items,
    'next_cursor', case when v_last is null then p_cursor
                        else (v_last->>'updated_at') || '|' || (v_last->>'id') end,
    'has_more', exists (
      select 1 from core.transactions t where t.user_id = uid and t.booking_ts >= now() - interval '24 months'
        and v_last is not null and (t.updated_at, t.id) > ((v_last->>'updated_at')::timestamptz, (v_last->>'id')::uuid)),
    'ref_currency', v_ref);
end $$;

-- ── questionnaire (O14, TECH_ANALYSIS §1.4) ────────────────────────────────
-- Risk section: five answers r1..r5 each 1..5 → profile = round(mean).
create function api.save_questionnaire(p_section text, p_answers jsonb, p_version int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_profile smallint; v_vals numeric[];
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_section not in ('income','goals','risk','habits') or jsonb_typeof(p_answers) <> 'object'
     or length(p_answers::text) > 4000 or coalesce(p_version, 0) < 1 then
    perform core.api_error('INVALID', 'questionnaire.invalid');
  end if;
  insert into core.questionnaire (user_id, section, answers, version)
  values (uid, p_section, p_answers, p_version)
  on conflict (user_id, section) do update set answers = excluded.answers, version = excluded.version, updated_at = now();
  if p_section = 'risk' then
    select array_agg((p_answers->>k)::numeric) into v_vals
    from unnest(array['r1','r2','r3','r4','r5']) k
    where jsonb_typeof(p_answers->k) = 'number' and (p_answers->>k)::numeric between 1 and 5;
    if coalesce(array_length(v_vals, 1), 0) = 5 then
      v_profile := round((select avg(x) from unnest(v_vals) x));
      update core.profiles set risk_profile = v_profile where user_id = uid;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'risk_profile', v_profile);
end $$;

-- ── update_settings (S7; ARCHITECTURE §8.3: last write wins) ───────────────
create function api.update_settings(p_client_id uuid, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_res jsonb; s jsonb := coalesce(p_settings, '{}'::jsonb); p core.profiles;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_client_id is null then perform core.api_error('INVALID', 'settings.invalid'); end if;
  select result into v_res from ops.idempotency where client_id = p_client_id and user_id = uid;
  if found then return v_res; end if;
  if jsonb_typeof(s) <> 'object' or exists (
       select 1 from jsonb_object_keys(s) k where k not in ('ref_currency','language','hide_amounts_in_push',
         'data_saver','lock_delay_s','notif_prefs','first_name','timezone','country')) then
    perform core.api_error('INVALID', 'settings.invalid');
  end if;
  begin
    update core.profiles set
      ref_currency = coalesce(s->>'ref_currency', ref_currency),
      language = coalesce(s->>'language', language),
      country = coalesce(s->>'country', country),
      timezone = case when s ? 'timezone' and exists (select 1 from pg_timezone_names where name = s->>'timezone')
                      then s->>'timezone' else timezone end,
      hide_amounts_in_push = coalesce((s->>'hide_amounts_in_push')::boolean, hide_amounts_in_push),
      data_saver = coalesce((s->>'data_saver')::boolean, data_saver),
      lock_delay_s = coalesce((s->>'lock_delay_s')::int, lock_delay_s),
      notif_prefs = case when jsonb_typeof(s->'notif_prefs') = 'object' then notif_prefs || (s->'notif_prefs') else notif_prefs end,
      first_name = case when s ? 'first_name' then nullif(trim(s->>'first_name'), '') else first_name end
    where user_id = uid returning * into p;
  exception when check_violation or invalid_text_representation or foreign_key_violation then
    perform core.api_error('INVALID', 'settings.invalid');
  end;
  if p.user_id is null then perform core.api_error('NOT_FOUND', 'profile.missing'); end if;
  insert into core.security_events (user_id, type, source, details)
  values (uid, 'settings_changed', 'server', jsonb_build_object('keys', (select jsonb_agg(k) from jsonb_object_keys(s) k)));
  v_res := jsonb_build_object('status', 'applied', 'row_version', p.row_version);
  insert into ops.idempotency (client_id, user_id, rpc, result) values (p_client_id, uid, 'update_settings', v_res);
  return v_res;
end $$;

-- ── record_security_event (API.md §2.10 whitelist) ─────────────────────────
create function api.record_security_event(p_type text, p_details jsonb default '{}', p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_type not in ('pin_failed','settings_changed','device_security_changed','sign_out')
     or jsonb_typeof(coalesce(p_details, '{}')) <> 'object' or length(coalesce(p_details, '{}')::text) > 1000 then
    perform core.api_error('INVALID', 'security_event.invalid');
  end if;
  if not ops.rate_limit('sec_event:' || uid, 30, 3600) then
    perform core.api_error('RATE_LIMITED', 'rate_limited', 3600);
  end if;
  if p_device_id is not null and not exists (select 1 from core.devices where id = p_device_id and user_id = uid) then
    p_device_id := null;
  end if;
  insert into core.security_events (user_id, device_id, type, source, details)
  values (uid, p_device_id, p_type, 'app', coalesce(p_details, '{}'));
  return jsonb_build_object('ok', true);
end $$;

-- ── apply_mutations (API.md §2.11, ARCHITECTURE §8.4) ──────────────────────
-- Each item runs in its own sub-transaction: an error rolls back that item only.
-- Supported in B6: update_settings, upsert_debt, save_questionnaire. B7/B8 add
-- set_category, rules, budgets, categories, trades, real estate here.
create function api.apply_mutations(p_items jsonb) returns jsonb
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

-- ── grants ────────────────────────────────────────────────────────────────
revoke all on function api.sync_transactions(text, int), api.save_questionnaire(text, jsonb, int),
  api.update_settings(uuid, jsonb), api.record_security_event(text, jsonb, uuid), api.apply_mutations(jsonb)
  from public, anon;
grant execute on function api.sync_transactions(text, int), api.save_questionnaire(text, jsonb, int),
  api.update_settings(uuid, jsonb), api.record_security_event(text, jsonb, uuid), api.apply_mutations(jsonb)
  to authenticated;
