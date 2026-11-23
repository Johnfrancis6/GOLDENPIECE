"""Hand-checked finance cases (G8). Each expected value is worked out in the comment."""
import math

import numpy as np
import pytest

from goldenpiece.analytics import finance as fn


def test_flow_returns_buy_hold_sell():
    # day 0: buy 100 (start of day), worth 102 at close  -> r = (102-0-100)/(0+100) = 0.02
    # day 1: no flow, 99                                   -> r = (99-102)/102
    # day 2: sell 50 at close, 51 left                     -> r = (51-99+50)/99 = 2/99
    r, den = fn.flow_returns(np.array([102.0, 99.0, 51.0]), np.array([100.0, 0.0, -50.0]))
    assert r == pytest.approx([0.02, -3 / 102, 2 / 99])
    assert den == pytest.approx([100, 102, 99])
    # TWR = 1.02 · 99/102 · 101/99 − 1 = 101/100 − 1
    assert fn.twr(r) == pytest.approx(0.01)


def test_flow_returns_full_sale_and_empty_days():
    # held 100, sold everything at 105 at close -> +5 %; next day nothing invested -> 0
    r, _ = fn.flow_returns(np.array([0.0, 0.0]), np.array([-105.0, 0.0]), v_prev0=100.0)
    assert r == pytest.approx([0.05, 0.0])


def test_irr_simple():
    assert fn.irr(np.array([0, 365]), np.array([-1000.0, 1100.0])) == pytest.approx(0.10, abs=1e-9)
    # -100 now, -100 in one year, +231 in two years: 100(1+r)^2 + 100(1+r) = 231 -> r = 0.10
    assert fn.irr(np.array([0, 365, 730]), np.array([-100.0, -100.0, 231.0])) == pytest.approx(0.10, abs=1e-9)
    assert fn.irr(np.array([0, 365]), np.array([100.0, 50.0])) is None  # no sign change


def test_irr_bisection_fallback():
    # deep loss: -100 then +1 a year later -> r = -0.99 (Newton from 0.1 overshoots)
    assert fn.irr(np.array([0, 365]), np.array([-100.0, 1.0])) == pytest.approx(-0.99, abs=1e-6)


def test_period_irr_annual_and_short():
    v = np.full(365, 100.0); v[-1] = 110.0
    assert fn.period_irr(100.0, v, np.zeros(365), 365) == pytest.approx(0.10, abs=1e-9)
    # 182 days, 100 -> 105 with no flow: the period rate is 5 % whatever the annual rate
    v = np.full(182, 100.0); v[-1] = 105.0
    assert fn.period_irr(100.0, v, np.zeros(182), 182) == pytest.approx(0.05, abs=1e-9)


def test_hist_var_cvar():
    # 40 returns: -0.20, -0.10, then 38 × +0.01. k = ceil(0.05·40) = 2
    r = np.array([-0.20, -0.10] + [0.01] * 38)
    var, cvar, k = fn.hist_var(r)
    assert k == 2 and var == pytest.approx(0.10) and cvar == pytest.approx(0.15)
    # 250 returns: k = ceil(12.5) = 13 (≥ 12 tail points, ARCHITECTURE §14)
    _, _, k = fn.hist_var(np.linspace(-0.1, 0.1, 250))
    assert k == 13


def test_one_month_scaling():
    assert 0.02 * math.sqrt(21) == pytest.approx(0.0916515, abs=1e-6)


def test_overlapping():
    # (1.1·1.1) − 1 = 0.21 ; (1.1·0.5) − 1 = −0.45
    assert fn.overlapping(np.array([0.1, 0.1, -0.5]), 2) == pytest.approx([0.21, -0.45])


def test_vol_and_beta():
    r = np.array([0.01, -0.01, 0.01, -0.01])
    # mean 0, sample var = 4·1e-4/3 -> std = 0.0115470; × √252
    assert fn.vol_ann(r, 252) == pytest.approx(math.sqrt(4e-4 / 3) * math.sqrt(252))
    rb = np.array([0.01, -0.02, 0.03, 0.0])
    assert fn.beta(2 * rb, rb) == pytest.approx(2.0)
    assert fn.beta(rb + 0.001, rb) == pytest.approx(1.0)


def test_drawdown():
    # index 1.1, 0.55, 1.1 -> peaks 1.1, 1.1, 1.1 -> dd 0, -0.5, 0
    assert fn.drawdown(np.array([0.1, -0.5, 1.0])) == pytest.approx([0.0, -0.5, 0.0])
    # a first loss counts from the start value 1.0
    assert fn.drawdown(np.array([-0.1])) == pytest.approx([-0.1])


def test_attribution_with_currency_effect():
    # A (USD): 100 -> 110 local (+10 %), USD +5 % vs ref: 100 -> 115.5 ref (+15.5 %)
    # B (ref ccy): 100 -> 100. Weights 0.5 / 0.5.
    series = {
        "A": (np.array([115.5]), np.zeros(1), np.array([110.0]), np.zeros(1)),
        "B": (np.array([100.0]), np.zeros(1), np.array([100.0]), np.zeros(1)),
    }
    res, rp = fn.attribution(series, prev={"A": (100.0, 100.0), "B": (100.0, 100.0)})
    a = {x.key: x for x in res}
    assert a["A"].avg_weight == pytest.approx(0.5)
    assert a["A"].return_local == pytest.approx(0.10) and a["A"].return_ref == pytest.approx(0.155)
    assert a["A"].contribution == pytest.approx(0.0775)
    assert a["A"].currency_effect == pytest.approx(0.0275)
    assert a["B"].contribution == pytest.approx(0.0)
    assert rp == pytest.approx([0.0775])          # Σ contributions = portfolio return


def test_attribution_sums_to_portfolio_return_with_flows():
    rng = np.random.default_rng(7)
    n = 30
    series = {}
    for k in ("X", "Y", "Z"):
        vl = 100 * np.cumprod(1 + rng.normal(0, 0.01, n))
        fx = np.cumprod(1 + rng.normal(0, 0.002, n))
        f = np.zeros(n); f[10] = 20.0
        vl[10:] += 20.0
        series[k] = (vl * fx, f * fx, vl, f)
    _, rp = fn.attribution(series)
    tot_v = sum(s[0] for s in series.values())
    tot_f = sum(s[1] for s in series.values())
    r, _ = fn.flow_returns(tot_v, tot_f)
    assert rp == pytest.approx(r, abs=1e-12)
