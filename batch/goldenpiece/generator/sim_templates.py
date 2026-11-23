"""Simulated-bank templates (ARCHITECTURE §3.3, §7.8; DATA_MODEL §2.8).

Deterministic: the same GOLDENPIECE_SEED gives byte-identical output
(`digest()`), checked in CI against `shared/fixtures/sim_templates.sha256`.

A template = accounts + 12 months of past and 12 months of future
ProviderEntry bodies stored as **offsets in seconds from the anchor**.
The anchor is a Monday 00:00 local time (the clone anchors at the most
recent local Monday midnight, so weekdays and hours stay realistic;
day-of-month events such as salary drift with the clone date [assumed]).

Injected scenarios carry ground truth (`scenario_tag`, `expected_band`):
- personas: one every 2-4 days in the future, 08:00-21:00 local, at most
  one per day, mix 60 % ask / 25 % bank / 15 % budget (§7.8); one every
  10-20 days in the past (evaluation history, G7);
- account profiles and new wallets: one every ~10 days.

Everything is fictitious: institutions (ref.operators / ref.banks),
people and merchant names, IBANs (fictitious bank codes) and MSISDNs
(prefix 99, outside mobile ranges [assumed]).

  python3 -m goldenpiece.generator.sim_templates --digest      # print digest
  python3 -m goldenpiece.generator.sim_templates --sql > x.sql # full load SQL
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import sys
from dataclasses import dataclass, field
from datetime import date, timedelta

from goldenpiece.generator import iban as ib

SEED = int(os.environ.get("GOLDENPIECE_SEED", "2026"))
GENERATOR_VERSION = "b2.1"
A0 = date(2026, 1, 5)          # a Monday: virtual calendar of day 0
PAST_DAYS = 365
FUTURE_DAYS = 365
DAY = 86400


# ── model ────────────────────────────────────────────────────────────────
@dataclass
class Account:
    key: str
    kind: str                  # bank | momo
    institution: str           # ref.banks / ref.operators id, '*' = chosen at link time
    currency: str
    opening: int = 0


@dataclass
class Ev:
    offset: int
    acct: str
    entry: dict
    tag: str | None = None
    band: str | None = None
    order: int = 0             # tie-break inside the same second

    def signed(self) -> int:
        a = self.entry["amountMinor"]
        ch = self.entry.get("charges", {}).get("amountMinor", 0)
        return a if self.entry["creditDebit"] == "CRDT" else -a - ch


@dataclass
class SecEv:
    offset: int
    type: str
    details: dict
    tag: str | None = None


@dataclass
class Template:
    id: str
    kind: str                  # persona | account_profile
    profile_id: str
    description: str
    tz: str
    country: str
    accounts: list[Account]
    events: list[Ev] = field(default_factory=list)
    sec: list[SecEv] = field(default_factory=list)
    wealth: list[dict] = field(default_factory=list)


# ── names (fictitious) ───────────────────────────────────────────────────
FIRST = ["Awa", "Fatou", "Moussa", "Ibrahima", "Aminata", "Cheikh", "Mariama", "Ousmane", "Khady", "Mamadou",
         "Adjoua", "Kouassi", "Yao", "Akissi", "Koffi", "Aya", "Brou", "Nadia", "Jean", "Esther", "Paul",
         "Christelle", "Hervé", "Sandrine", "Arnaud", "Mireille", "Samuel", "Rokhaya", "Bineta", "Seydou"]
LAST = ["Ndiaye", "Diop", "Fall", "Sow", "Ba", "Sy", "Gueye", "Kouamé", "Koné", "Traoré", "Yao", "Bamba",
        "Ouattara", "Mbarga", "Ngono", "Essomba", "Fotso", "Tchoumi", "Diallo", "Camara", "Sarr", "Faye"]

DIAL = {"SN": "+221", "CI": "+225", "CM": "+237", "FR": "+33", "ML": "+223", "GA": "+241"}

BTC = {
    "card": ("PMNT", "CCRD", "POSD"), "atm": ("PMNT", "CCRD", "CWDL"),
    "xfer_out": ("PMNT", "ICDT", "ESCT"), "xfer_in": ("PMNT", "RCDT", "ESCT"),
    "book_out": ("PMNT", "ICDT", "BOOK"), "book_in": ("PMNT", "RCDT", "BOOK"),
    "fee": ("ACMT", "MDOP", "CHRG"), "loan": ("LDAS", "CSLN", "PPAY"),
    "dd": ("PMNT", "IDDT", "ESDD"),
}
MOMO_BTC = {
    "cash_in": ("PMNT", "CNTR", "CDPT"), "cash_out": ("PMNT", "CNTR", "CWDL"),
    "p2p_in": ("PMNT", "RCDT", "OTHR"), "p2p_out": ("PMNT", "ICDT", "OTHR"),
    "merchant": ("PMNT", "MCOP", "OTHR"), "bill": ("PMNT", "ICDT", "OTHR"),
    "airtime": ("PMNT", "ICDT", "OTHR"), "bank_in": ("PMNT", "RCDT", "BOOK"),
    "bank_out": ("PMNT", "ICDT", "BOOK"), "fee": ("ACMT", "MDOP", "CHRG"),
    "reversal": ("PMNT", "RCDT", "RRTN"),
}
MOMO_CREDIT = {"cash_in", "p2p_in", "bank_in", "reversal"}


class Gen:
    """Builds one template's events with a private deterministic RNG."""

    def __init__(self, t: Template):
        self.t = t
        self.rng = random.Random(f"{SEED}:{t.id}")
        self.n = 0
        self._people: dict[str, dict] = {}
        self.cur = {a.key: a.currency for a in t.accounts}
        self.inst = {a.key: a.institution for a in t.accounts}
        self.dial = DIAL.get(t.country, "+221")

    # time
    @staticmethod
    def date_of(d: int) -> date:
        return A0 + timedelta(days=d)

    def ts(self, d: int, h0: int, h1: int | None = None) -> int:
        h = h0 if h1 is None else self.rng.randint(h0, h1)
        return d * DAY + h * 3600 + self.rng.randint(0, 59) * 60 + self.rng.randint(0, 59)

    # counterparties
    def person(self, slot: str) -> dict:
        """A stable fictitious person for this template (same slot → same person)."""
        if slot not in self._people:
            name = f"{self.rng.choice(FIRST)} {self.rng.choice(LAST)}"
            self._people[slot] = {"name": name, "msisdn": self.msisdn()}
        return dict(self._people[slot])

    def new_person(self) -> dict:
        return {"name": f"{self.rng.choice(FIRST)} {self.rng.choice(LAST)}", "msisdn": self.msisdn()}

    def msisdn(self) -> str:
        return self.dial + "99" + "".join(str(self.rng.randint(0, 9)) for _ in range(7))

    def kind(self, acct: str) -> str:
        return next(a.kind for a in self.t.accounts if a.key == acct)

    def cp_iban(self, country: str, bank: str) -> str:
        acc = "".join(str(self.rng.randint(0, 9)) for _ in range(ib.account_length(country)))
        return ib.iban(country, bank, "00101", acc)

    # amounts
    def minor(self, acct: str, major: int) -> int:
        return major * 100 if self.cur[acct] in ("EUR", "USD") else major

    # entry builders
    def add(self, acct: str, offset: int, entry: dict, tag=None, band=None) -> Ev:
        self.n += 1
        ev = Ev(offset, acct, entry, tag, band, self.n)
        self.t.events.append(ev)
        return ev

    def bank(self, acct: str, offset: int, cd: str, major: int, kind: str, cp: dict | None = None,
             remit: str | None = None, purpose: str | None = None, charges_major: int = 0,
             tag=None, band=None) -> Ev:
        e: dict = {"status": "BOOK", "creditDebit": cd, "amountMinor": self.minor(acct, major),
                   "currency": self.cur[acct],
                   "bankTxCode": dict(zip(("domain", "family", "subFamily"), BTC[kind]))}
        if cp:
            e["counterparty"] = cp
        if remit:
            e["remittanceInfo"] = remit
        if purpose:
            e["purposeCode"] = purpose
        if charges_major:
            e["charges"] = {"amountMinor": self.minor(acct, charges_major), "currency": self.cur[acct]}
        return self.add(acct, offset, e, tag, band)

    def momo(self, acct: str, offset: int, op: str, major: int, cp: dict | None = None,
             remit: str | None = None, agent: str | None = None, fee_major: int = 0,
             purpose: str | None = None, tag=None, band=None) -> Ev:
        e: dict = {"status": "BOOK", "creditDebit": "CRDT" if op in MOMO_CREDIT else "DBIT",
                   "amountMinor": self.minor(acct, major), "currency": self.cur[acct],
                   "bankTxCode": dict(zip(("domain", "family", "subFamily"), MOMO_BTC[op])),
                   "momo": {"operator": self.inst[acct], "opType": op}}
        if agent:
            e["momo"]["agentId"] = agent
        if cp:
            e["counterparty"] = cp
        if remit:
            e["remittanceInfo"] = remit
        if purpose:
            e["purposeCode"] = purpose
        if fee_major:
            e["charges"] = {"amountMinor": self.minor(acct, fee_major), "currency": self.cur[acct]}
        return self.add(acct, offset, e, tag, band)

    def agent(self) -> tuple[dict, str]:
        code = f"AG{self.rng.randint(1000, 9999)}"
        return {"name": f"Agent {self.rng.choice(['Point Express', 'Kiosque', 'Cabine', 'Relais'])} {code[2:]}"}, code

    @staticmethod
    def cash_out_fee(major: int) -> int:
        return max(100, major // 100)

    # calendar helpers
    @staticmethod
    def pay_day(dt: date, dom: int) -> bool:
        """dt is the business day for day-of-month `dom` (weekend → previous Friday)."""
        nxt = (dt.replace(day=28) + timedelta(days=4))
        last = (nxt - timedelta(days=nxt.day)).day
        target = dt.replace(day=min(dom, last))
        while target.weekday() >= 5:
            target -= timedelta(days=1)
        return dt == target

    def days(self, past: bool = True, future: bool = True):
        lo = -PAST_DAYS if past else 0
        hi = FUTURE_DAYS if future else 0
        return range(lo, hi)


# ── normal life per persona ──────────────────────────────────────────────
MONTHS_FR = ["JANV", "FEVR", "MARS", "AVRIL", "MAI", "JUIN", "JUIL", "AOUT", "SEPT", "OCT", "NOV", "DEC"]


def life_salaried_xof(g: Gen, bank: str, momo: str | None, momo2: str | None, *, salary: int,
                      employer: str, rent: int, landlord: str, scale: float = 1.0, past: bool = True,
                      loan: int = 0, country: str = "SN", bank_code: str = "SN902"):
    """Salaried household paid in XOF/XAF (Dakar persona; also the UEMOA/CEMAC bank profiles)."""
    rng = g.rng
    landlord_cp = {"name": landlord, "iban": g.cp_iban(country, bank_code), "bic": "FLEUSND0"}
    employer_cp = {"name": employer, "iban": g.cp_iban(country, bank_code)}
    s = lambda v: max(100, int(round(v * scale / 100.0)) * 100)  # noqa: E731
    for d in g.days(past=past):
        dt = g.date_of(d)
        wd = dt.weekday()
        if g.pay_day(dt, 28):
            g.bank(bank, g.ts(d, 7, 9), "CRDT", s(salary), "xfer_in", employer_cp,
                   f"SALAIRE {MONTHS_FR[dt.month - 1]} {dt.year}", "SALA")
        if g.pay_day(dt, 3):
            g.bank(bank, g.ts(d, 9, 11), "DBIT", s(rent), "xfer_out", landlord_cp,
                   f"LOYER {MONTHS_FR[dt.month - 1]} {dt.year}", "RENT")
        if g.pay_day(dt, 5) and loan:
            g.bank(bank, g.ts(d, 6, 6), "DBIT", s(loan), "loan", {"name": "Service crédit"}, "ECHEANCE PRET AUTO")
        if g.pay_day(dt, 10):
            g.bank(bank, g.ts(d, 10, 16), "DBIT", s(rng.randint(14000, 38000)), "dd",
                   {"name": "Compagnie d'Électricité du Littoral"}, "FACTURE ELECTRICITE", "ELEC")
            g.bank(bank, g.ts(d, 10, 16), "DBIT", s(20000), "dd", {"name": "Fibre Horizon"},
                   "ABONNEMENT FIBRE INTERNET", "PHON")
        if g.pay_day(dt, 15) and dt.month % 2 == 0:
            g.bank(bank, g.ts(d, 10, 16), "DBIT", s(rng.randint(6000, 13000)), "dd",
                   {"name": "Société des Eaux du Cap"}, "FACTURE EAU", "WTER")
        if g.pay_day(dt, 1):
            g.bank(bank, g.ts(d, 2, 3), "DBIT", s(2500), "fee", None, "FRAIS DE TENUE DE COMPTE")
        if dt.day == 6 and dt.month in (1, 4, 10):
            g.bank(bank, g.ts(d, 9, 12), "DBIT", s(75000), "xfer_out",
                   {"name": "Groupe Scolaire Les Palmiers", "iban": g.cp_iban(country, bank_code)},
                   "SCOLARITE TRIMESTRE", "STDY")
        # card spending
        if wd == 5 and rng.random() < 0.85:
            m = rng.choice(["Supermarché Baobab", "Supermarché Étoile", "Hyper Teranga"])
            g.bank(bank, g.ts(d, 10, 19), "DBIT", s(rng.randint(12000, 48000)), "card",
                   {"name": m, "merchantCode": "5411"}, f"PAIEMENT CB {m.upper()}")
        if rng.random() < 0.09:
            g.bank(bank, g.ts(d, 7, 20), "DBIT", s(rng.randint(15000, 30000)), "card",
                   {"name": "Station Carburant Sahel", "merchantCode": "5541"}, "PAIEMENT CB CARBURANT")
        if wd in (4, 5) and rng.random() < 0.45:
            m = rng.choice(["Restaurant Le Lagon", "Dibiterie du Marché", "Restaurant Chez Fatou", "Pizzeria Corniche"])
            g.bank(bank, g.ts(d, 12, 21), "DBIT", s(rng.randint(5000, 18000)), "card",
                   {"name": m, "merchantCode": "5812"}, f"PAIEMENT CB {m.upper()}")
        if rng.random() < 0.04:
            g.bank(bank, g.ts(d, 9, 19), "DBIT", s(rng.randint(3000, 25000)), "card",
                   {"name": "Pharmacie du Plateau", "merchantCode": "5912"}, "PAIEMENT CB PHARMACIE")
        if rng.random() < 0.05:
            g.bank(bank, g.ts(d, 9, 20), "DBIT", s(rng.choice([20000, 30000, 50000])), "atm",
                   {"name": "DAB Agence Centre"}, "RETRAIT DAB")
        if dt.day == 7 and rng.random() < 0.5:
            g.bank(bank, g.ts(d, 18, 22), "DBIT", s(5000), "card", {"name": "Bouquet TV Sat", "merchantCode": "4899"},
                   "ABONNEMENT BOUQUET TV")
        if momo is None:
            continue
        # bank → wallet, monthly
        if g.pay_day(dt, 29):
            amount = s(100000)
            g.bank(bank, g.ts(d, 12, 13), "DBIT", amount, "book_out", {"name": "Mon portefeuille mobile"},
                   "VIREMENT VERS PORTEFEUILLE")
            g.momo(momo, g.ts(d, 13, 13), "bank_in", amount, {"name": "Banque — mon compte"}, "Virement depuis banque")
        # wallet daily life
        if rng.random() < 0.55:
            m = rng.choice(["Boutique Ndiaye", "Boutique du Coin", "Épicerie Sow", "Marché Tilène — étal 12",
                            "Boulangerie Moderne"])
            g.momo(momo, g.ts(d, 7, 20), "merchant", rng.randint(5, 50) * 100,
                   {"name": m, "merchantCode": "5411"}, f"Paiement {m}")
        if wd < 5 and rng.random() < 0.6:
            g.momo(momo, g.ts(d, 7, 9), "merchant", rng.randint(10, 30) * 100,
                   {"name": "Taxi Rapide", "merchantCode": "4121"}, "Course taxi")
        if wd == 0 and rng.random() < 0.8:
            g.momo(momo, g.ts(d, 8, 20), "airtime", rng.choice([500, 1000, 2000]), None, "Achat crédit téléphonique")
        if dt.day in (2, 16):
            p = g.person("mother")
            g.momo(momo, g.ts(d, 9, 19), "p2p_out", s(rng.choice([15000, 20000, 25000])), p, "Pour la famille")
        if dt.day == 20:
            p = g.person("tontine")
            g.momo(momo, g.ts(d, 18, 20), "p2p_out", s(25000), p, "Cotisation tontine quartier")
        if rng.random() < 0.06:
            cp, code = g.agent()
            amount = s(rng.choice([20000, 30000, 50000]))
            g.momo(momo, g.ts(d, 9, 19), "cash_out", amount, cp, "Retrait", agent=code, fee_major=g.cash_out_fee(amount))
        if rng.random() < 0.05:
            p = g.person(f"friend{rng.randint(0, 5)}")
            g.momo(momo, g.ts(d, 9, 21), "p2p_in", rng.randint(2, 20) * 1000, p, "Remboursement")
        if rng.random() < 0.05:
            p = g.person(f"friend{rng.randint(0, 5)}")
            g.momo(momo, g.ts(d, 9, 21), "p2p_out", rng.randint(2, 15) * 1000, p, "Participation")
        if momo2 is None:
            continue
        if g.pay_day(dt, 12):
            cp, code = g.agent()
            g.momo(momo2, g.ts(d, 10, 18), "cash_in", rng.choice([10000, 15000, 20000, 30000]), cp, "Dépôt", agent=code)
        if rng.random() < 0.18:
            m = rng.choice(["Boutique Ndiaye", "Kiosque Journaux Plateau", "Café Touba Express"])
            g.momo(momo2, g.ts(d, 7, 21), "merchant", rng.randint(3, 25) * 100,
                   {"name": m, "merchantCode": "5499"}, f"Paiement {m}")
        if dt.day == 14:
            g.momo(momo2, g.ts(d, 10, 18), "bill", rng.randint(4000, 9000), {"name": "Société des Eaux du Cap"},
                   "Facture eau", purpose="WTER")


def life_trader_xof(g: Gen, bank: str, momo: str, momo2: str):
    """Abidjan trader: many customer receipts by wallet, weekly supplier transfers from the bank."""
    rng = g.rng
    suppliers = [{"name": n, "iban": g.cp_iban("CI", "CI901"), "bic": "LAGUCID0"}
                 for n in ("Grossiste Adjamé Textiles", "Import Bamba & Fils", "Comptoir du Port")]
    customers = [g.person(f"cust{i}") for i in range(25)]
    for d in g.days():
        dt = g.date_of(d)
        wd = dt.weekday()
        if wd < 6:
            for _ in range(rng.choice([1, 2, 2, 3])):
                c = rng.choice(customers) if rng.random() < 0.8 else g.new_person()
                g.momo(momo, g.ts(d, 8, 19), "p2p_in", rng.randint(3, 45) * 1000, c, "Achat marchandise")
        if wd in (1, 4) and rng.random() < 0.85:
            cp, code = g.agent()
            amount = rng.choice([100000, 150000, 200000, 250000])
            g.momo(momo, g.ts(d, 17, 19), "cash_in", amount // 4, cp, "Dépôt recette", agent=code)
            g.bank(bank, g.ts(d, 16, 17), "CRDT", amount, "xfer_in", {"name": "Versement espèces guichet"},
                   "VERSEMENT ESPECES RECETTE")
        if wd == 4:
            amount = rng.randint(30, 75) * 10000
            g.momo(momo, g.ts(d, 17, 17), "bank_out", amount // 3, {"name": "Banque — compte pro"}, "Vers banque")
            g.bank(bank, g.ts(d, 17, 17) + 300, "CRDT", amount // 3, "book_in", {"name": "Portefeuille Lagune Cash"},
                   "VIREMENT DEPUIS PORTEFEUILLE")
        if wd == 2:
            g.bank(bank, g.ts(d, 9, 11), "DBIT", rng.randint(15, 45) * 10000, "xfer_out", rng.choice(suppliers),
                   "REGLEMENT FACTURE FOURNISSEUR", "SUPP")
        if g.pay_day(dt, 5):
            g.bank(bank, g.ts(d, 9, 11), "DBIT", 85000, "xfer_out",
                   {"name": "SCI Treichville Commerce", "iban": g.cp_iban("CI", "CI901")}, "LOYER BOUTIQUE", "RENT")
        if g.pay_day(dt, 1):
            g.bank(bank, g.ts(d, 2, 3), "DBIT", 3000, "fee", None, "FRAIS DE TENUE DE COMPTE")
        if g.pay_day(dt, 12):
            g.bank(bank, g.ts(d, 10, 15), "DBIT", rng.randint(22000, 45000), "dd",
                   {"name": "Compagnie d'Électricité du Littoral"}, "FACTURE ELECTRICITE", "ELEC")
        if dt.day == 25:
            g.momo(momo, g.ts(d, 18, 20), "p2p_out", 30000, g.person("helper"), "Salaire aide boutique")
        # personal wallet
        if rng.random() < 0.5:
            m = rng.choice(["Maquis Le Bon Coin", "Boutique Koné", "Marché Treichville — étal 4", "Taxi Rapide",
                            "Garba Chez Tanti"])
            g.momo(momo2, g.ts(d, 7, 21), "merchant", rng.randint(5, 40) * 100, {"name": m, "merchantCode": "5499"},
                   f"Paiement {m}")
        if wd == 6:
            g.momo(momo, g.ts(d, 10, 12), "p2p_out", rng.choice([15000, 20000]), {"name": "Mon portefeuille perso"},
                   "Vers perso")
            g.momo(momo2, g.ts(d, 12, 12), "p2p_in", 15000, {"name": "Mon portefeuille pro"}, "Depuis pro")
        if wd == 0 and rng.random() < 0.8:
            g.momo(momo2, g.ts(d, 8, 20), "airtime", rng.choice([1000, 2000]), None, "Achat crédit téléphonique")
        if dt.day in (10, 24):
            g.momo(momo2, g.ts(d, 9, 19), "p2p_out", rng.choice([10000, 20000]), g.person("family"), "Pour la famille")
        if rng.random() < 0.05:
            cp, code = g.agent()
            amount = rng.choice([10000, 20000, 30000])
            g.momo(momo2, g.ts(d, 9, 19), "cash_out", amount, cp, "Retrait", agent=code,
                   fee_major=g.cash_out_fee(amount))


def life_diaspora(g: Gen, bank: str, momo: str):
    """Paris-based investor: EUR salary, rent, transfers home, monthly investments; XOF wallet at home."""
    rng = g.rng
    employer = {"name": "Atelier Numérique Lyonnais", "iban": g.cp_iban("FR", "99901")}
    landlord = {"name": "Gestion Locative Belleville", "iban": g.cp_iban("FR", "99901")}
    family = g.person("mother")
    for d in g.days():
        dt = g.date_of(d)
        wd = dt.weekday()
        if g.pay_day(dt, 27):
            g.bank(bank, g.ts(d, 6, 8), "CRDT", 3250, "xfer_in", employer,
                   f"SALAIRE {MONTHS_FR[dt.month - 1]} {dt.year}", "SALA")
        if g.pay_day(dt, 2):
            g.bank(bank, g.ts(d, 8, 10), "DBIT", 960, "xfer_out", landlord, "LOYER APPARTEMENT", "RENT")
        if g.pay_day(dt, 4):
            g.bank(bank, g.ts(d, 8, 10), "DBIT", 400, "xfer_out", {"name": "Courtier Titres Plus"},
                   "ACHAT TITRES PLAN EPARGNE", "SECU")
        if g.pay_day(dt, 8):
            g.bank(bank, g.ts(d, 9, 12), "DBIT", rng.randint(45, 85), "dd", {"name": "Énergie Ville"},
                   "FACTURE ELECTRICITE", "ELEC")
            g.bank(bank, g.ts(d, 9, 12), "DBIT", 30, "dd", {"name": "Fibre Horizon"}, "ABONNEMENT FIBRE INTERNET",
                   "PHON")
            g.bank(bank, g.ts(d, 9, 12), "DBIT", 18, "dd", {"name": "Mobile Plus"}, "FORFAIT MOBILE", "PHON")
        if g.pay_day(dt, 1):
            g.bank(bank, g.ts(d, 2, 3), "DBIT", 6, "fee", None, "FRAIS DE TENUE DE COMPTE")
        if g.pay_day(dt, 28):
            eur = rng.choice([150, 200, 250, 300])
            g.bank(bank, g.ts(d, 18, 20), "DBIT", eur, "xfer_out", {"name": "Transfert vers portefeuille Kola Money"},
                   "ENVOI FAMILLE SENEGAL", "FAMI", charges_major=3)
            xof = eur * 655
            g.momo(momo, g.ts(d, 20, 20), "bank_in", xof, {"name": "Transfert international"}, "Réception transfert")
            g.momo(momo, g.ts(d, 20, 21) + 1800, "p2p_out", xof // 2, family, "Pour Maman")
        if wd == 5 and rng.random() < 0.9:
            m = rng.choice(["Supermarché Étoile", "Marché Bio Quartier", "Épicerie Afrique Saveurs"])
            g.bank(bank, g.ts(d, 10, 19), "DBIT", rng.randint(35, 110), "card",
                   {"name": m, "merchantCode": "5411"}, f"PAIEMENT CB {m.upper()}")
        if wd < 5 and rng.random() < 0.25:
            m = rng.choice(["Café du Canal", "Restaurant Le Lagon", "Boulangerie Moderne"])
            g.bank(bank, g.ts(d, 8, 14), "DBIT", rng.randint(4, 22), "card", {"name": m, "merchantCode": "5812"},
                   f"PAIEMENT CB {m.upper()}")
        if dt.day == 3:
            g.bank(bank, g.ts(d, 7, 9), "DBIT", 86, "dd", {"name": "Transports Île Pass"},
                   "ABONNEMENT TRANSPORT PUBLIC", "TRPT")
        if rng.random() < 0.03:
            g.bank(bank, g.ts(d, 9, 19), "DBIT", rng.randint(8, 40), "card",
                   {"name": "Pharmacie du Plateau", "merchantCode": "5912"}, "PAIEMENT CB PHARMACIE")
        if rng.random() < 0.02:
            g.bank(bank, g.ts(d, 9, 20), "DBIT", rng.choice([280, 450, 620]), "card",
                   {"name": "Voyages Teranga Air", "merchantCode": "4511"}, "PAIEMENT CB BILLET AVION")
        if rng.random() < 0.08:
            g.momo(momo, g.ts(d, 9, 20), "airtime", rng.choice([1000, 2000]), None, "Crédit pour la famille")


def life_momo_only(g: Gen, momo: str, *, scale: float = 1.0, past: bool = True, start_cash_in: bool = False):
    """Generic wallet (account profiles, new wallet)."""
    rng = g.rng
    s = lambda v: max(100, int(round(v * scale / 100.0)) * 100)  # noqa: E731
    first = True
    for d in g.days(past=past):
        dt = g.date_of(d)
        wd = dt.weekday()
        if start_cash_in and first:
            cp, code = g.agent()
            g.momo(momo, g.ts(d, 9, 9), "cash_in", s(30000), cp, "Premier dépôt", agent=code)
            first = False
        if dt.day in (1, 15):
            cp, code = g.agent()
            g.momo(momo, g.ts(d, 9, 18), "cash_in", s(rng.choice([20000, 30000, 40000])), cp, "Dépôt", agent=code)
        if rng.random() < 0.45:
            m = rng.choice(["Boutique du Coin", "Épicerie Sow", "Boulangerie Moderne", "Marché Central — étal 7"])
            g.momo(momo, g.ts(d, 7, 20), "merchant", s(rng.randint(5, 40) * 100), {"name": m, "merchantCode": "5411"},
                   f"Paiement {m}")
        if wd < 5 and rng.random() < 0.35:
            g.momo(momo, g.ts(d, 7, 9), "merchant", s(rng.randint(10, 25) * 100),
                   {"name": "Taxi Rapide", "merchantCode": "4121"}, "Course taxi")
        if wd == 0 and rng.random() < 0.7:
            g.momo(momo, g.ts(d, 8, 20), "airtime", s(rng.choice([500, 1000])), None, "Achat crédit téléphonique")
        if dt.day == 18:
            g.momo(momo, g.ts(d, 10, 18), "bill", s(rng.randint(8000, 20000)), {"name": "Compagnie d'Électricité du Littoral"},
                   "Facture électricité", purpose="ELEC")
        if rng.random() < 0.06:
            g.momo(momo, g.ts(d, 9, 21), "p2p_in", s(rng.randint(2, 15) * 1000), g.person(f"friend{rng.randint(0, 4)}"),
                   "Envoi")
        if rng.random() < 0.07:
            g.momo(momo, g.ts(d, 9, 21), "p2p_out", s(rng.randint(2, 10) * 1000), g.person(f"friend{rng.randint(0, 4)}"),
                   "Envoi")
        if dt.day == 25:
            g.momo(momo, g.ts(d, 9, 19), "p2p_out", s(10000), g.person("mother"), "Pour la famille")


# ── injected scenarios (ground truth) ────────────────────────────────────
def median(xs: list[int], default: int) -> int:
    xs = sorted(xs)
    return xs[len(xs) // 2] if xs else default


def typical(t: Template, acct: str, pred) -> int:
    return median([e.entry["amountMinor"] for e in t.events if e.acct == acct and pred(e.entry)], 0)


def round_major(g: Gen, acct: str, minor: int, step_major: int) -> int:
    """minor units → major units rounded to step (>= step)."""
    major = minor // 100 if g.cur[acct] in ("EUR", "USD") else minor
    return max(step_major, (major // step_major) * step_major)


def balance_at(t: Template, acct: str, offset: int) -> int:
    opening = next(a.opening for a in t.accounts if a.key == acct)
    return opening + sum(e.signed() for e in t.events if e.acct == acct and e.offset < offset)


def sc_anomaly_amount(g: Gen, d: int, acct: str, past: bool):
    t = g.t
    if g.kind(acct) == "momo":
        base = typical(t, acct, lambda e: e["momo"]["opType"] == "p2p_out") or g.minor(acct, 10000)
        major = round_major(g, acct, base * g.rng.randint(6, 10), 1000)
        g.momo(acct, g.ts(d, 8, 20), "p2p_out", major, g.new_person(), "Envoi", tag="anomaly_amount", band="ask")
    else:
        base = typical(t, acct, lambda e: e["bankTxCode"]["subFamily"] == "POSD") or g.minor(acct, 20000)
        step = 10 if g.cur[acct] in ("EUR", "USD") else 5000
        major = round_major(g, acct, base * g.rng.randint(6, 10), step)
        m = g.rng.choice(["Électro Plus Sandaga", "Bijouterie Or du Sahel", "Mega Électroménager"])
        g.bank(acct, g.ts(d, 8, 20), "DBIT", major, "card", {"name": m, "merchantCode": "5732"},
               f"PAIEMENT CB {m.upper()}", tag="anomaly_amount", band="ask")


def sc_anomaly_hour(g: Gen, d: int, acct: str, past: bool):
    base = typical(g.t, acct, lambda e: e["creditDebit"] == "DBIT") or g.minor(acct, 5000)
    major = round_major(g, acct, base * 3, 500 if g.cur[acct] not in ("EUR", "USD") else 5)
    off = d * DAY + g.rng.randint(2, 3) * 3600 + g.rng.randint(0, 3599)
    if g.kind(acct) == "momo":
        g.momo(acct, off, "p2p_out", major, g.new_person(), "Envoi", tag="anomaly_hour", band="ask")
    else:
        g.bank(acct, off, "DBIT", major, "card", {"name": "Boutique en ligne Nuit", "merchantCode": "5999"},
               "PAIEMENT CB EN LIGNE", tag="anomaly_hour", band="ask")


def sc_r3_fake_deposit(g: Gen, d: int, acct: str, past: bool):
    p = g.new_person()
    major = g.rng.choice([25000, 40000, 50000, 75000])
    off = g.ts(d, 9, 19)
    g.momo(acct, off, "p2p_in", major, p, "Envoi", tag="R3_fake_deposit", band="none")
    g.momo(acct, off + g.rng.randint(12, 25) * 60, "p2p_out", major, p, "Renvoi erreur de transfert",
           tag="R3_fake_deposit", band="ask")


def sc_r5_fake_investment(g: Gen, d: int, acct: str, past: bool):
    payee = {"name": "Rendement Plus Placements", "msisdn": g.msisdn()}
    base = g.rng.choice([10000, 15000, 25000])
    for i, (dd, mult) in enumerate(((0, 1), (4, 2), (9, 4))):
        g.momo(acct, g.ts(d + dd, 9, 20), "p2p_out", base * mult, payee, "Placement trading doublement 30 jours",
               tag="R5_fake_investment", band="ask" if i == 2 else "none")


def sc_r1_sim_swap(g: Gen, d: int, acct: str, past: bool):
    off = g.ts(d, 8, 19)
    g.t.sec.append(SecEv(off, "sim_swap", {"accountKey": acct, "signal": "operator_sim_swap"}, "R1_sim_swap"))
    bal = balance_at(g.t, acct, off)
    major = max(5000, (int(bal * g.rng.uniform(0.7, 0.9)) // 1000) * 1000)
    cp, code = g.agent()
    g.momo(acct, off + g.rng.randint(15, 40) * 60, "cash_out", major, cp, "Retrait", agent=code,
           fee_major=g.cash_out_fee(major), tag="R1_sim_swap", band="bank")


def sc_r4_mule(g: Gen, d: int, acct: str, past: bool):
    off = g.ts(d, 9, 15)
    total = 0
    for i in range(6):
        major = g.rng.randint(20, 60) * 1000
        total += major
        g.momo(acct, off + i * g.rng.randint(15, 30) * 60, "p2p_in", major, g.new_person(), "Envoi",
               tag="R4_mule", band="none")
    g.momo(acct, off + 6 * 1800 + 1200, "p2p_out", (total * 9 // 10 // 1000) * 1000, g.new_person(), "Envoi",
           tag="R4_mule", band="bank")


def sc_drain_new_payee(g: Gen, d: int, acct: str, past: bool):
    off = g.ts(d, 9, 18)
    bal = balance_at(g.t, acct, off)
    step = 10 if g.cur[acct] in ("EUR", "USD") else 10000
    major = round_major(g, acct, int(bal * 0.8), step)
    g.bank(acct, off, "DBIT", major, "xfer_out", {"name": g.new_person()["name"], "iban": g.cp_iban(
        g.t.country if g.t.country in ib.UEMOA | ib.CEMAC else "FR", "99901" if g.t.country == "FR" else "10901"
        if g.t.country in ib.CEMAC else g.t.country + "902")},
        "VIREMENT", tag="drain_new_payee", band="bank")


def sc_budget(g: Gen, d: int, acct: str, past: bool):
    if g.kind(acct) == "momo":
        base = typical(g.t, acct, lambda e: e["momo"]["opType"] == "merchant") or g.minor(acct, 2000)
        major = round_major(g, acct, base * g.rng.randint(3, 4), 500)
        g.momo(acct, g.ts(d, 10, 19), "merchant", major, {"name": "Marché Central — étal 7", "merchantCode": "5411"},
               "Paiement Marché Central — étal 7", tag="budget_overspend", band="none")
    else:
        base = typical(g.t, acct, lambda e: e["bankTxCode"]["subFamily"] == "POSD") or g.minor(acct, 20000)
        step = 5 if g.cur[acct] in ("EUR", "USD") else 1000
        major = round_major(g, acct, base * g.rng.randint(3, 4), step)
        g.bank(acct, g.ts(d, 10, 19), "DBIT", major, "card", {"name": "Supermarché Baobab", "merchantCode": "5411"},
               "PAIEMENT CB SUPERMARCHÉ BAOBAB", tag="budget_overspend", band="none")


def inject(g: Gen, *, momo: str | None, bank: str | None, future_gap=(2, 4), past_gap=(10, 20),
           future_from: int = 1, past: bool = True):
    """Scenario schedule. ask 60 % / bank 25 % / budget 15 % (§7.8)."""
    rng = g.rng
    ask = []
    bank_band = []
    if momo:
        ask += [(sc_anomaly_amount, momo, 2), (sc_r3_fake_deposit, momo, 1), (sc_r5_fake_investment, momo, 1)]
        bank_band += [(sc_r1_sim_swap, momo, 1), (sc_r4_mule, momo, 1)]
    if bank:
        ask += [(sc_anomaly_amount, bank, 2)]
        if not momo:
            bank_band += [(sc_drain_new_payee, bank, 1)]
    budget = [(sc_budget, bank or momo, 1)]

    def pick():
        r = rng.random()
        pool = ask if r < 0.60 else bank_band if r < 0.85 else budget
        weights = [w for _, _, w in pool]
        fn, acct, _ = rng.choices(pool, weights=weights)[0]
        return fn, acct

    d = -PAST_DAYS + rng.randint(*past_gap)
    while past and d < -12:
        fn, acct = pick()
        if rng.random() < 0.15 and fn is not sc_r5_fake_investment:
            fn = sc_anomaly_hour
        fn(g, d, acct, True)
        d += rng.randint(*past_gap)
    d = future_from
    while d < FUTURE_DAYS - 12:
        fn, acct = pick()
        fn(g, d, acct, False)
        d += rng.randint(*future_gap) + (9 if fn is sc_r5_fake_investment else 0)


# ── balances ─────────────────────────────────────────────────────────────
def settle(g: Gen):
    """Sort; wallets never go negative (a cash-in is added the day before);
    bank accounts get an opening balance that keeps them ≥ 0."""
    t = g.t
    t.events.sort(key=lambda e: (e.offset, e.order))
    for a in t.accounts:
        evs = [e for e in t.events if e.acct == a.key]
        if a.kind == "bank":
            run, low = a.opening, a.opening
            for e in evs:
                run += e.signed()
                low = min(low, run)
            if low < 0:
                step = 100000 if a.currency in ("EUR", "USD") else 100000
                a.opening += ((-low) // step + 2) * step
            continue
        run = a.opening
        for e in list(evs):
            if run + e.signed() < 0:
                need = -(run + e.signed())
                major = ((need // (100 if a.currency in ("EUR", "USD") else 1)) // 5000 + 2) * 5000
                cp, code = g.agent()
                top = g.momo(a.key, max(e.offset - DAY + 3600 * 2, e.offset - 6 * 3600) if e.tag else e.offset - 1800,
                             "cash_in", major, cp, "Dépôt", agent=code)
                run += top.signed()
            run += e.signed()
        t.events.sort(key=lambda e: (e.offset, e.order))


# ── templates ────────────────────────────────────────────────────────────
def build_all() -> list[Template]:
    out = []

    t = Template("persona_dakar_salaried", "persona", "SN", "Salariée à Dakar : banque + deux portefeuilles",
                 "Africa/Dakar", "SN",
                 [Account("bank", "bank", "banque_baobab", "XOF", 450000),
                  Account("momo1", "momo", "teranga_mobile", "XOF", 25000),
                  Account("momo2", "momo", "kola_money", "XOF", 8000)])
    g = Gen(t)
    life_salaried_xof(g, "bank", "momo1", "momo2", salary=650000, employer="Société Atlantique Services",
                      rent=150000, landlord="Diop Immobilier", loan=95000)
    inject(g, momo="momo1", bank="bank")
    t.wealth = [
        {"kind": "debt", "name": "Prêt auto", "lender": "banque_baobab", "currency": "XOF", "principal": 3000000,
         "balance": 1900000, "annual_rate_bp": 950, "monthly_payment": 95000, "start_days": -420, "end_days": 640},
        {"kind": "trade", "instrument_id": "SPY", "side": "buy", "days": -300, "quantity": "2", "price_minor": 45210,
         "currency": "USD"},
        {"kind": "trade", "instrument_id": "BTC", "side": "buy", "days": -200, "quantity": "0.01",
         "price_minor": 6250000, "currency": "USD"},
    ]
    settle(g)
    out.append(t)

    t = Template("persona_abidjan_trader", "persona", "CI", "Commerçant à Abidjan : banque pro + deux portefeuilles",
                 "Africa/Abidjan", "CI",
                 [Account("bank", "bank", "banque_lagune", "XOF", 1200000),
                  Account("momo1", "momo", "lagune_cash", "XOF", 60000),
                  Account("momo2", "momo", "savane_pay", "XOF", 10000)])
    g = Gen(t)
    life_trader_xof(g, "bank", "momo1", "momo2")
    inject(g, momo="momo1", bank="bank")
    t.wealth = [
        {"kind": "real_estate", "name": "Boutique Treichville", "country": "CI", "currency": "XOF",
         "valuations": [[-330, 22000000], [-30, 25000000]]},
        {"kind": "trade", "instrument_id": "GLD", "side": "buy", "days": -250, "quantity": "3", "price_minor": 18540,
         "currency": "USD"},
    ]
    settle(g)
    out.append(t)

    t = Template("persona_diaspora_investor", "persona", "DIASPORA",
                 "Investisseur de la diaspora à Paris : compte en euros + portefeuille au Sénégal",
                 "Europe/Paris", "FR",
                 [Account("bank", "bank", "bank_demo", "EUR", 520000),
                  Account("momo1", "momo", "kola_money", "XOF", 15000)])
    g = Gen(t)
    life_diaspora(g, "bank", "momo1")
    inject(g, momo="momo1", bank="bank")
    t.wealth = [
        {"kind": "real_estate", "name": "Terrain à Saly", "country": "SN", "currency": "XOF",
         "valuations": [[-360, 11000000], [-60, 12500000]]},
        {"kind": "trade", "instrument_id": "SPY", "side": "buy", "days": -340, "quantity": "6", "price_minor": 43890,
         "currency": "USD"},
        {"kind": "trade", "instrument_id": "QQQ", "side": "buy", "days": -280, "quantity": "4", "price_minor": 38020,
         "currency": "USD"},
        {"kind": "trade", "instrument_id": "ETH", "side": "buy", "days": -150, "quantity": "0.8",
         "price_minor": 312000, "currency": "USD"},
        {"kind": "trade", "instrument_id": "SPY", "side": "sell", "days": -40, "quantity": "1", "price_minor": 51230,
         "currency": "USD"},
    ]
    settle(g)
    out.append(t)

    # account profiles (real sign-ups' simulated accounts): institution '*' = the one linked
    for tid, prof, cur, country, scale in (("acct_bank_uemoa", "UEMOA", "XOF", "SN", 0.7),
                                            ("acct_bank_cemac", "CEMAC", "XAF", "CM", 0.7)):
        t = Template(tid, "account_profile", prof, f"Compte bancaire salarié ({cur})", "Africa/Dakar"
                     if cur == "XOF" else "Africa/Douala", country, [Account("main", "bank", "*", cur, 300000)])
        g = Gen(t)
        life_salaried_xof(g, "main", None, None, salary=420000, employer="Entreprise Générale du Centre",
                          rent=110000, landlord="Agence Immobilière Horizon", scale=scale, country=country,
                          bank_code="SN902" if cur == "XOF" else "10901")
        inject(g, momo=None, bank="main", future_gap=(8, 12), past_gap=(15, 25))
        settle(g)
        out.append(t)

    t = Template("acct_bank_eur", "account_profile", "DIASPORA", "Compte bancaire en euros", "Europe/Paris", "FR",
                 [Account("bank", "bank", "*", "EUR", 300000)])
    g = Gen(t)
    life_diaspora_bank_only(g, "bank")
    inject(g, momo=None, bank="bank", future_gap=(8, 12), past_gap=(15, 25))
    settle(g)
    out.append(t)

    for tid, prof, cur, country, past in (("acct_momo_uemoa", "UEMOA", "XOF", "SN", True),
                                          ("acct_momo_cemac", "CEMAC", "XAF", "CM", True),
                                          ("new_wallet_uemoa", "UEMOA", "XOF", "SN", False),
                                          ("new_wallet_cemac", "CEMAC", "XAF", "CM", False)):
        desc = ("Nouveau portefeuille mobile" if not past else "Portefeuille mobile") + f" ({cur})"
        t = Template(tid, "account_profile", prof, desc, "Africa/Dakar" if cur == "XOF" else "Africa/Douala",
                     country, [Account("main", "momo", "*", cur, 12000 if past else 0)])
        g = Gen(t)
        life_momo_only(g, "main", past=past, start_cash_in=not past)
        inject(g, momo="main", bank=None, future_gap=(8, 12), past_gap=(15, 25), future_from=6 if not past else 1,
               past=past)
        settle(g)
        out.append(t)
    return out


def life_diaspora_bank_only(g: Gen, bank: str):
    """EUR account profile: diaspora life without the wallet."""
    rng = g.rng
    for d in g.days():
        dt = g.date_of(d)
        wd = dt.weekday()
        if g.pay_day(dt, 27):
            g.bank(bank, g.ts(d, 6, 8), "CRDT", 2600, "xfer_in", {"name": "Services Urbains Est"},
                   f"SALAIRE {MONTHS_FR[dt.month - 1]} {dt.year}", "SALA")
        if g.pay_day(dt, 2):
            g.bank(bank, g.ts(d, 8, 10), "DBIT", 780, "xfer_out", {"name": "Bailleur Résidence Les Lilas"},
                   "LOYER APPARTEMENT", "RENT")
        if g.pay_day(dt, 8):
            g.bank(bank, g.ts(d, 9, 12), "DBIT", rng.randint(40, 75), "dd", {"name": "Énergie Ville"},
                   "FACTURE ELECTRICITE", "ELEC")
        if g.pay_day(dt, 1):
            g.bank(bank, g.ts(d, 2, 3), "DBIT", 5, "fee", None, "FRAIS DE TENUE DE COMPTE")
        if g.pay_day(dt, 28):
            g.bank(bank, g.ts(d, 18, 20), "DBIT", rng.choice([100, 150, 200]), "xfer_out",
                   {"name": "Service de transfert Afrique"}, "ENVOI FAMILLE", "FAMI", charges_major=3)
        if wd == 5 and rng.random() < 0.9:
            g.bank(bank, g.ts(d, 10, 19), "DBIT", rng.randint(30, 95), "card",
                   {"name": "Supermarché Étoile", "merchantCode": "5411"}, "PAIEMENT CB SUPERMARCHÉ ÉTOILE")
        if wd < 5 and rng.random() < 0.2:
            g.bank(bank, g.ts(d, 8, 14), "DBIT", rng.randint(4, 18), "card",
                   {"name": "Café du Canal", "merchantCode": "5812"}, "PAIEMENT CB CAFÉ DU CANAL")


# ── output ───────────────────────────────────────────────────────────────
def rows(t: Template):
    """(account_key, seq, offset, entry, tag, band, cum) with seq per account from 1, cum = signed running sum."""
    seqs: dict[str, int] = {}
    cums: dict[str, int] = {}
    for e in t.events:
        seqs[e.acct] = seqs.get(e.acct, 0) + 1
        cums[e.acct] = cums.get(e.acct, 0) + e.signed()
        yield e.acct, seqs[e.acct], e.offset, e.entry, e.tag, e.band, cums[e.acct]


def canonical(templates: list[Template]) -> str:
    doc = []
    for t in templates:
        doc.append({
            "id": t.id, "kind": t.kind, "profile_id": t.profile_id, "description": t.description, "tz": t.tz,
            "accounts": [a.__dict__ for a in t.accounts],
            "entries": [list(r) for r in rows(t)],
            "security_events": [[i + 1, s.offset, s.type, s.details, s.tag] for i, s in enumerate(t.sec)],
            "wealth": t.wealth})
    return json.dumps(doc, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def digest(templates: list[Template] | None = None) -> str:
    return hashlib.sha256(canonical(templates or build_all()).encode()).hexdigest()


def version_tag(templates: list[Template]) -> str:
    return f"{GENERATOR_VERSION}+{digest(templates)[:12]}"


def _lit(s: str | None) -> str:
    return "null" if s is None else "'" + s.replace("'", "''") + "'"


def sql_statements(templates: list[Template] | None = None, chunk: int = 800):
    """SQL to (re)load every template; each statement is small enough for the Management API.
    A template whose generator_version is unchanged is skipped (idempotent)."""
    templates = templates or build_all()
    ver = version_tag(templates)
    for t in templates:
        head = (
            f"do $$ begin if exists (select 1 from sim.templates where id = {_lit(t.id)} "
            f"and generator_version = {_lit(ver)}) then raise exception 'gp_skip'; end if; end $$;")
        yield t.id, "check", head
        stmts = [
            f"delete from sim.template_security_events where template_id = {_lit(t.id)};",
            f"delete from sim.template_wealth where template_id = {_lit(t.id)};",
            f"delete from sim.template_accounts where template_id = {_lit(t.id)};",
            "insert into sim.templates (id, kind, profile_id, description, generator_version, seed, timezone, "
            f"country) values ({_lit(t.id)}, {_lit(t.kind)}, {_lit(t.profile_id)}, {_lit(t.description)}, 'loading', "
            f"{SEED}, {_lit(t.tz)}, {_lit(t.country)}) on conflict (id) do update set kind = excluded.kind, "
            "profile_id = excluded.profile_id, description = excluded.description, generator_version = 'loading', "
            "seed = excluded.seed, timezone = excluded.timezone, country = excluded.country;",
        ]
        for a in t.accounts:
            stmts.append("insert into sim.template_accounts (template_id, key, kind, institution, currency, "
                         f"opening_balance_minor) values ({_lit(t.id)}, {_lit(a.key)}, {_lit(a.kind)}, "
                         f"{_lit(a.institution)}, {_lit(a.currency)}, {a.opening});")
        yield t.id, "head", "\n".join(stmts)
        rs = list(rows(t))
        for i in range(0, len(rs), chunk):
            payload = json.dumps([{"k": k, "s": s, "o": o, "e": e, "t": tag, "b": band, "c": cum}
                                  for k, s, o, e, tag, band, cum in rs[i:i + chunk]],
                                 ensure_ascii=False, separators=(",", ":"))
            yield t.id, "entries", (
                "insert into sim.template_entries (template_id, account_key, seq, offset_s, entry, scenario_tag, "
                "expected_band, cum_minor) select " + _lit(t.id) + ", r.k, r.s, r.o, r.e, r.t, r.b, r.c from "
                "jsonb_to_recordset(" + _lit(payload) + "::jsonb) as r(k text, s int, o bigint, e jsonb, t text, "
                "b text, c bigint);")
        if t.sec:
            payload = json.dumps([{"s": i + 1, "o": s.offset, "y": s.type, "d": s.details, "t": s.tag}
                                  for i, s in enumerate(t.sec)], ensure_ascii=False, separators=(",", ":"))
            yield t.id, "sec", (
                "insert into sim.template_security_events (template_id, seq, offset_s, type, details, scenario_tag) "
                "select " + _lit(t.id) + ", r.s, r.o, r.y, r.d, r.t from jsonb_to_recordset(" + _lit(payload)
                + "::jsonb) as r(s int, o bigint, y text, d jsonb, t text);")
        if t.wealth:
            payload = json.dumps(t.wealth, ensure_ascii=False, separators=(",", ":"))
            yield t.id, "wealth", (
                "insert into sim.template_wealth (template_id, seq, item) select " + _lit(t.id)
                + ", ord::int, item from jsonb_array_elements(" + _lit(payload)
                + "::jsonb) with ordinality as w(item, ord);")
        yield t.id, "done", f"update sim.templates set generator_version = {_lit(ver)} where id = {_lit(t.id)};"


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--digest", action="store_true")
    ap.add_argument("--sql", action="store_true", help="print one SQL script (local psql); no skip check")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args(argv)
    ts = build_all()
    if a.digest:
        print(digest(ts))
    if a.stats:
        for t in ts:
            tags = {}
            for e in t.events:
                if e.tag and e.band != "none":
                    tags[e.tag] = tags.get(e.tag, 0) + 1
            print(t.id, len(t.events), "entries,", len(t.sec), "security events,", tags)
    if a.sql:
        out = sys.stdout
        out.write("begin;\n")
        for _tid, kind, stmt in sql_statements(ts):
            if kind != "check":
                out.write(stmt + "\n")
        out.write("commit;\n")


if __name__ == "__main__":
    main()
