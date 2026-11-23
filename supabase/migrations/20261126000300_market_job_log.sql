-- B3: job log for the market-* Edge Functions (ops.job_runs, 90-day retention per DATA_MODEL §5).
create function api.market_job_log(p_job text, p_started_at timestamptz, p_status text, p_items int,
                                   p_detail jsonb default null, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  insert into ops.job_runs (job, started_at, finished_at, status, items, detail, error)
  values (p_job, p_started_at, now(), p_status, p_items, p_detail, left(p_error, 500))
$$;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
revoke all on function api.market_job_log(text, timestamptz, text, int, jsonb, text) from anon, authenticated;
grant execute on function api.market_job_log(text, timestamptz, text, int, jsonb, text) to service_role;
