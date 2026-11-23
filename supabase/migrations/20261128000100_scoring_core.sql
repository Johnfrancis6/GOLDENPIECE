-- B5: scoring core (ARCHITECTURE §7). Everything runs in SQL so the Edge tick and
-- the SQL fallback tick score the same way, in the ingest transaction (one hop):
-- features (point in time, 180-day window) → A_thr, A_if (Isolation Forest trees
-- stored in ops.iforest_trees), F (rules R1-R6, ref.fraud_rules), M (context)
-- → S, band → core.scores (+ core.alerts, notification in 20261128000200).

-- ── fraud rules (sources checked 2026-11-23, see docs/CHAIN_LOG.md B5) ──────
insert into ref.fraud_rules (id, version, scheme, name_fr, name_en, explanation_fr, explanation_en, params, weight,
                             w_min, w_max, source_title, source_url, source_date) values
('R1', 1, 'sim_swap_takeover', 'Changement de SIM puis envoi important', 'SIM swap then large payment',
 'Carte SIM ou téléphone changé il y a moins de 24 h, puis envoi important',
 'SIM card or phone changed less than 24 h ago, then a large payment',
 '{"window_h": 24, "balance_share": 0.25}', 72, 57, 87,
 'GSMA, Mobile money fraud typologies and mitigation strategies (March 2024), §4.4.1 "SIM swap and account takeover fraud", p. 20',
 'https://www.gsma.com/mobilefordevelopment/wp-content/uploads/2024/03/GSMA-Fraud-Typologies-04-03-24.pdf', '2024-03-04'),
('R2', 1, 'credential_change_drain', 'Accès modifiés puis nouveau bénéficiaire', 'Credentials changed then new payee',
 'Mot de passe ou e-mail changé il y a moins de 24 h, puis nouveau bénéficiaire',
 'Password or email changed less than 24 h ago, then a new payee',
 '{"window_h": 24, "amount_pct": 0.95}', 35, 20, 50,
 'GSMA, Mobile money fraud typologies and mitigation strategies (March 2024), §4.4.1 account takeover (credentials obtained, account accessed, funds transferred), p. 20',
 'https://www.gsma.com/mobilefordevelopment/wp-content/uploads/2024/03/GSMA-Fraud-Typologies-04-03-24.pdf', '2024-03-04'),
('R3', 1, 'fake_deposit', 'Argent reçu puis renvoyé', 'Money received then sent back',
 'Argent reçu puis renvoyé à la même personne, comme dans l''arnaque au « transfert par erreur »',
 'Money received then sent back to the same person, as in the "wrong transfer" scam',
 '{"window_min": 30, "amount_ratio_min": 0.8, "amount_ratio_max": 1.2}', 40, 25, 55,
 'Police nationale du Burkina Faso via Wakat Séra, « Arnaques via Orange money au Burkina : plus de 60 plaintes » (message « transfert reçu » puis demande de renvoi), 22 July 2020',
 'https://www.wakatsera.com/arnaques-via-orange-money-au-burkina-plus-de-60-plaintes-de-pres-de-70-millions-f-cfa-de-prejudice/', '2020-07-22'),
('R4', 1, 'mule_account', 'Argent qui ne fait que passer', 'Money passing through',
 'Argent reçu de nombreuses personnes puis vite renvoyé', 'Money received from many people and quickly sent on',
 '{"fan_in_24h": 5, "pass_through": 0.8, "pass_window_h": 4}', 72, 57, 87,
 'GSMA, Mobile money fraud typologies and mitigation strategies (March 2024), money mules as exit channel, pp. 14 and 34',
 'https://www.gsma.com/mobilefordevelopment/wp-content/uploads/2024/03/GSMA-Fraud-Typologies-04-03-24.pdf', '2024-03-04'),
('R5', 1, 'fake_investment', 'Possible faux placement', 'Possible fake investment',
 'Envois de plus en plus élevés à un bénéficiaire qui promet des gains', 'Growing payments to a payee promising returns',
 '{"payee_age_days": 30, "min_payments": 3, "window_days": 14}', 45, 30, 60,
 'AMF-UMOA campaign of 5 December 2022 against unauthorised high-return offers (SCOOP CA BA, Unmanis, CI-COP Invest Transport), reported by Droit Médias Finance',
 'https://droitmediasfinance.com/index.php/actualites/droit-des-marches-financiers/426-uemoa-l-amf-uemoa-met-le-public-en-garde-contre-les-investissements-a-haut-risque-de-scoop-caba-unmanis-et-ci-cop-invest-transport',
 '2022-12-11'),
('R6', 1, 'night_cash_out_new_device', 'Retrait de nuit, nouveau téléphone', 'Night withdrawal, new phone',
 'Retrait d''espèces la nuit depuis un téléphone ajouté il y a moins de 24 h',
 'Night cash withdrawal from a phone added less than 24 h ago',
 '{"from_h": 0, "to_h": 5, "device_age_h": 24}', 25, 10, 40,
 'GSMA, Mobile money fraud typologies and mitigation strategies (March 2024), §4.4.1 (taken-over account, funds withdrawn at an agent outlet), p. 20; night window and device age are GOLDENPIECE thresholds',
 'https://www.gsma.com/mobilefordevelopment/wp-content/uploads/2024/03/GSMA-Fraud-Typologies-04-03-24.pdf', '2024-03-04');

