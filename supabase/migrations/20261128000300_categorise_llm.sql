-- B5: categorise-llm backlog (API.md §3, ARCHITECTURE §9.4). Rows left `category_source='none'`
-- by the rules are grouped by (user, counterparty, label) and sent — pseudonymised in the Edge
-- function — to Groq at most 40 labels per run. Only users with the "catégorisation par IA"
-- consent (latest answer = granted) are sent; demo personas (fictitious data) count as consenting.

create table ops.llm_seen (
  user_id uuid not null references core.profiles on delete cascade,
  cp_key text not null,
  text_hash text not null,
  attempts int not null default 0,
  last_at timestamptz not null default now(),
  result text,
  primary key (user_id, cp_key, text_hash)
);
alter table ops.llm_seen enable row level security;

create function core.llm_allowed(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select granted from core.consents where user_id = p_user and kind = 'ai_categorisation'
                   order by at desc limit 1),
                  (select demo_persona is not null from core.profiles where user_id = p_user), false)
$$;

-- ≤ p_limit distinct labels; never amount, date or account (amount bucket in F CFA only).
create function api.llm_backlog(p_limit int default 40) returns jsonb
language sql stable security definer set search_path = '' as $$
  with g as (
    select t.user_id, t.cp_key, md5(core.norm_text(coalesce(t.remittance_info, '') || '|' || coalesce(t.cp_name, ''))) h,
           min(t.cp_name) cp_name, min(t.remittance_info) remittance, min(m.op_type) op, min(t.cp_merchant_code) mcc,
           min(t.cdt_dbt_ind) dc, min(t.btc_family || '.' || t.btc_subfamily) bt, count(*) n,
           percentile_disc(0.5) within group (order by core.conv_minor(t.amount_minor, t.currency, 'XOF')) xof,
           bool_or(t.cp_key like 'm:%' or (m.op_type in ('p2p_in', 'p2p_out') and t.cp_merchant_code is null)) person
    from core.transactions t left join core.tx_momo m on m.transaction_id = t.id
    where t.category_source = 'none' and t.status = 'BOOK' and t.cp_key is not null
    group by 1, 2, 3
  )
  select jsonb_build_object(
    'categories', (select jsonb_agg(jsonb_build_object('id', id, 'fr', name_fr, 'en', name_en) order by sort)
                   from ref.categories where parent_id is not null),
    'items', coalesce(jsonb_agg(jsonb_build_object('user_id', g.user_id, 'cp_key', g.cp_key, 'h', g.h,
        'cp_name', g.cp_name, 'remittance', g.remittance, 'op', g.op, 'mcc', g.mcc, 'dc', g.dc, 'bt', g.bt, 'n', g.n,
        'person', g.person,
        'amount_bucket', case when g.xof < 5000 then '<5k' when g.xof < 50000 then '5-50k'
                              when g.xof < 500000 then '50-500k' else '>500k' end,
        'known_people', (select coalesce(jsonb_agg(distinct p.cp_name), '[]') from core.transactions p
                         where p.user_id = g.user_id and p.cp_key like 'm:%' and p.cp_name is not null))), '[]'))
  from (select g.* from g left join ops.llm_seen s on s.user_id = g.user_id and s.cp_key = g.cp_key and s.text_hash = g.h
        where core.llm_allowed(g.user_id) and (s.attempts is null or s.attempts < 2 or s.last_at < now() - interval '7 days')
        order by g.n desc limit greatest(1, least(p_limit, 40))) g
$$;

-- Apply answers [{user_id, cp_key, h, category_id|null}] → rows still uncategorised get category_source 'ai'.
create function api.llm_apply(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rows int := 0; v_n int; it jsonb; v_cat text;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    v_cat := it ->> 'category_id';
    if v_cat is not null and not exists (select 1 from ref.categories where id = v_cat and parent_id is not null) then
      v_cat := null;
    end if;
    if v_cat is not null then
      update core.transactions t set category_id = v_cat, category_source = 'ai',
             category_version = category_version + 1, row_version = row_version + 1, updated_at = now()
      where t.user_id = (it ->> 'user_id')::uuid and t.cp_key = it ->> 'cp_key' and t.category_source = 'none'
        and md5(core.norm_text(coalesce(t.remittance_info, '') || '|' || coalesce(t.cp_name, ''))) = it ->> 'h';
      get diagnostics v_n = row_count;
      v_rows := v_rows + v_n;
    end if;
    insert into ops.llm_seen (user_id, cp_key, text_hash, attempts, last_at, result)
    values ((it ->> 'user_id')::uuid, it ->> 'cp_key', it ->> 'h', 1, now(), v_cat)
    on conflict (user_id, cp_key, text_hash) do update set attempts = ops.llm_seen.attempts + 1, last_at = now(),
      result = excluded.result;
  end loop;
  return jsonb_build_object('updated', v_rows, 'labels', jsonb_array_length(coalesce(p_items, '[]')));
end $$;

create function api.llm_job(p_status text, p_items int, p_detail jsonb, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  insert into ops.job_runs (job, status, finished_at, items, detail, error)
  values ('categorise-llm', p_status, now(), p_items, p_detail, left(p_error, 1000))
$$;

-- Every 5 minutes, only when there is something to send (pg_net → Edge, cron secret).
create function ops.cron_llm() returns text
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  if jsonb_array_length(api.llm_backlog(1) -> 'items') = 0 then return 'idle'; end if;
  v_url := (select value ->> 'url' from ops.app_config where key = 'functions');
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'gp_cron_secret';
  if v_url is null or v_secret is null then return 'no_edge'; end if;
  perform net.http_post(url := v_url || '/categorise-llm', body := '{}'::jsonb,
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-gp-cron', v_secret),
                        timeout_milliseconds := 55000);
  return 'dispatched';
end $$;
select cron.schedule('gp-categorise-llm', '*/5 * * * *', 'select ops.cron_llm()');

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function api.llm_backlog(int), api.llm_apply(jsonb), api.llm_job(text, int, jsonb, text),
  ops.cron_llm() to service_role;
