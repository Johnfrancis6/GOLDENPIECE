"""G7 detection quality (ARCHITECTURE §12 G7): replay the booked debits of the
demo users through the scorer (point-in-time features, `core.score_replay`) and
compare with the simulated bank's ground truth (`sim.truth`).

Targets: recall of injected events at > 70 (expected band "bank") ≥ 90 %;
at ≥ 40 (expected "ask" or "bank") ≥ 97 %; false prompts (clean rows scored ≥ 40)
≤ 2 per user per month. Anomaly scenarios that fall in a user's learning phase
are silent by design (§7.7): they are reported but left out of the recall.

  python -m goldenpiece.eval.g7 [--write] [--model <version>]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from collections import defaultdict

ANOMALY_TAGS = {"anomaly_amount", "anomaly_hour", "first_session_ask"}
TARGETS = {"recall_bank": 0.90, "recall_ask_or_bank": 0.97, "false_prompts_per_user_month": 2.0}


def metrics(rows: list[dict], months: dict[str, float]) -> dict:
    """rows: {u, total, band, learning, tag, expected_band}; months: user → months of scored history."""
    inj = [r for r in rows if r["tag"] and r["expected_band"] in ("ask", "bank")]
    silent = [r for r in inj if r["learning"] and r["tag"] in ANOMALY_TAGS]
    counted = [r for r in inj if not (r["learning"] and r["tag"] in ANOMALY_TAGS)]
    bank = [r for r in counted if r["expected_band"] == "bank"]
    clean = [r for r in rows if not r["tag"]]
    hi = [r for r in rows if r["total"] > 70]
    by_tag = defaultdict(lambda: {"n": 0, "ge40": 0, "gt70": 0})
    for r in inj:
        d = by_tag[r["tag"] + ":" + r["expected_band"]]
        d["n"] += 1
        d["ge40"] += r["total"] >= 40
        d["gt70"] += r["total"] > 70
    um = sum(months.values()) or 1.0
    out = {
        "recall_bank": sum(r["total"] > 70 for r in bank) / len(bank) if bank else None,
        "recall_ask_or_bank": sum(r["total"] >= 40 for r in counted) / len(counted) if counted else None,
        "recall_ask_or_bank_raw": sum(r["total"] >= 40 for r in inj) / len(inj) if inj else None,
        "precision_bank": sum(1 for r in hi if r["tag"]) / len(hi) if hi else None,
        "false_prompts_per_user_month": sum(r["total"] >= 40 for r in clean) / um,
        "false_bank_per_user_month": sum(r["total"] > 70 for r in clean) / um,
        "injected": len(inj), "silent_learning": len(silent), "clean": len(clean), "user_months": round(um, 2),
        "by_scenario": dict(by_tag),
    }
    out["targets_met"] = all(out[k] is not None and (out[k] <= v if k.startswith("false") else out[k] >= v)
                             for k, v in TARGETS.items())
    return out


def evaluate(db, model_version: str | None = None, write: bool = False, users: list[str] | None = None) -> dict:
    """model_version: None = active model, '' = no model (rules + thresholds only), else that version."""
    if users is None:
        users = [r["user_id"] for r in db.rows("select user_id from core.profiles where demo_persona is not null")]
    set_model = "" if model_version is None else \
        f"select set_config('gp.model_version', '{model_version or '-none-'}', false);\n"
    rows, months = [], {}
    for u in users:
        res = db.rows_returning(
            set_model + "select coalesce(json_agg(q), '[]'::json) j from (select r.total, r.band, r.learning, r.tag, "
            f"r.expected_band, r.booking_ts from core.score_replay('{u}') r) q")
        j = res[-1]["j"] if res else []
        rs = json.loads(j) if isinstance(j, str) else j
        for r in rs:
            r["u"] = u
        rows += rs
        if rs:
            ts = sorted(dt.datetime.fromisoformat(r["booking_ts"]) for r in rs)
            months[u] = max((ts[-1] - ts[0]).days / 30.4375, 1.0)
    m = metrics(rows, months)
    mv = model_version if model_version is not None else (
        (db.rows("select version from ops.model_artifacts where kind = 'iforest' and status = 'active'") or [{}])[0]
        .get("version"))
    rv = (db.rows("select string_agg(id || '.' || v, ',' order by id) r from (select distinct on (id) id, version v "
                  "from ref.fraud_rules where active order by id, version desc) q") or [{}])[0].get("r")
    m["model_version"], m["rules_version"], m["users"] = mv or None, rv, len(users)
    m["summary"] = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in m.items()
                    if k not in ("by_scenario", "summary")}
    if write:
        db.run("insert into ops.model_eval (model_version, rules_version, run_at, precision_bank, recall_bank, "
               "recall_ask_or_bank, false_prompts_per_user_month, details) values ("
               f"{_l(m['model_version'])}, {_l(rv)}, now(), {_n(m['precision_bank'])}, {_n(m['recall_bank'])}, "
               f"{_n(m['recall_ask_or_bank'])}, {_n(m['false_prompts_per_user_month'])}, "
               f"$d${json.dumps({k: v for k, v in m.items() if k != 'summary'})}$d$::jsonb)")
    return m


def _l(v) -> str:
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def _n(v) -> str:
    return "null" if v is None else repr(float(v))


def main() -> int:
    ap = argparse.ArgumentParser(prog="goldenpiece.eval.g7")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--model", default=None, help="model version ('' = no Isolation Forest)")
    a = ap.parse_args()
    from goldenpiece.analytics.db import connect
    m = evaluate(connect(), model_version=a.model, write=a.write)
    print(json.dumps(m, indent=1, default=str))
    return 0 if m["targets_met"] else 1


if __name__ == "__main__":
    sys.exit(main())
