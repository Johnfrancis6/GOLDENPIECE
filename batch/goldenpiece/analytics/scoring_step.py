"""Nightly scoring step (B5, ARCHITECTURE §7.6-§7.7, G7), run after the analytics batch:

- learning status per user (transition → "learning finished" alert + silent push) and the
  180-day behaviour profiles (`analytics.behaviour_profiles`), all users with transactions;
- Sunday: Isolation Forest training → candidate → parity (1e-9) + G7 not worse → promoted;
- every night: G7 evaluation of the active model on the demo users → `ops.model_eval`.
Each part is logged in `ops.job_runs` (job `scoring-nightly`); a failure never stops the others.
"""
from __future__ import annotations

import datetime as dt
import time

from goldenpiece.analytics.db import jlit, lit


def run(db, today: dt.date, users: list[str] | None = None, log=print, train_weekday: int = 6) -> dict:
    t0 = time.monotonic()
    out: dict = {"errors": []}
    job_id = db.rows_returning("insert into ops.job_runs (job, status) values ('scoring-nightly', 'running') returning id")[0]["id"]
    try:
        ids = users or [r["user_id"] for r in db.rows(
            "select distinct user_id from core.transactions where status = 'BOOK'")]
        transitions = 0
        for k in range(0, len(ids), 20):
            chunk = ids[k:k + 20]
            arr = lit("{" + ",".join(chunk) + "}") + "::uuid[]"
            rows = db.rows(f"select u, analytics.refresh_learning(u) l, analytics.refresh_behaviour(u) b "
                           f"from unnest({arr}) u")
            transitions += sum(1 for r in rows if (r["l"] or {}).get("transition"))
        out["users"], out["learning_transitions"] = len(ids), transitions
        log(f"scoring: {len(ids)} users, {transitions} learning transitions")
    except Exception as e:
        out["errors"].append(f"profiles: {e}"[:500])
    if users is None and today.weekday() == train_weekday:
        try:
            from goldenpiece.ml import iforest
            out["iforest"] = {k: v for k, v in iforest.train(db, promote=True).items() if k not in ("candidate", "baseline")}
            log(f"iforest: {out['iforest']}")
        except Exception as e:
            out["errors"].append(f"iforest: {e}"[:500])
    if users is None:
        try:
            from goldenpiece.eval import g7
            out["g7"] = g7.evaluate(db, write=True)["summary"]
            log(f"g7: {out['g7']}")
        except Exception as e:
            out["errors"].append(f"g7: {e}"[:500])
    out["total_s"] = round(time.monotonic() - t0, 2)
    db.run(f"update ops.job_runs set status = {lit('failed' if out['errors'] else 'ok')}, finished_at = now(), "
           f"items = {out.get('users', 0)}, detail = {jlit(out)} where id = {job_id};")
    return out
