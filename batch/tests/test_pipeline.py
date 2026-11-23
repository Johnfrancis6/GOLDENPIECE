"""Pipeline on a synthetic market and user: hand-checkable values end to end."""
import datetime as dt

import numpy as np
import pytest

from goldenpiece.analytics import pipeline as pl

TODAY = dt.date(2026, 11, 23)


def market(n_days=1200, drift=0.0005, seed=1):
    g0 = TODAY - dt.timedelta(days=n_days)
    rng = np.random.default_rng(seed)
    bars = []
    p = 100.0
    q = 50.0
    for k in range(n_days + 1):
        d = g0 + dt.timedelta(days=k)
        p *= 1 + drift + rng.normal(0, 0.01)
        q *= 1 + rng.normal(0, 0.02)
        if d.weekday() < 5:
            bars.append({"instrument_id": "AAA", "d": d.isoformat(), "c": p})
        bars.append({"instrument_id": "CRY", "d": d.isoformat(), "c": q})
    inst = [
        {"id": "AAA", "asset_class": "etf", "currency": "USD", "country": "US", "sector": "broad",
         "benchmark_id": None, "in_risk": True, "frequency": "intraday"},
        {"id": "CRY", "asset_class": "crypto", "currency": "USD", "country": None, "sector": "crypto",
         "benchmark_id": "AAA", "in_risk": True, "frequency": "intraday"},
        {"id": "MON", "asset_class": "commodity", "currency": "USD", "country": None, "sector": "agri",
         "benchmark_id": None, "in_risk": False, "frequency": "monthly"},
    ]
    bars.append({"instrument_id": "MON", "d": (TODAY - dt.timedelta(days=60)).isoformat(), "c": 10})
    fx = [{"d": (g0 + dt.timedelta(days=k)).isoformat(), "quote": "USD", "rate": 1.10} for k in range(n_days + 1)]
    return pl.build_market(TODAY, inst, bars, [], fx, [])


def user(trades, accounts=(), tx=(), re_=(), debts=(), ref="XOF"):
    return pl.UserData(user_id="u1", ref=ref, country="SN", threshold_pct=25, accounts=list(accounts),
                       tx_days=list(tx), trades=list(trades), corp=[], real_estate=list(re_), debts=list(debts))


def test_constant_fx_no_currency_effect_and_twr_matches_price():
    m = market()
    buy = TODAY - dt.timedelta(days=200)
    u = user([{"instrument_id": "AAA", "side": "buy", "trade_date": buy.isoformat(), "quantity": 10,
               "price_minor": int(round(m.price["AAA"][m.idx(buy)] * 100)), "currency": "USD", "fees_minor": 0}])
    r = pl.compute_user(m, u)
    itd = next(p for p in r.performance if p["period"] == "ITD")
    # bought at the close of day `buy`: TWR = P_today / P_buy − 1 (rounding of the trade price only)
    expect = m.price["AAA"][-1] / (round(m.price["AAA"][m.idx(buy)] * 100) / 100) - 1
    assert itd["twr"] == pytest.approx(expect, abs=1e-9)
    assert itd["irr"] == pytest.approx(expect, abs=1e-6)          # one flow, < 1 year: IRR = TWR
    a = [x for x in r.attribution if x["period"] == "ITD" and x["level"] == "instrument"][0]
    assert a["currency_effect"] == pytest.approx(0, abs=1e-12)
    # value in XOF: qty × price × 655.957 / 1.10
    last = [x for x in r.portfolio if x["d"] == TODAY.isoformat()][0]
    assert last["value_ref_minor"] == round(10 * m.price["AAA"][-1] * 655.957 / 1.10)


def test_risk_figures_and_minimums():
    m = market()
    t = [{"instrument_id": i, "side": "buy", "trade_date": (TODAY - dt.timedelta(days=30)).isoformat(),
          "quantity": q, "price_minor": 1000, "currency": "USD", "fees_minor": 0}
         for i, q in (("AAA", 5), ("CRY", 3), ("MON", 2))]
    r = pl.compute_user(m, user(t))
    rk = {(x["metric"], x["scope"]): x for x in r.risk}
    assert rk[("vol_ann", "portfolio")]["status"] == "ok"
    v1 = rk[("var95_1d", "portfolio")]
    assert v1["status"] == "ok" and v1["n_obs"] >= 1000
    assert rk[("var95_1m", "portfolio")]["value"] == pytest.approx(v1["value"] * 21 ** 0.5, rel=1e-6)
    assert rk[("cvar95_1d", "portfolio")]["value"] >= v1["value"]
    assert rk[("var95_1m_hist", "portfolio")]["status"] == "ok"
    assert rk[("beta", "AAA")]["value"] == 1.0                     # its own benchmark
    assert rk[("excluded", "MON")]["method"] == "risk.excluded.monthly_price"
    # drawdown from the user's own 30 days: exactly 30 → ok
    assert rk[("max_drawdown", "portfolio")]["n_obs"] == 31


