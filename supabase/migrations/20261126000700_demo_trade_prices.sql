-- B3 fix of B2 demo data: sim.template_wealth trades carry generator prices far from the market
-- (SPY bought at 438.90 $ on 2025-12-18 while it closed at 676.47 $). Analytics (B4: TWR, IRR,
-- attribution) need real prices: a demo trade is priced at the instrument's last daily close on or
-- before its trade date (same currency only), when that history exists. Manual trades are untouched.
create function core.demo_trade_price() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_c numeric; v_ccy text;
begin
  if new.source <> 'demo' then return new; end if;
  select i.currency into v_ccy from mkt.instruments i where i.id = new.instrument_id;
  if v_ccy is distinct from new.currency then return new; end if;
  select b.c into v_c from mkt.bars_daily b
   where b.instrument_id = new.instrument_id and b.d <= new.trade_date and b.d > new.trade_date - 10
   order by b.d desc limit 1;
  if v_c is not null then
    new.price_minor := round(v_c * 10::numeric ^ ref.money_exponent(new.currency));
  end if;
  return new;
end $$;

create trigger demo_trade_price before insert on core.trades
for each row when (new.source = 'demo') execute function core.demo_trade_price();

-- existing demo clones
update core.trades t set price_minor = round((select b.c from mkt.bars_daily b
    where b.instrument_id = t.instrument_id and b.d <= t.trade_date and b.d > t.trade_date - 10
    order by b.d desc limit 1) * 100)
where t.source = 'demo' and t.currency = 'USD'
  and (select currency from mkt.instruments where id = t.instrument_id) = 'USD'
  and exists (select 1 from mkt.bars_daily b where b.instrument_id = t.instrument_id
              and b.d <= t.trade_date and b.d > t.trade_date - 10);

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