-- ── tunable parameters (bands 40/70 never move: they are constants) ───────
insert into ops.scoring_params (key, scope, value, default_value, min_value, max_value) values
  ('z0', 'global', 2.5, 2.5, 2, 4),
  ('z1', 'global', 4.5, 4.5, 4, 7),
  ('mad_floor', 'global', 0.15, 0.15, 0.05, 0.5),
  ('hour_r0', 'global', 0.95, 0.95, 0.85, 0.98),
  ('check_cap', 'global', 0.65, 0.65, 0.5, 1),
  ('min_amount_eur', 'global', 8, 8, 0, 30),                 -- anomaly checks skip smaller payments
  ('x0', 'global', 4, 4, 3, 8),                               -- amount ratio check (with the robust z)
  ('x1', 'global', 12, 12, 8, 30),
  ('ratio_r0', 'global', 1.5, 1.5, 1.2, 3),
  ('new_payee_s', 'global', 0.25, 0.25, 0, 0.4),
  ('if_weight', 'global', 0.7, 0.7, 0, 1),
  ('bump:no_lock', 'global', 0.10, 0.10, 0, 0.2),
  ('bump:weak_biometric', 'global', 0.05, 0.05, 0, 0.2),
  ('bump:new_device', 'global', 0.10, 0.10, 0, 0.2),
  ('bump:amount_large', 'global', 0.10, 0.10, 0, 0.2),
  ('bump:integrity_fail', 'global', 0, 0, 0, 0.15)            -- inactive (S2-5)
on conflict do nothing;
insert into ops.scoring_params (key, scope, value, default_value, min_value, max_value)
select 'w:' || id, 'global', weight, weight, w_min, w_max from ref.fraud_rules where version = 1
on conflict do nothing;

create table core.known_payees (                              -- "Oui, c'est moi" (§7.5)
  user_id uuid not null references core.profiles on delete cascade,
  cp_key text not null,
  added_at timestamptz not null default now(),
  alert_id uuid,
  primary key (user_id, cp_key)
);
alter table core.known_payees enable row level security;
grant select on core.known_payees to authenticated;
create policy own_select on core.known_payees for select to authenticated using (user_id = (select auth.uid()));

-- Isolation Forest trees (exported by batch/goldenpiece/ml/iforest.py; same arrays as
-- the JSON export of ARCHITECTURE §7.6 plus `value` = path length of each leaf as
-- sklearn computes it: (depth + 1) + c(n_leaf) − 1).
create table ops.iforest_trees (
  version text not null,
  tree int not null,
  feature int[] not null,
  threshold float8[] not null,
  left_child int[] not null,
  right_child int[] not null,
  value float8[] not null,
  primary key (version, tree)
);
alter table ops.model_artifacts add column if not exists meta jsonb;   -- q50, q999, denominator, mean, std
grant select, insert, delete on ops.iforest_trees to batch_writer;
grant delete on ops.model_artifacts to batch_writer;
alter table ops.iforest_trees enable row level security;

-- ── helpers ─────────────────────────────────────────────────────────────
create function core.med(a float8[]) returns float8
language plpgsql immutable parallel safe as $$
declare b float8[]; n int := coalesce(cardinality(a), 0);
begin
  if n = 0 then return null; end if;
  b := array(select x from unnest(a) x order by x);
  return case when n % 2 = 1 then b[(n + 1) / 2] else (b[n / 2] + b[n / 2 + 1]) / 2 end;
end $$;

create function core.robust(a float8[], out n int, out med float8, out mad float8)
language plpgsql immutable parallel safe as $$
begin
  n := coalesce(cardinality(a), 0);
  if n = 0 then return; end if;
  med := core.med(a);
  mad := core.med(array(select abs(x - med) from unnest(a) x));
end $$;

create function core.clamp01(x float8) returns float8
language sql immutable parallel safe as $$ select greatest(0, least(1, coalesce(x, 0))) $$;

-- amount in EUR (float) for comparisons across a user's currencies
create function core.amount_eur(p_minor bigint, p_ccy text) returns float8
language sql stable parallel safe as $$
  select (p_minor / 10::numeric ^ core.ccy_exp(p_ccy) / core.per_eur(p_ccy))::float8
$$;

-- op group (f10, notification op_type): card | transfer | cash_out | p2p | merchant | other
create function core.op_group(p_op text, p_family text, p_sub text) returns text
language sql immutable parallel safe as $$
  select case
    when p_op in ('cash_out') then 'cash_out'
    when p_op in ('p2p_out', 'p2p_in') then 'p2p'
    when p_op in ('merchant', 'bill', 'airtime') then 'merchant'
    when p_op in ('bank_out', 'bank_in') then 'transfer'
    when p_op is not null then 'other'
    when p_family = 'CCRD' or p_sub = 'POSD' then 'card'
    when p_family = 'CNTR' or p_sub in ('CWDL') then 'cash_out'
    when p_family in ('ICDT', 'RCDT') or p_sub in ('ESCT', 'DMCT', 'BOOK', 'STDO', 'SDVA') then 'transfer'
    else 'other' end
$$;

-- Scored operations (§7.1): payments the user initiates. Bank charges, direct
-- debits and loan instalments are not scored (and not in the habit baselines).
create function core.is_scored(p_op text, p_family text) returns boolean
language sql immutable parallel safe as $$
  select case when p_op is not null then p_op in ('cash_out', 'p2p_out', 'merchant', 'bank_out', 'bill', 'airtime')
              else p_family in ('CCRD', 'ICDT', 'CNTR') end
$$;

-- one parameter value: user × category override, else global
create function core.param(p_key text, p_user uuid default null, p_category text default null) returns float8
language sql stable parallel safe set search_path = '' as $$
  select coalesce(
    (select value from ops.scoring_params where key = p_key and scope = 'user_category'
       and user_id = p_user and category_id = coalesce(p_category, '_')),
    (select value from ops.scoring_params where key = p_key and scope = 'global'))::float8
$$;

-- ── Isolation Forest inference (parity with sklearn score_samples, §7.6) ──
-- Returns s_if = 2^(−E[h]/c(max_samples)) ∈ (0,1] (sklearn returns −s_if).
-- Inputs are compared as float32 (sklearn casts X to float32 before the trees).
create function core.iforest_raw(p_version text, x float8[]) returns float8
language plpgsql stable set search_path = '' as $$
declare
  t record; node int; d float8 := 0; v_den float8;
  xf float8[] := array(select (v::real)::float8 from unnest(x) v);
