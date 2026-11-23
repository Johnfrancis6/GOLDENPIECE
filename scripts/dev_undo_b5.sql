-- DEV ONLY (goldenpiece-dev): undo B5 scoring migrations while iterating, then `sb_api.py migrate` again.
drop table if exists ops.tmp_replay;
drop function if exists core.score_replay(uuid, timestamptz, timestamptz), core.training_rows(uuid, int), sim.truth(uuid),
  core.score_transaction(uuid), core.score_compute(uuid), core.if_vector(jsonb), core.score_features(uuid),
  core.iforest_raw(text, float8[]), core.param(text, uuid, text), core.is_scored(text, text), core.op_group(text, text, text),
  core.amount_eur(bigint, text), core.clamp01(float8), core.robust(float8[]), core.med(float8[]) cascade;
drop table if exists core.known_payees, ops.iforest_trees cascade;
alter table ops.model_artifacts drop column if exists meta;
delete from core.alerts where kind in ('anomaly','fraud'); delete from core.scores;
delete from ops.scoring_params; delete from ref.fraud_rules;
delete from supabase_migrations.schema_migrations where version = '20261128000100';
