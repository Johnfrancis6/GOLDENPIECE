-- B2: ingest (insert + rule categorisation), simulated provider internals,
-- provider RPCs for the Edge Functions (service role only).
-- ARCHITECTURE §3, API.md §3, §4.1, §4.6.

-- ── text helpers ─────────────────────────────────────────────────────────
create function core.norm_text(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(translate(coalesce(t, ''),
    'ÀÂÄÁÃÉÈÊËÍÎÏÓÔÖÕÚÙÛÜÇÑàâäáãéèêëíîïóôöõúùûüçñ',
    'AAAAAEEEEIIIOOOOUUUUCNaaaaaeeeeiiioooouuuucn'))
$$;

-- Normalised counterparty key (features f1/f3/f13, user rules).
-- m: msisdn, i: IBAN, n: name, op: wallet op without counterparty, x: label only.
create function core.cp_key(p_entry jsonb) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when nullif(p_entry #>> '{counterparty,msisdn}', '') is not null
      then 'm:' || regexp_replace(p_entry #>> '{counterparty,msisdn}', '[^0-9+]', '', 'g')
    when nullif(p_entry #>> '{counterparty,iban}', '') is not null
      then 'i:' || upper(replace(p_entry #>> '{counterparty,iban}', ' ', ''))
    when nullif(p_entry #>> '{counterparty,name}', '') is not null
      then 'n:' || core.norm_text(p_entry #>> '{counterparty,name}')
    when p_entry #>> '{momo,opType}' is not null then 'op:' || (p_entry #>> '{momo,opType}')
    else 'x:' || core.norm_text(coalesce(p_entry ->> 'remittanceInfo', ''))
  end
$$;

-- One rule against one transaction's normalised fields.
create function core.rule_matches(p_field text, p_type text, p_pattern text,
                                  p_cp_key text, p_text text, p_mcc text, p_op text)
returns boolean language sql immutable parallel safe set search_path = '' as $$
  select coalesce(case p_field
    when 'cp_key' then case p_type when 'equals' then p_cp_key = p_pattern
                                   when 'contains' then strpos(p_cp_key, p_pattern) > 0
                                   else p_cp_key ~ p_pattern end
    when 'remittance' then case p_type when 'equals' then p_text = p_pattern
                                       when 'contains' then strpos(p_text, p_pattern) > 0
                                       else p_text ~ p_pattern end
    when 'merchant_code' then p_mcc = p_pattern
    when 'op_type' then p_op = p_pattern
  end, false)
$$;

-- Best rule for a user: the user's rules first, then global keyword rules.
create function core.pick_category(p_user uuid, p_cp_key text, p_text text, p_mcc text, p_op text,
                                   out category_id text, out is_user boolean)
language sql stable set search_path = '' as $$
  select r.category_id, r.user_id is not null
  from core.cat_rules r
  where (r.user_id = p_user or r.user_id is null)
    and core.rule_matches(r.match_field, r.match_type, r.pattern, p_cp_key, p_text, p_mcc, p_op)
  order by (r.user_id is null), r.priority, r.id
  limit 1
$$;

-- Re-run rule categorisation on rows still 'none' (later sessions: after a new rule).
create function core.categorise(p_user uuid, p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update core.transactions t
     set category_id = c.category_id,
         category_source = case when c.is_user then 'user_rule' else 'keyword' end
    from core.transactions s
    left join core.tx_momo m on m.transaction_id = s.id
    cross join lateral core.pick_category(s.user_id, s.cp_key,
      core.norm_text(coalesce(s.remittance_info, '') || ' ' || coalesce(s.cp_name, '')),
      s.cp_merchant_code, m.op_type) c
   where t.id = s.id and s.user_id = p_user and s.category_source = 'none'
     and (p_ids is null or s.id = any(p_ids)) and c.category_id is not null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── ingest (API.md §3): insert + rule categorisation; scoring comes in B5 ──
-- p_entries: ProviderEntry[] (shared/schemas/provider_entry.json), money as integers.
-- Idempotent: (account_id, provider_entry_id) unique; a PDNG row becomes BOOK/RJCT.
create function core.ingest_entries(p_user uuid, p_account uuid, p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ins uuid[]; v_upd int; v_cat int; v_none int;
begin
  if not exists (select 1 from core.accounts where id = p_account and user_id = p_user) then
    perform core.api_error('NOT_FOUND', 'account.not_found');
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' then
    perform core.api_error('INVALID', 'ingest.entries_not_array');
  end if;
  begin
    with src as (
      select distinct on (e ->> 'providerEntryId') e, e -> 'counterparty' cp
      from jsonb_array_elements(p_entries) with ordinality x(e, ord)
      order by e ->> 'providerEntryId', ord desc
    ), up as (
      insert into core.transactions as t (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor,
        currency, booking_ts, value_date, btc_domain, btc_family, btc_subfamily, end_to_end_id, tx_id,
        acct_svcr_ref, cp_name, cp_iban, cp_msisdn, cp_bic, cp_merchant_code, cp_key, remittance_info,
        purpose_code, charges_minor, charges_currency, category_id, category_source)
      select p_user, p_account, e ->> 'providerEntryId', e ->> 'status', e ->> 'creditDebit',
        (e ->> 'amountMinor')::bigint, e ->> 'currency', (e ->> 'bookingTs')::timestamptz,
        (e ->> 'valueDate')::date, e #>> '{bankTxCode,domain}', e #>> '{bankTxCode,family}',
        e #>> '{bankTxCode,subFamily}', e ->> 'endToEndId', e ->> 'txId', e ->> 'acctSvcrRef',
        cp ->> 'name', cp ->> 'iban', cp ->> 'msisdn', cp ->> 'bic', cp ->> 'merchantCode', core.cp_key(e),
        e ->> 'remittanceInfo', e ->> 'purposeCode', (e #>> '{charges,amountMinor}')::bigint,
        e #>> '{charges,currency}', c.category_id,
        case when c.category_id is null then 'none' when c.is_user then 'user_rule' else 'keyword' end
      from src
      cross join lateral core.pick_category(p_user, core.cp_key(e),
        core.norm_text(coalesce(e ->> 'remittanceInfo', '') || ' ' || coalesce(cp ->> 'name', '')),
        cp ->> 'merchantCode', e #>> '{momo,opType}') c
      where (e ->> 'providerEntryId') is not null
      on conflict (account_id, provider_entry_id) do update set status = excluded.status
        where t.status = 'PDNG' and excluded.status <> 'PDNG'
      returning t.id, t.provider_entry_id, (xmax = 0) as inserted, t.category_source
    ), mo as (
      insert into core.tx_momo (transaction_id, operator, op_type, agent_id, balance_after_minor, operator_ref)
      select up.id, src.e #>> '{momo,operator}', src.e #>> '{momo,opType}', src.e #>> '{momo,agentId}',
             (src.e #>> '{momo,balanceAfterMinor}')::bigint, src.e #>> '{momo,operatorRef}'
      from up join src on src.e ->> 'providerEntryId' = up.provider_entry_id
      where up.inserted and src.e ? 'momo'
      returning 1
    )
    select array_agg(id) filter (where inserted),
           count(*) filter (where not inserted),
           count(*) filter (where inserted and category_source <> 'none'),
           count(*) filter (where inserted and category_source = 'none')
      into v_ins, v_upd, v_cat, v_none
    from up;
  exception
    when invalid_text_representation or not_null_violation or check_violation or datetime_field_overflow
         or invalid_datetime_format or numeric_value_out_of_range or foreign_key_violation then
      perform core.api_error('INVALID', 'ingest.invalid_entry');
  end;
  return jsonb_build_object('inserted', coalesce(cardinality(v_ins), 0), 'updated', v_upd,
    'categorised', v_cat, 'uncategorised', v_none, 'scored', 0, 'alerts', 0,
    'transaction_ids', to_jsonb(coalesce(v_ins, '{}'::uuid[])));
end $$;

-- Simulated operator signals (C8) and other provider security events.
-- p_events: [{providerEventId, type, at, details}]
create function core.ingest_security_events(p_user uuid, p_events jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into core.security_events (user_id, type, source, at, details)
  select p_user, e ->> 'type', 'sim', (e ->> 'at')::timestamptz,
         coalesce(e -> 'details', '{}') - 'accountKey' || jsonb_build_object('provider_event_id', e ->> 'providerEventId')
  from jsonb_array_elements(coalesce(p_events, '[]')) e
  on conflict (user_id, (details ->> 'provider_event_id')) where source = 'sim' do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- ── IBAN / MSISDN (twins of batch/goldenpiece/generator/iban.py) ──────────
create function sim.rib_digits(s text) returns numeric
language sql immutable parallel safe set search_path = '' as $$
  select translate(upper(s), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '12345678912345678923456789')::numeric
$$;

create function sim.rib_key(p_bank text, p_branch text, p_account text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lpad((97 - ((89 * sim.rib_digits(p_bank) + 15 * sim.rib_digits(p_branch) + 3 * sim.rib_digits(p_account))
                     % 97))::text, 2, '0')
$$;

create function sim.iban_check(p_country text, p_bban text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lpad((98 - (string_agg(case when c ~ '[0-9]' then c else (ascii(c) - 55)::text end, '' order by i)::numeric
                    % 97))::text, 2, '0')
  from unnest(string_to_array(upper(p_bban || p_country || '00'), null)) with ordinality u(c, i)
$$;

create function sim.iban(p_country text, p_bank text, p_branch text, p_account text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select p_country || sim.iban_check(p_country, p_bank || p_branch || p_account || sim.rib_key(p_bank, p_branch, p_account))
         || p_bank || p_branch || p_account || sim.rib_key(p_bank, p_branch, p_account)
$$;

-- Deterministic digits from a seed text.
create function sim.digits(p_seed text, p_n int) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lpad((('x' || substr(md5(p_seed), 1, 15))::bit(60)::bigint % (10::numeric ^ p_n)::bigint)::text, p_n, '0')
$$;

-- Currency zone of a country: 'uemoa' | 'cemac' | 'other'.
create function sim.zone(p_country text) returns text
language sql stable set search_path = '' as $$
  select case when p.profile_id in ('SN','CI','UEMOA') then 'uemoa'
              when p.profile_id in ('CM','CEMAC') then 'cemac' else 'other' end
  from (select (select profile_id from ref.countries where iso2 = p_country) as profile_id) p
$$;

-- ── simulated entries ────────────────────────────────────────────────────
create function sim.signed(p_entry jsonb) returns bigint
language sql immutable parallel safe set search_path = '' as $$
  select case when p_entry ->> 'creditDebit' = 'CRDT' then (p_entry ->> 'amountMinor')::bigint
              else -(p_entry ->> 'amountMinor')::bigint - coalesce((p_entry #>> '{charges,amountMinor}')::bigint, 0) end
$$;

-- Raw rows (template + per-link extras) of one link account with offset in (p_from, p_to].
create function sim.link_rows(p_link uuid, p_key text, p_from bigint, p_to bigint)
returns table (seq int, offset_s bigint, entry jsonb, scenario_tag text, expected_band text, balance_after bigint)
language sql stable set search_path = '' as $$
  with l as (
    select sl.template_id, ta.opening_balance_minor ob
    from sim.links sl join sim.template_accounts ta on ta.template_id = sl.template_id and ta.key = p_key
    where sl.link_id = p_link
  ), x as (
    select x.seq, x.offset_s, x.entry, x.scenario_tag, x.expected_band, sim.signed(x.entry) sg
    from sim.link_entries x where x.link_id = p_link and x.account_key = p_key
  )
  select e.seq, e.offset_s, e.entry, e.scenario_tag, e.expected_band,
         l.ob + e.cum_minor + coalesce((select sum(x.sg) from x where x.offset_s <= e.offset_s), 0)::bigint
  from l join sim.template_entries e
    on e.template_id = l.template_id and e.account_key = p_key and e.offset_s > p_from and e.offset_s <= p_to
  union all
  select x.seq, x.offset_s, x.entry, x.scenario_tag, x.expected_band,
         l.ob + coalesce((select e.cum_minor from sim.template_entries e
                          where e.template_id = l.template_id and e.account_key = p_key and e.offset_s <= x.offset_s
                          order by e.offset_s desc, e.seq desc limit 1), 0)
              + (select sum(y.sg) from x y where y.offset_s <= x.offset_s)::bigint
  from l cross join x where x.offset_s > p_from and x.offset_s <= p_to
$$;

-- Full ProviderEntry (ARCHITECTURE §3.1) from a raw row.
create function sim.provider_entry(p_link uuid, p_key text, p_seq int, p_offset bigint, p_entry jsonb,
                                   p_balance_after bigint, p_anchor timestamptz, p_tz text, p_institution text)
returns jsonb language sql immutable parallel safe set search_path = '' as $$
  select p_entry || jsonb_build_object(
      'providerEntryId', substr(p_link::text, 1, 8) || '-' || p_key || '-' || case when p_seq >= 1000000 then 'X' else 'S' end || p_seq,
      'accountId', p_key,
      'bookingTs', to_char((p_anchor + make_interval(secs => p_offset)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'valueDate', to_char(((p_anchor + make_interval(secs => p_offset)) at time zone p_tz)::date, 'YYYY-MM-DD'))
    || case when p_entry ? 'momo' then jsonb_build_object('momo', (p_entry -> 'momo') || jsonb_build_object(
           'operator', case when p_entry #>> '{momo,operator}' = '*' then p_institution else p_entry #>> '{momo,operator}' end,
           'operatorRef', upper(substr(md5(p_link::text || p_key || p_seq), 1, 10)),
           'balanceAfterMinor', p_balance_after))
       else jsonb_build_object('acctSvcrRef', 'SIM' || upper(substr(md5(p_link::text || p_key || p_seq), 1, 12)))
            || case when p_entry #>> '{bankTxCode,family}' in ('ICDT','RCDT')
                    then jsonb_build_object('endToEndId', 'E2E' || upper(substr(md5('e2e' || p_link::text || p_key || p_seq), 1, 16)))
                    else '{}'::jsonb end
     end
$$;

-- Link context (anchor, zone, institution).
create function sim.link_ctx(p_link uuid, out anchor_at timestamptz, out tz text, out institution text,
                             out template_id text, out account_keys text[], out delivered_until timestamptz,
                             out user_id uuid)
language sql stable set search_path = '' as $$
  select l.anchor_at, pr.timezone, p.institution, l.template_id, l.account_keys, l.delivered_until, p.user_id
  from sim.links l join core.provider_links p on p.id = l.link_id join core.profiles pr on pr.user_id = p.user_id
  where l.link_id = p_link
$$;

-- ProviderEntry[] of one link account in (p_from_ts, p_to_ts], oldest first.
create function sim.entries_between(p_link uuid, p_key text, p_from_ts timestamptz, p_to_ts timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(sim.provider_entry(p_link, p_key, r.seq, r.offset_s, r.entry, r.balance_after,
                                               c.anchor_at, c.tz, c.institution) order by r.offset_s, r.seq), '[]')
  from sim.link_ctx(p_link) c,
       sim.link_rows(p_link, p_key,
         floor(extract(epoch from p_from_ts - c.anchor_at))::bigint,
         floor(extract(epoch from p_to_ts - c.anchor_at))::bigint) r
$$;

-- Security events of a link in (p_from_ts, p_to_ts] as provider events.
create function sim.security_between(p_link uuid, p_from_ts timestamptz, p_to_ts timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  with c as (select * from sim.link_ctx(p_link)),
  ev as (
    select s.seq, s.offset_s, s.type, s.details from c join sim.template_security_events s
      on s.template_id = c.template_id and (s.details ->> 'accountKey') = any(c.account_keys)
    union all
    select s.seq, s.offset_s, s.type, s.details from sim.link_security_events s where s.link_id = p_link
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'providerEventId', substr(p_link::text, 1, 8) || '-' || case when ev.seq >= 1000000 then 'X' else 'S' end || ev.seq,
      'type', ev.type,
      'at', to_char((c.anchor_at + make_interval(secs => ev.offset_s)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'details', ev.details) order by ev.offset_s), '[]')
  from c cross join ev
  where c.anchor_at + make_interval(secs => ev.offset_s) > p_from_ts
    and c.anchor_at + make_interval(secs => ev.offset_s) <= p_to_ts
$$;

-- Balance of a link account at a time (opening + everything booked until then).
create function sim.balance(p_link uuid, p_key text, p_at timestamptz) returns bigint
language sql stable set search_path = '' as $$
  select ta.opening_balance_minor
         + coalesce((select e.cum_minor from sim.template_entries e
                     where e.template_id = l.template_id and e.account_key = p_key
                       and e.offset_s <= floor(extract(epoch from p_at - l.anchor_at))
                     order by e.offset_s desc, e.seq desc limit 1), 0)
         + coalesce((select sum(sim.signed(x.entry)) from sim.link_entries x
                     where x.link_id = p_link and x.account_key = p_key
                       and x.offset_s <= floor(extract(epoch from p_at - l.anchor_at))), 0)::bigint
  from sim.links l join sim.template_accounts ta on ta.template_id = l.template_id and ta.key = p_key
  where l.link_id = p_link
$$;

-- Anything due for a link in (delivered_until, p_now]?
create function sim.link_has_due(p_link uuid, p_now timestamptz) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from sim.template_entries e
                 where e.template_id = l.template_id and e.account_key = any(l.account_keys)
                   and e.offset_s > floor(extract(epoch from l.delivered_until - l.anchor_at))
                   and e.offset_s <= floor(extract(epoch from p_now - l.anchor_at)))
      or exists (select 1 from sim.link_entries x where x.link_id = l.link_id
                   and x.offset_s > floor(extract(epoch from l.delivered_until - l.anchor_at))
                   and x.offset_s <= floor(extract(epoch from p_now - l.anchor_at)))
      or exists (select 1 from sim.template_security_events s
                 where s.template_id = l.template_id and (s.details ->> 'accountKey') = any(l.account_keys)
                   and s.offset_s > floor(extract(epoch from l.delivered_until - l.anchor_at))
                   and s.offset_s <= floor(extract(epoch from p_now - l.anchor_at)))
      or exists (select 1 from sim.link_security_events s where s.link_id = l.link_id
                   and s.offset_s > floor(extract(epoch from l.delivered_until - l.anchor_at))
                   and s.offset_s <= floor(extract(epoch from p_now - l.anchor_at)))
  from sim.links l where l.link_id = p_link
$$;

-- Most recent local Monday 00:00 (weekday-aligned anchor, see generator docstring).
create function sim.anchor_for(p_tz text, p_now timestamptz default now()) returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('week', p_now at time zone p_tz) at time zone p_tz
$$;

-- The user's own account identifiers (deterministic from template + key + user).
create function sim.account_identity(p_template text, p_key text, p_user uuid, p_kind text, p_institution text,
                                     p_currency text, p_country text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_seed text := p_template || ':' || p_key || ':' || p_user::text;
  v_bank ref.banks; v_ctry text; v_code text; v_dial text; v_msisdn text;
begin
  if p_kind = 'bank' then
    select * into v_bank from ref.banks where id = p_institution;
    v_ctry := v_bank.country; v_code := v_bank.iban_bank_code;
    if v_code is null then                                   -- bank_demo: zone of the currency
      v_ctry := case p_currency when 'XOF' then 'SN' when 'XAF' then 'CM' else 'FR' end;
      v_code := case p_currency when 'XOF' then 'SN900' when 'XAF' then '10900' else '99900' end;
    end if;
    return jsonb_build_object('iban', sim.iban(v_ctry, v_code, '00101',
             sim.digits(v_seed, case when sim.zone(v_ctry) = 'uemoa' then 12 else 11 end)),
           'bic', v_bank.bic);
  end if;
  v_ctry := case when p_currency = 'XOF' and sim.zone(p_country) <> 'uemoa' then 'SN'
                 when p_currency = 'XAF' and sim.zone(p_country) <> 'cemac' then 'CM' else p_country end;
  v_dial := coalesce((select dial_code from ref.countries where iso2 = v_ctry), '+221');
  v_msisdn := v_dial || '99' || sim.digits(v_seed, 7);
  return jsonb_build_object('msisdn', v_msisdn,
    'msisdnMasked', v_dial || ' 99 ••• •• ' || right(v_msisdn, 2));
end $$;

-- Template for a newly linked institution (account profiles).
create function sim.pick_template(p_institution text, p_country text, p_options jsonb) returns text
language plpgsql stable set search_path = '' as $$
declare v_zone text;
begin
  if exists (select 1 from ref.banks where id = p_institution) then
    v_zone := coalesce(sim.zone((select country from ref.banks where id = p_institution and country is not null)),
                       sim.zone(p_country));
    return case v_zone when 'uemoa' then 'acct_bank_uemoa' when 'cemac' then 'acct_bank_cemac' else 'acct_bank_eur' end;
  elsif exists (select 1 from ref.operators where id = p_institution) then
    v_zone := case sim.zone(p_country) when 'cemac' then 'cemac' else 'uemoa' end;
    return case when coalesce((p_options ->> 'new_wallet')::boolean, false) then 'new_wallet_' else 'acct_momo_' end
           || v_zone;
  end if;
  return null;
end $$;

-- ── api: provider RPCs for Edge Functions (service role only) ─────────────
-- Generic (any adapter): accounts, ingest, balances, link status.

create function api.provider_link_get(p_user_id uuid, p_link_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'adapter', p.adapter, 'institution', p.institution, 'status', p.status,
    'scopes', to_jsonb(p.scopes), 'history_days', p.history_days, 'options', p.options,
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'provider_account_id', a.provider_account_id))
                          from core.accounts a where a.link_id = p.id), '[]'))
  from core.provider_links p where p.id = p_link_id and p.user_id = p_user_id
$$;

-- Active links of a user (optionally only those holding p_account_ids).
create function api.provider_user_links(p_user_id uuid, p_account_ids uuid[] default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'adapter', p.adapter, 'institution', p.institution,
    'accounts', (select jsonb_agg(jsonb_build_object('id', a.id, 'provider_account_id', a.provider_account_id))
                 from core.accounts a where a.link_id = p.id
                   and (p_account_ids is null or a.id = any(p_account_ids))))), '[]')
  from core.provider_links p
  where p.user_id = p_user_id and p.status = 'active'
    and (p_account_ids is null or exists (select 1 from core.accounts a where a.link_id = p.id and a.id = any(p_account_ids)))
$$;

-- Create/refresh the app accounts of a link from ProviderAccount[] and activate the link.
-- p_accounts: [{providerAccountId, kind, institution, currency, displayName, iban?, bic?, msisdnMasked?, historyAvailable?}]
create function api.provider_accounts_upsert(p_user_id uuid, p_link_id uuid, p_accounts jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from core.provider_links where id = p_link_id and user_id = p_user_id) then
    perform core.api_error('NOT_FOUND', 'link.not_found');
  end if;
  insert into core.accounts as a (user_id, link_id, kind, provider_account_id, display_name, institution, currency,
                                  iban, bic, bank_id, operator, msisdn_masked, history_available)
  select p_user_id, p_link_id, x ->> 'kind', x ->> 'providerAccountId', x ->> 'displayName', x ->> 'institution',
         x ->> 'currency', x ->> 'iban', x ->> 'bic',
         case when x ->> 'kind' = 'bank' then (select id from ref.banks where id = x ->> 'institution') end,
         case when x ->> 'kind' = 'momo' then (select id from ref.operators where id = x ->> 'institution') end,
         x ->> 'msisdnMasked', coalesce((x ->> 'historyAvailable')::boolean, true)
  from jsonb_array_elements(p_accounts) x
  on conflict (link_id, provider_account_id) do update
    set display_name = excluded.display_name, history_available = excluded.history_available;
  update core.provider_links set status = 'active' where id = p_link_id and status = 'pending';
  return (select jsonb_agg(jsonb_build_object('id', a.id, 'provider_account_id', a.provider_account_id,
            'kind', a.kind, 'display_name', a.display_name, 'institution', a.institution, 'currency', a.currency)
            order by a.created_at, a.provider_account_id)
          from core.accounts a where a.link_id = p_link_id);
end $$;

create function api.provider_ingest(p_user_id uuid, p_account_id uuid, p_entries jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  select core.ingest_entries(p_user_id, p_account_id, p_entries)
$$;

create function api.provider_ingest_security(p_user_id uuid, p_events jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('inserted', core.ingest_security_events(p_user_id, p_events))
$$;

-- p_balances: [{accountId (provider id), amountMinor, currency, at}]
create function api.provider_set_balances(p_user_id uuid, p_link_id uuid, p_balances jsonb) returns jsonb
language sql security definer set search_path = '' as $$
  with u as (
    update core.accounts a set balance_minor = (b ->> 'amountMinor')::bigint, balance_at = (b ->> 'at')::timestamptz,
                               last_sync_at = now()
    from jsonb_array_elements(p_balances) b
    where a.link_id = p_link_id and a.user_id = p_user_id and a.provider_account_id = b ->> 'accountId'
    returning a.id, a.balance_minor, a.currency
  )
  select coalesce(jsonb_agg(jsonb_build_object('account_id', id, 'balance', jsonb_build_object('m', balance_minor, 'c', currency))), '[]') from u
$$;

create function api.provider_link_revoke(p_user_id uuid, p_link_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  update core.provider_links set status = 'revoked' where id = p_link_id and user_id = p_user_id
  returning jsonb_build_object('ok', true)
$$;

-- Simulated adapter (sim.*) behind the same contract.
create function api.sim_link_start(p_user_id uuid, p_institution text, p_scopes text[], p_country text,
                                   p_options jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_name text; v_tid text; v_id uuid; v_country text;
begin
  v_name := coalesce((select name from ref.banks where id = p_institution), (select name from ref.operators where id = p_institution));
  if v_name is null then perform core.api_error('INVALID', 'link.unknown_institution'); end if;
  if not exists (select 1 from core.profiles where user_id = p_user_id) then perform core.api_error('NOT_FOUND', 'profile.not_found'); end if;
  v_country := coalesce(p_country, (select country from core.profiles where user_id = p_user_id));
  v_tid := sim.pick_template(p_institution, v_country, coalesce(p_options, '{}'));
  if v_tid is null or not exists (select 1 from sim.templates where id = v_tid) then
    perform core.api_error('REJECTED', 'link.no_template');
  end if;
  if (select count(*) from core.provider_links where user_id = p_user_id and status in ('pending','active')) >= 8 then
    perform core.api_error('REJECTED', 'link.too_many');
  end if;
  insert into core.provider_links (user_id, adapter, institution, scopes, status, history_days, template_id, options)
  values (p_user_id, 'sim', p_institution, coalesce(p_scopes, '{balances,transactions}'), 'pending',
          case when v_tid like 'new_wallet%' then 0 else 365 end, v_tid, coalesce(p_options, '{}'))
  returning id into v_id;
  return jsonb_build_object('link_id', v_id, 'consent', jsonb_build_object(
    'institution', p_institution, 'institution_name', v_name, 'scopes', to_jsonb(coalesce(p_scopes, '{balances,transactions}')),
    'history_days', case when v_tid like 'new_wallet%' then 0 else 365 end, 'simulated', true));
end $$;

-- Consent approved: anchor the template, return ProviderAccount[].
create function api.sim_link_complete(p_user_id uuid, p_link_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_link core.provider_links; v_prof core.profiles; v_keys text[]; v_now timestamptz := now();
begin
  select * into v_link from core.provider_links where id = p_link_id and user_id = p_user_id and adapter = 'sim';
  if not found then perform core.api_error('NOT_FOUND', 'link.not_found'); end if;
  if v_link.status <> 'pending' then perform core.api_error('CONFLICT', 'link.not_pending'); end if;
  select * into v_prof from core.profiles where user_id = p_user_id;
  select array_agg(key order by key) into v_keys from sim.template_accounts where template_id = v_link.template_id;
  insert into sim.links (link_id, template_id, account_keys, anchor_at, delivered_until)
  values (p_link_id, v_link.template_id, v_keys, sim.anchor_for(v_prof.timezone, v_now), v_now);
  return sim.provider_accounts(p_link_id);
end $$;

create function sim.provider_accounts(p_link uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_agg(jsonb_build_object(
      'providerAccountId', ta.key, 'kind', ta.kind, 'institution', p.institution, 'currency', ta.currency,
      'displayName', case when ta.kind = 'bank'
                          then case ta.currency when 'EUR' then 'Compte courant (EUR)' else 'Compte courant' end
                          else coalesce((select name from ref.operators where id = p.institution), 'Mobile money') end,
      'historyAvailable', p.history_days > 0)
    || sim.account_identity(l.template_id, ta.key, p.user_id, ta.kind, p.institution, ta.currency, pr.country)
    order by ta.key)
  from sim.links l join core.provider_links p on p.id = l.link_id
  join core.profiles pr on pr.user_id = p.user_id
  join sim.template_accounts ta on ta.template_id = l.template_id and ta.key = any(l.account_keys)
  where l.link_id = p_link
$$;

-- listEntries: newest first, keyset cursor "<offset>:<seq>", only entries booked by now.
create function api.sim_list_entries(p_link_id uuid, p_account_id text, p_cursor text default null,
                                     p_booked_from timestamptz default null, p_page_size int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c record; v_to bigint; v_from bigint; v_coff bigint; v_cseq int; v_page jsonb; v_n int; v_loff bigint; v_lseq int;
  v_size int := least(greatest(coalesce(p_page_size, 200), 1), 500);
begin
  select * into c from sim.link_ctx(p_link_id);
  if c.anchor_at is null then perform core.api_error('NOT_FOUND', 'link.not_found'); end if;
  if not p_account_id = any(c.account_keys) then perform core.api_error('NOT_FOUND', 'account.not_found'); end if;
  v_to := floor(extract(epoch from now() - c.anchor_at));
  v_from := case when p_booked_from is null then -9223372036854775807
                 else floor(extract(epoch from p_booked_from - c.anchor_at)) - 1 end;
  if p_cursor is not null then
    if p_cursor !~ '^-?[0-9]+:[0-9]+$' then perform core.api_error('INVALID', 'cursor.invalid'); end if;
    v_coff := split_part(p_cursor, ':', 1)::bigint; v_cseq := split_part(p_cursor, ':', 2)::int;
  end if;
  with r as (
    select * from sim.link_rows(p_link_id, p_account_id, v_from, v_to) r
    where p_cursor is null or (r.offset_s, r.seq) < (v_coff, v_cseq)
    order by r.offset_s desc, r.seq desc limit v_size + 1
  ), page as (select * from r order by offset_s desc, seq desc limit v_size)
  select jsonb_agg(sim.provider_entry(p_link_id, p_account_id, seq, offset_s, entry, balance_after, c.anchor_at,
                                      c.tz, c.institution) order by offset_s desc, seq desc),
         (select count(*) from r),
         (select p.offset_s from page p order by p.offset_s, p.seq limit 1),
         (select p.seq from page p order by p.offset_s, p.seq limit 1)
    into v_page, v_n, v_loff, v_lseq
  from page;
  return jsonb_build_object('entries', coalesce(v_page, '[]'),
    'next_cursor', case when v_n > v_size then v_loff || ':' || v_lseq end);
end $$;

create function api.sim_balances(p_link_id uuid, p_account_ids text[] default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('accountId', ta.key, 'amountMinor', sim.balance(l.link_id, ta.key, now()),
                                               'currency', ta.currency,
                                               'at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
                            order by ta.key), '[]')
  from sim.links l join sim.template_accounts ta on ta.template_id = l.template_id and ta.key = any(l.account_keys)
  where l.link_id = p_link_id and (p_account_ids is null or ta.key = any(p_account_ids))
$$;

create function api.sim_security_events(p_link_id uuid, p_since timestamptz default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select sim.security_between(p_link_id, coalesce(p_since, '-infinity'::timestamptz), now())
$$;

create function api.sim_revoke(p_link_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  -- nothing to revoke at a simulated bank; core.provider_links.status is the switch
  select jsonb_build_object('ok', exists (select 1 from sim.links where link_id = p_link_id))
$$;

-- Time passing (provider-tick): due entries since the watermark, per link.
-- Returns [{link_id, user_id, until, accounts:[{account_id, provider_account_id, entries}], security_events}].
create function api.sim_tick_collect(p_link_ids uuid[] default null, p_max_links int default 50) returns jsonb
language sql stable security definer set search_path = '' as $$
  with now_ as (select now() as t),
  due as (
    select l.link_id, p.user_id, l.delivered_until from sim.links l
    join core.provider_links p on p.id = l.link_id and p.status = 'active', now_
    where (p_link_ids is null or l.link_id = any(p_link_ids)) and sim.link_has_due(l.link_id, now_.t)
    order by l.delivered_until limit greatest(coalesce(p_max_links, 50), 1)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'link_id', d.link_id, 'user_id', d.user_id,
    'until', to_char(n.t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'accounts', (select coalesce(jsonb_agg(jsonb_build_object('account_id', a.id, 'provider_account_id', a.provider_account_id,
                   'entries', sim.entries_between(d.link_id, a.provider_account_id, d.delivered_until, n.t))), '[]')
                 from core.accounts a where a.link_id = d.link_id),
    'security_events', sim.security_between(d.link_id, d.delivered_until, n.t))), '[]')
  from due d, now_ n
$$;

-- Watermark + balances after a successful delivery.
create function api.sim_tick_ack(p_link_id uuid, p_until timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update sim.links set delivered_until = greatest(delivered_until, p_until) where link_id = p_link_id;
  update core.accounts a set balance_minor = sim.balance(p_link_id, a.provider_account_id, p_until),
                             balance_at = p_until, last_sync_at = now()
  where a.link_id = p_link_id;
  return jsonb_build_object('ok', true);
end $$;

-- SQL-only delivery (fallback when the Edge Function URL/secret are not configured,
-- e.g. the local CI stack). Same result as provider-tick, without scoring hooks.
create function sim.deliver_due_sql(p_link_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; a jsonb; n int := 0;
begin
  for r in select jsonb_array_elements(api.sim_tick_collect(p_link_ids, 200)) loop
    for a in select jsonb_array_elements(r -> 'accounts') loop
      n := n + (core.ingest_entries((r ->> 'user_id')::uuid, (a ->> 'account_id')::uuid, a -> 'entries') ->> 'inserted')::int;
    end loop;
    perform core.ingest_security_events((r ->> 'user_id')::uuid, r -> 'security_events');
    perform api.sim_tick_ack((r ->> 'link_id')::uuid, (r ->> 'until')::timestamptz);
  end loop;
  return n;
end $$;

-- Cron shared secret (vault), checked by provider-tick / ingest / account-demo-cleanup.
create function api.cron_secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_secret is not null and length(p_secret) >= 32 and exists (
    select 1 from vault.decrypted_secrets where name = 'gp_cron_secret' and decrypted_secret = p_secret)
$$;

-- ── grants ───────────────────────────────────────────────────────────────
revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
revoke all on function api.provider_link_get(uuid, uuid), api.provider_user_links(uuid, uuid[]),
  api.provider_accounts_upsert(uuid, uuid, jsonb), api.provider_ingest(uuid, uuid, jsonb),
  api.provider_ingest_security(uuid, jsonb), api.provider_set_balances(uuid, uuid, jsonb),
  api.provider_link_revoke(uuid, uuid), api.sim_link_start(uuid, text, text[], text, jsonb),
  api.sim_link_complete(uuid, uuid), api.sim_list_entries(uuid, text, text, timestamptz, int),
  api.sim_balances(uuid, text[]), api.sim_security_events(uuid, timestamptz), api.sim_revoke(uuid),
  api.sim_tick_collect(uuid[], int), api.sim_tick_ack(uuid, timestamptz), api.cron_secret_ok(text)
  from anon, authenticated;
grant execute on function api.provider_link_get(uuid, uuid), api.provider_user_links(uuid, uuid[]),
  api.provider_accounts_upsert(uuid, uuid, jsonb), api.provider_ingest(uuid, uuid, jsonb),
  api.provider_ingest_security(uuid, jsonb), api.provider_set_balances(uuid, uuid, jsonb),
  api.provider_link_revoke(uuid, uuid), api.sim_link_start(uuid, text, text[], text, jsonb),
  api.sim_link_complete(uuid, uuid), api.sim_list_entries(uuid, text, text, timestamptz, int),
  api.sim_balances(uuid, text[]), api.sim_security_events(uuid, timestamptz), api.sim_revoke(uuid),
  api.sim_tick_collect(uuid[], int), api.sim_tick_ack(uuid, timestamptz), api.cron_secret_ok(text)
  to service_role;
-- helpers used by other security definer functions keep owner rights; batch reads cp_key/norm_text
grant execute on function core.norm_text(text), core.cp_key(jsonb) to batch_writer, service_role;
