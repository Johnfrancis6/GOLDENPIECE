"""Nightly / per-user analytics (B4). ARCHITECTURE §4.3, §14; DATA_MODEL §2.7.

series (portfolio_daily) → net worth → risk (vol, beta, VaR/CVaR, drawdown)
→ exposures → performance (1M / YTD / 1Y / ITD: TWR, IRR) → attribution
(+ currency effect) → concentration alerts.

`compute_user` is pure (data in, rows out) and unit-tested; `run` does the I/O.
Decisions (also in docs/CHAIN_LOG.md, B4):
- Instruments are valued at the daily close (forward-filled on non-trading
  days); today uses mkt.quotes_latest. FX: base EUR from mkt.fx_daily,
  forward-filled; XOF/XAF at the peg (G6: each day's rate, never today's).
- Cash history = current account balance minus the booked movements after
  each day (bank and mobile money, per account currency).
- Debts: current balance from their start date (no amortisation history) [mine].
- Real estate: last valuation on or before the day (0 before the first).
- Performance and drawdown cover market instruments only (cash, real estate
  and debts are not "placements" with a market return); real estate is in
  net worth, exposures and concentration (design copy concentration.limits).
- Risk = current holdings × historical prices over the last 3 years, on the
  union calendar of the included instruments (forward-filled), observations
  per year measured on that calendar.
"""
from __future__ import annotations

import datetime as dt
import math
import time
from collections import defaultdict
from dataclasses import dataclass, field

import numpy as np

from goldenpiece.money import EXPONENTS
from . import finance as fn
from .db import jlit, lit

PEG = 655.957
RISK_YEARS = 3
SERIES_DAYS = 730            # portfolio/networth kept 2 years (DATA_MODEL §5)
DRAWDOWN_POINTS = 730
ALERT_COOLDOWN_DAYS = 30


def exp10(ccy: str) -> int:
    return 10 ** EXPONENTS.get(ccy, 2)


# ── market data ─────────────────────────────────────────────────────────────
@dataclass
class Market:
    today: dt.date
    g0: dt.date
    n: int
    inst: dict[str, dict]
    price: dict[str, np.ndarray] = field(default_factory=dict)     # local major, ffilled
    has_bar: dict[str, np.ndarray] = field(default_factory=dict)
    per_eur: dict[str, np.ndarray] = field(default_factory=dict)

    def idx(self, d: dt.date) -> int:
        return (d - self.g0).days

    def rate(self, ccy: str) -> np.ndarray:
        """units of `ccy` per EUR over the grid."""
        if ccy == "EUR":
            return np.ones(self.n)
        if ccy in ("XOF", "XAF"):
            return np.full(self.n, PEG)
        if ccy not in self.per_eur:
            raise KeyError(f"no FX history for {ccy}")
        return self.per_eur[ccy]

    def conv(self, src: str, dst: str) -> np.ndarray:
        """multiplier: amount in src (major) × conv = amount in dst (major)."""
        if src == dst:
            return np.ones(self.n)
        return self.rate(dst) / self.rate(src)


def _ffill(a: np.ndarray) -> np.ndarray:
    mask = np.isnan(a)
    idx = np.where(~mask, np.arange(len(a)), 0)
    np.maximum.accumulate(idx, out=idx)
    out = a[idx]
    out[: np.argmax(~mask) if (~mask).any() else len(a)] = np.nan
    return out


def build_market(today: dt.date, instruments: list[dict], bars: list[dict], quotes: list[dict],
                 fx: list[dict], fx_latest: list[dict]) -> Market:
    g0 = dt.date(today.year - RISK_YEARS, today.month, min(today.day, 28)) - dt.timedelta(days=10)
    n = (today - g0).days + 1
    m = Market(today=today, g0=g0, n=n, inst={i["id"]: i for i in instruments})
    raw: dict[str, np.ndarray] = {}
    for b in bars:
        k = (dt.date.fromisoformat(b["d"]) - g0).days
        if 0 <= k < n:
            raw.setdefault(b["instrument_id"], np.full(n, np.nan))[k] = float(b["c"])
    for q in quotes:
        d = dt.date.fromisoformat(q["as_of"][:10])
        iid = q["instrument_id"]
        inst = m.inst.get(iid)
        if inst and inst.get("frequency") not in ("monthly",) and d >= today - dt.timedelta(days=3):
            raw.setdefault(iid, np.full(n, np.nan))[n - 1] = float(q["price"])
    for iid, a in raw.items():
        m.has_bar[iid] = ~np.isnan(a)
        m.price[iid] = _ffill(a)
    fxr: dict[str, np.ndarray] = {}
    for r in fx:
        k = (dt.date.fromisoformat(r["d"]) - g0).days
        if 0 <= k < n:
            fxr.setdefault(r["quote"], np.full(n, np.nan))[k] = float(r["rate"])
        elif k < 0:  # seed value before the grid
            a = fxr.setdefault(r["quote"], np.full(n, np.nan))
            if np.isnan(a[0]):
                a[0] = float(r["rate"])
    for r in fx_latest:
        a = fxr.setdefault(r["quote"], np.full(n, np.nan))
        a[n - 1] = float(r["rate"])
    for q, a in fxr.items():
        f = _ffill(a)
        first = np.argmax(~np.isnan(f))
        f[:first] = f[first]          # back-fill the few days before the first rate
        m.per_eur[q] = f
    return m


