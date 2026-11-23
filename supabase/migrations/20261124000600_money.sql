-- B1: money arithmetic in SQL (ARCHITECTURE G3). Same contract as
-- supabase/functions/_shared/money.ts and batch/goldenpiece/money.py;
-- checked by supabase/tests/money_fixtures.test.sql (generated from
-- shared/fixtures/money.json). Exact: numeric integers, half-even at the end.

create function ref.money_exponent(p_currency text) returns int
language plpgsql immutable parallel safe set search_path = '' as $$
begin
  case p_currency
    when 'XOF' then return 0;
    when 'XAF' then return 0;
    when 'EUR' then return 2;
    when 'USD' then return 2;
    else raise exception 'unsupported currency %', p_currency using errcode = '22023';
  end case;
end $$;

-- n / d rounded half-even; n and d must be integral numerics.
create function ref.money_div_round(n numeric, d numeric) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
declare q numeric; r numeric;
begin
  if d = 0 then raise exception 'division by zero' using errcode = '22012'; end if;
  if d < 0 then n := -n; d := -d; end if;
  q := div(n, d);                       -- truncates toward zero
  r := n - q * d;
  if r < 0 then q := q - 1; r := r + d; end if;   -- floor: 0 <= r < d
  if 2 * r > d or (2 * r = d and mod(q, 2) <> 0) then q := q + 1; end if;
  return q;
end $$;

-- decimal string -> minor units
create function ref.money_parse(p_amount text, p_currency text) returns bigint
language plpgsql immutable parallel safe set search_path = '' as $$
declare v numeric; s int;
begin
  if p_amount !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'invalid decimal %', p_amount using errcode = '22023';
  end if;
  v := p_amount::numeric;
  s := scale(v);
  return ref.money_div_round(v * 10::numeric ^ s * 10::numeric ^ ref.money_exponent(p_currency),
                             10::numeric ^ s)::bigint;
end $$;

-- minor units -> plain major string with exactly `exponent` decimals ('-12.34')
create function ref.money_format(p_minor bigint, p_currency text) returns text
language plpgsql immutable parallel safe set search_path = '' as $$
declare e int := ref.money_exponent(p_currency);
begin
  if e = 0 then return p_minor::text; end if;
  return to_char(p_minor::numeric / (10::numeric ^ e), 'FM' || repeat('9', 18) || '0.' || repeat('0', e));
end $$;

-- units of p_currency per 1 EUR (XOF/XAF exact peg; USD from caller or mkt.fx_latest)
create function ref.money_per_eur(p_currency text, p_usd_per_eur numeric) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
begin
  case p_currency
    when 'EUR' then return 1;
    when 'XOF' then return 655.957;
    when 'XAF' then return 655.957;
    when 'USD' then
      if p_usd_per_eur is null then
        raise exception 'USD conversion needs usd_per_eur' using errcode = '22023';
      end if;
      return p_usd_per_eur;
    else raise exception 'unsupported currency %', p_currency using errcode = '22023';
  end case;
end $$;

create function ref.money_convert(p_minor bigint, p_from text, p_to text, p_usd_per_eur numeric default null)
returns bigint
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  es int := ref.money_exponent(p_from);
  ed int := ref.money_exponent(p_to);
  f numeric; t numeric; num numeric; den numeric; k int;
begin
  if p_from = p_to then return p_minor; end if;
  f := ref.money_per_eur(p_from, p_usd_per_eur);
  t := ref.money_per_eur(p_to, p_usd_per_eur);
  num := p_minor::numeric * 10::numeric ^ ed * t;
  den := 10::numeric ^ es * f;
  k := greatest(scale(num), scale(den));          -- make both integral (exact)
  return ref.money_div_round(trunc(num * 10::numeric ^ k), trunc(den * 10::numeric ^ k))::bigint;
end $$;

-- split by integer weights: largest remainder, ties to the lower index
create function ref.money_allocate(p_minor bigint, p_weights int[]) returns bigint[]
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  total numeric; n int := coalesce(array_length(p_weights, 1), 0);
  base bigint[] := '{}'; left_ numeric; i int; r record;
begin
  if n = 0 or exists (select 1 from unnest(p_weights) w where w < 0 or w is null) then
    raise exception 'weights must be non-negative' using errcode = '22023';
  end if;
  select sum(w) into total from unnest(p_weights) w;
  if total = 0 then raise exception 'weights must have a positive sum' using errcode = '22023'; end if;
  for i in 1..n loop
    base := base || floor(p_minor::numeric * p_weights[i] / total)::bigint;
  end loop;
  left_ := p_minor - (select sum(b) from unnest(base) b);
  for r in
    select o.ord from unnest(p_weights) with ordinality as o(w, ord)
    order by (p_minor::numeric * o.w - base[o.ord] * total) desc, o.ord
  loop
    exit when left_ <= 0;
    base[r.ord] := base[r.ord] + 1;
    left_ := left_ - 1;
  end loop;
  return base;
end $$;

grant execute on function ref.money_exponent(text), ref.money_div_round(numeric, numeric),
  ref.money_parse(text, text), ref.money_format(bigint, text), ref.money_per_eur(text, numeric),
  ref.money_convert(bigint, text, text, numeric), ref.money_allocate(bigint, int[])
  to authenticated, service_role, batch_writer;
