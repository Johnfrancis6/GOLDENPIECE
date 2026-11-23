-- B1: api schema skeleton (API.md §1, §2.1) + ops helpers (rate limit, health).
-- Later sessions add the screen RPCs. Every api function: explicit grants,
-- search_path = '', security definer only where RLS alone is not enough.

-- ── helpers (not exposed: live outside api) ───────────────────────────────
-- API.md §1 errors: PostgREST custom error (SQLSTATE PGRST) with HTTP status.
-- Body: {"code": "<CODE>", "message": "<message_key>", "details": null, "hint": "<retry_after_s>|null"}
create function core.api_error(p_code text, p_message_key text default null, p_retry_after_s int default null)
returns void language plpgsql set search_path = '' as $$
declare v_status int := case p_code
  when 'INVALID' then 400 when 'FORBIDDEN' then 403 when 'NOT_FOUND' then 404
  when 'CONFLICT' then 409 when 'REJECTED' then 422 when 'MIN_VERSION' then 426
  when 'RATE_LIMITED' then 429 else 400 end;
begin
  raise sqlstate 'PGRST' using
    message = json_build_object('code', p_code, 'message', coalesce(p_message_key, lower(p_code)),
                                'details', null, 'hint', p_retry_after_s::text)::text,
    detail = json_build_object('status', v_status, 'headers',
               case when p_retry_after_s is null then '{}'::json
                    else json_build_object('Retry-After', p_retry_after_s::text) end)::text;
end $$;
grant execute on function core.api_error(text, text, int) to anon, authenticated, service_role;

-- Screen envelope (API.md §1): etag = md5 of the payload.
create function core.envelope(p_etag text, p_data jsonb, p_as_of timestamptz default now())
returns jsonb language sql stable set search_path = '' as $$
  select case when p_etag is not null and p_etag = md5(p_data::text)
    then jsonb_build_object('etag', p_etag, 'not_modified', true)
    else jsonb_build_object('etag', md5(p_data::text), 'as_of', p_as_of, 'not_modified', false, 'data', p_data)
  end
$$;
grant execute on function core.envelope(text, jsonb, timestamptz) to authenticated, service_role;

-- Token bucket (ARCHITECTURE G11): true = allowed (and one token taken).
create function ops.rate_limit(p_key text, p_limit int, p_window_s int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_tokens real; v_at timestamptz; v_now timestamptz := clock_timestamp();
begin
  insert into ops.rate_limits as r (key, tokens, refreshed_at)
  values (p_key, p_limit, v_now)
  on conflict (key) do update
    set tokens = least(p_limit::real,
                       r.tokens + extract(epoch from (v_now - r.refreshed_at))::real * p_limit / p_window_s),
        refreshed_at = v_now
  returning tokens into v_tokens;
  if v_tokens < 1 then
    return false;
  end if;
  update ops.rate_limits set tokens = tokens - 1 where key = p_key;
  return true;
end $$;
grant execute on function ops.rate_limit(text, int, int) to authenticated, service_role;

-- Health verdict (ARCHITECTURE §11). A check whose feature is not live yet
-- (no instruments, no batch run, no categoriser run) is 'not_applicable'.
create function ops.health_check() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select value from ops.app_config where key = 'health'), '{}');
  checks jsonb := jsonb_build_object('db', 'ok');
  failing text[] := '{}';
  warnings text[] := '{}';
  v_ts timestamptz; v_n bigint; v_mb numeric;
