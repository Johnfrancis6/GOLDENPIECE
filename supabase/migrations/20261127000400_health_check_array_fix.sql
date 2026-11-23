-- B4 fix (defect since B1/B3): `failing := failing || 'x'` parses 'x' as a text[] literal and raises
-- 22P02 the first time a check fails (found when the dispatch PAT was refused). Same function, typed literals.
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
    select count(*) into v_n from core.transactions where category_source = 'none';
    if v_n > coalesce((cfg->>'groq_backlog_max')::int, 500) then
      failing := failing || 'groq_backlog'::text; checks := checks || '{"groq_backlog": "failing"}';
    else checks := checks || '{"groq_backlog": "ok"}'; end if;
  else checks := checks || '{"groq_backlog": "not_applicable"}'; end if;

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