# ── per user ────────────────────────────────────────────────────────────────
@dataclass
class UserData:
    user_id: str
    ref: str
    country: str
    threshold_pct: int
    accounts: list[dict]          # id, kind, currency, balance_minor
    tx_days: list[dict]           # account_id, d, net_minor (credits − debits, BOOK)
    trades: list[dict]            # instrument_id, side, trade_date, quantity, price_minor, currency, fees_minor
    corp: list[dict]              # instrument_id, kind, ex_date, ratio, amount_minor, currency
    real_estate: list[dict]       # id, name, country, currency, valuations [[d, minor]]
    debts: list[dict]             # id, currency, balance_minor, start_date
    lang: str = "fr"


@dataclass
class UserResult:
    portfolio: list[dict] = field(default_factory=list)
    networth: list[dict] = field(default_factory=list)
    risk: list[dict] = field(default_factory=list)
    drawdown: list[dict] = field(default_factory=list)
    exposures: list[dict] = field(default_factory=list)
    performance: list[dict] = field(default_factory=list)
    attribution: list[dict] = field(default_factory=list)
    breaches: list[dict] = field(default_factory=list)


def _d(s) -> dt.date:
    return s if isinstance(s, dt.date) else dt.date.fromisoformat(str(s)[:10])


def _minor(x: float, ccy: str) -> int:
    return int(round(x * exp10(ccy)))


def _instrument_series(m: Market, u: UserData, iid: str, lo: int):
    """Daily qty, local value, local flow and price from grid index lo-1 to today.
    Index 0 of the returned arrays is the day before the window (lo − 1)."""
    inst = m.inst[iid]
    ccy = inst["currency"]
    n = m.n - lo + 1
    qty = np.zeros(n)
    flow = np.zeros(n)
    events = []
    for t in u.trades:
        if t["instrument_id"] == iid:
            events.append((_d(t["trade_date"]), 1, t))
    for c in u.corp:
        if c["instrument_id"] == iid:
            events.append((_d(c["ex_date"]), 0, c))     # actions before same-day trades
    events.sort(key=lambda e: (e[0], e[1]))
    price = m.price.get(iid, np.full(m.n, np.nan))[lo - 1:]
    last_trade_px = np.nan
    q = 0.0
    pos = 0
    for k in range(n):
        gk = lo - 1 + k
        day = m.g0 + dt.timedelta(days=gk)
        while pos < len(events) and events[pos][0] <= day:
            ed, kind, e = events[pos]
            pos += 1
            at = k if ed == day else None       # flows only count on their day inside the window
            if kind == 0:
                if e["kind"] == "split" and e.get("ratio"):
                    q *= float(e["ratio"])
                elif e["kind"] == "cash_dividend" and e.get("amount_minor") and at is not None:
                    amt = q * e["amount_minor"] / exp10(e.get("currency") or ccy)
                    flow[at] -= amt * float(m.conv(e.get("currency") or ccy, ccy)[gk])
                continue
            tq = float(e["quantity"])
            tccy = e["currency"]
            px = e["price_minor"] / exp10(tccy) * float(m.conv(tccy, ccy)[gk])
            fee = (e.get("fees_minor") or 0) / exp10(tccy) * float(m.conv(tccy, ccy)[gk])
            last_trade_px = px
            if e["side"] == "buy":
                q += tq
                if at is not None:
                    flow[at] += tq * px + fee
            else:
                sold = min(tq, q)
                q -= sold
                if at is not None:
                    flow[at] -= sold * px - fee
            if q < 1e-12:
                q = 0.0
        qty[k] = q
    px = np.where(np.isnan(price), last_trade_px, price)
    px = np.nan_to_num(px, nan=0.0)
    return qty, qty * px, flow, px


