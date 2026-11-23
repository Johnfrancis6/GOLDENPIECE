-- B3 fix: text[] || 'literal' parsed the literal as an array; use array_append.
create or replace function mkt.cron_market(p_now timestamptz default now()) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_min int := extract(minute from p_now at time zone 'UTC')::int;
  v_utc timestamp := p_now at time zone 'UTC';
  out text[] := '{}';
begin
  if (select value ->> 'url' from ops.app_config where key = 'functions') is null then return 'no_edge'; end if;
  if v_min % 15 = 0 and exists (select 1 from mkt.instruments i where i.active and i.vendor = 'finnhub'
                                and mkt.is_open(i.id, 20, p_now)) then
    perform mkt.dispatch('market-refresh', '{"kind":"quotes"}'); out := array_append(out, 'quotes');
  end if;
  if v_min % 10 = 0 then
    perform mkt.dispatch('market-refresh', '{"kind":"crypto"}'); out := array_append(out, 'crypto');
  end if;
  if v_min = 5 and mkt.fx_open(p_now) then
    perform mkt.dispatch('market-refresh', '{"kind":"fx"}'); out := array_append(out, 'fx');
  end if;
  if v_min % 2 = 1 and jsonb_array_length(api.market_targets('bars', 1)) > 0 then
    perform mkt.dispatch('market-eod', '{"kind":"bars"}'); out := array_append(out, 'bars');
  end if;
  if v_min % 10 = 3 and jsonb_array_length(api.market_targets('fred', 4)) > 0 then
    perform mkt.dispatch('market-eod', '{"kind":"fred"}'); out := array_append(out, 'fred');
  end if;
  if v_min % 10 = 7
     and (not exists (select 1 from mkt.fx_daily)
          or (extract(isodow from v_utc) < 6 and v_utc::time >= '15:30'
              and (select max(d) from mkt.fx_daily) < v_utc::date))
     and mkt.state_due('ecb', interval '0', interval '30 minutes') then
    perform mkt.touch('ecb');
    perform mkt.dispatch('market-eod', '{"kind":"ecb"}'); out := array_append(out, 'ecb');
  end if;
  -- keep 35 days of quota counters
  if v_min = 59 then delete from mkt.quota where bucket < p_now - interval '35 days'; end if;
  return coalesce(nullif(array_to_string(out, ','), ''), 'idle');
end $$;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
