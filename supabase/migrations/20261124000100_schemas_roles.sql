-- B1 Foundations: extensions, schemas, roles, base grants.
-- DATA_MODEL.md conventions; ARCHITECTURE.md §9.1 (roles).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists core;       -- user data
create schema if not exists ref;        -- reference data (written by migrations only)
create schema if not exists mkt;        -- market cache
create schema if not exists analytics;  -- batch outputs
create schema if not exists ops;        -- operations
create schema if not exists sim;        -- simulated bank (never read by the app)
create schema if not exists api;        -- the only schema PostgREST exposes

-- batch_writer: GitHub Actions batch via the pooler (ARCHITECTURE §9.1).
-- Created NOLOGIN here; the login + password are set out of band
-- (B4, from the GitHub secret), never in a migration.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'batch_writer') then
    create role batch_writer nologin noinherit;
  end if;
end $$;

-- Nobody gets default access to new schemas.
revoke all on schema core, ref, mkt, analytics, ops, sim, api from public;

grant usage on schema api to anon, authenticated, service_role;
-- authenticated needs core usage for Realtime on core.alerts (RLS applies).
grant usage on schema core, ref to authenticated;
grant usage on schema ref to anon;
grant usage on schema core, ref, mkt, analytics, ops, sim to service_role;
grant usage on schema core, ref, mkt, analytics, ops, sim to batch_writer;

-- Note: per-schema default privileges cannot remove PUBLIC's EXECUTE on new
-- functions; each migration revokes it explicitly (see api skeleton) and a
-- pgTAP test fails if a function is executable by PUBLIC/anon unexpectedly.

-- service_role (Edge Functions) has full access to every app schema.
alter default privileges in schema core, ref, mkt, analytics, ops, sim
  grant all on tables to service_role;
alter default privileges in schema core, ref, mkt, analytics, ops, sim
  grant all on sequences to service_role;
alter default privileges in schema api, core, ref, mkt, analytics, ops, sim
  grant execute on functions to service_role;