begin
  -- quotes: oldest intraday quote, checked on weekdays 14:00-20:00 UTC (B3 refines per exchange)
  if exists (select 1 from mkt.quotes_latest) then
    select min(q.fetched_at) into v_ts from mkt.quotes_latest q
      join mkt.instruments i on i.id = q.instrument_id where i.frequency = 'intraday';
    if v_ts is not null and extract(isodow from now() at time zone 'UTC') < 6
       and (now() at time zone 'UTC')::time between '14:00' and '20:00'
       and v_ts < now() - make_interval(mins => coalesce((cfg->>'quotes_max_age_min')::int, 45)) then
      failing := failing || 'quotes_stale'; checks := checks || '{"quotes": "failing"}';
    else checks := checks || '{"quotes": "ok"}'; end if;
  else checks := checks || '{"quotes": "not_applicable"}'; end if;

  -- nightly batch
  select max(started_at) into v_ts from ops.job_runs where job = 'batch-nightly' and status = 'ok';
  if v_ts is null then checks := checks || '{"batch": "not_applicable"}';
  elsif v_ts < now() - make_interval(hours => coalesce((cfg->>'batch_max_age_h')::int, 26)) then
    failing := failing || 'batch_late'; checks := checks || '{"batch": "failing"}';
  else checks := checks || '{"batch": "ok"}'; end if;

  -- GitHub dispatch failed twice in a row
  if exists (select 1 from ops.job_runs where job = 'dispatch-batch') then
    if (select bool_and(status = 'failed') from (select status from ops.job_runs where job = 'dispatch-batch'
         order by started_at desc limit 2) s) and
       (select count(*) from ops.job_runs where job = 'dispatch-batch') >= 2 then
      failing := failing || 'dispatch_failed'; checks := checks || '{"dispatch": "failing"}';
    else checks := checks || '{"dispatch": "ok"}'; end if;
  else checks := checks || '{"dispatch": "not_applicable"}'; end if;

  -- Groq backlog (only once the categoriser has run)
  if exists (select 1 from ops.job_runs where job = 'categorise-llm') then
    select count(*) into v_n from core.transactions where category_source = 'none';
    if v_n > coalesce((cfg->>'groq_backlog_max')::int, 500) then
      failing := failing || 'groq_backlog'; checks := checks || '{"groq_backlog": "failing"}';
    else checks := checks || '{"groq_backlog": "ok"}'; end if;
  else checks := checks || '{"groq_backlog": "not_applicable"}'; end if;

  -- database size (warning only, DATA_MODEL §4)
  v_mb := round(pg_catalog.pg_database_size(pg_catalog.current_database()) / 1048576.0, 1);
  if v_mb > coalesce((cfg->>'db_size_warn_mb')::numeric, 300) then warnings := warnings || 'db_size'; end if;

  return jsonb_build_object('ok', cardinality(failing) = 0, 'failing', to_jsonb(failing),
    'warnings', to_jsonb(warnings), 'checks', checks, 'db_size_mb', v_mb, 'at', now());
end $$;

-- ── api ─────────────────────────────────────────────────────────────────
-- Splash (anon): API.md §2.1
create function api.health_public() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'status', 'ok',
    'min_version', (select value from ops.app_config where key = 'min_version'),
    'maintenance', coalesce((select value from ops.app_config where key = 'maintenance'), 'false'::jsonb))
$$;

-- Full health verdict, for the `health` Edge Function (service role only).
create function api.health_internal() returns jsonb
language sql security definer set search_path = '' as $$ select ops.health_check() $$;

-- Country picker (anon): API.md §2.1
create function api.countries(p_lang text default 'fr') returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'iso2', c.iso2,
      'name', case when p_lang = 'en' then c.name_en else c.name_fr end,
      'dial_code', c.dial_code, 'profile_id', c.profile_id,
      'default_tz', c.default_tz, 'timezones', to_jsonb(c.timezones),
      'operators', to_jsonb(c.operators))
    order by case when p_lang = 'en' then c.name_en else c.name_fr end collate "C"), '[]'::jsonb)
  from ref.countries c
$$;

-- Legal texts (anon): latest version per kind
create function api.legal_texts(p_lang text default 'fr') returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', t.kind, 'version', t.version, 'body_md', t.body_md)
                  order by t.kind), '[]'::jsonb)
  from (select distinct on (kind) kind, version, body_md from ref.legal_texts
        where lang = case when p_lang = 'en' then 'en' else 'fr' end
        order by kind, published_at desc, version desc) t
$$;

-- FX for display: units of p_to per 1 unit of p_from (XOF/XAF peg exact, USD from mkt.fx_latest).
create function api.fx_rate(p_from text, p_to text) returns numeric
language plpgsql stable security definer set search_path = '' as $$
declare usd numeric := (select rate from mkt.fx_latest where quote = 'USD');
begin
  if p_from = p_to then return 1; end if;
  if 'USD' in (p_from, p_to) and usd is null then
    perform core.api_error('NOT_FOUND', 'fx.usd_missing');
  end if;
  return ref.money_per_eur(p_to, usd) / ref.money_per_eur(p_from, usd);
end $$;

