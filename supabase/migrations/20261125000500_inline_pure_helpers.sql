-- B2: pure SQL helpers without `set search_path`, so the planner inlines them
-- (a function with a SET clause is never inlined; per-row calls made rule
-- matching ~0.6 ms/row). They only call pg_catalog functions, fully
-- qualified where it matters, and are not security definer.

create or replace function core.norm_text(t text) returns text
language sql immutable parallel safe as $$
  select pg_catalog.lower(pg_catalog.translate(coalesce(t, ''),
    'ÀÂÄÁÃÉÈÊËÍÎÏÓÔÖÕÚÙÛÜÇÑàâäáãéèêëíîïóôöõúùûüçñ',
    'AAAAAEEEEIIIOOOOUUUUCNaaaaaeeeeiiioooouuuucn'))
$$;
alter function core.norm_text(text) reset all;

create or replace function core.rule_matches(p_field text, p_type text, p_pattern text,
                                             p_cp_key text, p_text text, p_mcc text, p_op text)
returns boolean language sql immutable parallel safe as $$
  select coalesce(case p_field
    when 'cp_key' then case p_type when 'equals' then p_cp_key = p_pattern
                                   when 'contains' then pg_catalog.strpos(p_cp_key, p_pattern) > 0
                                   else p_cp_key ~ p_pattern end
    when 'remittance' then case p_type when 'equals' then p_text = p_pattern
                                       when 'contains' then pg_catalog.strpos(p_text, p_pattern) > 0
                                       else p_text ~ p_pattern end
    when 'merchant_code' then p_mcc = p_pattern
    when 'op_type' then p_op = p_pattern
  end, false)
$$;
alter function core.rule_matches(text, text, text, text, text, text, text) reset all;

create or replace function sim.signed(p_entry jsonb) returns bigint
language sql immutable parallel safe as $$
  select case when p_entry ->> 'creditDebit' = 'CRDT' then (p_entry ->> 'amountMinor')::bigint
              else -(p_entry ->> 'amountMinor')::bigint - coalesce((p_entry #>> '{charges,amountMinor}')::bigint, 0) end
$$;
alter function sim.signed(jsonb) reset all;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
