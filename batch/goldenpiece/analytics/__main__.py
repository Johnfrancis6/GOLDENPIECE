"""python -m goldenpiece.analytics [--users id,id] [--job batch-nightly|batch-user] [--date YYYY-MM-DD] [--dry-run]

Transport: GP_DB_URL (psycopg, local stack) or the Supabase Management API
(SUPABASE_ACCESS_TOKEN, project goldenpiece-dev only)."""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys

from .db import connect
from .pipeline import run


def main() -> int:
    ap = argparse.ArgumentParser(prog="goldenpiece.analytics")
    ap.add_argument("--users", default="", help="comma-separated user ids (default: all)")
    ap.add_argument("--job", default=None)
    ap.add_argument("--date", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--queue", action="store_true",
                    help="process the users waiting in ops.recompute_queue (≤ 50); no-op when it is empty")
    ap.add_argument("--skip-if-done", action="store_true",
                    help="exit if a batch-nightly already succeeded today (schedule backup of the pg_cron dispatch)")
    ap.add_argument("--no-scoring", action="store_true", help="skip the B5 scoring step (learning, profiles, model, G7)")
    a = ap.parse_args()
    users = [u.strip() for u in a.users.replace(" ", ",").split(",") if u.strip()] or None
    job = a.job or ("batch-user" if users else "batch-nightly")
    today = dt.date.fromisoformat(a.date) if a.date else None
    db = connect()
    if a.skip_if_done and db.rows("select 1 from ops.job_runs where job = 'batch-nightly' and status = 'ok' "
                                  "and started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'"):
        print("batch-nightly already done today")
        return 0
    if a.queue:
        users = [r["user_id"] for r in db.rows("select user_id from ops.recompute_queue order by requested_at limit 50")]
        if not users:
            print("recompute queue empty")
            return 0
        job = "batch-user"
    detail = run(db, users, today, job, a.dry_run)
    print(json.dumps(detail, indent=1))
    if not a.dry_run and not a.no_scoring:
        from goldenpiece.analytics import scoring_step
        day = today or dt.datetime.now(dt.timezone.utc).date()
        print(json.dumps(scoring_step.run(db, day, users if job == "batch-user" else None), indent=1, default=str))
    return 1 if detail["users"] and len(detail["failed"]) == detail["users"] else 0


if __name__ == "__main__":
    sys.exit(main())
