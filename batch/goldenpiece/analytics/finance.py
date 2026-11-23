"""Finance math of the nightly batch (B4). Pure functions, numpy only.

Conventions (shared with the SQL of api.get_performance_custom; see
docs/API.md §2.7-§2.8 and ARCHITECTURE §14):

- Daily return with external flows F_t (buy +, sell −, dividend −):
  buys count at the start of the day, sells at the end, so
      r_t = (V_t − V_{t−1} − F_t) / (V_{t−1} + max(F_t, 0))
  and r_t = 0 when the denominator is 0 (nothing invested that day).
- TWR = Π(1 + r_t) − 1 (chain-linked). Annualised only if the period is ≥ 365 days.
- IRR: investor cash flows −V_start at time 0, −F_t on day t (buys at the start
  of the day, sells at its end, as for TWR), +V_end at the end of the last day; Σ cf·(1+r)^(−days/365) = 0 by Newton (≤ 50 iterations), bisection
  fallback; None when no sign change. Reported as an annual rate when the
  period is ≥ 365 days, else as the period-equivalent rate.
- Attribution: w_i,t = (V_i,t−1 + max(F_i,t, 0)) / Σ_j (same); contribution_i =
  Σ_t w_i,t·r_i,t (ref currency); currency effect_i = Σ_t w_i,t·(r_i,t ref − r_i,t local).
- Historical VaR / CVaR 95 %: k = ⌈0.05·n⌉ worst returns; VaR = −r_(k),
  CVaR = −mean(k worst). Positive numbers are losses (fraction of value).
- 1-month = 1-day × √21 (C5); overlapping 21-day compounded returns as a check.
- Volatility: sample stdev (ddof 1) × √(observations per year). Beta: cov/var, ddof 1.
- Drawdown: I_t = Π(1 + r_t); dd_t = I_t / max_{s≤t} I_s − 1 (≤ 0).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

# ARCHITECTURE §14 "Minimum data"
MIN_VOL = 60
MIN_BETA = 120
MIN_VAR = 250
MIN_VAR_OVERLAP = 500
MIN_DRAWDOWN_DAYS = 30
CONF = 0.95
MONTH_DAYS = 21


def flow_returns(v: np.ndarray, f: np.ndarray, v_prev0: float = 0.0) -> tuple[np.ndarray, np.ndarray]:
    """Daily returns and their denominators for a value series with flows.
    v[t] value at end of day t (after flows), f[t] external flow on day t,
    v_prev0 value at the end of the day before v[0]."""
    v = np.asarray(v, dtype=float)
    f = np.asarray(f, dtype=float)
    prev = np.concatenate(([v_prev0], v[:-1]))
    den = prev + np.maximum(f, 0.0)
    num = v - prev - f
    r = np.divide(num, den, out=np.zeros_like(num), where=np.abs(den) > 1e-12)
    return r, den


def twr(r: np.ndarray) -> float:
    return float(np.prod(1.0 + np.asarray(r, dtype=float)) - 1.0)


def annualise(total: float, days: int) -> float:
    return (1.0 + total) ** (365.0 / days) - 1.0


def _npv(rate: float, t: np.ndarray, cf: np.ndarray) -> float:
    return float(np.sum(cf * (1.0 + rate) ** (-t)))


def irr(days: np.ndarray, cf: np.ndarray, max_iter: int = 50, tol: float = 1e-10) -> float | None:
    """Annual IRR of dated cash flows (days from the first flow). None if not computable."""
    t = np.asarray(days, dtype=float) / 365.0
    cf = np.asarray(cf, dtype=float)
    if not (np.any(cf > 0) and np.any(cf < 0)):
        return None
    r = 0.1
    for _ in range(max_iter):
        base = 1.0 + r
        if base <= 0:
            break
        val = float(np.sum(cf * base ** (-t)))
        der = float(np.sum(-t * cf * base ** (-t - 1.0)))
        if der == 0 or not math.isfinite(val) or not math.isfinite(der):
            break
        nr = r - val / der
        if not math.isfinite(nr) or nr <= -0.9999:
            break
        if abs(nr - r) < tol:
            return nr
        r = nr
    lo, hi = -0.9999, 10.0
    flo, fhi = _npv(lo, t, cf), _npv(hi, t, cf)
    if not (math.isfinite(flo) and math.isfinite(fhi)) or flo * fhi > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2.0
        fm = _npv(mid, t, cf)
        if fm == 0 or (hi - lo) < tol:
            return mid
        if flo * fm < 0:
            hi, fhi = mid, fm
        else:
            lo, flo = mid, fm
    return (lo + hi) / 2.0


def period_irr(v_start: float, v: np.ndarray, f: np.ndarray, days: int) -> float | None:
    """IRR over a period of `days` days (len(v) == days): annual if ≥ 365 days, else period rate."""
    n = len(v)
    t = [0.0]
    cf = [-float(v_start)]
    for i in range(n):
        if f[i] != 0:
            t.append(float(i) if f[i] > 0 else i + 1.0)   # buys at the start of the day, sells at the end
            cf.append(-float(f[i]))
    t.append(float(n))
    cf.append(float(v[-1]))
    r = irr(np.array(t), np.array(cf))
    if r is None:
        return None
    return r if days >= 365 else (1.0 + r) ** (days / 365.0) - 1.0


def hist_var(r: np.ndarray, conf: float = CONF) -> tuple[float, float, int]:
    """(VaR, CVaR, k) of a return sample; positive = loss."""
    s = np.sort(np.asarray(r, dtype=float))
    k = max(1, math.ceil((1.0 - conf) * len(s) - 1e-9))
    return float(-s[k - 1]), float(-np.mean(s[:k])), k


def overlapping(r: np.ndarray, h: int = MONTH_DAYS) -> np.ndarray:
    """Overlapping h-day compounded returns."""
    lg = np.log1p(np.asarray(r, dtype=float))
    c = np.concatenate(([0.0], np.cumsum(lg)))
    return np.expm1(c[h:] - c[:-h])


def vol_ann(r: np.ndarray, per_year: float) -> float:
    return float(np.std(np.asarray(r, dtype=float), ddof=1) * math.sqrt(per_year))


def beta(r: np.ndarray, rb: np.ndarray) -> float:
    r = np.asarray(r, dtype=float)
    rb = np.asarray(rb, dtype=float)
    vb = np.var(rb, ddof=1)
    if vb == 0:
        return float("nan")
    return float(np.cov(r, rb, ddof=1)[0, 1] / vb)


def drawdown(r: np.ndarray) -> np.ndarray:
    idx = np.cumprod(1.0 + np.asarray(r, dtype=float))
    peak = np.maximum.accumulate(np.maximum(idx, 1.0))
    return idx / peak - 1.0


@dataclass
class Attribution:
    key: str
    avg_weight: float
    return_local: float
    return_ref: float
    contribution: float
    currency_effect: float


def attribution(series: dict[str, tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]],
                prev: dict[str, tuple[float, float]] | None = None) -> tuple[list[Attribution], np.ndarray]:
    """series[key] = (v_ref, f_ref, v_local, f_local) over the same days.
    prev[key] = (v_ref, v_local) the day before the period. Returns per-key
    attribution and the portfolio daily returns (ref)."""
    prev = prev or {}
    keys = list(series)
    if not keys:
        return [], np.zeros(0)
    rr, dr, rl = {}, {}, {}
    for k in keys:
        vr, fr, vl, fl = series[k]
        p = prev.get(k, (0.0, 0.0))
        rr[k], dr[k] = flow_returns(vr, fr, p[0])
        rl[k], _ = flow_returns(vl, fl, p[1])
    den_tot = np.sum([dr[k] for k in keys], axis=0)
    active = np.abs(den_tot) > 1e-12
    out = []
    rp = np.zeros_like(den_tot)
    for k in keys:
        w = np.divide(dr[k], den_tot, out=np.zeros_like(den_tot), where=active)
        rp += w * rr[k]
        out.append(Attribution(
            key=k,
            avg_weight=float(np.mean(w[active])) if active.any() else 0.0,
            return_local=twr(rl[k]),
            return_ref=twr(rr[k]),
            contribution=float(np.sum(w * rr[k])),
            currency_effect=float(np.sum(w * (rr[k] - rl[k]))),
        ))
    return out, rp