def compute_user(m: Market, u: UserData) -> UserResult:
    res = UserResult()
    today = m.today
    ref = u.ref
    # window start: earliest activity, at most 2 years back
    first = [today]
    first += [_d(t["trade_date"]) for t in u.trades]
    first += [_d(x["d"]) for x in u.tx_days]
    first += [_d(v[0]) for r in u.real_estate for v in r["valuations"]]
    start = max(min(first), today - dt.timedelta(days=SERIES_DAYS - 1), m.g0 + dt.timedelta(days=1))
    lo = m.idx(start)
    days = [start + dt.timedelta(days=k) for k in range(m.n - lo)]
    nd = len(days)

    # instruments (arrays include the day before the window at index 0)
    held = sorted({t["instrument_id"] for t in u.trades if t["instrument_id"] in m.inst})
    inst_s = {}
    for iid in held:
        ccy = m.inst[iid]["currency"]
        qty, vl, fl, px = _instrument_series(m, u, iid, lo)
        c = m.conv(ccy, ref)[lo - 1:]
        inst_s[iid] = dict(qty=qty, vl=vl, fl=fl, px=px, vr=vl * c, fr=fl * c, ccy=ccy)
        for k in range(1, nd + 1):
            if qty[k] > 0 or fl[k] != 0:
                res.portfolio.append(dict(
                    d=days[k - 1].isoformat(), instrument_id=iid, qty=round(float(qty[k]), 10),
                    price_local=round(float(px[k]), 8),
                    value_local_minor=_minor(vl[k], ccy), value_ref_minor=_minor(vl[k] * c[k], ref),
                    flow_ref_minor=_minor(fl[k] * c[k], ref), flow_local_minor=_minor(fl[k], ccy)))

    # cash per account: balance at the end of each day
    tx_by_acc: dict[str, dict[dt.date, int]] = defaultdict(dict)
    for x in u.tx_days:
        tx_by_acc[x["account_id"]][_d(x["d"])] = int(x["net_minor"])
    cash_ccy = defaultdict(lambda: np.zeros(nd))                # ccy → local major
    class_ref = defaultdict(lambda: np.zeros(nd))
    for a in u.accounts:
        ccy = a["currency"]
        bal = np.zeros(nd)
        after = 0
        net = tx_by_acc.get(a["id"], {})
        later = sum(v for d_, v in net.items() if d_ > today)
        cur = (a.get("balance_minor") or 0) - later
        for k in range(nd - 1, -1, -1):
            bal[k] = cur - after
            after += net.get(days[k], 0)
        major = bal / exp10(ccy)
        cash_ccy[ccy] += major
        class_ref["cash" if a["kind"] == "bank" else a["kind"]] += major * m.conv(ccy, ref)[lo:]
    for ccy, major in sorted(cash_ccy.items()):
        c = m.conv(ccy, ref)[lo:]
        for k in range(nd):
            if major[k] != 0:
                res.portfolio.append(dict(
                    d=days[k].isoformat(), instrument_id=f"CASH:{ccy}", qty=round(float(major[k]), 10),
                    price_local=None, value_local_minor=_minor(major[k], ccy),
                    value_ref_minor=_minor(major[k] * c[k], ref), flow_ref_minor=0, flow_local_minor=0))

    # real estate
    re_now = {}
    for r in u.real_estate:
        ccy = r["currency"]
        vals = sorted((_d(v[0]), int(v[1])) for v in r["valuations"])
        c = m.conv(ccy, ref)[lo:]
        v = np.zeros(nd)
        j = -1
        for k in range(nd):
            while j + 1 < len(vals) and vals[j + 1][0] <= days[k]:
                j += 1
            v[k] = vals[j][1] / exp10(ccy) if j >= 0 else 0.0
            if v[k]:
                res.portfolio.append(dict(
                    d=days[k].isoformat(), instrument_id=f"RE:{r['id']}", qty=1, price_local=None,
                    value_local_minor=_minor(v[k], ccy), value_ref_minor=_minor(v[k] * c[k], ref),
                    flow_ref_minor=0, flow_local_minor=0))
        class_ref["real_estate"] += v * c
        re_now[r["id"]] = (r, v[-1] * c[-1], v[-1])

    # debts
    liab = np.zeros(nd)
    for dbt in u.debts:
        ccy = dbt["currency"]
        c = m.conv(ccy, ref)[lo:]
        s = _d(dbt["start_date"]) if dbt.get("start_date") else start
        mask = np.array([d_ >= s for d_ in days])
        liab += mask * (dbt["balance_minor"] / exp10(ccy)) * c

    for iid, s in inst_s.items():
        class_ref[m.inst[iid]["asset_class"]] += s["vr"][1:]
    assets = sum(class_ref.values()) if class_ref else np.zeros(nd)
    for k in range(nd):
        res.networth.append(dict(
            d=days[k].isoformat(), ref_currency=ref, assets_minor=_minor(assets[k], ref),
            liabilities_minor=_minor(liab[k], ref), net_minor=_minor(assets[k] - liab[k], ref),
            by_class={c: _minor(v[k], ref) for c, v in sorted(class_ref.items()) if round(v[k] * exp10(ref))}))

    _exposures(m, u, res, inst_s, cash_ccy, re_now, lo)
    _concentration(m, u, res, inst_s, re_now)
    _risk(m, u, res, inst_s, re_now, days)
    _performance(m, u, res, inst_s, days)
    return res


