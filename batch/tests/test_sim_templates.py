"""Simulated-bank templates (B2): determinism, balances, scenario mix, identifiers."""
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

import pytest

from goldenpiece.generator import iban as ib
from goldenpiece.generator import sim_templates as st

ROOT = Path(__file__).resolve().parents[2]
TEMPLATES = st.build_all()
BY_ID = {t.id: t for t in TEMPLATES}


def test_same_seed_same_data_in_a_fresh_process():
    """BUILD_PLAN B2 'same seed = same data': a new interpreter (other hash seed) gives the same digest,
    and it matches the committed digest."""
    out = subprocess.run([sys.executable, "-m", "goldenpiece.generator.sim_templates", "--digest"],
                         cwd=ROOT / "batch", capture_output=True, text=True, check=True,
                         env={"PYTHONHASHSEED": "12345", "PATH": "/usr/bin:/bin"}).stdout.strip()
    assert out == st.digest(TEMPLATES)
    assert out == (ROOT / "shared/fixtures/sim_templates.sha256").read_text().strip(), \
        "generator output changed: run `python3 -m goldenpiece.generator.sim_templates --digest > " \
        "../shared/fixtures/sim_templates.sha256` and reload dev (scripts/sb_api.py load-sim)"


def test_expected_templates():
    assert set(BY_ID) == {"persona_dakar_salaried", "persona_abidjan_trader", "persona_diaspora_investor",
                          "acct_bank_uemoa", "acct_bank_cemac", "acct_bank_eur", "acct_momo_uemoa",
                          "acct_momo_cemac", "new_wallet_uemoa", "new_wallet_cemac"}


@pytest.mark.parametrize("tid", sorted(BY_ID))
def test_balances_never_negative_and_cum_consistent(tid):
    t = BY_ID[tid]
    opening = {a.key: a.opening for a in t.accounts}
    for key, seq, off, entry, tag, band, cum in st.rows(t):
        assert opening[key] + cum >= 0, (tid, key, seq)


@pytest.mark.parametrize("tid", sorted(BY_ID))
def test_twelve_months_each_side(tid):
    offs = [e.offset for e in BY_ID[tid].events]
    assert max(offs) > (st.FUTURE_DAYS - 20) * st.DAY
    if not tid.startswith("new_wallet"):
        assert min(offs) < -(st.PAST_DAYS - 20) * st.DAY
    else:
        assert min(offs) >= 0


def test_entries_validate_against_provider_entry_schema():
    from tests.test_schemas import validator
    v = validator("provider_entry.json")
    for t in TEMPLATES:
        for i, (key, seq, off, entry, *_rest) in enumerate(st.rows(t)):
            if i % 7:
                continue
            full = {**entry, "providerEntryId": f"x-{key}-S{seq}", "accountId": key,
                    "bookingTs": "2026-01-05T10:00:00Z", "valueDate": "2026-01-05"}
            if "momo" in full:
                full["momo"] = {**full["momo"], "operatorRef": "R1", "balanceAfterMinor": 1}
            v.validate(full)


def test_persona_future_scenarios_frequency_and_mix():
    """§7.8: one injected event every 2-4 days in the future, 08-21 local, ≈60/25/15 ask/bank/budget."""
    for tid in ("persona_dakar_salaried", "persona_abidjan_trader", "persona_diaspora_investor"):
        t = BY_ID[tid]
        fut = [e for e in t.events if e.tag and e.offset > 0 and e.band in ("ask", "bank")
               or (e.tag == "budget_overspend" and e.offset > 0)]
        days = sorted({e.offset // st.DAY for e in fut})
        assert 80 <= len(days) <= 140, (tid, len(days))
        for e in fut:
            h = (e.offset % st.DAY) // 3600
            assert 8 <= h <= 21, (tid, e.tag, h)
        bands = Counter("budget" if e.tag == "budget_overspend" else e.band for e in fut)
        total = sum(bands.values())
        assert 0.45 < bands["ask"] / total < 0.75 and 0.12 < bands["bank"] / total < 0.40, bands


def test_ground_truth_labels():
    tags = Counter(e.tag for t in TEMPLATES for e in t.events if e.tag)
    for tag in ("anomaly_amount", "R1_sim_swap", "R3_fake_deposit", "R4_mule", "R5_fake_investment",
                "budget_overspend", "drain_new_payee", "anomaly_hour"):
        assert tags[tag] > 0, tag
    for t in TEMPLATES:
        for s in t.sec:
            assert s.details["accountKey"] in {a.key for a in t.accounts}
            # the cash-out of an R1 scenario follows its SIM swap within the hour
            assert any(e.tag == "R1_sim_swap" and 0 < e.offset - s.offset <= 3600 for e in t.events)


def test_only_fictitious_institutions():
    banks = {"banque_baobab", "banque_fleuve", "banque_lagune", "caisse_sahel", "caisse_horizon",
             "banque_equateur", "bank_demo", "*"}
    ops = {"kola_money", "savane_pay", "teranga_mobile", "lagune_cash", "sanaga_pay", "ogooue_money", "*"}
    for t in TEMPLATES:
        for a in t.accounts:
            assert a.institution in (banks if a.kind == "bank" else ops)
        for e in t.events:
            if "momo" in e.entry:
                assert e.entry["momo"]["operator"] in ops
            ms = e.entry.get("counterparty", {}).get("msisdn")
            if ms:
                assert ms[len(ms) - 9:len(ms) - 7] == "99", ms     # fictitious prefix 99


def test_iban_fixtures_and_validity():
    for c in json.loads((ROOT / "shared/fixtures/iban.json").read_text()):
        assert ib.iban(c["country"], c["bank"], c["branch"], c["account"]) == c["iban"]
        assert ib.is_valid_iban(c["iban"])
        assert len(c["iban"]) == (28 if c["country"] in ib.UEMOA else 27)
    for t in TEMPLATES:
        for e in t.events:
            iban = e.entry.get("counterparty", {}).get("iban")
            if iban:
                assert ib.is_valid_iban(iban), iban


def test_sql_statements_shape():
    stmts = list(st.sql_statements(TEMPLATES))
    kinds = Counter(k for _, k, _ in stmts)
    assert kinds["check"] == kinds["done"] == len(TEMPLATES)
    assert max(len(s) for *_x, s in stmts) < 2_000_000
