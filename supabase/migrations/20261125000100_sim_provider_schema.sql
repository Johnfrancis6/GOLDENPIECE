-- B2: simulated bank + provider — schema additions (ARCHITECTURE §3, DATA_MODEL §2.8).

-- Templates carry their zone, country and the running balance per entry
-- (balanceAfterMinor without summing at read time).
alter table sim.templates add column timezone text not null default 'Africa/Dakar';
alter table sim.templates add column country char(2) not null default 'SN';
alter table sim.template_entries add column cum_minor bigint not null default 0;
create index on sim.template_entries (template_id, account_key, offset_s);

-- Wealth items of a persona (debts, real estate, demo trades), JSON per item.
create table sim.template_wealth (
  template_id text not null references sim.templates on delete cascade,
  seq int not null,
  item jsonb not null,
  primary key (template_id, seq)
);

-- Per-link scheduled extras (first-session guarantee, ARCHITECTURE §7.8):
-- entries / security events tied to one clone, offsets from the link anchor.
-- seq >= 1000000 so ids never collide with template entries.
create table sim.link_entries (
  link_id uuid not null references sim.links on delete cascade,
  account_key text not null,
  seq int not null check (seq >= 1000000),
  offset_s bigint not null,
  entry jsonb not null,
  scenario_tag text,
  expected_band text check (expected_band in ('none','ask','bank')),
  primary key (link_id, account_key, seq)
);
create table sim.link_security_events (
  link_id uuid not null references sim.links on delete cascade,
  seq int not null check (seq >= 1000000),
  offset_s bigint not null,
  type text not null,
  details jsonb not null default '{}',
  scenario_tag text,
  primary key (link_id, seq)
);

alter table sim.template_wealth enable row level security;
alter table sim.link_entries enable row level security;
alter table sim.link_security_events enable row level security;
create policy batch_writer_all on sim.template_wealth for all to batch_writer using (true) with check (true);
create policy batch_writer_all on sim.link_entries for all to batch_writer using (true) with check (true);
create policy batch_writer_all on sim.link_security_events for all to batch_writer using (true) with check (true);
grant select, insert, update, delete on sim.template_wealth, sim.link_entries, sim.link_security_events to batch_writer;

-- A link waits for the user's consent between provider-link-start and -complete.
alter table core.provider_links drop constraint provider_links_status_check;
alter table core.provider_links add constraint provider_links_status_check
  check (status in ('pending','active','expired','revoked'));
alter table core.provider_links add column template_id text references sim.templates(id);   -- sim adapter only
alter table core.provider_links add column options jsonb not null default '{}';

-- Simulated operator signals are idempotent per provider event id.
create unique index security_events_sim_uid on core.security_events (user_id, (details->>'provider_event_id'))
  where source = 'sim';

-- ── global keyword rules (core.cat_rules, user_id null, source 'keyword') ──
-- Matched against core.norm_text(remittance_info || ' ' || cp_name) for
-- match_field 'remittance', or the mobile-money op type. User rules
-- (user_id = the user) always win over global ones; then lower priority.
insert into core.cat_rules (id, user_id, match_field, match_type, pattern, category_id, priority, source)
select md5('gp-keyword:' || f || ':' || p)::uuid,
       null, f, 'contains', p, c, pr, 'keyword'
from (values
  ('op_type', 'airtime', 'bills.airtime', 50),
  ('op_type', 'cash_out', 'transfers.cash', 50),
  ('op_type', 'cash_in', 'transfers.cash', 50),
  ('op_type', 'bank_in', 'transfers.internal', 50),
  ('op_type', 'bank_out', 'transfers.internal', 50),
  ('op_type', 'fee', 'bills.fees', 50),
  ('remittance', 'salaire', 'income.salary', 100),
  ('remittance', 'achat marchandise', 'income.business', 100),
  ('remittance', 'loyer', 'housing.rent', 100),
  ('remittance', 'electricite', 'bills.electricity', 100),
  ('remittance', 'facture eau', 'bills.water', 100),
  ('remittance', 'societe des eaux', 'bills.water', 100),
  ('remittance', 'fibre', 'bills.internet', 100),
  ('remittance', 'internet', 'bills.internet', 100),
  ('remittance', 'forfait mobile', 'bills.airtime', 100),
  ('remittance', 'credit telephonique', 'bills.airtime', 100),
  ('remittance', 'bouquet tv', 'bills.tv', 100),
  ('remittance', 'frais de tenue', 'bills.fees', 100),
  ('remittance', 'scolarite', 'education.school_fees', 100),
  ('remittance', 'groupe scolaire', 'education.school_fees', 100),
  ('remittance', 'supermarche', 'groceries.supermarket', 90),
  ('remittance', 'hyper ', 'groceries.supermarket', 90),
  ('remittance', 'marche ', 'groceries.market', 100),
  ('remittance', 'epicerie', 'groceries.shop', 100),
  ('remittance', 'boutique', 'groceries.shop', 110),
  ('remittance', 'boulangerie', 'groceries.shop', 100),
  ('remittance', 'kiosque', 'groceries.shop', 100),
  ('remittance', 'taxi', 'transport.taxi', 100),
  ('remittance', 'carburant', 'transport.fuel', 100),
  ('remittance', 'transport public', 'transport.public', 100),
  ('remittance', 'billet avion', 'transport.travel', 100),
  ('remittance', 'restaurant', 'restaurant.eating_out', 100),
  ('remittance', 'dibiterie', 'restaurant.eating_out', 100),
  ('remittance', 'maquis', 'restaurant.eating_out', 100),
  ('remittance', 'pizzeria', 'restaurant.eating_out', 100),
  ('remittance', 'cafe ', 'restaurant.eating_out', 100),
  ('remittance', 'garba', 'restaurant.eating_out', 100),
  ('remittance', 'pharmacie', 'health.pharmacy', 100),
  ('remittance', 'electro', 'housing.equipment', 100),
  ('remittance', 'tontine', 'savings.tontine', 100),
  ('remittance', 'achat titres', 'savings.investment', 100),
  ('remittance', 'pour la famille', 'transfers.family', 100),
  ('remittance', 'envoi famille', 'transfers.family', 100),
  ('remittance', 'pour maman', 'transfers.family', 100),
  ('remittance', 'portefeuille', 'transfers.internal', 95),
  ('remittance', 'vers perso', 'transfers.internal', 100),
  ('remittance', 'depuis pro', 'transfers.internal', 100),
  ('remittance', 'versement especes', 'transfers.cash', 100),
  ('remittance', 'retrait dab', 'transfers.cash', 100)
) as v(f, p, c, pr);
