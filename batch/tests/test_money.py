import json
from pathlib import Path

import pytest

from goldenpiece import money

FIX = json.loads((Path(__file__).resolve().parents[2] / "shared/fixtures/money.json").read_text())


def run(case):
    a = case["args"]
    op = case["op"]
    if op == "exponent":
        return money.exponent(a["currency"])
    if op == "div_round":
        return money.div_round(int(a["n"]), int(a["d"]))
    if op == "parse":
        return money.parse(a["amount"], a["currency"])
    if op == "format":
        return money.format_major(a["minor"], a["currency"])
    if op == "convert":
        return money.convert(a["minor"], a["from"], a["to"], a["usd_per_eur"])
    if op == "allocate":
        return money.allocate(a["minor"], a["weights"])
    raise AssertionError(op)


@pytest.mark.parametrize("case", FIX["cases"], ids=lambda c: c["op"])
def test_fixture(case):
    assert run(case) == case["expect"]


def test_fixture_count():
    assert len(FIX["cases"]) >= 200


def test_errors():
    with pytest.raises(money.MoneyError):
        money.exponent("GBP")
    with pytest.raises(money.MoneyError):
        money.convert(1, "EUR", "USD")
    with pytest.raises(money.MoneyError):
        money.parse("1e5", "EUR")