def test_short_history_is_insufficient():
    m = market(n_days=100)
    t = [{"instrument_id": "AAA", "side": "buy", "trade_date": (TODAY - dt.timedelta(days=10)).isoformat(),
          "quantity": 1, "price_minor": 10000, "currency": "USD", "fees_minor": 0}]
    r = pl.compute_user(m, user(t))
    rk = {(x["metric"], x["scope"]): x for x in r.risk}
    assert rk[("vol_ann", "portfolio")]["status"] == "ok"            # ≈ 70 weekday returns ≥ 60
    assert rk[("var95_1d", "portfolio")]["status"] == "insufficient"  # < 250
    assert rk[("max_drawdown", "portfolio")]["status"] == "insufficient"  # 11 days < 30


def test_cash_history_networth_debts_real_estate_concentration():
    m = market(n_days=60)
    d1 = TODAY - dt.timedelta(days=5)
    acc = [{"id": "a1", "kind": "bank", "currency": "XOF", "balance_minor": 100000},
           {"id": "a2", "kind": "momo", "currency": "XOF", "balance_minor": 5000}]
    tx = [{"account_id": "a1", "d": d1.isoformat(), "net_minor": 30000},
          {"account_id": "a1", "d": (TODAY - dt.timedelta(days=40)).isoformat(), "net_minor": -1000}]
    re_ = [{"id": "r1", "name": "Terrain", "country": "SN", "currency": "XOF",
            "valuations": [[(TODAY - dt.timedelta(days=20)).isoformat(), 1000000]]}]
    debts = [{"id": "d1", "currency": "XOF", "balance_minor": 50000, "start_date": "2020-01-01"}]
    r = pl.compute_user(m, user([], acc, tx, re_, debts))
    nw = {x["d"]: x for x in r.networth}
    # before d1 the bank held 100000 − 30000 = 70000
    assert nw[(d1 - dt.timedelta(days=1)).isoformat()]["by_class"]["cash"] == 70000
    assert nw[TODAY.isoformat()]["assets_minor"] == 100000 + 5000 + 1000000
    assert nw[TODAY.isoformat()]["net_minor"] == 1105000 - 50000
    assert nw[(TODAY - dt.timedelta(days=21)).isoformat()]["by_class"].get("real_estate") is None
    cls = {x["key"]: x["share"] for x in r.exposures if x["axis"] == "class"}
    assert sum(cls.values()) == pytest.approx(1.0)
    # only real estate among investments -> 100 % > 25 %
    assert r.breaches and r.breaches[0]["key"] == "RE:r1" and r.breaches[0]["name"] == "Terrain"


def test_sell_flows_and_pnl():
    m = market(n_days=400)
    b = TODAY - dt.timedelta(days=300)
    s = TODAY - dt.timedelta(days=100)
    pb = m.price["CRY"][m.idx(b)]; ps = m.price["CRY"][m.idx(s)]
    t = [{"instrument_id": "CRY", "side": "buy", "trade_date": b.isoformat(), "quantity": 2,
          "price_minor": int(round(pb * 100)), "currency": "USD", "fees_minor": 0},
         {"instrument_id": "CRY", "side": "sell", "trade_date": s.isoformat(), "quantity": 2,
          "price_minor": int(round(ps * 100)), "currency": "USD", "fees_minor": 0}]
    r = pl.compute_user(m, user(t, ref="USD"))
    itd = next(p for p in r.performance if p["period"] == "ITD")
    # P/L = proceeds − cost, in USD cents
    assert itd["pnl_ref_minor"] == pytest.approx(round(2 * round(ps * 100)) - round(2 * round(pb * 100)), abs=2)
    assert itd["twr"] == pytest.approx((round(ps * 100) / round(pb * 100)) - 1, abs=1e-9)
