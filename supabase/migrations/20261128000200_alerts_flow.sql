-- B5: alert lifecycle (API.md §2.9, §2.12, §3; ARCHITECTURE §7.5, §7.7; design N, B13-B15, D).
-- Notifications are built here (payload of design N / BACKEND_NEEDS #6) and handed to the
-- Edge `notify` (push sending stubbed until B8). Bands 40/70 never move; feedback tunes the
-- parameters below them, bounded and logged (ops.param_changes).

alter table ops.push_log
  add column if not exists type text,
  add column if not exists channel text,
  add column if not exists payload jsonb,
  add column if not exists detail jsonb,
  add column if not exists created_at timestamptz not null default now();
create index if not exists push_log_user_channel on ops.push_log (user_id, channel, created_at desc);
create index if not exists push_log_held on ops.push_log (status) where status = 'held';

-- ── helpers ──────────────────────────────────────────────────────────────
-- "Awa Koné" → "Awa K." for people; merchants keep their name (≤ 24 chars). Never an account number.
create function core.payee_short(p_name text, p_group text) returns text
language sql immutable parallel safe as $$
  select case
    when p_name is null then null
    when p_group in ('p2p', 'transfer') and array_length(regexp_split_to_array(trim(p_name), '\s+'), 1) >= 2
      then split_part(trim(p_name), ' ', 1) || ' '
           || left((regexp_split_to_array(trim(p_name), '\s+'))[array_length(regexp_split_to_array(trim(p_name), '\s+'), 1)], 1) || '.'
    else left(regexp_replace(p_name, '[0-9]{6,}', '', 'g'), 24) end
$$;

create function core.user_ref(p_user uuid) returns text
language sql immutable parallel safe as $$
  select left(encode(extensions.digest(p_user::text, 'sha256'), 'hex'), 8)
$$;

-- tx block of alert payloads (amount in minor units + currency)
create function core.alert_tx(p_tx uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', t.id, 'amount', jsonb_build_object('m', t.amount_minor, 'c', t.currency),
    'cp_name', t.cp_name, 'booking_ts', t.booking_ts, 'category_id', t.category_id,
    'op_type', coalesce(m.op_type, core.op_group(null, t.btc_family, t.btc_subfamily)),
    'account', jsonb_build_object('id', a.id, 'kind', a.kind, 'display_name', a.display_name,
                                  'institution', a.institution))
  from core.transactions t join core.accounts a on a.id = t.account_id
  left join core.tx_momo m on m.transaction_id = t.id where t.id = p_tx
$$;

-- ── notifications (design N §4) ──────────────────────────────────────────
create function ops.notify_payload(p_alert uuid, p_type text) returns jsonb
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
      'op_type', coalesce(m.op_type, v_grp),
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

-- Queue one notification: channel switches, 1 per day per budgets/markets channel, quiet hours
-- 22:00-07:00 local for those channels (held, sent at 07:00); security never limited.
create function ops.notify(p_alert uuid, p_type text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb := ops.notify_payload(p_alert, p_type); v_user uuid; p core.profiles; v_ch text;
  v_status text := 'queued'; v_id bigint; v_local timestamp; v_url text; v_secret text;
begin
  select user_id into v_user from core.alerts where id = p_alert;
  select * into p from core.profiles where user_id = v_user;
  v_ch := v_payload ->> 'channel';
  v_local := now() at time zone p.timezone;
  if v_ch <> 'security' then
    if coalesce((p.notif_prefs ->> v_ch)::boolean, v_ch = 'budgets') is false then
      v_status := 'skipped_pref';
    elsif exists (select 1 from ops.push_log where user_id = v_user and channel = v_ch
                    and status in ('queued', 'sent', 'stub', 'held')
                    and (created_at at time zone p.timezone)::date = v_local::date) then
      v_status := 'skipped_daily';
    elsif extract(hour from v_local) >= 22 or extract(hour from v_local) < 7 then
      v_status := 'held';
    end if;
  end if;
  insert into ops.push_log (user_id, alert_id, kind, type, channel, status, payload, sent_at)
  values (v_user, p_alert, p_type, p_type, v_ch, v_status, v_payload, now())
  returning id into v_id;
  if v_status = 'queued' then perform ops.notify_dispatch(v_id); end if;
  return v_id;
end $$;

-- Hand a queued notification to the Edge `notify` (pg_net, sent after commit).
create function ops.notify_dispatch(p_push bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  v_url := (select value ->> 'url' from ops.app_config where key = 'functions');
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'gp_cron_secret';
  if v_url is null or v_secret is null then
    update ops.push_log set status = 'no_edge' where id = p_push;
    return;
  end if;
  perform net.http_post(url := v_url || '/notify', body := jsonb_build_object('push_id', p_push),
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-gp-cron', v_secret),
                        timeout_milliseconds := 10000);
end $$;

-- Edge `notify`: read a queued notification with the user's push tokens …
create function api.notify_get(p_push_id bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('push_id', l.id, 'user_id', l.user_id, 'alert_id', l.alert_id, 'status', l.status,
    'payload', l.payload, 'demo', p.demo_persona is not null,
    'tokens', coalesce((select jsonb_agg(d.push_token) from core.devices d where d.user_id = l.user_id
                         and d.push_enabled and d.push_token is not null and d.revoked_at is null), '[]'))
  from ops.push_log l join core.profiles p on p.user_id = l.user_id where l.id = p_push_id
$$;

-- … and record the outcome (status sent | stub | no_token | failed; ticket from Expo).
create function api.notify_done(p_push_id bigint, p_status text, p_ticket text default null, p_detail jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update ops.push_log set status = p_status, ticket_id = p_ticket, detail = p_detail, sent_at = now()
  where id = p_push_id;
  update core.alerts a set push_sent_at = coalesce(a.push_sent_at, now())
  from ops.push_log l where l.id = p_push_id and a.id = l.alert_id and p_status in ('sent', 'stub', 'no_token');
end $$;

-- Alert inserts and status changes → notification type (design N §4).
create function core.alerts_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := case
      when new.kind in ('anomaly', 'fraud') and new.band = 'ask' then 'confirm'
      when new.kind in ('anomaly', 'fraud') and new.band = 'bank' then 'alerted'
      when new.kind = 'concentration' then 'conc'
      when new.kind = 'learning_done' then 'learning'
      when new.kind = 'budget' then case when coalesce((new.reasons -> 0 -> 'params' ->> 'pct')::int, 80) >= 100
                                         then 'budget100' else 'budget80' end end;
  elsif new.status is distinct from old.status then
    v_type := case
      when new.status = 'escalated' and old.status = 'awaiting_user' then 'alerted'
      when new.status = 'decided_legit' then 'legit'
      when new.status = 'decided_fraud' then 'fraud' end;
  end if;
  if v_type is not null then perform ops.notify(new.id, v_type); end if;
  return null;
end $$;
create trigger alerts_notify after insert or update of status on core.alerts
  for each row execute function core.alerts_notify();

-- ── bounded tuning (§7.5) ────────────────────────────────────────────────
-- One user × category parameter moves by p_delta within the global row's bounds,
-- at most once per day per (key, user, category). Returns the change or null.
create function core.tune(p_user uuid, p_category text, p_key text, p_delta real, p_cause text,
                          p_alert uuid, p_actor uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g ops.scoring_params; v_cat text := coalesce(p_category, '_'); v_before real; v_after real;
begin
  select * into g from ops.scoring_params where key = p_key and scope = 'global';
  if not found then return null; end if;
  if exists (select 1 from ops.param_changes where param_key = p_key and user_id = p_user and category_id = v_cat
               and at > now() - interval '1 day') then return null; end if;
  v_before := coalesce((select value from ops.scoring_params where key = p_key and scope = 'user_category'
                          and user_id = p_user and category_id = v_cat), g.value);
  v_after := greatest(g.min_value, least(g.max_value, v_before + p_delta));
  if v_after = v_before then return null; end if;
  insert into ops.scoring_params (key, scope, user_id, category_id, value, default_value, min_value, max_value)
  values (p_key, 'user_category', p_user, v_cat, v_after, g.default_value, g.min_value, g.max_value)
  on conflict (key, scope, user_id, category_id) do update set value = excluded.value,
    version = ops.scoring_params.version + 1, updated_at = now();
  insert into ops.param_changes (param_key, user_id, category_id, before, after, cause, alert_id, actor)
  values (p_key, p_user, v_cat, v_before, v_after, p_cause, p_alert, p_actor);
  return jsonb_build_object('key', p_key, 'category', v_cat, 'before', v_before, 'after', v_after, 'cause', p_cause);
end $$;

-- Weekly (Monday): per rule with ≥ 5 decisions in 28 days, precision < 30 % → w − 3, > 80 % → w + 3.
create function ops.weekly_rule_tuning() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_out jsonb := '[]'; g ops.scoring_params; v_after real;
begin
  for r in
    select x ->> 'code' code, count(*) n, count(*) filter (where d.decision = 'fraud') fraud
    from core.analyst_decisions d join core.alerts a on a.id = d.alert_id join core.scores s on s.id = a.score_id
    cross join lateral jsonb_array_elements(coalesce(s.features -> 'rules', '[]')) x
    where d.decided_at > now() - interval '28 days'
    group by 1 having count(*) >= 5
  loop
    select * into g from ops.scoring_params where key = 'w:' || r.code and scope = 'global';
    continue when not found;
    v_after := greatest(g.min_value, least(g.max_value, g.value + case
      when r.fraud::real / r.n < 0.30 then -3 when r.fraud::real / r.n > 0.80 then 3 else 0 end));
    if v_after <> g.value then
      update ops.scoring_params set value = v_after, version = version + 1, updated_at = now()
      where key = g.key and scope = 'global';
      insert into ops.param_changes (param_key, before, after, cause) values (g.key, g.value, v_after, 'weekly_precision');
      v_out := v_out || jsonb_build_array(jsonb_build_object('key', g.key, 'before', g.value, 'after', v_after,
                                                             'precision', round(r.fraud::numeric / r.n, 3), 'n', r.n));
    end if;
  end loop;
  insert into ops.job_runs (job, status, finished_at, items, detail)
  values ('rule-tuning', 'ok', now(), jsonb_array_length(v_out), jsonb_build_object('changes', v_out));
  return v_out;
end $$;

-- ── decisions ────────────────────────────────────────────────────────────
create function core.decide_alert(p_alert uuid, p_decision text, p_comment text, p_analyst uuid, p_simulated boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare al core.alerts; v_cat text; v_change jsonb; v_changes jsonb := '[]';
begin
  select * into al from core.alerts where id = p_alert for update;
  if not found then perform core.api_error('NOT_FOUND', 'alert.not_found'); end if;
  if p_decision not in ('fraud', 'legit') then perform core.api_error('INVALID', 'alert.bad_decision'); end if;
  if al.status in ('decided_legit', 'decided_fraud') then
    return jsonb_build_object('status', al.status, 'already_decided', true, 'param_changes', '[]'::jsonb);
  end if;
  if al.status not in ('escalated', 'in_review', 'awaiting_user', 'confirmed_by_user') then
    perform core.api_error('REJECTED', 'alert.not_decidable');
  end if;
  insert into core.analyst_decisions (alert_id, analyst_id, decision, comment, simulated)
  values (p_alert, p_analyst, p_decision, left(p_comment, 500), p_simulated);
  update core.alerts set status = 'decided_' || p_decision, row_version = row_version + 1, updated_at = now()
  where id = p_alert;
  v_cat := (select category_id from core.transactions where id = al.transaction_id);
  v_change := core.tune(al.user_id, v_cat, 'z0', case when p_decision = 'legit' then 0.25 else -0.25 end,
                        'analyst_' || p_decision, p_alert, p_analyst);
  if v_change is not null then v_changes := v_changes || jsonb_build_array(v_change); end if;
  perform ops.audit(p_analyst, case when p_simulated then 'simulated_analyst' else 'analyst' end,
                    'alert.decide', p_alert::text,
                    jsonb_build_object('decision', p_decision, 'param_changes', v_changes));
  return jsonb_build_object('status', 'decided_' || p_decision, 'param_changes', v_changes);
end $$;

-- ── user RPCs (§2.9) ─────────────────────────────────────────────────────
create function core.alert_item(al core.alerts) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', al.id, 'kind', al.kind, 'band', al.band, 'score', al.score, 'status', al.status,
    'reasons', coalesce((select jsonb_agg(jsonb_build_object('code', r ->> 'code', 'params', coalesce(r -> 'params', '{}')))
                         from jsonb_array_elements(case when jsonb_typeof(al.reasons) = 'array' then al.reasons
                                                        else '[]' end) r), '[]'),
    'tx', case when al.transaction_id is not null then core.alert_tx(al.transaction_id) - 'account' end,
    'created_at', al.created_at, 'answered_at', al.answered_at, 'user_answer', al.user_answer,
    'decision', (select jsonb_build_object('value', d.decision, 'at', d.decided_at) from core.analyst_decisions d
                 where d.alert_id = al.id order by d.decided_at desc limit 1),
    'row_version', al.row_version)
$$;

create function api.list_alerts(p_status text default 'open', p_cursor text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_ts timestamptz; v_id uuid; v_items jsonb; v_n int; v_next text;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_status not in ('open', 'all') then perform core.api_error('INVALID', 'alerts.bad_status'); end if;
  if p_cursor is not null then
    begin
      v_ts := split_part(p_cursor, '|', 1)::timestamptz; v_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform core.api_error('INVALID', 'alerts.bad_cursor'); end;
  end if;
  with q as (
    select a.id, a.created_at, row_number() over (order by a.created_at desc, a.id desc) rn
    from core.alerts a where a.user_id = uid
      and (p_status = 'all' or a.status in ('open', 'awaiting_user', 'escalated', 'in_review'))
      and (v_ts is null or (a.created_at, a.id) < (v_ts, v_id))
    order by a.created_at desc, a.id desc limit 21)
  select jsonb_agg(core.alert_item(a) order by q.rn) filter (where q.rn <= 20), count(*),
         (array_agg(q.created_at::text || '|' || q.id) filter (where q.rn = 20))[1]
    into v_items, v_n, v_next
  from q join core.alerts a on a.id = q.id;
  return jsonb_build_object('items', coalesce(v_items, '[]'), 'next_cursor', case when v_n > 20 then v_next end);
end $$;

create function core.alert_timeline(al core.alerts) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('status', s, 'at', at) order by at), '[]') from (
    values ('created', al.created_at), ('notified', al.push_sent_at), ('reminded', al.reminder_sent_at),
           (case al.user_answer when 'me' then 'confirmed_by_user' when 'not_me' then 'not_me' end, al.answered_at),
           ('escalated', al.escalated_at),
           ((select 'decided_' || d.decision from core.analyst_decisions d where d.alert_id = al.id
             order by d.decided_at desc limit 1),
            (select d.decided_at from core.analyst_decisions d where d.alert_id = al.id order by d.decided_at desc limit 1))
  ) v(s, at) where s is not null and at is not null
$$;

create function api.get_alert(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); al core.alerts; sc core.scores;
begin
  select * into al from core.alerts where id = p_id and user_id = uid;
  if not found then perform core.api_error('NOT_FOUND', 'alert.not_found'); end if;
  select * into sc from core.scores where id = al.score_id;
  return core.alert_item(al) || jsonb_build_object(
    'score_breakdown', case when sc.id is not null then jsonb_build_object('a_thr', sc.a_thr, 'a_if', sc.a_if,
      'f', sc.f, 'm', sc.m, 'learning', sc.learning,
      'reasons', sc.reasons, 'bumps', coalesce(sc.features -> 'bumps', '[]')) end,
    'timeline', core.alert_timeline(al));
end $$;

-- "C'est vous ?" answer (after the local sensitive-action gate). Idempotent by client id.
create function api.answer_alert(p_client_id uuid, p_alert_id uuid, p_answer text, p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); al core.alerts; v_res jsonb; v_status text; v_cat text; t core.transactions;
  v_change jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if p_client_id is null or p_answer not in ('me', 'not_me') then perform core.api_error('INVALID', 'alert.bad_answer'); end if;
  select result into v_res from ops.idempotency where client_id = p_client_id and user_id = uid;
  if found then return v_res; end if;
  if not ops.rate_limit('answer_alert:' || uid, 10, 60) then perform core.api_error('RATE_LIMITED', 'rate.limited', 60); end if;
  select * into al from core.alerts where id = p_alert_id and user_id = uid for update;
  if not found then perform core.api_error('NOT_FOUND', 'alert.not_found'); end if;
  if al.user_answer is not null then
    v_res := jsonb_build_object('status', al.status, 'already_answered', true, 'answer', al.user_answer);
  else
    select * into t from core.transactions where id = al.transaction_id;
    v_status := case
      when al.status = 'awaiting_user' and p_answer = 'me' then 'confirmed_by_user'
      when al.status = 'awaiting_user' and p_answer = 'not_me' then 'escalated'
      else al.status end;                                     -- bank band: answer recorded, status kept
    update core.alerts set user_answer = p_answer, answered_at = now(), status = v_status,
      escalated_at = case when v_status = 'escalated' and escalated_at is null then now() else escalated_at end,
      row_version = row_version + 1, updated_at = now()
    where id = al.id;
    perform ops.audit(uid, 'user', 'alert.answer', al.id::text,
                      jsonb_build_object('answer', p_answer, 'device_id', p_device_id));
    if p_answer = 'me' and al.status = 'awaiting_user' then           -- §7.5: known payee + z0 +0.10 (bounded)
      if t.cp_key is not null then
        insert into core.known_payees (user_id, cp_key, alert_id) values (uid, t.cp_key, al.id) on conflict do nothing;
      end if;
      v_change := core.tune(uid, t.category_id, 'z0', 0.10, 'user_me', al.id, uid);
    end if;
    v_res := jsonb_build_object('status', v_status, 'already_answered', false);
  end if;
  insert into ops.idempotency (client_id, user_id, rpc, result) values (p_client_id, uid, 'answer_alert', v_res);
  return v_res;
end $$;

-- ── analyst RPCs (§2.12, BACKEND_NEEDS #9-#10) — analyst role + aal2 ────
create function core.require_analyst() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not core.is_analyst() then perform core.api_error('FORBIDDEN', 'analyst.required'); end if;
end $$;

create function api.analyst_queue(p_status text default 'pending', p_cursor text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_ts timestamptz; v_id uuid; v_items jsonb; v_n int; v_last text;
begin
  perform core.require_analyst();
  if p_status not in ('pending', 'decided', 'all') then perform core.api_error('INVALID', 'queue.bad_status'); end if;
  if p_cursor is not null then
    begin
      v_ts := split_part(p_cursor, '|', 1)::timestamptz; v_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then perform core.api_error('INVALID', 'queue.bad_cursor'); end;
  end if;
  with q as (
    select a.*, row_number() over (order by a.created_at desc, a.id desc) rn
    from core.alerts a
    where a.kind in ('anomaly', 'fraud')
      and case p_status when 'pending' then a.status in ('escalated', 'in_review')
                        when 'decided' then a.status in ('decided_legit', 'decided_fraud')
                        else a.status in ('escalated', 'in_review', 'decided_legit', 'decided_fraud') end
      and (v_ts is null or (a.created_at, a.id) < (v_ts, v_id))
    order by a.created_at desc, a.id desc limit 51)
  select jsonb_agg(jsonb_build_object(
      'alert_id', q.id, 'created_at', q.created_at, 'score', q.score, 'band', q.band, 'kind', q.kind,
      'reasons', q.reasons, 'user_ref', core.user_ref(q.user_id), 'country', p.country, 'bank_id', q.bank_id,
      'status', q.status, 'age_min', floor(extract(epoch from now() - q.created_at) / 60)::int,
      'tx', (select jsonb_build_object('amount', jsonb_build_object('m', t.amount_minor, 'c', t.currency),
                                       'op_type', coalesce(m.op_type, core.op_group(null, t.btc_family, t.btc_subfamily)),
                                       'cp_name', t.cp_name)
             from core.transactions t left join core.tx_momo m on m.transaction_id = t.id where t.id = q.transaction_id),
      'decided', (select jsonb_build_object('by', case when d.simulated then 'simulated' else core.user_ref(d.analyst_id) end,
                                            'at', d.decided_at, 'simulated', d.simulated, 'decision', d.decision)
                  from core.analyst_decisions d where d.alert_id = q.id order by d.decided_at desc limit 1))
      order by q.created_at desc, q.id desc) filter (where q.rn <= 50),
    count(*), (array_agg(q.created_at::text || '|' || q.id order by q.rn) filter (where q.rn = 50))[1]
    into v_items, v_n, v_last
  from q join core.profiles p on p.user_id = q.user_id;
  return jsonb_build_object('items', coalesce(v_items, '[]'),
                            'next_cursor', case when v_n > 50 then v_last end);
end $$;

create function api.analyst_alert(p_alert_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare al core.alerts; sc core.scores; t core.transactions;
begin
  perform core.require_analyst();
  select * into al from core.alerts where id = p_alert_id and kind in ('anomaly', 'fraud');
  if not found then perform core.api_error('NOT_FOUND', 'alert.not_found'); end if;
  if al.status = 'escalated' then                                   -- opened by an analyst → in review
    update core.alerts set status = 'in_review', row_version = row_version + 1, updated_at = now()
    where id = al.id returning * into al;
  end if;
  select * into sc from core.scores where id = al.score_id;
  select * into t from core.transactions where id = al.transaction_id;
  return jsonb_build_object(
    'alert', core.alert_item(al) || jsonb_build_object('user_ref', core.user_ref(al.user_id), 'bank_id', al.bank_id,
                                                        'escalated_at', al.escalated_at),
    'score_breakdown', jsonb_build_object('a_thr', sc.a_thr, 'a_if', sc.a_if, 'f', sc.f, 'm', sc.m,
      'learning', sc.learning, 'rules', coalesce(sc.features -> 'rules', '[]'),
      'bumps', coalesce(sc.features -> 'bumps', '[]'), 'model_version', sc.model_version,
      'rules_version', sc.rules_version, 'params_version', sc.params_version, 'latency_ms', sc.latency_ms),
    'reasons', sc.reasons,
    'features', sc.features - array['rules', 'bumps'],
    'user_events', coalesce((select jsonb_agg(e order by e ->> 'at') from (
        select jsonb_build_object('type', 'notification_' || l.type, 'at', l.sent_at, 'status', l.status) e
        from ops.push_log l where l.alert_id = al.id
        union all select jsonb_build_object('type', 'answer_' || al.user_answer, 'at', al.answered_at)
        where al.answered_at is not null) q), '[]'),
    'tx', (select to_jsonb(x) - array['user_id'] || jsonb_build_object('momo', (select to_jsonb(m) - 'transaction_id'
             from core.tx_momo m where m.transaction_id = x.id)) from core.transactions x where x.id = t.id),
    'history_90d', coalesce((select jsonb_agg(jsonb_build_object('booking_ts', h.booking_ts,
        'amount', jsonb_build_object('m', h.amount_minor, 'c', h.currency), 'dc', h.cdt_dbt_ind, 'cp_name', h.cp_name,
        'category_id', h.category_id, 'score', s.total) order by h.booking_ts desc)
      from core.transactions h left join core.scores s on s.transaction_id = h.id
      where h.user_id = al.user_id and h.status = 'BOOK' and h.booking_ts > coalesce(t.booking_ts, now()) - interval '90 days'
        and h.booking_ts <= coalesce(t.booking_ts, now())), '[]'),
    'security_events_30d', coalesce((select jsonb_agg(jsonb_build_object('type', e.type, 'at', e.at, 'source', e.source)
        order by e.at desc) from core.security_events e where e.user_id = al.user_id
        and e.at > coalesce(t.booking_ts, now()) - interval '30 days'), '[]'),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('label', d.label, 'security_level', d.security_level,
        'unlock_method', d.unlock_method, 'created_at', d.created_at, 'revoked_at', d.revoked_at) order by d.created_at)
      from core.devices d where d.user_id = al.user_id), '[]'),
    'previous_decisions', coalesce((select jsonb_agg(jsonb_build_object('alert_id', a.id, 'created_at', a.created_at,
        'decision', d.decision, 'simulated', d.simulated, 'at', d.decided_at) order by d.decided_at desc)
      from core.alerts a join core.analyst_decisions d on d.alert_id = a.id
      where a.user_id = al.user_id and a.id <> al.id), '[]'),
    'user_answer', al.user_answer,
    'timeline', core.alert_timeline(al));
end $$;

create function api.analyst_decide(p_alert_id uuid, p_decision text, p_comment text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform core.require_analyst();
  return core.decide_alert(p_alert_id, p_decision, p_comment, auth.uid(), false);
end $$;

create function api.scoring_params() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform core.require_analyst();
  return jsonb_build_object(
    'bands', jsonb_build_object('ask', 40, 'bank', 70),
    'params', (select jsonb_agg(jsonb_build_object('key', key, 'value', value, 'default', default_value,
                 'min', min_value, 'max', max_value, 'version', version, 'updated_at', updated_at) order by key)
               from ops.scoring_params where scope = 'global'),
    'user_overrides', (select count(*) from ops.scoring_params where scope = 'user_category'),
    'rules', (select jsonb_agg(jsonb_build_object('id', id, 'version', version, 'scheme', scheme,
                'name_fr', name_fr, 'name_en', name_en, 'params', params, 'weight_default', weight,
                'source_title', source_title, 'source_url', source_url, 'source_date', source_date) order by id)
              from (select distinct on (id) * from ref.fraud_rules where active order by id, version desc) r),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'key', c.param_key,
                 'user_ref', case when c.user_id is not null then core.user_ref(c.user_id) end, 'category', c.category_id,
                 'before', c.before, 'after', c.after, 'cause', c.cause, 'alert_id', c.alert_id, 'at', c.at) order by c.id desc)
               from (select * from ops.param_changes order by id desc limit 100) c), '[]'));
end $$;

-- "Rétablir les valeurs par défaut": p_scope 'global' | 'users' | 'all'. Every change is logged.
create function api.reset_params(p_scope text default 'all') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n int := 0; m int := 0;
begin
  perform core.require_analyst();
  if p_scope not in ('global', 'users', 'all') then perform core.api_error('INVALID', 'params.bad_scope'); end if;
  if p_scope in ('users', 'all') then
    with d as (delete from ops.scoring_params where scope = 'user_category' and value <> default_value returning *)
    insert into ops.param_changes (param_key, user_id, category_id, before, after, cause, actor)
    select key, user_id, category_id, value, default_value, 'reset', auth.uid() from d;
    get diagnostics n = row_count;
    delete from ops.scoring_params where scope = 'user_category';
  end if;
  if p_scope in ('global', 'all') then
    with u as (select key, value from ops.scoring_params where scope = 'global' and value <> default_value),
    c as (insert into ops.param_changes (param_key, before, after, cause, actor)
          select s.key, u.value, s.default_value, 'reset', auth.uid() from ops.scoring_params s join u using (key)
          where s.scope = 'global' returning 1)
    select count(*) into m from c;
    update ops.scoring_params set value = default_value, version = version + 1, updated_at = now()
    where scope = 'global' and value <> default_value;
  end if;
  perform ops.audit(auth.uid(), 'analyst', 'params.reset', p_scope, jsonb_build_object('users', n, 'global', m));
  return jsonb_build_object('status', 'reset', 'user_params', n, 'global_params', m);
end $$;

create function api.ops_metrics() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform core.require_analyst();
  return jsonb_build_object(
    'push_latency_ms_24h', (select jsonb_build_object(
        'p50', percentile_cont(0.5) within group (order by extract(epoch from l.sent_at - a.created_at) * 1000),
        'p95', percentile_cont(0.95) within group (order by extract(epoch from l.sent_at - a.created_at) * 1000),
        'n', count(*))
      from ops.push_log l join core.alerts a on a.id = l.alert_id
      where l.created_at > now() - interval '24 hours' and l.status in ('sent', 'stub', 'no_token')
        and l.type in ('confirm', 'alerted')),
    'ingest_to_alert_ms_24h', (select jsonb_build_object(
        'p50', percentile_cont(0.5) within group (order by extract(epoch from a.created_at - t.ingested_at) * 1000),
        'p95', percentile_cont(0.95) within group (order by extract(epoch from a.created_at - t.ingested_at) * 1000),
        'n', count(*))
      from core.alerts a join core.transactions t on t.id = a.transaction_id
      where a.created_at > now() - interval '24 hours'),
    'score_latency_ms_24h', (select jsonb_build_object('p50', percentile_cont(0.5) within group (order by latency_ms),
        'p95', percentile_cont(0.95) within group (order by latency_ms), 'n', count(*))
      from core.scores where computed_at > now() - interval '24 hours'),
    'alerts_24h', (select jsonb_object_agg(coalesce(band, 'none'), n) from (select band, count(*) n from core.alerts
                   where created_at > now() - interval '24 hours' group by band) q),
    'groq_backlog', (select count(*) from core.transactions where category_source = 'none'),
    'last_batch', (select jsonb_build_object('job', job, 'status', status, 'finished_at', finished_at, 'items', items)
                   from ops.job_runs where job = 'batch-nightly' order by started_at desc limit 1),
    'quotas_today', (select jsonb_object_agg(vendor, used) from (select vendor, sum(credits) used from mkt.quota
                     where bucket >= date_trunc('day', now()) group by vendor) q),
    'model', (select jsonb_build_object('version', version, 'trained_at', trained_at, 'train_rows', train_rows,
                                        'parity_ok', parity_ok)
              from ops.model_artifacts where kind = 'iforest' and status = 'active'),
    'model_eval', (select jsonb_build_object('run_at', run_at, 'model_version', model_version,
        'precision_bank', precision_bank, 'recall_bank', recall_bank, 'recall_ask_or_bank', recall_ask_or_bank,
        'false_prompts_per_user_month', false_prompts_per_user_month)
      from ops.model_eval order by run_at desc limit 1),
    'funnel_7d', jsonb_build_object(
      'demo_starts', (select count(*) from ops.audit_log where action = 'demo.start' and at > now() - interval '7 days'),
      'sign_ups', (select count(*) from core.profiles where not is_anonymous and created_at > now() - interval '7 days'),
      'answers', (select count(*) from core.alerts where answered_at > now() - interval '7 days')),
    'as_of', now());
end $$;

-- ── learning status + behaviour profiles (nightly batch step, §7.7) ──────
create function analytics.refresh_learning(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_first timestamptz; v_n int; v_days int; v_active boolean; v_was boolean;
begin
  select min(booking_ts), count(*) into v_first, v_n from core.transactions where user_id = p_user and status = 'BOOK';
  v_days := coalesce(extract(day from now() - v_first)::int, 0);
  v_active := v_first is not null and v_days >= 30 and v_n >= 30;
  select active into v_was from analytics.learning_status where user_id = p_user;
  insert into analytics.learning_status (user_id, first_op_at, ops_count, days, active, computed_at)
  values (p_user, v_first, v_n, v_days, v_active, now())
  on conflict (user_id) do update set first_op_at = excluded.first_op_at, ops_count = excluded.ops_count,
    days = excluded.days, active = excluded.active, computed_at = excluded.computed_at;
  if v_active and v_was is false then                       -- transition → silent push (design N type 7)
    update core.profiles set learning_active_at = now() where user_id = p_user;
    insert into core.alerts (user_id, kind, band, status, reasons)
    values (p_user, 'learning_done', 'info', 'closed', '[{"code": "learning_done", "params": {}}]');
  end if;
  return jsonb_build_object('active', v_active, 'days', v_days, 'ops', v_n, 'transition', v_active and v_was is false);
end $$;

create function analytics.refresh_behaviour(p_user uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_tz text := coalesce((select timezone from core.profiles where user_id = p_user), 'UTC');
  v_ref text := coalesce((select ref_currency from core.profiles where user_id = p_user), 'XOF'); n int;
begin
  delete from analytics.behaviour_profiles where user_id = p_user;
  with d as (
    select t.booking_ts, t.cp_key, coalesce(t.category_id, '_') category_id,
           ln(greatest(core.amount_eur(t.amount_minor, t.currency), 0.01)) l,
           core.conv_minor(t.amount_minor, t.currency, v_ref) ref_minor,
           extract(hour from t.booking_ts at time zone v_tz)::int hr,
           extract(isodow from t.booking_ts at time zone v_tz)::int dow
    from core.transactions t left join core.tx_momo m on m.transaction_id = t.id
    where t.user_id = p_user and t.status = 'BOOK' and t.cdt_dbt_ind = 'DBIT'
      and core.is_scored(m.op_type, t.btc_family) and t.booking_ts > now() - interval '180 days'
  ), tot as (select count(*) n from d),
  g as (
    select 'user' dim, '_' k, array_agg(l) ls, count(*) n, percentile_disc(0.95) within group (order by ref_minor) p95,
           min(booking_ts) f, max(booking_ts) la from d
    union all select 'category', category_id, array_agg(l), count(*), percentile_disc(0.95) within group (order by ref_minor),
           min(booking_ts), max(booking_ts) from d group by category_id
    union all select 'payee', cp_key, array_agg(l), count(*), percentile_disc(0.95) within group (order by ref_minor),
           min(booking_ts), max(booking_ts) from d where cp_key is not null group by cp_key
    union all select 'hour', hr::text, null, count(*), null, min(booking_ts), max(booking_ts) from d group by hr
    union all select 'weekday', dow::text, null, count(*), null, min(booking_ts), max(booking_ts) from d group by dow)
  insert into analytics.behaviour_profiles (user_id, dim, key, n, median_ln_amount, mad_ln_amount, p95_amount_minor,
    share, p95_hourly_count, p95_daily_outflow_minor, first_seen, last_seen, computed_at)
  select p_user, g.dim, g.k, g.n, r.med, r.mad, g.p95,
         case when g.dim in ('hour', 'weekday') then g.n::real / greatest(tot.n, 1) end,
         case when g.dim = 'user' then (select percentile_cont(0.95) within group (order by c)
                                        from (select count(*) c from d group by date_trunc('hour', booking_ts)) q) end,
         case when g.dim = 'user' then (select percentile_disc(0.95) within group (order by s)
                                        from (select sum(ref_minor) s from d group by (booking_ts at time zone v_tz)::date) q) end,
         g.f, g.la, now()
  from g cross join tot left join lateral core.robust(g.ls) r on g.ls is not null
  where tot.n > 0;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── every minute: reminders, simulated analyst (S2-4), held notifications ─
create function ops.cron_alerts() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r record; v_rem int := 0; v_sim int := 0; v_held int := 0; v_tr record;
begin
  -- one reminder 15 min after an unanswered 40-70 alert (design N §4 rule)
  for r in select id from core.alerts where status = 'awaiting_user' and reminder_sent_at is null
             and created_at < now() - interval '15 minutes' and created_at > now() - interval '24 hours'
           for update skip locked loop
    update core.alerts set reminder_sent_at = now() where id = r.id;
    perform ops.notify(r.id, 'reminder');
    v_rem := v_rem + 1;
  end loop;
  -- simulated analyst: escalated alerts of persona-based users after 10 min, from the ground truth
  for r in select a.id, a.transaction_id from core.alerts a join core.profiles p on p.user_id = a.user_id
           where a.status in ('escalated', 'in_review') and p.demo_persona is not null
             and coalesce(a.escalated_at, a.created_at) < now() - interval '10 minutes'
           order by a.created_at limit 50 for update of a skip locked loop
    select * into v_tr from sim.truth(r.transaction_id);
    perform core.decide_alert(r.id, case when v_tr.tag is not null and v_tr.band in ('ask', 'bank') then 'fraud'
                                         else 'legit' end, 'simulated', null, true);
    v_sim := v_sim + 1;
  end loop;
  -- notifications held by quiet hours, once it is 07:00-22:00 local
  for r in select l.id from ops.push_log l join core.profiles p on p.user_id = l.user_id
           where l.status = 'held' and extract(hour from now() at time zone p.timezone) between 7 and 21
           for update of l skip locked loop
    update ops.push_log set status = 'queued' where id = r.id;
    perform ops.notify_dispatch(r.id);
    v_held := v_held + 1;
  end loop;
  if v_rem + v_sim + v_held > 0 then
    insert into ops.job_runs (job, status, finished_at, items, detail)
    values ('alerts-cron', 'ok', now(), v_rem + v_sim + v_held,
            jsonb_build_object('reminders', v_rem, 'simulated_decisions', v_sim, 'held_sent', v_held));
  end if;
  return jsonb_build_object('reminders', v_rem, 'simulated_decisions', v_sim, 'held_sent', v_held);
end $$;

select cron.schedule('gp-alerts', '* * * * *', 'select ops.cron_alerts()');
select cron.schedule('gp-rule-tuning', '17 4 * * 1', 'select ops.weekly_rule_tuning()');

-- ── grants ───────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function api.list_alerts(text, text), api.get_alert(uuid), api.answer_alert(uuid, uuid, text, uuid),
  api.analyst_queue(text, text), api.analyst_alert(uuid), api.analyst_decide(uuid, text, text),
  api.scoring_params(), api.reset_params(text), api.ops_metrics()
  to authenticated, service_role;
grant execute on function api.notify_get(bigint), api.notify_done(bigint, text, text, jsonb),
  ops.cron_alerts(), ops.weekly_rule_tuning(), ops.notify(uuid, text) to service_role;
grant execute on function analytics.refresh_learning(uuid), analytics.refresh_behaviour(uuid),
  ops.weekly_rule_tuning() to batch_writer, service_role;
grant execute on function core.is_analyst() to authenticated, anon, service_role;