def _exposures(m, u, res, inst_s, cash_ccy, re_now, lo):
    ref = u.ref
    items = []   # (class, currency, country, sector, value_ref)
    for a in u.accounts:
        ccy = a["currency"]
        v = (a.get("balance_minor") or 0) / exp10(ccy) * float(m.conv(ccy, ref)[-1])
        items.append(("cash" if a["kind"] == "bank" else a["kind"], ccy, u.country, "cash", v))
    for iid, s in inst_s.items():
        i = m.inst[iid]
        items.append((i["asset_class"], i["currency"], i.get("country") or "INTL",
                      i.get("sector") or "other", float(s["vr"][-1])))
    for rid, (r, vref, _) in re_now.items():
        items.append(("real_estate", r["currency"], r.get("country") or u.country, "real_estate", vref))
    items = [x for x in items if x[4] > 0]
    total = sum(x[4] for x in items)
    if total <= 0:
        return
    for ax, pos in (("class", 0), ("currency", 1), ("country", 2), ("sector", 3)):
        agg = defaultdict(float)
        for x in items:
            agg[x[pos]] += x[4]
        for key, v in sorted(agg.items()):
            res.exposures.append(dict(axis=ax, key=key, value_ref_minor=_minor(v, ref), share=v / total))


def _concentration(m, u, res, inst_s, re_now):
    pos = {iid: float(s["vr"][-1]) for iid, s in inst_s.items() if s["vr"][-1] > 0}
    for rid, (r, vref, _) in re_now.items():
        if vref > 0:
            pos[f"RE:{rid}"] = vref
    total = sum(pos.values())
    if total <= 0:
        return
    thr = u.threshold_pct / 100.0
    names = {f"RE:{rid}": r["name"] for rid, (r, _, _) in re_now.items()}
    for iid in inst_s:
        i = m.inst[iid]
        names[iid] = (i.get("name_en") if u.lang == "en" else None) or i.get("name") or iid
    for key, v in sorted(pos.items(), key=lambda kv: -kv[1]):
        share = v / total
        if share > thr:
            res.breaches.append(dict(key=key, name=names.get(key, key), share=share,
                                     threshold_pct=u.threshold_pct))


def _metric(res, metric, value, vref, n_obs, method, status, ref, scope="portfolio"):
    res.risk.append(dict(metric=metric, scope=scope,
                         value=None if value is None or not math.isfinite(value) else round(value, 8),
                         value_ref_minor=None if vref is None else _minor(vref, ref),
                         n_obs=int(n_obs), method=method, status=status))


