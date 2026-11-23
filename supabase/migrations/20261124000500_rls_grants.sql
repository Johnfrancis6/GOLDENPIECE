-- B1: row-level security and grants. DATA_MODEL.md §3, ARCHITECTURE.md §9.
-- PostgREST exposes only `api`; RLS is still on every table (defence in
-- depth, and Realtime reads core.alerts directly).

-- 1. RLS on every table of the app schemas.
do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_tables
           where schemaname in ('core','ref','mkt','analytics','ops','sim') loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;
end $$;

-- 2. Helpers.
create function core.is_analyst() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'analyst'
                  and (auth.jwt() ->> 'aal') = 'aal2', false)
$$;
grant execute on function core.is_analyst() to authenticated, anon, service_role;

-- 3. service_role: everything (bypasses RLS on Supabase).
grant all on all tables in schema core, ref, mkt, analytics, ops, sim to service_role;
grant all on all sequences in schema core, ref, mkt, analytics, ops, sim to service_role;

-- 4. batch_writer (GitHub Actions): read core/ref/mkt, write analytics, sim,
--    some ops tables; never DELETE on core.
grant select on all tables in schema core, ref, mkt, sim, analytics, ops to batch_writer;
grant insert, update, delete on all tables in schema analytics, sim to batch_writer;
grant insert on core.alerts to batch_writer;                              -- concentration / learning_done
grant update (learning_active_at) on core.profiles to batch_writer;
grant insert, update on ops.job_runs, ops.model_artifacts, ops.model_eval, ops.scoring_params to batch_writer;
grant insert on ops.param_changes, ops.audit_log to batch_writer;
grant delete on ops.recompute_queue to batch_writer;
grant usage on all sequences in schema ops, analytics to batch_writer;
do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_tables
           where schemaname in ('core','ref','mkt','analytics','ops','sim') loop
    execute format('create policy batch_writer_all on %I.%I for all to batch_writer using (true) with check (true)',
                   r.schemaname, r.tablename);
  end loop;
end $$;

-- 5. ref: readable by every signed-in user; anon sees countries + legal texts only.
grant select on all tables in schema ref to authenticated;
grant select on ref.countries, ref.legal_texts to anon;
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'ref' loop
    execute format('create policy read_all on ref.%I for select to authenticated using (true)', r.tablename);
  end loop;
end $$;
create policy anon_read on ref.countries for select to anon using (true);
create policy anon_read on ref.legal_texts for select to anon using (true);

-- 6. core: owner policies (u = (select auth.uid())).
-- profiles: select/update own; insert by trigger only; no delete.
grant select on core.profiles to authenticated;
grant update (language, country, timezone, ref_currency, phone_e164, risk_profile,
              hide_amounts_in_push, data_saver, lock_delay_s, concentration_threshold_pct,
              notif_prefs, last_active_at) on core.profiles to authenticated;
create policy own_select on core.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy own_update on core.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- devices: select/insert own; update a few columns; revoke via function.
grant select, insert on core.devices to authenticated;
grant update (label, os_version, app_version, security_level, unlock_method, push_token,
              push_enabled, last_seen_at) on core.devices to authenticated;
create policy own_select on core.devices for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on core.devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on core.devices for update to authenticated
  using (user_id = (select auth.uid()) and revoked_at is null) with check (user_id = (select auth.uid()));

-- consents: history, select/insert only.
grant select, insert on core.consents to authenticated;
create policy own_select on core.consents for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on core.consents for insert to authenticated with check (user_id = (select auth.uid()));

-- Tables fully owned by the user (select/insert/update/delete own).
do $$
declare t text;
begin
  foreach t in array array['questionnaire','trades','real_estate','debts','user_categories','budgets'] loop
    execute format('grant select, insert, update, delete on core.%I to authenticated', t);
    execute format('create policy own_all on core.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- cards: select/insert/update own.
grant select, insert, update on core.cards to authenticated;
create policy own_select on core.cards for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on core.cards for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on core.cards for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Read-only own tables (written by functions / batch).
do $$
declare t text;
begin
  foreach t in array array['provider_links','accounts','transactions','security_events','scores'] loop
    execute format('grant select on core.%I to authenticated', t);
    execute format('create policy own_select on core.%I for select to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- tx_momo: through its transaction.
grant select on core.tx_momo to authenticated;
create policy own_select on core.tx_momo for select to authenticated using (
  exists (select 1 from core.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())));

-- real_estate_valuations: append-only, through its property.
grant select, insert on core.real_estate_valuations to authenticated;
create policy own_select on core.real_estate_valuations for select to authenticated using (
  exists (select 1 from core.real_estate r where r.id = real_estate_id and r.user_id = (select auth.uid())));
create policy own_insert on core.real_estate_valuations for insert to authenticated with check (
  exists (select 1 from core.real_estate r where r.id = real_estate_id and r.user_id = (select auth.uid())));

-- corporate_actions: own + global (seeded, user_id null) readable; writes own.
grant select, insert, update, delete on core.corporate_actions to authenticated;
create policy read_own_or_global on core.corporate_actions for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy own_insert on core.corporate_actions for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on core.corporate_actions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_delete on core.corporate_actions for delete to authenticated using (user_id = (select auth.uid()));

-- cat_rules: own rules all; global keyword rules readable by all.
grant select, insert, update, delete on core.cat_rules to authenticated;
create policy read_own_or_global on core.cat_rules for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy own_insert on core.cat_rules for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'user');
create policy own_update on core.cat_rules for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_delete on core.cat_rules for delete to authenticated using (user_id = (select auth.uid()));

-- alerts: user selects own (Realtime); analyst (aal2) selects bank-side statuses.
-- Updates only through api.answer_alert / api.analyst_decide (security definer).
grant select on core.alerts to authenticated;
create policy own_select on core.alerts for select to authenticated using (user_id = (select auth.uid()));
create policy analyst_select on core.alerts for select to authenticated using (
  (select core.is_analyst())
  and status in ('escalated','in_review','decided_legit','decided_fraud'));

-- analyst_decisions: users see decision + date of their own alerts, never the analyst.
grant select (id, alert_id, decision, simulated, decided_at) on core.analyst_decisions to authenticated;
create policy own_alert_select on core.analyst_decisions for select to authenticated using (
  exists (select 1 from core.alerts a where a.id = alert_id and a.user_id = (select auth.uid())));
create policy analyst_select on core.analyst_decisions for select to authenticated using ((select core.is_analyst()));

-- 7. analytics: users read their own rows (RPCs are the normal path).
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'analytics' loop
    execute format('grant select on analytics.%I to authenticated', r.tablename);
    execute format('create policy own_select on analytics.%I for select to authenticated using (user_id = (select auth.uid()))', r.tablename);
  end loop;
end $$;

-- 8. mkt, ops, sim: no direct access for users (api functions only).

-- 9. Audit log is append-only: only through ops.audit().
revoke update, delete, truncate on ops.audit_log from service_role, batch_writer;
create function ops.audit(p_actor uuid, p_actor_role text, p_action text, p_target text, p_detail jsonb default null)
returns bigint language sql security definer set search_path = '' as $$
  insert into ops.audit_log (actor, actor_role, action, target, detail)
  values (p_actor, p_actor_role, p_action, p_target, p_detail)
  returning id
$$;
grant execute on function ops.audit(uuid, text, text, text, jsonb) to service_role, batch_writer;

-- 10. Realtime on core.alerts (app foreground + dashboard queue).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'core' and tablename = 'alerts') then
    alter publication supabase_realtime add table core.alerts;
  end if;
end $$;
