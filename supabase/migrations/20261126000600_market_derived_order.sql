-- B3 fix: (1) mkt.refresh_derived computed the USDXOF day change before inserting the new
-- peg bars, so during a backfill it compared with a months-old bar (+7.9 % seen on dev);
-- bars first now. (2) get_markets: a monthly series' change over 1 month is its
-- month-over-month change (the 30-day-back bar was the latest bar itself → 0).
create or replace function mkt.refresh_derived() returns void
language plpgsql set search_path = '' as $$
declare v_usd numeric; v_usd_at timestamptz; v_prev numeric;
begin
  -- fx_latest from intraday FX quotes (base EUR)
  select q.price, q.as_of into v_usd, v_usd_at from mkt.quotes_latest q where q.instrument_id = 'EURUSD';
  if v_usd is not null then
    insert into mkt.fx_latest (quote, rate, as_of) values ('USD', v_usd, v_usd_at)
    on conflict (quote) do update set rate = excluded.rate, as_of = excluded.as_of
      where mkt.fx_latest.as_of <= excluded.as_of;
    insert into mkt.fx_latest (quote, rate, as_of)
    select right(q.instrument_id, 3), case when left(q.instrument_id, 3) = 'EUR' then q.price else q.price * v_usd end, q.as_of
    from mkt.quotes_latest q join mkt.instruments i on i.id = q.instrument_id
    where i.asset_class = 'fx' and i.vendor = 'twelvedata' and q.instrument_id <> 'EURUSD'
    on conflict (quote) do update set rate = excluded.rate, as_of = excluded.as_of
      where mkt.fx_latest.as_of <= excluded.as_of;
  end if;
  select rate, as_of into v_usd, v_usd_at from mkt.fx_latest where quote = 'USD';

  -- daily bars of the peg rows from Frankfurter history
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c)
  select 'USDXOF', f.d, round(655.957 / f.rate, 4), round(655.957 / f.rate, 4), round(655.957 / f.rate, 4),
         round(655.957 / f.rate, 4)
  from mkt.fx_daily f where f.quote = 'USD'
    and f.d > coalesce((select max(d) from mkt.bars_daily where instrument_id = 'USDXOF'), '1900-01-01')
  on conflict do nothing;
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c)
  select 'EURXOF', f.d, 655.957, 655.957, 655.957, 655.957
  from mkt.fx_daily f where f.quote = 'USD'
    and f.d > coalesce((select max(d) from mkt.bars_daily where instrument_id = 'EURXOF'), '1900-01-01')
  on conflict do nothing;
  -- EURXOF: constant; change 0
  insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
  values ('EURXOF', 655.957, 0, coalesce(v_usd_at, now()), now(), 'derived')
  on conflict (instrument_id) do update set as_of = excluded.as_of, fetched_at = excluded.fetched_at;
  -- USDXOF
  if v_usd is not null then
    select c into v_prev from mkt.bars_daily where instrument_id = 'USDXOF'
      and d < (v_usd_at at time zone 'UTC')::date order by d desc limit 1;
    insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
    values ('USDXOF', round(655.957 / v_usd, 4),
            case when v_prev > 0 then round((655.957 / v_usd / v_prev - 1) * 100, 4) end, v_usd_at, now(), 'derived')
    on conflict (instrument_id) do update set price = excluded.price, change_pct = excluded.change_pct,
      as_of = excluded.as_of, fetched_at = excluded.fetched_at;
  end if;
end $$;

-- Markets screen (P7) and Home strip: API.md §2.5 + B9 (spark_30d, change_30d_pct).
create or replace function api.get_markets(p_etag text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_lang text; v jsonb; v_as_of timestamptz;
begin
  if uid is null then perform core.api_error('FORBIDDEN', 'auth.required'); end if;
  v_lang := coalesce((select language from core.profiles where user_id = uid), 'fr');
  with items as (
    select i.group_key, i.sort, i.vendor, jsonb_build_object(
        'instrument_id', i.id,
        'name', case when v_lang = 'en' then coalesce(i.name_en, i.name) else i.name end,
        'class', i.asset_class, 'currency', i.currency, 'unit', i.unit,
        'price', mkt.sig6(q.price), 'change_pct', q.change_pct,
        'change_30d_pct', case when i.frequency = 'monthly' then round(q.change_pct, 2)        -- month over month
                               when b.c30 > 0 and q.price is not null then round((q.price / b.c30 - 1) * 100, 2) end,
        'spark_30d', coalesce(b.spark, '[]'::jsonb),
        'as_of', q.as_of, 'freshness', mkt.freshness(i), 'proxy_of', i.proxy_of) as item
    from mkt.instruments i
    left join mkt.quotes_latest q on q.instrument_id = i.id
    left join lateral (
      select (select jsonb_agg(mkt.sig6(s.c) order by s.d) from (
                select d, c from mkt.bars_daily where instrument_id = i.id
                  and d > case when i.frequency = 'monthly' then current_date - 400 else current_date - 31 end
                order by d desc limit 30) s) as spark,
             (select c from mkt.bars_daily where instrument_id = i.id
                and d <= current_date - 30
              order by d desc limit 1) as c30
    ) b on true
    where i.active and i.group_key is not null)
  select jsonb_build_object(
      'groups', (select jsonb_agg(jsonb_build_object('key', g.key, 'items', g.items) order by g.ord)
                 from (select group_key as key,
                              jsonb_agg(item order by sort) as items,
                              array_position(array['indices','metals','energy','agri','crypto','fx'], group_key) as ord
                       from items group by group_key) g),
      'attributions', (select jsonb_agg(distinct mkt.attribution_key(vendor)) from items))
    into v;
  select min(q.as_of) into v_as_of from mkt.quotes_latest q join mkt.instruments i on i.id = q.instrument_id
   where i.frequency = 'intraday' and i.active;
  return core.envelope(p_etag, v, coalesce(v_as_of, now()));
end $$;

select mkt.refresh_derived();

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