def _risk(m, u, res, inst_s, re_now, days):
    ref = u.ref
    now = {iid: float(s["vr"][-1]) for iid, s in inst_s.items() if s["qty"][-1] > 0}
    win0 = 0                                       # whole grid = last 3 years
    eligible, hist_n = {}, {}
    for iid, v in now.items():
        i = m.inst[iid]
        if not i.get("in_risk", True) or i.get("frequency") == "monthly":
            continue
        hb = m.has_bar.get(iid)
        n_ret = int(hb[win0:].sum()) - 1 if hb is not None else 0
        hist_n[iid] = n_ret
        eligible[iid] = v
    total_v = sum(now.values())

    def series_for(ids):
        """portfolio daily returns (ref) with constant current weights, union calendar."""
        if not ids:
            return np.zeros(0), 0
        starts = [int(np.argmax(m.has_bar[i])) for i in ids]
        s0 = max(starts)
        cal = np.zeros(m.n, dtype=bool)
        for i in ids:
            cal |= m.has_bar[i]
        cal[:s0] = False
        w = np.array([eligible[i] for i in ids]); w = w / w.sum()
        rets = []
        for i in ids:
            p = m.price[i] * m.conv(m.inst[i]["currency"], ref)
            pv = p[cal]
            rets.append(pv[1:] / pv[:-1] - 1.0)
        return (np.array(rets) * w[:, None]).sum(axis=0), int(cal.sum())

    def included(minimum):
        return sorted(i for i in eligible if hist_n[i] >= minimum)

    span_years = (m.n - 1) / 365.0
    # volatility
    ids = included(fn.MIN_VOL)
    if ids:
        r, ncal = series_for(ids)
        per_year = (ncal - 1) / span_years if ncal > 1 else 252
        if len(r) >= fn.MIN_VOL:
            _metric(res, "vol_ann", fn.vol_ann(r, per_year), None, len(r), "risk.method.vol_hist", "ok", ref)
        else:
            _metric(res, "vol_ann", None, None, len(r), "risk.method.vol_hist", "insufficient", ref)
    else:
        _metric(res, "vol_ann", None, None, 0, "risk.method.vol_hist", "insufficient", ref)
    # VaR / CVaR
    ids = included(fn.MIN_VAR)
    if ids:
        r, _ = series_for(ids)
        vinc = sum(eligible[i] for i in ids)
        if len(r) >= fn.MIN_VAR:
            var, cvar, k = fn.hist_var(r)
            s21 = math.sqrt(fn.MONTH_DAYS)
            _metric(res, "var95_1d", var, var * vinc, len(r), "risk.method.var_hist", "ok", ref)
            _metric(res, "cvar95_1d", cvar, cvar * vinc, len(r), "risk.method.cvar_hist", "ok", ref)
            _metric(res, "var95_1m", var * s21, var * s21 * vinc, len(r), "risk.method.var_sqrt21", "ok", ref)
            _metric(res, "cvar95_1m", cvar * s21, cvar * s21 * vinc, len(r), "risk.method.cvar_sqrt21", "ok", ref)
            if len(r) >= fn.MIN_VAR_OVERLAP:
                o = fn.overlapping(r)
                vo, _, _ = fn.hist_var(o)
                _metric(res, "var95_1m_hist", vo, vo * vinc, len(o), "risk.method.var_overlap21", "ok", ref)
            else:
                _metric(res, "var95_1m_hist", None, None, len(r), "risk.method.var_overlap21", "insufficient", ref)
        else:
            ids = []
    if not ids:
        for mt, mk in (("var95_1d", "var_hist"), ("cvar95_1d", "cvar_hist"), ("var95_1m", "var_sqrt21"),
                       ("cvar95_1m", "cvar_sqrt21"), ("var95_1m_hist", "var_overlap21")):
            _metric(res, mt, None, None, 0, f"risk.method.{mk}", "insufficient", ref)
    # beta: Σ w_i β_i, β_i vs the instrument's benchmark (itself → 1), local currency
    bsum, wsum, nmin = 0.0, 0.0, None
    benchmarks = {x.get("benchmark_id") for x in m.inst.values() if x.get("benchmark_id")}
    for iid in sorted(eligible):
        i = m.inst[iid]
        # a benchmark is its own market (β = 1); no benchmark (commodities, FX) → SPY
        bench = i.get("benchmark_id") or (None if iid in benchmarks else "SPY")
        if bench is None:
            b, nb = 1.0, hist_n[iid]
        else:
            if bench not in m.has_bar:
                continue
            both = m.has_bar[iid] & m.has_bar[bench]
            pa, pb = m.price[iid][both], m.price[bench][both]
            ra, rb = pa[1:] / pa[:-1] - 1, pb[1:] / pb[:-1] - 1
            nb = len(ra)
            if nb < fn.MIN_BETA:
                continue
            b = fn.beta(ra, rb)
        if nb < fn.MIN_BETA or not math.isfinite(b):
            continue
        bsum += eligible[iid] * b; wsum += eligible[iid]
        nmin = nb if nmin is None else min(nmin, nb)
        _metric(res, "beta", b, None, nb, "risk.method.beta_own_benchmark", "ok", ref, scope=iid)
    if wsum > 0:
        _metric(res, "beta", bsum / wsum, None, nmin, "risk.method.beta_own_benchmark", "ok", ref)
    else:
        _metric(res, "beta", None, None, 0, "risk.method.beta_own_benchmark", "insufficient", ref)
    # per-instrument status rows for the "excluded" list (value_ref today)
    for iid, v in now.items():
        i = m.inst[iid]
        if iid not in eligible:
            _metric(res, "excluded", None, v, 0, "risk.excluded.monthly_price", "excluded", ref, scope=iid)
        elif hist_n[iid] < fn.MIN_VOL:
            _metric(res, "excluded", None, v, hist_n[iid], "risk.excluded.insufficient_history", "excluded",
                    ref, scope=iid)
    for rid, (r, vref, _) in re_now.items():
        if vref > 0:
            _metric(res, "excluded", None, vref, 0, "risk.excluded.real_estate", "excluded", ref, scope=f"RE:{rid}")
    # drawdown of the user's own investment series
    if inst_s:
        vr = sum(s["vr"] for s in inst_s.values()); fr = sum(s["fr"] for s in inst_s.values())
        r, den = fn.flow_returns(vr[1:], fr[1:], vr[0])
        active = np.nonzero(den > 0)[0]
        if len(active):
            a0 = active[0]
            rr = r[a0:]
            dd = fn.drawdown(rr)
            n_days = len(rr)
            for k in range(max(0, n_days - DRAWDOWN_POINTS), n_days):
                res.drawdown.append(dict(d=days[a0 + k].isoformat(), drawdown=round(float(dd[k]), 6)))
            st = "ok" if n_days >= fn.MIN_DRAWDOWN_DAYS else "insufficient"
            mdd = float(dd.min())
            _metric(res, "max_drawdown", mdd if st == "ok" else None, None, n_days,
                    "risk.method.drawdown_own", st, ref)
            return
    _metric(res, "max_drawdown", None, None, 0, "risk.method.drawdown_own", "insufficient", ref)


def period_start(period: str, today: dt.date) -> dt.date | None:
    if period == "1M":
        y, mth = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
        return dt.date(y, mth, min(today.day, 28 if mth == 2 else 30)) + dt.timedelta(days=1)
    if period == "YTD":
        return dt.date(today.year, 1, 1)
    if period == "1Y":
        return dt.date(today.year - 1, today.month, min(today.day, 28)) + dt.timedelta(days=1)
    return None


def _group(inst_s, ids, k0, k1):
    """ref/local daily returns and ref denominators of a group over arrays[k0:k1]."""
    rr, rl, den = [], [], []
    for i in ids:
        s = inst_s[i]
        a, d_ = fn.flow_returns(s["vr"][k0:k1], s["fr"][k0:k1], s["vr"][k0 - 1])
        b, _ = fn.flow_returns(s["vl"][k0:k1], s["fl"][k0:k1], s["vl"][k0 - 1])
        rr.append(a); rl.append(b); den.append(d_)
    return np.array(rr), np.array(rl), np.array(den)