-- Bootstrap (each login/launch online): API.md §2.1
create function api.bootstrap(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select jsonb_build_object(
    'profile', jsonb_build_object('language', p.language, 'country', p.country, 'timezone', p.timezone,
       'ref_currency', p.ref_currency, 'risk_profile', p.risk_profile,
       'hide_amounts_in_push', p.hide_amounts_in_push, 'data_saver', p.data_saver,
       'lock_delay_s', p.lock_delay_s, 'is_demo', p.is_anonymous, 'demo_persona', p.demo_persona),
    'min_version', (select value from ops.app_config where key = 'min_version'),
    'learning', coalesce((select jsonb_build_object('active', l.active, 'days', l.days, 'ops', l.ops_count)
                          from analytics.learning_status l where l.user_id = uid),
                         '{"active": false, "days": 0, "ops": 0}'::jsonb),
    'consents_current', coalesce((select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted,
                                   'text_version', c.text_version, 'at', c.at) order by c.kind)
                                  from (select distinct on (kind) kind, granted, text_version, at
                                        from core.consents where user_id = uid order by kind, at desc, id desc) c),
                                 '[]'::jsonb),
    'card', (select jsonb_build_object('brand', k.brand, 'last4', k.last4, 'bank_name', b.name)
             from core.cards k left join ref.banks b on b.id = k.bank_id where k.user_id = uid),
    'devices_count', (select count(*) from core.devices d where d.user_id = uid and d.revoked_at is null),
    'flags', coalesce((select value from ops.app_config where key = 'flags'), '{}'::jsonb))
  into v
  from core.profiles p where p.user_id = uid;
  if v is null then perform core.api_error('NOT_FOUND', 'profile.missing'); end if;
  return core.envelope(p_etag, v);
end $$;

-- Device registration: API.md §2.1 (writes a new_device security event)
create function api.register_device(
  p_device_id uuid, p_platform text, p_app_version text, p_security_level text, p_unlock_method text,
  p_label text default null, p_os_version text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_owner uuid; v_revoked timestamptz; v_others int;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  select user_id, revoked_at into v_owner, v_revoked from core.devices where id = p_device_id;
  if v_owner is not null and v_owner <> uid then perform core.api_error('FORBIDDEN', 'device.other_user'); end if;
  if v_revoked is not null then perform core.api_error('FORBIDDEN', 'device.revoked'); end if;
  if v_owner is not null then
    update core.devices set platform = p_platform, app_version = p_app_version, security_level = p_security_level,
      unlock_method = p_unlock_method, label = coalesce(p_label, label), os_version = coalesce(p_os_version, os_version),
      last_seen_at = now()
    where id = p_device_id;
    return jsonb_build_object('new_device', false);
  end if;
  select count(*) into v_others from core.devices where user_id = uid and revoked_at is null;
  insert into core.devices (id, user_id, label, platform, os_version, app_version, security_level, unlock_method)
  values (p_device_id, uid, p_label, p_platform, p_os_version, p_app_version, p_security_level, p_unlock_method);
  insert into core.security_events (user_id, device_id, type, source, details)
  values (uid, p_device_id, 'new_device', 'server',
          jsonb_build_object('first_device', v_others = 0, 'security_level', p_security_level));
  return jsonb_build_object('new_device', true);
exception when check_violation then
  perform core.api_error('INVALID', 'device.invalid');
end $$;

-- Consents: API.md §2.1 — p_items = [{kind, granted, text_version}]
create function api.record_consents(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    perform core.api_error('INVALID', 'consents.invalid');
  end if;
  insert into core.consents (user_id, kind, granted, text_version)
  select uid, e->>'kind', (e->>'granted')::boolean, e->>'text_version'
  from jsonb_array_elements(p_items) e;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'recorded', n);
exception when check_violation or not_null_violation or invalid_text_representation then
  perform core.api_error('INVALID', 'consents.invalid');
end $$;

-- ── grants: api functions are callable only by the roles named here ──────
revoke all on all functions in schema api from public, anon, authenticated;
grant execute on function api.health_public(), api.countries(text), api.legal_texts(text)
  to anon, authenticated;
grant execute on function api.fx_rate(text, text), api.bootstrap(text),
  api.register_device(uuid, text, text, text, text, text, text), api.record_consents(jsonb)
  to authenticated;
grant execute on function api.health_internal() to service_role;
grant execute on function ops.health_check() to service_role;

-- PUBLIC keeps EXECUTE on new functions by default: remove it everywhere.
-- Rule for later sessions: end each migration that adds functions with this.
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
