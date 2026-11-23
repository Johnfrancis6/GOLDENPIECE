-- B4: batch plumbing. Recompute queue triggers, GitHub workflow_dispatch from
-- pg_cron (PAT in Vault 'github_dispatch_pat', never in the repo), SQL helpers.
-- ARCHITECTURE §4.3, §10.4-10.5; API.md §3 (dispatch-batch).
--
-- Decision [B4]: the dispatch is a SQL function calling GitHub through pg_net
-- (ops.dispatch_batch), not an Edge Function: the PAT stays in the database,
-- one hop less. Responses are read on the next run and logged in
-- ops.job_runs as job 'dispatch-batch' (health: two failures in a row = red).

alter table analytics.portfolio_daily add column flow_local_minor bigint not null default 0;
alter table ops.recompute_queue add column dispatched_at timestamptz;

insert into ops.app_config (key, value) values
  ('batch', '{"repo": "Johnfrancis6/GOLDENPIECE", "ref": "main", "nightly_hour_utc": 2, "max_users": 50,
              "nightly_workflow": "batch-nightly.yml", "user_workflow": "batch-user.yml"}')
on conflict (key) do nothing;

-- ── recompute queue ────────────────────────────────────────────────────────
create function core.enqueue_recompute() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if tg_table_name = 'real_estate_valuations' then
    select user_id into v_user from core.real_estate
     where id = coalesce(new.real_estate_id, old.real_estate_id);
  elsif tg_op = 'DELETE' then
    v_user := old.user_id;
  else
    v_user := new.user_id;
  end if;
  if v_user is not null and exists (select 1 from core.profiles where user_id = v_user) then
    insert into ops.recompute_queue (user_id, reason) values (v_user, tg_table_name)
    on conflict (user_id) do update set reason = excluded.reason, requested_at = now(), dispatched_at = null;
  end if;
  return null;
end $$;

create trigger enqueue_recompute after insert or update or delete on core.trades
  for each row execute function core.enqueue_recompute();
create trigger enqueue_recompute after insert or update or delete on core.real_estate_valuations
  for each row execute function core.enqueue_recompute();
create trigger enqueue_recompute after insert or update or delete on core.debts
  for each row execute function core.enqueue_recompute();
create trigger enqueue_recompute after insert or delete on core.accounts
  for each row execute function core.enqueue_recompute();

-- ── GitHub dispatch ────────────────────────────────────────────────────────
-- Every 5 min: collect earlier responses; at the nightly hour dispatch
-- batch-nightly once per day; otherwise dispatch batch-user for queued users
-- (≤ max_users, re-dispatched after 20 min if the run did not clear them).
create function ops.dispatch_batch(p_now timestamptz default now()) returns text
language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb := (select value from ops.app_config where key = 'batch');
  v_pat text; r record; v_resp record; v_users uuid[]; v_req bigint; v_wf text; v_inputs jsonb; v_out text := '';
begin
  -- 1. responses of earlier dispatches (pg_net is asynchronous)
  for r in select id, (detail ->> 'request_id')::bigint as req, started_at from ops.job_runs
           where job = 'dispatch-batch' and status = 'running' loop
    select status_code, left(coalesce(content, error_msg, ''), 300) as body into v_resp
      from net._http_response where id = r.req;
    if found then
      update ops.job_runs set finished_at = now(),
        status = case when v_resp.status_code between 200 and 299 then 'ok' else 'failed' end,
        error = case when v_resp.status_code between 200 and 299 then null
                     else 'HTTP ' || coalesce(v_resp.status_code::text, '?') || ': ' || v_resp.body end
       where id = r.id;
    elsif r.started_at < p_now - interval '10 minutes' then
      update ops.job_runs set status = 'failed', finished_at = now(), error = 'no response' where id = r.id;
    end if;
  end loop;

  select decrypted_secret into v_pat from vault.decrypted_secrets where name = 'github_dispatch_pat';
  if v_pat is null or cfg is null then return 'no_pat'; end if;

  if extract(hour from p_now at time zone 'UTC') = (cfg ->> 'nightly_hour_utc')::int
     and not exists (select 1 from ops.job_runs where job = 'dispatch-batch' and status in ('running', 'ok')
                       and detail ->> 'workflow' = cfg ->> 'nightly_workflow'
                       and started_at >= date_trunc('day', p_now at time zone 'UTC') at time zone 'UTC') then
    v_wf := cfg ->> 'nightly_workflow';
    v_inputs := '{}';
  else
    select array_agg(user_id) into v_users from (
      select user_id from ops.recompute_queue
       where dispatched_at is null or dispatched_at < p_now - interval '20 minutes'
       order by requested_at limit coalesce((cfg ->> 'max_users')::int, 50)) q;
    if v_users is null then return 'idle'; end if;
    v_wf := cfg ->> 'user_workflow';
    v_inputs := jsonb_build_object('users', array_to_string(v_users, ','));
    update ops.recompute_queue set dispatched_at = p_now where user_id = any(v_users);
  end if;

  v_req := net.http_post(
    url := 'https://api.github.com/repos/' || (cfg ->> 'repo') || '/actions/workflows/' || v_wf || '/dispatches',
    body := jsonb_build_object('ref', cfg ->> 'ref', 'inputs', v_inputs),
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_pat, 'Accept', 'application/vnd.github+json',
                                  'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'goldenpiece-pg-cron',
                                  'Content-Type', 'application/json'),
    timeout_milliseconds := 20000);
  insert into ops.job_runs (job, status, started_at, items, detail)
  values ('dispatch-batch', 'running', p_now, coalesce(cardinality(v_users), 0),
          jsonb_build_object('workflow', v_wf, 'ref', cfg ->> 'ref', 'request_id', v_req));
  return v_out || 'dispatched:' || v_wf || ':' || coalesce(cardinality(v_users), 0);
end $$;

select cron.schedule('gp-batch', '*/5 * * * *', 'select ops.dispatch_batch()');

-- ── money helpers for screen RPCs (display conversion at today's rate) ─────
create function core.ccy_exp(p_ccy text) returns int
language sql immutable parallel safe set search_path = '' as $$
  select case when p_ccy in ('XOF', 'XAF') then 0 else 2 end
$$;

create function core.per_eur(p_ccy text) returns numeric
language sql stable parallel safe set search_path = '' as $$
  select case when p_ccy = 'EUR' then 1::numeric
              when p_ccy in ('XOF', 'XAF') then 655.957
              else (select rate from mkt.fx_latest where quote = p_ccy) end
$$;

-- minor units of p_from → minor units of p_to (rounded half away from zero)
create function core.conv_minor(p_minor numeric, p_from text, p_to text) returns bigint
language sql stable parallel safe set search_path = '' as $$
  select case when p_minor is null then null
              when p_from = p_to then round(p_minor)::bigint
              else round(p_minor / 10::numeric ^ core.ccy_exp(p_from) / core.per_eur(p_from)
                         * core.per_eur(p_to) * 10::numeric ^ core.ccy_exp(p_to))::bigint end
$$;

-- ── grants ─────────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function core.ccy_exp(text), core.per_eur(text), core.conv_minor(numeric, text, text)
  to authenticated, service_role, batch_writer;
grant execute on function ops.dispatch_batch(timestamptz) to service_role;
grant update (dispatched_at) on ops.recompute_queue to batch_writer;