def _performance(m, u, res, inst_s, days):
    ref = u.ref
    today = m.today
    ids = sorted(inst_s)
    nd = len(days)
    if ids:
        vr_tot = sum(inst_s[i]["vr"] for i in ids)
        fr_tot = sum(inst_s[i]["fr"] for i in ids)
        has = np.nonzero((vr_tot[1:] > 0) | (fr_tot[1:] != 0))[0]
    else:
        has = np.array([], dtype=int)
    for period in ("1M", "YTD", "1Y", "ITD"):
        ps = period_start(period, today)
        if not len(has):
            res.performance.append(dict(period=period, start_d=(ps or today).isoformat(), twr=None, irr=None,
                                        annualised=False, pnl_ref_minor=None, status="insufficient"))
            continue
        first_active = days[int(has[0])]
        s = first_active if ps is None else max(ps, days[0])
        k0 = (s - days[0]).days + 1                  # array index (0 = day before window)
        k1 = nd + 1
        ndays = k1 - k0
        rr, rl, den = _group(inst_s, ids, k0, k1)
        den_tot = den.sum(axis=0)
        act = den_tot > 1e-12
        if not act.any():
            res.performance.append(dict(period=period, start_d=s.isoformat(), twr=None, irr=None,
                                        annualised=False, pnl_ref_minor=None, status="insufficient"))
            continue
        w = np.divide(den, den_tot, out=np.zeros_like(den), where=act)
        rp = (w * rr).sum(axis=0)
        t = fn.twr(rp)
        annualised = ndays >= 365
        twr_out = fn.annualise(t, ndays) if annualised else t
        v_start = float(vr_tot[k0 - 1])
        irr = fn.period_irr(v_start, vr_tot[k0:k1], fr_tot[k0:k1], ndays)
        pnl = float(vr_tot[k1 - 1] - v_start - fr_tot[k0:k1].sum())
        res.performance.append(dict(period=period, start_d=s.isoformat(), twr=twr_out,
                                    irr=irr, annualised=annualised, pnl_ref_minor=_minor(pnl, ref), status="ok"))
        # attribution: instruments, then classes
        mean_w = lambda wi: float(np.mean(wi[act])) if act.any() else 0.0  # noqa: E731
        for j, i in enumerate(ids):
            if not (den[j] > 0).any():
                continue
            res.attribution.append(dict(
                period=period, level="instrument", key=i, avg_weight=mean_w(w[j]),
                return_local=fn.twr(rl[j]), return_ref=fn.twr(rr[j]),
                contribution=float(np.sum(w[j] * rr[j])), currency_effect=float(np.sum(w[j] * (rr[j] - rl[j])))))
        by_class = defaultdict(list)
        for j, i in enumerate(ids):
            by_class[m.inst[i]["asset_class"]].append(j)
        for cls, js in sorted(by_class.items()):
            dc = den[js].sum(axis=0)
            if not (dc > 0).any():
                continue
            wc = np.divide(den[js], dc, out=np.zeros_like(den[js]), where=dc > 1e-12)
            r_ref_c = (wc * rr[js]).sum(axis=0)
            r_loc_c = (wc * rl[js]).sum(axis=0)
            res.attribution.append(dict(
                period=period, level="class", key=cls, avg_weight=mean_w(w[js].sum(axis=0)),
                return_local=fn.twr(r_loc_c), return_ref=fn.twr(r_ref_c),
                contribution=float(np.sum(w[js] * rr[js])),
                currency_effect=float(np.sum(w[js] * (rr[js] - rl[js])))))


# ── I/O ──────────────────────────────────────────────────────────────────────
def load_market(db, today: dt.date) -> Market:
    since = dt.date(today.year - RISK_YEARS, 1, 1) - dt.timedelta(days=20)
    inst = db.rows("select id, asset_class, currency, country, sector, benchmark_id, in_risk, frequency, "
                   "name, name_en from mkt.instruments")
    bars = db.rows(f"select instrument_id, d, c from mkt.bars_daily where d >= {lit(since)} and d <= {lit(today)}")
    quotes = db.rows("select instrument_id, price, as_of from mkt.quotes_latest")
    fx = db.rows(f"select d, quote, rate from mkt.fx_daily where d >= {lit(since - dt.timedelta(days=10))} "
                 f"and d <= {lit(today)}")
    fxl = db.rows("select quote, rate from mkt.fx_latest")
    return build_market(today, inst, bars, quotes, fx, fxl)


