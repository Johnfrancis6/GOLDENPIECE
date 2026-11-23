-- B3 fix: Twelve Data returns the current, still moving daily bar; storing it froze an
-- intraday close as the day's close (the next EOD run saw the date as present). Keep only
-- complete bars (d <= mkt.expected_bar_date) and drop the partial ones stored before.
create or replace function api.market_upsert_bars(p_instrument_id text, p_bars jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int; i mkt.instruments; v_last record; v_prev numeric;
begin
  select * into i from mkt.instruments where id = p_instrument_id;
  if i.id is null then perform core.api_error('NOT_FOUND', 'market.instrument'); end if;
  insert into mkt.bars_daily (instrument_id, d, o, h, l, c, v)
  select p_instrument_id, x.d, x.o, x.h, x.l, x.c, x.v
  from jsonb_to_recordset(p_bars) as x(d date, o numeric, h numeric, l numeric, c numeric, v numeric)
  where x.c > 0
    and (i.hist_vendor <> 'twelvedata' or x.d <= mkt.expected_bar_date(i.id))   -- no partial (live) bar
  on conflict (instrument_id, d) do update set o = excluded.o, h = excluded.h, l = excluded.l,
    c = excluded.c, v = excluded.v;
  get diagnostics n = row_count;
  if i.vendor = 'fred' then
    select d, c into v_last from mkt.bars_daily where instrument_id = i.id order by d desc limit 1;
    select c into v_prev from mkt.bars_daily where instrument_id = i.id and d < v_last.d order by d desc limit 1;
    if v_last.d is not null then
      insert into mkt.quotes_latest (instrument_id, price, change_pct, as_of, fetched_at, vendor)
      values (i.id, v_last.c, case when v_prev > 0 then round((v_last.c / v_prev - 1) * 100, 4) end,
              v_last.d::timestamptz, now(), 'fred')
      on conflict (instrument_id) do update set price = excluded.price, change_pct = excluded.change_pct,
        as_of = excluded.as_of, fetched_at = excluded.fetched_at, vendor = excluded.vendor;
    end if;
  end if;
  perform mkt.bump_version();
  return n;
end $$;

delete from mkt.bars_daily b using mkt.instruments i
 where i.id = b.instrument_id and i.hist_vendor = 'twelvedata' and b.d > mkt.expected_bar_date(i.id);

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