begin
  select (meta ->> 'denominator')::float8 into v_den from ops.model_artifacts where version = p_version;
  if v_den is null then return null; end if;
  for t in select feature, threshold, left_child, right_child, value from ops.iforest_trees
           where version = p_version order by tree loop
    node := 1;                                      -- arrays are 1-based; children stored 0-based
    while t.left_child[node] <> -1 loop
      if xf[t.feature[node] + 1] <= t.threshold[node] then node := t.left_child[node] + 1;
      else node := t.right_child[node] + 1; end if;
    end loop;
    d := d + t.value[node];
  end loop;
  return power(2::float8, -(d / v_den));
end $$;

-- ── point-in-time features of one debit (§7.2) ───────────────────────────
-- Only rows booked before the transaction (and the transaction itself for
-- the 1 h / 24 h / 2 h counters) are read, so the same function scores live
-- entries and replays history for the evaluation (G7).
create function core.score_features(p_tx uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  t core.transactions; a core.accounts; m core.tx_momo; v_tz text;
  v_ts timestamptz; v_eur float8; v_ln float8; v_op text; v_grp text; v_fam text;
  v_local timestamp; v_hour int; v_dow int; v_text text;
  h record; pay record; cat record; fam record; usr record;
  v_z1 float8; v_z2 float8; v_lvl2 text; v_x1 float8; v_x2 float8; v_floor float8;
  v_bal bigint; v_bal_eur float8; v_dev record; v_sec record; v_first timestamptz; v_cnt int;
  v_known boolean; v_r5 record; v_r3 boolean;
  v_pass_h int := coalesce((select (params ->> 'pass_window_h')::int from ref.fraud_rules
                            where id = 'R4' and active order by version desc limit 1), 4);
begin
  select * into t from core.transactions where id = p_tx;
  if not found then return null; end if;
  select * into a from core.accounts where id = t.account_id;
  select * into m from core.tx_momo where transaction_id = p_tx;
  v_tz := coalesce((select timezone from core.profiles where user_id = t.user_id), 'UTC');
  v_ts := t.booking_ts;
  v_eur := greatest(core.amount_eur(t.amount_minor, t.currency), 0.01);
  v_ln := ln(v_eur);
  v_op := m.op_type;
  v_grp := core.op_group(v_op, t.btc_family, t.btc_subfamily);
  v_fam := coalesce('op:' || v_op, 'bt:' || coalesce(t.btc_family, '') || '.' || coalesce(t.btc_subfamily, ''));
  v_local := v_ts at time zone v_tz;
  v_hour := extract(hour from v_local)::int;
  v_dow := extract(isodow from v_local)::int;
  v_floor := core.param('mad_floor');

  -- one pass over the 180-day window (history + this row for the 1 h / 24 h / R4 counters)
  with w as materialized (
    select s.id, s.booking_ts, s.cp_key, s.category_id,
           s.cdt_dbt_ind = 'DBIT' and core.is_scored(sm.op_type, s.btc_family) dbit, s.cdt_dbt_ind = 'CRDT' crdt,
           core.amount_eur(s.amount_minor, s.currency) eur,
           coalesce('op:' || sm.op_type, 'bt:' || coalesce(s.btc_family, '') || '.' || coalesce(s.btc_subfamily, '')) wfam,
           (s.booking_ts at time zone v_tz) lts
    from core.transactions s left join core.tx_momo sm on sm.transaction_id = s.id
    where s.user_id = t.user_id and s.status = 'BOOK'
      and s.booking_ts >= v_ts - interval '180 days' and s.booking_ts <= v_ts
  ), hs as materialized (
    select w.*, ln(greatest(w.eur, 0.01)) l, extract(hour from w.lts)::int hr, extract(isodow from w.lts)::int dow
    from w where w.id <> t.id and w.booking_ts < v_ts
  )
  select
    (select array_agg(l) from hs where dbit and cp_key = t.cp_key) pay_l,
    (select array_agg(l) from hs where dbit and category_id = t.category_id) cat_l,
    (select array_agg(l) from hs where dbit and wfam = v_fam) fam_l,
    (select array_agg(l) from hs where dbit) usr_l,
    (select count(*) from hs where dbit) n_dbit,
    (select count(*) from hs where dbit and least(abs(hr - v_hour), 24 - abs(hr - v_hour)) <= 1) n_hour,
    (select count(*) from hs where dbit and dow = v_dow) n_dow,
    (select percentile_cont(0.95) within group (order by eur) from hs where dbit) p95_amt,
    (select percentile_cont(0.99) within group (order by eur) from hs where dbit) p99_amt,
    (select bool_or(cp_key = t.cp_key) from hs) any_payee,
    (select min(booking_ts) from hs where cp_key = t.cp_key) payee_first,
    (select percentile_cont(0.95) within group (order by c) from
       (select count(*) c from hs where dbit group by date_trunc('hour', booking_ts)) q) p95_hourly,
    (select percentile_cont(0.95) within group (order by d) from
       (select sum(eur) d from hs where dbit group by lts::date) q) p95_daily,
    (select count(*) from w where dbit and booking_ts > v_ts - interval '1 hour') n_1h,
    (select sum(eur) from w where dbit and booking_ts > v_ts - interval '24 hours') out_24h,
    (select count(distinct cp_key) from w where crdt and cp_key is not null
       and booking_ts > v_ts - interval '24 hours'
       and cp_key not in (select x.cp_key from hs x where x.cp_key is not null
                            and x.booking_ts <= v_ts - interval '24 hours')) fan_in,
    (select sum(eur) filter (where dbit) from w where booking_ts > v_ts - make_interval(hours => v_pass_h)) pt_out,
    (select sum(eur) filter (where crdt) from w where booking_ts > v_ts - make_interval(hours => v_pass_h)) pt_in
  into h;

  select * into pay from core.robust(h.pay_l);
  select * into cat from core.robust(h.cat_l);
  select * into fam from core.robust(h.fam_l);
  select * into usr from core.robust(h.usr_l);

  -- f1: vs this payee (n ≥ 5); f2: vs category, else same kind of operation, else user
  if pay.n >= 5 then
    v_z1 := (v_ln - pay.med) / (1.4826 * greatest(pay.mad, v_floor)); v_x1 := exp(v_ln - pay.med);
  end if;
  if t.category_id is not null and cat.n >= 5 then
    v_z2 := (v_ln - cat.med) / (1.4826 * greatest(cat.mad, v_floor)); v_x2 := exp(v_ln - cat.med); v_lvl2 := 'category';
  elsif fam.n >= 5 then
    v_z2 := (v_ln - fam.med) / (1.4826 * greatest(fam.mad, v_floor)); v_x2 := exp(v_ln - fam.med); v_lvl2 := 'op';
  elsif usr.n >= 5 then
    v_z2 := (v_ln - usr.med) / (1.4826 * greatest(usr.mad, v_floor)); v_x2 := exp(v_ln - usr.med); v_lvl2 := 'user';
  end if;

  -- balance before (account balance at balance_at, rolled to the booking time)
  if m.balance_after_minor is not null then
    v_bal := m.balance_after_minor + t.amount_minor + coalesce(t.charges_minor, 0);
  elsif a.balance_minor is not null then
    select a.balance_minor
           - coalesce(sum(case when s.cdt_dbt_ind = 'CRDT' then s.amount_minor else -s.amount_minor end)
                      filter (where s.booking_ts >= v_ts and s.booking_ts <= a.balance_at), 0)
           + coalesce(sum(case when s.cdt_dbt_ind = 'CRDT' then s.amount_minor else -s.amount_minor end)
                      filter (where s.booking_ts < v_ts and s.booking_ts > a.balance_at), 0)
      into v_bal
    from core.transactions s where s.account_id = a.id and s.status = 'BOOK';
  end if;
  v_bal_eur := case when v_bal is null then null else greatest(core.amount_eur(greatest(v_bal, 0), t.currency), 0) end;

  -- device as of the booking time (the user's latest registered, not revoked)
  select d.security_level, d.unlock_method, extract(epoch from v_ts - d.created_at) / 3600 age_h into v_dev
  from core.devices d where d.user_id = t.user_id and d.created_at <= v_ts
    and (d.revoked_at is null or d.revoked_at > v_ts)
  order by d.created_at desc limit 1;

  -- security events in the last 24 h
  select array_agg(distinct e.type) types,
         min(extract(epoch from v_ts - e.at) / 60) filter (where e.type in
           ('sim_swap','new_device','device_security_changed','password_changed','email_changed')) age_min
    into v_sec
  from core.security_events e where e.user_id = t.user_id and e.at <= v_ts and e.at > v_ts - interval '24 hours';

  select min(booking_ts), count(*) into v_first, v_cnt
  from core.transactions where user_id = t.user_id and status = 'BOOK' and booking_ts < v_ts;
  v_known := t.cp_key is not null and exists (select 1 from core.known_payees k
                                              where k.user_id = t.user_id and k.cp_key = t.cp_key and k.added_at <= now());
  v_text := core.norm_text(coalesce(t.remittance_info, '') || ' ' || coalesce(t.cp_name, ''));

  -- R3: credit from the same party within 30 min, similar amount (or "erreur" label within 24 h)
  v_r3 := t.cp_key is not null and exists (
    select 1 from core.transactions c where c.user_id = t.user_id and c.status = 'BOOK' and c.cdt_dbt_ind = 'CRDT'
      and c.cp_key = t.cp_key and c.booking_ts < v_ts
      and (   (c.booking_ts >= v_ts - interval '30 minutes'
               and t.amount_minor between 0.8 * c.amount_minor and 1.2 * c.amount_minor)
           or (c.booking_ts >= v_ts - interval '24 hours' and v_text ~ '(erreur|errone|renvoi|rembours)')));

  -- R5: ≥ 3 debits in 14 days to this payee, each ≥ the previous one
  select count(*) n, bool_and(coalesce(r.prev, 0) <= r.amount_minor) rising into v_r5
  from (select s.amount_minor, lag(s.amount_minor) over (order by s.booking_ts) prev
        from core.transactions s where s.user_id = t.user_id and s.status = 'BOOK' and s.cdt_dbt_ind = 'DBIT'
          and s.cp_key = t.cp_key and s.booking_ts > v_ts - interval '14 days' and s.booking_ts <= v_ts) r;

  return jsonb_build_object(
    'f1', round(v_z1::numeric, 4), 'x1', round(v_x1::numeric, 2),
    'f2', round(v_z2::numeric, 4), 'x2', round(v_x2::numeric, 2), 'f2_level', v_lvl2,
    'f3', case when t.cp_key is null or v_known or coalesce(h.any_payee, false) then 0 else 1 end,
    'f4', round((1 - case when h.n_dbit > 0 then h.n_hour::numeric / h.n_dbit else 0 end), 4),
    'f5', round((1 - case when h.n_dbit > 0 then h.n_dow::numeric / h.n_dbit else 0 end), 4),
    'f6', round((h.n_1h::numeric / greatest(1, coalesce(h.p95_hourly, 1))::numeric), 4),
    'n_1h', h.n_1h,
    'f7', round((h.out_24h / greatest(0.01, coalesce(h.p95_daily, v_eur)))::numeric, 4),
    'f8', case when v_bal_eur is null or v_bal_eur <= 0 then null else round((v_eur / v_bal_eur)::numeric, 4) end,
    'f9', case when a.kind = 'momo' then 'momo' else 'bank' end,
    'f10', v_grp,
    'f11', h.fan_in,
    'f12', round(case when coalesce(h.pt_in, 0) > 0 then (coalesce(h.pt_out, 0) / h.pt_in)::numeric else 0 end, 4),
    'f13', v_r3,
    'f14', round(v_sec.age_min::numeric, 1), 'sec_types', coalesce(to_jsonb(v_sec.types), '[]'),
    'f15', v_text ~ '(placement|trading|forex|rendement|crypto|doublement|investissement|bitcoin)'
           and coalesce(h.payee_first, v_ts) > v_ts - interval '30 days',
    'r5_n', v_r5.n, 'r5_rising', coalesce(v_r5.rising, false),
    'c1', v_dev.security_level, 'unlock', v_dev.unlock_method, 'c2', round(v_dev.age_h::numeric, 1),
    'c3', (v_bal_eur is not null and v_eur >= 0.5 * v_bal_eur) or (h.p99_amt is not null and h.n_dbit >= 20 and v_eur >= h.p99_amt),
    'c4', null,
    'p95_amount_eur', round(h.p95_amt::numeric, 2), 'amount_eur', round(v_eur::numeric, 2),
    'local_time', to_char(v_local, 'HH24:MI'), 'local_hour', v_hour, 'op', v_op, 'category', t.category_id,
    'learning', not (v_first is not null and v_ts - v_first >= interval '30 days' and v_cnt >= 30),
    'ops_count', v_cnt, 'first_op_at', v_first);
end $$;

-- Feature vector of the Isolation Forest (order = ops.model_artifacts.features).
create function core.if_vector(f jsonb) returns float8[]
language sql immutable parallel safe as $$
  select array[
    greatest(-10, least(10, coalesce((f ->> 'f1')::float8, 0))),
    greatest(-10, least(10, coalesce((f ->> 'f2')::float8, 0))),
    coalesce((f ->> 'f3')::float8, 0),
    coalesce((f ->> 'f4')::float8, 0),
    coalesce((f ->> 'f5')::float8, 0),
    least(20, coalesce((f ->> 'f6')::float8, 0)),
    least(20, coalesce((f ->> 'f7')::float8, 0)),
    least(5, coalesce((f ->> 'f8')::float8, 0)),
    case when f ->> 'f9' = 'momo' then 1 else 0 end,
    case when f ->> 'f10' = 'card' then 1 else 0 end,
    case when f ->> 'f10' = 'transfer' then 1 else 0 end,
    case when f ->> 'f10' = 'cash_out' then 1 else 0 end,
    case when f ->> 'f10' = 'p2p' then 1 else 0 end,
    case when f ->> 'f10' = 'merchant' then 1 else 0 end]::float8[]
$$;

-- ── score (§7.3-7.4) ─────────────────────────────────────────────────────
create function core.score_compute(p_tx uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  f jsonb; t core.transactions; v_cat text; v_z0 float8; v_z1 float8; v_x0 float8; v_x1 float8; v_r0 float8; v_h0 float8;
  s_amt float8 := 0; amt_reason jsonb; checks jsonb := '[]'; rules jsonb := '[]'; bumps jsonb := '[]';
  a_thr float8 := 0; a_if float8 := 0; v_f float8 := 0; v_m float8; v_a float8; v_s int; v_band text;
  s float8; w float8; r record; v_model record; v_raw float8; v_vec float8[]; v_top jsonb;
  v_rules_version text; v_learning boolean; v_sec jsonb;
begin
  f := core.score_features(p_tx);
  if f is null then return null; end if;
  select * into t from core.transactions where id = p_tx;
  v_cat := coalesce(t.category_id, '_');
  v_z0 := core.param('z0', t.user_id, v_cat); v_z1 := core.param('z1');
  v_x0 := core.param('x0') * (1 + (v_z0 - core.param('z0')) / 2); v_x1 := core.param('x1');   -- user z0 shifts x0 too
  v_r0 := core.param('ratio_r0'); v_h0 := core.param('hour_r0');
  v_learning := (f ->> 'learning')::boolean;
  v_sec := f -> 'sec_types';

  -- A_thr: amount (max of payee / category checks), new payee, hour, velocity, daily outflow
  if (f ->> 'f1') is not null then
    s := greatest(core.clamp01(((f ->> 'f1')::float8 - v_z0) / (v_z1 - v_z0)),
                  core.clamp01((ln((f ->> 'x1')::float8) - ln(v_x0)) / (ln(v_x1) - ln(v_x0))));
    if s > 0 then s_amt := s; amt_reason := jsonb_build_object('code', 'AMOUNT_VS_PAYEE',
        'params', jsonb_build_object('x', round((f ->> 'x1')::numeric))); end if;
  end if;
  if (f ->> 'f2') is not null then
    s := greatest(core.clamp01(((f ->> 'f2')::float8 - v_z0) / (v_z1 - v_z0)),
                  core.clamp01((ln(greatest((f ->> 'x2')::float8, 1e-6)) - ln(v_x0)) / (ln(v_x1) - ln(v_x0))));
    if s > s_amt then s_amt := s; amt_reason := jsonb_build_object('code', 'AMOUNT_VS_CATEGORY',
        'params', jsonb_build_object('x', round((f ->> 'x2')::numeric), 'category', f ->> 'category')); end if;
  end if;
  if s_amt > 0 then checks := checks || jsonb_build_array(amt_reason || jsonb_build_object('s', s_amt)); end if;
  if (f ->> 'f3')::int = 1 then
    checks := checks || jsonb_build_array(jsonb_build_object('code', 'NEW_PAYEE', 'params', '{}'::jsonb,
                                                             's', core.param('new_payee_s')));
  end if;
  s := core.clamp01(((f ->> 'f4')::float8 - v_h0) / (1 - v_h0 - 0.01));
  if s > 0 then checks := checks || jsonb_build_array(jsonb_build_object('code', 'UNUSUAL_HOUR',
      'params', jsonb_build_object('time', f ->> 'local_time'), 's', s)); end if;
  s := core.clamp01(((f ->> 'f6')::float8 - v_r0) / v_r0);
  if s > 0 then checks := checks || jsonb_build_array(jsonb_build_object('code', 'VELOCITY',
      'params', jsonb_build_object('n', (f ->> 'n_1h')::int), 's', s)); end if;
  s := core.clamp01(((f ->> 'f7')::float8 - v_r0) / v_r0);
  if s > 0 then checks := checks || jsonb_build_array(jsonb_build_object('code', 'DAILY_OUTFLOW',
      'params', jsonb_build_object('x', round((f ->> 'f7')::numeric)), 's', s)); end if;
  -- one check alone stays below the bank band (cap), two strong ones reach it
  select 1 - coalesce(exp(sum(ln(greatest(1e-12, 1 - least((c ->> 's')::float8, core.param('check_cap')))))), 1)
    into a_thr from jsonb_array_elements(checks) c;

  -- A_if (active model only)
  select version, features, meta into v_model from ops.model_artifacts where kind = 'iforest' and status = 'active';
  if v_model.version is not null then
    v_vec := core.if_vector(f);
    v_raw := core.iforest_raw(v_model.version, v_vec);
    a_if := core.clamp01((v_raw - (v_model.meta ->> 'q50')::float8)
                         / ((v_model.meta ->> 'q999')::float8 - (v_model.meta ->> 'q50')::float8));
    if a_if > 0 then
      select jsonb_agg(k order by z desc) into v_top from (
        select 'f' || ((array[1,2,3,4,5,6,7,8,9,10,10,10,10,10])[i])::text k,
               max(abs((v_vec[i] - (v_model.meta -> 'mean' ->> (i - 1))::float8)
                       / greatest((v_model.meta -> 'std' ->> (i - 1))::float8, 1e-6))) z
        from generate_subscripts(v_vec, 1) i group by 1 order by 2 desc limit 2) q;
    end if;
  end if;
  -- anomaly silent in learning, for small payments and between the user's own accounts
  if v_learning or (f ->> 'amount_eur')::float8 < core.param('min_amount_eur')
     or t.category_id = 'transfers.internal' then
    a_thr := 0; a_if := 0; checks := '[]';
  end if;

  -- F: rules (active from day one, also in learning)
  for r in select distinct on (id) id, params from ref.fraud_rules where active order by id, version desc loop
    w := core.param('w:' || r.id);
    if (r.id = 'R1' and ((v_sec ? 'sim_swap') or ((v_sec ? 'new_device') and (v_sec ? 'device_security_changed')))
          and (coalesce((f ->> 'f8')::float8, 0) >= (r.params ->> 'balance_share')::float8 or (f ->> 'f3')::int = 1))
    or (r.id = 'R2' and ((v_sec ? 'password_changed') or (v_sec ? 'email_changed')) and (f ->> 'f3')::int = 1
          and (f ->> 'amount_eur')::float8 >= coalesce((f ->> 'p95_amount_eur')::float8, 0))
    or (r.id = 'R3' and (f ->> 'f13')::boolean)
    or (r.id = 'R4' and (f ->> 'f11')::int >= (r.params ->> 'fan_in_24h')::int
          and (f ->> 'f12')::float8 >= (r.params ->> 'pass_through')::float8)
    or (r.id = 'R5' and (f ->> 'f15')::boolean and (f ->> 'r5_n')::int >= (r.params ->> 'min_payments')::int
          and (f ->> 'r5_rising')::boolean)
    or (r.id = 'R6' and f ->> 'op' = 'cash_out'
          and (f ->> 'local_hour')::int >= (r.params ->> 'from_h')::int and (f ->> 'local_hour')::int < (r.params ->> 'to_h')::int
          and (coalesce((f ->> 'c2')::float8, 1e9) < (r.params ->> 'device_age_h')::float8 or (v_sec ? 'new_device')))
    then
      rules := rules || jsonb_build_array(jsonb_build_object('code', r.id, 'weight', round(w)));
    end if;
  end loop;
  select 1 - coalesce(exp(sum(ln(greatest(1e-12, 1 - (x ->> 'weight')::float8 / 100)))), 1) into v_f
  from jsonb_array_elements(rules) x;

  -- M: context bumps
  if f ->> 'c1' = 'none' then bumps := bumps || jsonb_build_array(jsonb_build_object('code', 'no_lock', 'value', core.param('bump:no_lock'))); end if;
  if f ->> 'unlock' = 'biometric_weak' then bumps := bumps || jsonb_build_array(jsonb_build_object('code', 'weak_biometric', 'value', core.param('bump:weak_biometric'))); end if;
  if (f ->> 'c2')::float8 < 24 or (v_sec ? 'new_device') then bumps := bumps || jsonb_build_array(jsonb_build_object('code', 'new_device', 'value', core.param('bump:new_device'))); end if;
  if (f ->> 'c3')::boolean then bumps := bumps || jsonb_build_array(jsonb_build_object('code', 'amount_large', 'value', core.param('bump:amount_large'))); end if;
  select least(1.4, 1 + coalesce(sum((b ->> 'value')::float8), 0)) into v_m from jsonb_array_elements(bumps) b;

  v_a := 1 - (1 - a_thr) * (1 - core.param('if_weight') * a_if);
  v_s := least(100, round(100 * (1 - (1 - v_a) * (1 - v_f)) * v_m))::int;
  v_band := case when v_s < 40 then 'none' when v_s <= 70 then 'ask' else 'bank' end;
  select string_agg(id || '.' || v, ',' order by id) into v_rules_version
  from (select distinct on (id) id, version v from ref.fraud_rules where active order by id, version desc) q;

  return jsonb_build_object(
    'total', v_s, 'band', v_band, 'a_thr', round(a_thr::numeric, 4), 'a_if', round(a_if::numeric, 4),
    'f', round(v_f::numeric, 4), 'm', round(v_m::numeric, 3), 'learning', v_learning, 'features', f,
    'reasons', coalesce((select jsonb_agg(x order by (x ->> 'weight')::int desc) from (
        select jsonb_build_object('code', c ->> 'code', 'params', c -> 'params',
                                  'weight', round(100 * (c ->> 's')::numeric)) x
        from jsonb_array_elements(checks) c
        union all
        select jsonb_build_object('code', 'UNUSUAL_COMBINATION',
                                  'params', jsonb_build_object('f1', v_top ->> 0, 'f2', v_top ->> 1),
                                  'weight', round(100 * core.param('if_weight') * a_if)::int)
        where a_if > 0 and v_top is not null
        union all
        select jsonb_build_object('code', x ->> 'code', 'params', '{}'::jsonb, 'weight', (x ->> 'weight')::int)
        from jsonb_array_elements(rules) x) q), '[]'),
    'rules', rules, 'bumps', bumps, 'model_version', v_model.version, 'rules_version', v_rules_version,
    'params_version', (select coalesce(max(id), 0) from ops.param_changes));
end $$;

-- Score one debit, store the score and (S ≥ 40) the alert. Called from ingest.
create function core.score_transaction(p_tx uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_t0 timestamptz := clock_timestamp(); r jsonb; t core.transactions; v_score uuid; v_alert uuid;
  v_bank text; v_kind text;
begin
  select * into t from core.transactions where id = p_tx;
  if not found or t.cdt_dbt_ind <> 'DBIT' or t.status <> 'BOOK'
     or not core.is_scored((select op_type from core.tx_momo where transaction_id = p_tx), t.btc_family) then
    return null;
  end if;
  if exists (select 1 from core.scores where transaction_id = p_tx) then return null; end if;
  r := core.score_compute(p_tx);
  insert into core.scores (user_id, transaction_id, total, band, a_thr, a_if, f, m, learning, features, reasons,
                           model_version, rules_version, params_version, latency_ms)
  values (t.user_id, p_tx, (r ->> 'total')::int, r ->> 'band', (r ->> 'a_thr')::real, (r ->> 'a_if')::real,
          (r ->> 'f')::real, (r ->> 'm')::real, (r ->> 'learning')::boolean,
          r -> 'features' || jsonb_build_object('rules', r -> 'rules', 'bumps', r -> 'bumps'),
          r -> 'reasons', r ->> 'model_version', r ->> 'rules_version', (r ->> 'params_version')::int,
          round(extract(epoch from clock_timestamp() - v_t0) * 1000)::int)
  returning id into v_score;
  if r ->> 'band' in ('ask', 'bank') then
    v_bank := coalesce((select bank_id from core.accounts where id = t.account_id),
                       (select bank_id from core.accounts where user_id = t.user_id and bank_id is not null
                        order by created_at limit 1));
    v_kind := case when jsonb_array_length(r -> 'rules') > 0 then 'fraud' else 'anomaly' end;
    insert into core.alerts (user_id, kind, score_id, transaction_id, score, band, status, reasons, bank_id, escalated_at)
    values (t.user_id, v_kind, v_score, p_tx, (r ->> 'total')::int, r ->> 'band',
            case when r ->> 'band' = 'bank' then 'escalated' else 'awaiting_user' end,
            r -> 'reasons', v_bank, case when r ->> 'band' = 'bank' then now() end)
    returning id into v_alert;
  end if;
  return jsonb_build_object('score_id', v_score, 'total', (r ->> 'total')::int, 'band', r ->> 'band',
                            'alert_id', v_alert);
end $$;

-- Ingest: same as B2 (20261125000400) + scoring of the new booked debits of the
-- last 30 minutes (live deliveries; a clone's old history is not scored).
create or replace function core.ingest_entries(p_user uuid, p_account uuid, p_entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ins uuid[]; v_upd int; v_cat int; v_none int; v_scored int := 0; v_alerts int := 0; v_id uuid; v_r jsonb;
  v_book uuid[];
begin
  if not exists (select 1 from core.accounts where id = p_account and user_id = p_user) then
    perform core.api_error('NOT_FOUND', 'account.not_found');
  end if;
  if jsonb_typeof(p_entries) is distinct from 'array' then
    perform core.api_error('INVALID', 'ingest.entries_not_array');
  end if;
  begin
    with src as (
      select distinct on (e ->> 'providerEntryId') e ->> 'providerEntryId' as pid, e, e -> 'counterparty' cp
      from jsonb_array_elements(p_entries) with ordinality x(e, ord)
      where (e ->> 'providerEntryId') is not null
      order by e ->> 'providerEntryId', ord desc
    ), cat as (
      select * from core.match_categories(p_user, (
        select jsonb_agg(jsonb_build_object('id', pid, 'cp_key', core.cp_key(e),
                 'text', core.norm_text(coalesce(e ->> 'remittanceInfo', '') || ' ' || coalesce(cp ->> 'name', '')),
                 'mcc', cp ->> 'merchantCode', 'op', e #>> '{momo,opType}')) from src))
    ), up as (
      insert into core.transactions as t (user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor,
        currency, booking_ts, value_date, btc_domain, btc_family, btc_subfamily, end_to_end_id, tx_id,
        acct_svcr_ref, cp_name, cp_iban, cp_msisdn, cp_bic, cp_merchant_code, cp_key, remittance_info,
        purpose_code, charges_minor, charges_currency, category_id, category_source)
      select p_user, p_account, src.pid, e ->> 'status', e ->> 'creditDebit',
        (e ->> 'amountMinor')::bigint, e ->> 'currency', (e ->> 'bookingTs')::timestamptz,
        (e ->> 'valueDate')::date, e #>> '{bankTxCode,domain}', e #>> '{bankTxCode,family}',
        e #>> '{bankTxCode,subFamily}', e ->> 'endToEndId', e ->> 'txId', e ->> 'acctSvcrRef',
        cp ->> 'name', cp ->> 'iban', cp ->> 'msisdn', cp ->> 'bic', cp ->> 'merchantCode', core.cp_key(e),
        e ->> 'remittanceInfo', e ->> 'purposeCode', (e #>> '{charges,amountMinor}')::bigint,
        e #>> '{charges,currency}', cat.category_id,
        case when cat.category_id is null then 'none' when cat.is_user then 'user_rule' else 'keyword' end
      from src left join cat on cat.id = src.pid
      on conflict (account_id, provider_entry_id) do update set status = excluded.status
        where t.status = 'PDNG' and excluded.status <> 'PDNG'
      returning t.id, t.provider_entry_id, (xmax = 0) as inserted, t.category_source, t.status, t.cdt_dbt_ind,
                t.booking_ts
    ), mo as (
      insert into core.tx_momo (transaction_id, operator, op_type, agent_id, balance_after_minor, operator_ref)
      select up.id, src.e #>> '{momo,operator}', src.e #>> '{momo,opType}', src.e #>> '{momo,agentId}',
             (src.e #>> '{momo,balanceAfterMinor}')::bigint, src.e #>> '{momo,operatorRef}'
      from up join src on src.pid = up.provider_entry_id
      where up.inserted and src.e ? 'momo'
      returning 1
    )
    select array_agg(id) filter (where inserted),
           count(*) filter (where not inserted),
           count(*) filter (where inserted and category_source <> 'none'),
           count(*) filter (where inserted and category_source = 'none'),
           array_agg(id order by booking_ts) filter (where status = 'BOOK' and cdt_dbt_ind = 'DBIT'
                                                     and booking_ts >= now() - interval '30 minutes')
      into v_ins, v_upd, v_cat, v_none, v_book
    from up;
  exception
    when invalid_text_representation or not_null_violation or check_violation or datetime_field_overflow
         or invalid_datetime_format or numeric_value_out_of_range or foreign_key_violation then
      perform core.api_error('INVALID', 'ingest.invalid_entry');
  end;
  if coalesce(current_setting('gp.no_score', true), '') <> 'on' then
    foreach v_id in array coalesce(v_book, '{}') loop
      v_r := core.score_transaction(v_id);
      if v_r is not null then
        v_scored := v_scored + 1;
        if v_r ->> 'alert_id' is not null then v_alerts := v_alerts + 1; end if;
      end if;
    end loop;
  end if;
  return jsonb_build_object('inserted', coalesce(cardinality(v_ins), 0), 'updated', v_upd,
    'categorised', v_cat, 'uncategorised', v_none, 'scored', v_scored, 'alerts', v_alerts,
    'transaction_ids', to_jsonb(coalesce(v_ins, '{}'::uuid[])));
end $$;

-- Ground truth of a cloned/linked simulated entry (G7, simulated analyst).
create function sim.truth(p_tx uuid, out tag text, out band text)
language sql stable set search_path = '' as $$
  with t as (
    select a.link_id, split_part(x.provider_entry_id, '-', 2) k,
           substr(split_part(x.provider_entry_id, '-', 3), 2)::int seq
    from core.transactions x join core.accounts a on a.id = x.account_id
    where x.id = p_tx and x.provider_entry_id ~ '^[0-9a-f]{8}-[a-z0-9_]+-[SX][0-9]+$'
  )
  select coalesce(le.scenario_tag, te.scenario_tag), coalesce(le.expected_band, te.expected_band)
  from t join sim.links l on l.link_id = t.link_id
  left join sim.link_entries le on le.link_id = t.link_id and le.account_key = t.k and le.seq = t.seq
  left join sim.template_entries te on te.template_id = l.template_id and te.account_key = t.k and te.seq = t.seq
$$;

-- Evaluation replay (dry): scores every booked debit of a user without writing.
create function core.score_replay(p_user uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (transaction_id uuid, booking_ts timestamptz, total int, band text, learning boolean,
               rules jsonb, reasons jsonb, tag text, expected_band text, vec float8[])
language sql stable set search_path = '' as $$
  select t.id, t.booking_ts, (r ->> 'total')::int, r ->> 'band', (r ->> 'learning')::boolean, r -> 'rules',
         r -> 'reasons', tr.tag, tr.band, core.if_vector(r -> 'features')
  from core.transactions t
  cross join lateral core.score_compute(t.id) r
  left join lateral sim.truth(t.id) tr on true
  where t.user_id = p_user and t.status = 'BOOK' and t.cdt_dbt_ind = 'DBIT'
    and core.is_scored((select op_type from core.tx_momo where transaction_id = t.id), t.btc_family)
    and (p_from is null or t.booking_ts >= p_from) and (p_to is null or t.booking_ts < p_to)
$$;

-- Training rows for the Isolation Forest (clean: injected scenarios excluded).
create function core.training_rows(p_user uuid, p_days int default 180)
returns table (transaction_id uuid, vec float8[], injected boolean)
language sql stable set search_path = '' as $$
  select t.id, core.if_vector(f), tr.tag is not null
  from core.transactions t
  cross join lateral core.score_features(t.id) f
  left join lateral sim.truth(t.id) tr on true
  where t.user_id = p_user and t.status = 'BOOK' and t.cdt_dbt_ind = 'DBIT'
    and core.is_scored((select op_type from core.tx_momo where transaction_id = t.id), t.btc_family)
    and t.booking_ts >= now() - make_interval(days => p_days) and not (f ->> 'learning')::boolean
$$;

revoke execute on all functions in schema api, core, ref, mkt, analytics, ops, sim from public;
grant execute on function core.med(float8[]), core.robust(float8[]), core.clamp01(float8), core.amount_eur(bigint, text),
  core.is_scored(text, text),
  core.op_group(text, text, text), core.param(text, uuid, text), core.iforest_raw(text, float8[]),
  core.score_features(uuid), core.if_vector(jsonb), core.score_compute(uuid), sim.truth(uuid),
  core.score_replay(uuid, timestamptz, timestamptz), core.training_rows(uuid, int)
  to batch_writer, service_role;
grant execute on function core.score_transaction(uuid) to service_role;
grant select on ops.scoring_params, ref.fraud_rules, ops.param_changes, core.known_payees to batch_writer;