def load_users(db, today: dt.date, user_ids: list[str] | None) -> list[UserData]:
    flt = "" if user_ids is None else f" and p.user_id = any({lit('{' + ','.join(user_ids) + '}')}::uuid[])"
    profs = db.rows("select p.user_id, p.ref_currency, p.country, p.timezone, p.concentration_threshold_pct, p.language "
                    "from core.profiles p where (exists (select 1 from core.accounts a where a.user_id = p.user_id) "
                    "or exists (select 1 from core.trades t where t.user_id = p.user_id) "
                    "or exists (select 1 from core.real_estate r where r.user_id = p.user_id))" + flt)
    if not profs:
        return []
    ids = lit("{" + ",".join(p["user_id"] for p in profs) + "}") + "::uuid[]"
    since = today - dt.timedelta(days=SERIES_DAYS + 5)
    acc = db.rows(f"select id, user_id, kind, currency, balance_minor from core.accounts where user_id = any({ids})")
    txd = db.rows(
        "select t.user_id, t.account_id, (t.booking_ts at time zone p.timezone)::date as d, "
        "sum(case when t.cdt_dbt_ind = 'CRDT' then t.amount_minor else -t.amount_minor end) as net_minor "
        "from core.transactions t join core.profiles p on p.user_id = t.user_id "
        f"where t.user_id = any({ids}) and t.status = 'BOOK' and t.booking_ts >= {lit(since)} group by 1, 2, 3")
    trades = db.rows("select user_id, instrument_id, side, trade_date, quantity, price_minor, currency, fees_minor "
                     f"from core.trades where user_id = any({ids}) order by trade_date, created_at")
    corp = db.rows("select user_id, instrument_id, kind, ex_date, ratio, amount_minor, currency "
                   f"from core.corporate_actions where user_id is null or user_id = any({ids})")
    re_ = db.rows("select r.id, r.user_id, r.name, r.country, r.currency, "
                  "coalesce((select json_agg(json_build_array(v.valued_on, v.value_minor) order by v.valued_on) "
                  "from core.real_estate_valuations v where v.real_estate_id = r.id), '[]') as valuations "
                  f"from core.real_estate r where r.user_id = any({ids})")
    debts = db.rows(f"select id, user_id, currency, balance_minor, start_date from core.debts where user_id = any({ids})")
    by = lambda rows: _by_user(rows)  # noqa: E731
    A, T, TR, RE, DB = by(acc), by(txd), by(trades), by(re_), by(debts)
    out = []
    for p in profs:
        uid = p["user_id"]
        out.append(UserData(
            user_id=uid, ref=p["ref_currency"], country=p["country"],
            threshold_pct=int(p["concentration_threshold_pct"]), accounts=A.get(uid, []), tx_days=T.get(uid, []),
            trades=[dict(t, quantity=float(t["quantity"])) for t in TR.get(uid, [])],
            corp=[c for c in corp if c["user_id"] in (None, uid)], real_estate=RE.get(uid, []),
            debts=DB.get(uid, []), lang=p.get("language") or "fr"))
    return out


def _by_user(rows):
    out = defaultdict(list)
    for r in rows:
        out[r["user_id"]].append(r)
    return out


def write_sql(uid: str, today: dt.date, r: UserResult) -> str:
    u, t = lit(uid), lit(today)
    s = [
        f"delete from analytics.portfolio_daily where user_id = {u};",
        f"insert into analytics.portfolio_daily (user_id, d, instrument_id, qty, price_local, value_local_minor, "
        f"value_ref_minor, flow_ref_minor, flow_local_minor) select {u}, d, instrument_id, qty, price_local, "
        f"value_local_minor, value_ref_minor, flow_ref_minor, flow_local_minor from jsonb_to_recordset({jlit(r.portfolio)}) "
        "as x(d date, instrument_id text, qty numeric, price_local numeric, value_local_minor bigint, "
        "value_ref_minor bigint, flow_ref_minor bigint, flow_local_minor bigint);",
        f"delete from analytics.networth_daily where user_id = {u};",
        f"insert into analytics.networth_daily (user_id, d, ref_currency, assets_minor, liabilities_minor, net_minor, "
        f"by_class) select {u}, d, ref_currency, assets_minor, liabilities_minor, net_minor, by_class "
        f"from jsonb_to_recordset({jlit(r.networth)}) as x(d date, ref_currency char(3), assets_minor bigint, "
        "liabilities_minor bigint, net_minor bigint, by_class jsonb);",
        # latest 2 as_of kept (DATA_MODEL §5)
        f"delete from analytics.risk_metrics where user_id = {u} and (as_of = {t} or as_of < "
        f"(select coalesce(max(as_of), {t}) from analytics.risk_metrics where user_id = {u} and as_of < {t}));",
        f"insert into analytics.risk_metrics (user_id, as_of, metric, scope, value, value_ref_minor, n_obs, method, "
        f"status) select {u}, {t}, metric, scope, value, value_ref_minor, n_obs, method, status "
        f"from jsonb_to_recordset({jlit(r.risk)}) as x(metric text, scope text, value numeric, "
        "value_ref_minor bigint, n_obs int, method text, status text);",
        f"delete from analytics.drawdown_series where user_id = {u};",
        f"insert into analytics.drawdown_series (user_id, d, drawdown) select {u}, d, drawdown "
        f"from jsonb_to_recordset({jlit(r.drawdown)}) as x(d date, drawdown real);",
        f"delete from analytics.exposures where user_id = {u} and (as_of = {t} or as_of < "
        f"(select coalesce(max(as_of), {t}) from analytics.exposures where user_id = {u} and as_of < {t}));",
        f"insert into analytics.exposures (user_id, as_of, axis, key, value_ref_minor, share) "
        f"select {u}, {t}, axis, key, value_ref_minor, share from jsonb_to_recordset({jlit(r.exposures)}) "
        "as x(axis text, key text, value_ref_minor bigint, share real);",
        f"delete from analytics.performance where user_id = {u} and (as_of = {t} or as_of < "
        f"(select coalesce(max(as_of), {t}) from analytics.performance where user_id = {u} and as_of < {t}));",
        f"insert into analytics.performance (user_id, period, as_of, start_d, twr, irr, annualised, pnl_ref_minor, "
        f"status) select {u}, period, {t}, start_d, twr, irr, annualised, pnl_ref_minor, status "
        f"from jsonb_to_recordset({jlit(r.performance)}) as x(period text, start_d date, twr real, irr real, "
        "annualised boolean, pnl_ref_minor bigint, status text);",
        f"delete from analytics.attribution where user_id = {u} and (as_of = {t} or as_of < "
        f"(select coalesce(max(as_of), {t}) from analytics.attribution where user_id = {u} and as_of < {t}));",
        f"insert into analytics.attribution (user_id, period, as_of, level, key, avg_weight, return_local, "
        f"return_ref, contribution, currency_effect) select {u}, period, {t}, level, key, avg_weight, return_local, "
        f"return_ref, contribution, currency_effect from jsonb_to_recordset({jlit(r.attribution)}) as x(period text, "
        "level text, key text, avg_weight real, return_local real, return_ref real, contribution real, "
        "currency_effect real);",
    ]
    # concentration alerts: one per asset per 30 days (kind 'concentration', band 'info')
    for b in r.breaches:
        params = {"asset": b["name"], "asset_key": b["key"], "share": round(b["share"] * 100, 1),
                  "threshold": b["threshold_pct"]}
        reasons = [{"code": "concentration_breach", "params": params}]
        s.append(
            f"insert into core.alerts (user_id, kind, band, status, reasons) select {u}, 'concentration', 'info', "
            f"'open', {jlit(reasons)} where not exists (select 1 from core.alerts a where a.user_id = {u} "
            f"and a.kind = 'concentration' and a.reasons -> 0 -> 'params' ->> 'asset_key' = {lit(b['key'])} "
            f"and a.created_at > now() - interval '{ALERT_COOLDOWN_DAYS} days');")
    return "\n".join(s)


