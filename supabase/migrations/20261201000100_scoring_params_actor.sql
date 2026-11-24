-- B9.4: the "Réglages du modèle" panel (design/screens/d-bank-dashboard.md §4) shows the actor of each change and
-- the model version line. `api.scoring_params()` now adds, per change: `by` (analyst user_ref, 'simulated' for the
-- simulated analyst, null for user answers / batch / reset without actor) and `simulated`; at the top: `model`
-- (active Isolation Forest version + trained_at) and `rules_version` (highest active rule version).
create or replace function api.scoring_params() returns jsonb
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
    'rules_version', (select max(version) from ref.fraud_rules where active),
    'model', (select jsonb_build_object('version', version, 'trained_at', trained_at)
              from ops.model_artifacts where kind = 'iforest' and status = 'active' limit 1),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'key', c.param_key,
                 'user_ref', case when c.user_id is not null then core.user_ref(c.user_id) end, 'category', c.category_id,
                 'before', c.before, 'after', c.after, 'cause', c.cause, 'alert_id', c.alert_id, 'at', c.at,
                 'by', case when c.actor is not null then core.user_ref(c.actor)
                            when c.cause in ('analyst_legit', 'analyst_fraud') then 'simulated' end,
                 'simulated', c.actor is null and c.cause in ('analyst_legit', 'analyst_fraud')) order by c.id desc)
               from (select * from ops.param_changes order by id desc limit 100) c), '[]'));
end $$;

-- B9.4 Ops tab (delegated: B7 tiles + G1/G3 charts): one row per day of the last p_days days (server time zone UTC),
-- with the alerts created by band, the push latency p95 (alert → push sent, same filter as ops_metrics) and the
-- p95 score latency. Days without data come back with zeros / nulls so the line keeps its x axis.
create function api.ops_series(p_days int default 14) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_days int := greatest(2, least(coalesce(p_days, 14), 60));
begin
  perform core.require_analyst();
  return (select jsonb_agg(jsonb_build_object(
      'day', d.day,
      'alerts', jsonb_build_object(
        'info', (select count(*) from core.alerts a where a.band = 'info' and a.created_at >= d.day and a.created_at < d.day + 1),
        'ask', (select count(*) from core.alerts a where a.band = 'ask' and a.created_at >= d.day and a.created_at < d.day + 1),
        'bank', (select count(*) from core.alerts a where a.band = 'bank' and a.created_at >= d.day and a.created_at < d.day + 1)),
      'push_p95_ms', (select percentile_cont(0.95) within group (order by extract(epoch from l.sent_at - a.created_at) * 1000)
                      from ops.push_log l join core.alerts a on a.id = l.alert_id
                      where l.created_at >= d.day and l.created_at < d.day + 1
                        and l.status in ('sent', 'stub', 'no_token') and l.type in ('confirm', 'alerted')),
      'score_p95_ms', (select percentile_cont(0.95) within group (order by s.latency_ms)
                       from core.scores s where s.computed_at >= d.day and s.computed_at < d.day + 1)) order by d.day)
    from (select (current_date - g)::date as day from generate_series(v_days - 1, 0, -1) g) d);
end $$;

revoke execute on function api.ops_series(int) from public;
grant execute on function api.ops_series(int) to authenticated, service_role;
