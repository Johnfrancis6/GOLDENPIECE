-- B2: demo clones (account-demo-start / reset / cleanup) and the provider tick
-- (pg_cron every minute → provider-tick Edge Function, SQL fallback).
-- API.md §4.6, ARCHITECTURE §3.3, §7.8, DATA_MODEL §5.

create function sim.display_name(p_kind text, p_currency text, p_institution text) returns text
language sql stable set search_path = '' as $$
  select case when p_kind = 'bank' then case p_currency when 'EUR' then 'Compte courant (EUR)' else 'Compte courant' end
              else coalesce((select name from ref.operators where id = p_institution), 'Mobile money') end
$$;

-- First-session guarantee (§7.8): a 40-70 event 3 min after the start (bank card,
-- new merchant, 6-8× the usual amount) and a > 70 event the next day at 10:00
-- local (SIM swap at 09:35, then 75 % of the wallet cashed out; reversed 2 h later
-- so the rest of the template keeps a positive balance).
create function sim.add_first_session(p_user uuid, p_links jsonb, p_now timestamptz) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_tz text := (select timezone from core.profiles where user_id = p_user);
  v_bank record; v_momo record; v_due timestamptz; v_typ bigint; v_amt bigint; v_fee bigint; v_n int := 0;
  v_unit bigint;
begin
  select l.link_id, l.anchor_at, l.template_id, k.key, ta.currency into v_bank
  from jsonb_each_text(p_links) k(key, link) join sim.links l on l.link_id = k.link::uuid
  join sim.template_accounts ta on ta.template_id = l.template_id and ta.key = k.key
  where ta.kind = 'bank' order by k.key limit 1;
  select l.link_id, l.anchor_at, l.template_id, k.key, ta.currency into v_momo
  from jsonb_each_text(p_links) k(key, link) join sim.links l on l.link_id = k.link::uuid
  join sim.template_accounts ta on ta.template_id = l.template_id and ta.key = k.key
  where ta.kind = 'momo' order by k.key limit 1;

  if v_bank.link_id is not null then
    v_unit := case when v_bank.currency in ('EUR','USD') then 1000 else 5000 end;   -- 10 EUR / 5 000 XOF
    select percentile_disc(0.5) within group (order by (e.entry ->> 'amountMinor')::bigint) into v_typ
    from sim.template_entries e where e.template_id = v_bank.template_id and e.account_key = v_bank.key
      and e.entry #>> '{bankTxCode,subFamily}' = 'POSD' and e.scenario_tag is null;
    v_amt := greatest(v_unit, (coalesce(v_typ, 6 * v_unit) * 7 / v_unit) * v_unit);
    v_due := p_now + interval '3 minutes';
    insert into sim.link_entries (link_id, account_key, seq, offset_s, entry, scenario_tag, expected_band)
    values (v_bank.link_id, v_bank.key, 1000001, floor(extract(epoch from v_due - v_bank.anchor_at))::bigint,
      jsonb_build_object('status', 'BOOK', 'creditDebit', 'DBIT', 'amountMinor', v_amt, 'currency', v_bank.currency,
        'bankTxCode', jsonb_build_object('domain', 'PMNT', 'family', 'CCRD', 'subFamily', 'POSD'),
        'counterparty', jsonb_build_object('name', 'Électro Plus Sandaga', 'merchantCode', '5732'),
        'remittanceInfo', 'PAIEMENT CB ÉLECTRO PLUS SANDAGA'),
      'first_session_ask', 'ask');
    v_n := v_n + 1;
  end if;

  if v_momo.link_id is not null then
    v_due := (((p_now at time zone v_tz)::date + 1) + time '10:00') at time zone v_tz;
    insert into sim.link_security_events (link_id, seq, offset_s, type, details, scenario_tag)
    values (v_momo.link_id, 1000001, floor(extract(epoch from v_due - interval '25 minutes' - v_momo.anchor_at))::bigint,
            'sim_swap', jsonb_build_object('accountKey', v_momo.key, 'signal', 'operator_sim_swap'), 'first_session_bank');
    v_amt := greatest(5000, (sim.balance(v_momo.link_id, v_momo.key, v_due) * 3 / 4 / 1000) * 1000);
    v_fee := greatest(100, v_amt / 100);
    insert into sim.link_entries (link_id, account_key, seq, offset_s, entry, scenario_tag, expected_band) values
    (v_momo.link_id, v_momo.key, 1000002, floor(extract(epoch from v_due - v_momo.anchor_at))::bigint,
      jsonb_build_object('status', 'BOOK', 'creditDebit', 'DBIT', 'amountMinor', v_amt, 'currency', v_momo.currency,
        'bankTxCode', jsonb_build_object('domain', 'PMNT', 'family', 'CNTR', 'subFamily', 'CWDL'),
        'counterparty', jsonb_build_object('name', 'Agent Point Express 7731'), 'remittanceInfo', 'Retrait',
        'charges', jsonb_build_object('amountMinor', v_fee, 'currency', v_momo.currency),
        'momo', jsonb_build_object('operator', '*', 'opType', 'cash_out', 'agentId', 'AG7731')),
      'first_session_bank', 'bank'),
    (v_momo.link_id, v_momo.key, 1000003, floor(extract(epoch from v_due + interval '2 hours' - v_momo.anchor_at))::bigint,
      jsonb_build_object('status', 'BOOK', 'creditDebit', 'CRDT', 'amountMinor', v_amt + v_fee, 'currency', v_momo.currency,
        'bankTxCode', jsonb_build_object('domain', 'PMNT', 'family', 'RCDT', 'subFamily', 'RRTN'),
        'remittanceInfo', 'Annulation opération contestée',
        'momo', jsonb_build_object('operator', '*', 'opType', 'reversal')),
      'first_session_reversal', 'none');
    v_n := v_n + 3;
  end if;
  return v_n;