def run(db, user_ids: list[str] | None = None, today: dt.date | None = None, job: str = "batch-nightly",
        dry_run: bool = False, log=print) -> dict:
    t0 = time.monotonic()
    today = today or dt.datetime.now(dt.timezone.utc).date()
    run_started = dt.datetime.now(dt.timezone.utc)
    job_id = None
    if not dry_run:
        job_id = db.rows_returning(f"insert into ops.job_runs (job, status, detail) values ({lit(job)}, 'running', "
                                   f"{jlit({'users': user_ids or 'all', 'as_of': today.isoformat()})}) returning id")[0]["id"]
    try:
        m = load_market(db, today)
        users = load_users(db, today, user_ids)
        t_load = time.monotonic() - t0
        failed, timings = [], []
        for u in users:
            ts = time.monotonic()
            try:
                r = compute_user(m, u)
                if not dry_run:
                    db.run(write_sql(u.user_id, today, r))
                timings.append(time.monotonic() - ts)
                log(f"user {u.user_id[:8]}: {len(r.portfolio)} series rows, {len(r.risk)} risk, "
                    f"{len(r.breaches)} breaches, {timings[-1]:.2f}s")
            except Exception as e:  # one user never stops the batch
                failed.append({"user": u.user_id, "error": f"{type(e).__name__}: {e}"[:500]})
                log(f"user {u.user_id[:8]} FAILED: {e}")
        detail = {"users": len(users), "failed": failed[:20], "load_s": round(t_load, 2),
                  "max_user_s": round(max(timings), 2) if timings else 0, "as_of": today.isoformat(),
                  "total_s": round(time.monotonic() - t0, 2), "db_calls": getattr(db, "calls", None)}
        if not dry_run:
            if user_ids is not None:
                db.run(f"delete from ops.recompute_queue where user_id = any({lit('{' + ','.join(user_ids) + '}')}::uuid[]) "
                       f"and requested_at <= {lit(run_started.isoformat())};")
            elif job == "batch-nightly":
                db.run(f"delete from ops.recompute_queue where requested_at <= {lit(run_started.isoformat())};")
            status = "failed" if failed and len(failed) == len(users) else "ok"
            db.run(f"update ops.job_runs set status = {lit(status)}, finished_at = now(), items = {len(users) - len(failed)}, "
                   f"detail = {jlit(detail)}, error = {lit(failed[0]['error'] if failed else None)} where id = {job_id};")
        return detail
    except Exception as e:
        if job_id is not None:
            db.run(f"update ops.job_runs set status = 'failed', finished_at = now(), error = {lit(str(e)[:1000])} "
                   f"where id = {job_id};")
        raise
