-- B5 part 2: `groq_backlog` (health + ops_metrics) counted every uncategorised row, including rows of
-- users without the AI-categorisation consent and labels Groq already answered "unknown" twice — rows
-- `categorise-llm` will never send. Now: only what `api.llm_backlog` can still send (same filters).
-- `ops_metrics` keeps the raw count as `groq_uncategorised_all`. Health also warns `groq_failing`
-- when the last 3 categorise-llm runs failed.

create function core.llm_backlog_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from core.transactions t
  left join ops.llm_seen s on s.user_id = t.user_id and s.cp_key = t.cp_key
    and s.text_hash = md5(core.norm_text(coalesce(t.remittance_info, '') || '|' || coalesce(t.cp_name, '')))
  where t.category_source = 'none' and t.status = 'BOOK' and t.cp_key is not null
    and core.llm_allowed(t.user_id)
    and (s.attempts is null or s.attempts < 2 or s.last_at < now() - interval '7 days')
$$;

create or replace function ops.health_check() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := coalesce((select value from ops.app_config where key = 'health'), '{}');
  checks jsonb := jsonb_build_object('db', 'ok');
  failing text[] := '{}';
  warnings text[] := '{}';
  v_ts timestamptz; v_n bigint; v_mb numeric;
begin
  if exists (select 1 from mkt.quotes_latest) then
    select min(q.fetched_at) into v_ts from mkt.quotes_latest q
      join mkt.instruments i on i.id = q.instrument_id
     where i.frequency = 'intraday' and i.active and mkt.is_open(i.id)
       and (i.exchange_tz is null or (now() at time zone i.exchange_tz)::time >= i.open_local + interval '45 minutes')
       and i.vendor in ('finnhub', 'coingecko');           -- FX / spot metals are hourly by design
    if v_ts is not null and v_ts < now() - make_interval(mins => coalesce((cfg->>'quotes_max_age_min')::int, 45)) then
      failing := failing || 'quotes_stale'::text; checks := checks || '{"quotes": "failing"}';
    else checks := checks || '{"quotes": "ok"}'; end if;
  else checks := checks || '{"quotes": "not_applicable"}'; end if;

  select max(started_at) into v_ts from ops.job_runs where job = 'batch-nightly' and status = 'ok';
  if v_ts is null then checks := checks || '{"batch": "not_applicable"}';
  elsif v_ts < now() - make_interval(hours => coalesce((cfg->>'batch_max_age_h')::int, 26)) then
    failing := failing || 'batch_late'::text; checks := checks || '{"batch": "failing"}';
  else checks := checks || '{"batch": "ok"}'; end if;

  if exists (select 1 from ops.job_runs where job = 'dispatch-batch') then
    if (select bool_and(status = 'failed') from (select status from ops.job_runs where job = 'dispatch-batch'
         order by started_at desc limit 2) s) and
       (select count(*) from ops.job_runs where job = 'dispatch-batch') >= 2 then
      failing := failing || 'dispatch_failed'::text; checks := checks || '{"dispatch": "failing"}';
    else checks := checks || '{"dispatch": "ok"}'; end if;
  else checks := checks || '{"dispatch": "not_applicable"}'; end if;

  if exists (select 1 from ops.job_runs where job = 'categorise-llm') then
    v_n := core.llm_backlog_count();
    if v_n > coalesce((cfg->>'groq_backlog_max')::int, 500) then
      failing := failing || 'groq_backlog'::text; checks := checks || '{"groq_backlog": "failing"}';
    else checks := checks || '{"groq_backlog": "ok"}'; end if;
  else checks := checks || '{"groq_backlog": "not_applicable"}'; end if;

  -- the last 3 categorise-llm runs failed (Groq down, key revoked, model retired): warning only
  if (select count(*) filter (where status = 'failed') from (select status from ops.job_runs
        where job = 'categorise-llm' order by started_at desc limit 3) s) = 3 then
    warnings := warnings || 'groq_failing'::text;
  end if;

  -- market quota above the cap today (warning only)
  if exists (select 1 from mkt.quota q
             join lateral (select (value -> q.vendor) as c from ops.app_config where key = 'market_quotas') l on true
             where q.bucket >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
               and (l.c ->> 'per_day') is not null
             group by q.vendor, l.c
             having sum(q.credits) > (l.c ->> 'per_day')::int * (l.c ->> 'cap')::numeric) then
    warnings := warnings || 'market_quota'::text;
  end if;

  v_mb := round(pg_catalog.pg_database_size(pg_catalog.current_database()) / 1048576.0, 1);
  if v_mb > coalesce((cfg->>'db_size_warn_mb')::numeric, 300) then warnings := warnings || 'db_size'::text; end if;

  return jsonb_build_object('ok', cardinality(failing) = 0, 'failing', to_jsonb(failing),
    'warnings', to_jsonb(warnings), 'checks', checks, 'db_size_mb', v_mb, 'at', now());
end $$;

create or replace function api.ops_metrics() returns jsonb
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
    'groq_backlog', core.llm_backlog_count(),
    'groq_uncategorised_all', (select count(*) from core.transactions where category_source = 'none'),
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

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function core.llm_backlog_count() to service_role;