end $$;

-- Clone a persona into the caller's (anonymous) profile. API.md §4.6.
create function api.demo_start(p_user_id uuid, p_persona text, p_lang text default null,
                               p_country text default null, p_client_ip text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_t0 timestamptz := clock_timestamp(); v_now timestamptz := now();
  v_tid text := 'persona_' || coalesce(p_persona, '');
  v_t sim.templates; v_ta record; v_w record; v_link uuid; v_acc uuid; v_ident jsonb; v_res jsonb;
  v_anchor timestamptz; v_accounts int := 0; v_tx int := 0; v_skipped int := 0; v_links jsonb := '{}';
  v_ref text; v_re uuid; v_v jsonb;
begin
  if p_persona is null or p_persona !~ '^[a-z_]{1,40}$'
     or not exists (select 1 from sim.templates where id = v_tid and kind = 'persona') then
    perform core.api_error('INVALID', 'demo.unknown_persona');
  end if;
  if not exists (select 1 from core.profiles where user_id = p_user_id) then
    perform core.api_error('NOT_FOUND', 'profile.not_found');
  end if;
  perform 1 from core.profiles where user_id = p_user_id for update;
  if p_client_ip is not null and not ops.rate_limit('demo_start:' || p_client_ip, 5, 3600) then
    perform core.api_error('RATE_LIMITED', 'demo.rate_limited', 720);
  end if;
  if exists (select 1 from core.accounts where user_id = p_user_id) then
    perform core.api_error('CONFLICT', 'demo.already_started');
  end if;

  select * into v_t from sim.templates where id = v_tid;
  v_ref := coalesce((select currency from sim.template_accounts where template_id = v_tid and kind = 'bank'
                     order by key limit 1), 'XOF');
  update core.profiles set demo_persona = v_tid,
    language = case when p_lang in ('fr','en') then p_lang else language end,
    country = v_t.country, timezone = v_t.timezone, ref_currency = v_ref,
    learning_active_at = v_now, last_active_at = v_now
  where user_id = p_user_id;
  v_anchor := sim.anchor_for(v_t.timezone, v_now);

  for v_ta in select * from sim.template_accounts where template_id = v_tid order by key loop
    insert into core.provider_links (user_id, adapter, institution, scopes, status, history_days, template_id)
    values (p_user_id, 'sim', v_ta.institution, '{balances,transactions}', 'active', 365, v_tid)
    returning id into v_link;
    insert into sim.links (link_id, template_id, account_keys, anchor_at, delivered_until)
    values (v_link, v_tid, array[v_ta.key], v_anchor, v_now);
    v_ident := sim.account_identity(v_tid, v_ta.key, p_user_id, v_ta.kind, v_ta.institution, v_ta.currency, v_t.country);
    insert into core.accounts (user_id, link_id, kind, provider_account_id, display_name, institution, currency,
                               iban, bic, bank_id, operator, msisdn_masked, history_available)
    values (p_user_id, v_link, v_ta.kind, v_ta.key, sim.display_name(v_ta.kind, v_ta.currency, v_ta.institution),
            v_ta.institution, v_ta.currency, v_ident ->> 'iban', v_ident ->> 'bic',
            case when v_ta.kind = 'bank' then v_ta.institution end,
            case when v_ta.kind = 'momo' then v_ta.institution end, v_ident ->> 'msisdnMasked', true)
    returning id into v_acc;
    v_res := core.ingest_entries(p_user_id, v_acc,
               sim.entries_between(v_link, v_ta.key, v_anchor - interval '800 days', v_now));
    v_tx := v_tx + (v_res ->> 'inserted')::int;
    perform core.ingest_security_events(p_user_id, sim.security_between(v_link, v_anchor - interval '800 days', v_now));
    update core.accounts set balance_minor = sim.balance(v_link, v_ta.key, v_now), balance_at = v_now,
                             last_sync_at = v_now where id = v_acc;
    v_links := v_links || jsonb_build_object(v_ta.key, v_link);
    v_accounts := v_accounts + 1;
  end loop;

  -- wealth: debts, real estate, demo trades (only for instruments that exist, B3)
  for v_w in select item from sim.template_wealth where template_id = v_tid order by seq loop
    case v_w.item ->> 'kind'
    when 'debt' then
      insert into core.debts (id, user_id, name, lender, currency, principal_minor, balance_minor, annual_rate_bp,
                              monthly_payment_minor, start_date, end_date)
      values (gen_random_uuid(), p_user_id, v_w.item ->> 'name',
              coalesce((select name from ref.banks where id = v_w.item ->> 'lender'), v_w.item ->> 'lender'),
              v_w.item ->> 'currency', (v_w.item ->> 'principal')::bigint, (v_w.item ->> 'balance')::bigint,
              (v_w.item ->> 'annual_rate_bp')::int, (v_w.item ->> 'monthly_payment')::bigint,
              (v_now + make_interval(days => (v_w.item ->> 'start_days')::int))::date,
              (v_now + make_interval(days => (v_w.item ->> 'end_days')::int))::date);
    when 'real_estate' then
      v_re := gen_random_uuid();
      insert into core.real_estate (id, user_id, name, country, currency)
      values (v_re, p_user_id, v_w.item ->> 'name', v_w.item ->> 'country', v_w.item ->> 'currency');
      for v_v in select jsonb_array_elements(v_w.item -> 'valuations') loop
        insert into core.real_estate_valuations (id, real_estate_id, value_minor, valued_on)
        values (gen_random_uuid(), v_re, (v_v ->> 1)::bigint, (v_now + make_interval(days => (v_v ->> 0)::int))::date);
      end loop;
    when 'trade' then
      if exists (select 1 from mkt.instruments where id = v_w.item ->> 'instrument_id') then
        insert into core.trades (id, user_id, instrument_id, side, trade_date, quantity, price_minor, currency, source)
        values (gen_random_uuid(), p_user_id, v_w.item ->> 'instrument_id', v_w.item ->> 'side',
                (v_now + make_interval(days => (v_w.item ->> 'days')::int))::date, (v_w.item ->> 'quantity')::numeric,
                (v_w.item ->> 'price_minor')::bigint, v_w.item ->> 'currency', 'demo');
      else
        v_skipped := v_skipped + 1;
      end if;
    else null;
    end case;
  end loop;

  -- imported history counts: learning is done at once (§7.7)
  insert into analytics.learning_status (user_id, first_op_at, ops_count, days, active, computed_at)
  select p_user_id, min(booking_ts), count(*), coalesce(extract(day from v_now - min(booking_ts))::int, 0), true, v_now
  from core.transactions where user_id = p_user_id
  on conflict (user_id) do update set first_op_at = excluded.first_op_at, ops_count = excluded.ops_count,
    days = excluded.days, active = true, computed_at = excluded.computed_at;

  perform sim.add_first_session(p_user_id, v_links, v_now);
  perform ops.audit(p_user_id, 'user', 'demo.start', v_tid, jsonb_build_object('transactions', v_tx));
  return jsonb_build_object('user_id', p_user_id, 'persona', p_persona, 'accounts_count', v_accounts,
    'transactions_count', v_tx, 'trades_skipped', v_skipped,
    'ms', round(extract(epoch from clock_timestamp() - v_t0) * 1000));
end $$;

-- Delete the user's demo data and clone the same persona again.
create function api.demo_reset(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p core.profiles; r record;
begin
  select * into v_p from core.profiles where user_id = p_user_id for update;
  if not found then perform core.api_error('NOT_FOUND', 'profile.not_found'); end if;
  if v_p.demo_persona is null then perform core.api_error('REJECTED', 'demo.not_demo'); end if;
  if not ops.rate_limit('demo_reset:' || p_user_id, 5, 3600) then
    perform core.api_error('RATE_LIMITED', 'demo.rate_limited', 720);
  end if;
  delete from core.provider_links where user_id = p_user_id;            -- accounts, transactions, sim.links
  for r in select c.table_schema, c.table_name from information_schema.columns c
           join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
           where c.column_name = 'user_id' and t.table_type = 'BASE TABLE'
             and c.table_schema in ('core', 'analytics')
             and c.table_name not in ('profiles', 'devices', 'consents', 'questionnaire', 'cards') loop
    execute format('delete from %I.%I where user_id = $1', r.table_schema, r.table_name) using p_user_id;
  end loop;
  delete from ops.recompute_queue where user_id = p_user_id;
  perform ops.audit(p_user_id, 'user', 'demo.reset', v_p.demo_persona, null);
  return api.demo_start(p_user_id, substr(v_p.demo_persona, 9), v_p.language, null, null);
end $$;

-- Nightly: anonymous demo users inactive for 7 days (3 when the DB passes 300 MB). DATA_MODEL §5.
create function api.demo_cleanup(p_days int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_days int; v_n int; v_job bigint;
begin
  v_days := coalesce(p_days, case when pg_catalog.pg_database_size(pg_catalog.current_database()) > 300 * 1048576
                                  then 3 else 7 end);
  insert into ops.job_runs (job, status) values ('account-demo-cleanup', 'running') returning id into v_job;
  delete from auth.users u using core.profiles p
  where p.user_id = u.id and p.is_anonymous and p.last_active_at < now() - make_interval(days => v_days);
  get diagnostics v_n = row_count;
  update ops.job_runs set status = 'ok', finished_at = now(), items = v_n, detail = jsonb_build_object('days', v_days)
  where id = v_job;
  return jsonb_build_object('deleted', v_n, 'days', v_days);
end $$;

-- ── provider tick ────────────────────────────────────────────────────────
-- Every minute. Due links go to the provider-tick Edge Function (pg_net) when
-- ops.app_config 'functions' {url} and vault 'gp_cron_secret' exist; links
-- still undelivered 3 minutes after their entry was due (Edge down) and every
-- link when the Edge is not configured (local stack) are delivered in SQL.
create function sim.cron_tick() returns text
language plpgsql security definer set search_path = '' as $$
declare v_due uuid[]; v_late uuid[]; v_url text; v_secret text; v_n int;
begin
  select array_agg(l.link_id) filter (where sim.link_has_due(l.link_id, now())),
         array_agg(l.link_id) filter (where sim.link_has_due(l.link_id, now() - interval '3 minutes'))
    into v_due, v_late
  from sim.links l join core.provider_links p on p.id = l.link_id and p.status = 'active';
  if v_due is null then return 'idle'; end if;
  v_url := (select value ->> 'url' from ops.app_config where key = 'functions');
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'gp_cron_secret';
  if v_url is null or v_secret is null then
    v_n := sim.deliver_due_sql(v_due);
    return 'sql:' || v_n;
  end if;
  if v_late is not null then
    v_n := sim.deliver_due_sql(v_late);
    insert into ops.job_runs (job, status, finished_at, items, detail)
    values ('provider-tick-fallback', 'ok', now(), v_n, jsonb_build_object('links', cardinality(v_late)));
  end if;
  perform net.http_post(url := v_url || '/provider-tick', body := jsonb_build_object('link_ids', to_jsonb(v_due)),
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-gp-cron', v_secret),
                        timeout_milliseconds := 55000);
  return 'dispatched:' || cardinality(v_due);
end $$;

-- Shared secret for cron → Edge calls; generated in the database, never in the repo.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'gp_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'gp_cron_secret',
                                'pg_cron → provider-tick / account-demo-cleanup shared secret (B2)');
  end if;
end $$;

select cron.schedule('gp-provider-tick', '* * * * *', 'select sim.cron_tick()');
select cron.schedule('gp-demo-cleanup', '7 3 * * *', 'select api.demo_cleanup()');

-- ── grants ───────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
revoke all on function api.demo_start(uuid, text, text, text, text), api.demo_reset(uuid), api.demo_cleanup(int)
  from anon, authenticated;
grant execute on function api.demo_start(uuid, text, text, text, text), api.demo_reset(uuid), api.demo_cleanup(int)
  to service_role;
