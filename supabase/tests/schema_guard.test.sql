-- Schema guards: every DATA_MODEL §2 table exists with RLS on; no function
-- in the app schemas is executable by PUBLIC; anon reaches only the listed
-- api functions; PostgREST-exposed schema holds no tables.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
select plan(11);

select tables_are('core', array['profiles','devices','consents','questionnaire','cards','provider_links','accounts',
  'transactions','tx_momo','security_events','trades','corporate_actions','real_estate','real_estate_valuations',
  'debts','user_categories','cat_rules','budgets','scores','alerts','analyst_decisions'], 'core tables (DATA_MODEL §2)');
select tables_are('ref', array['countries','operators','banks','card_bins','legal_texts','categories','fraud_rules'], 'ref tables');
select tables_are('mkt', array['instruments','quotes_latest','bars_daily','fx_daily','fx_latest','version'], 'mkt tables');
select tables_are('analytics', array['behaviour_profiles','learning_status','portfolio_daily','networth_daily',
  'risk_metrics','drawdown_series','exposures','performance','attribution'], 'analytics tables');
select tables_are('ops', array['app_config','job_runs','audit_log','rate_limits','idempotency','recompute_queue',
  'push_log','scoring_params','param_changes','model_artifacts','model_eval'], 'ops tables');
select tables_are('sim', array['templates','template_accounts','template_entries','template_security_events','links'], 'sim tables');
select tables_are('api', array[]::name[], 'api exposes no tables');

select is((select array_agg(n.nspname || '.' || c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where c.relkind = 'r' and n.nspname in ('core','ref','mkt','analytics','ops','sim') and not c.relrowsecurity),
          null, 'RLS enabled on every app table');

select is((select array_agg(p.oid::regprocedure::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('api','core','ref','mkt','analytics','ops','sim')
             and has_function_privilege('public', p.oid, 'execute')
             and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0)),
          null, 'no app function executable by PUBLIC');

select is((select array_agg(p.proname::text order by p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'api' and has_function_privilege('anon', p.oid, 'execute')),
          array['countries','health_public','legal_texts'], 'anon can call only the listed api functions');

select is((select array_agg(p.proname::text order by p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'api' and p.prosecdef and not ('search_path=""' = any(coalesce(p.proconfig, '{}'))
                                                            or 'search_path=' = any(coalesce(p.proconfig, '{}')))),
          null, 'every security definer api function pins search_path');

select * from finish();
rollback;
