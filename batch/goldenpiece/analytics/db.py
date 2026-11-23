"""Database access for the batch.

Two transports, same interface (`rows(sql)` → list of dicts, `run(sql)`):

- `ApiDB`: Supabase Management API over HTTPS (`SUPABASE_ACCESS_TOKEN`). Used by
  GitHub Actions (secret already present) and by build sessions, whose network
  blocks the Postgres port. Every statement runs after `set role batch_writer`
  (least privilege: read core/mkt, write analytics, insert alerts/job_runs).
  A multi-statement call is one implicit transaction.
- `PgDB`: psycopg on a Postgres URL (`GP_DB_URL`), for the local CI stack.
  Also switches to `batch_writer`.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

ALLOWED_REFS = {"ynabfjwcdmaxfnppjtla"}  # goldenpiece-dev only (AUTORUN_BACKEND.md)
ROLE = "set role batch_writer;\n"


class ApiDB:
    def __init__(self, ref: str | None = None, token: str | None = None):
        self.ref = ref or os.environ.get("SUPABASE_PROJECT_REF", "ynabfjwcdmaxfnppjtla")
        if self.ref not in ALLOWED_REFS:
            raise SystemExit(f"refusing project {self.ref}")
        # In build sessions the proxy injects the real token; a dummy is enough there.
        self.token = token or os.environ.get("SUPABASE_ACCESS_TOKEN") or ("sbp_" + "0" * 40)
        self.calls = 0

    def _post(self, sql: str):
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{self.ref}/database/query",
            data=json.dumps({"query": sql}).encode(),
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json",
                     "User-Agent": "goldenpiece-batch"},
            method="POST")
        delay = 2.0
        for attempt in range(5):
            self.calls += 1
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    return json.loads(r.read() or b"null")
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")
                if e.code in (429, 502, 503, 504) and attempt < 4:
                    time.sleep(delay); delay *= 2
                    continue
                try:
                    body = json.loads(body).get("message", body)
                except ValueError:
                    pass
                raise RuntimeError(f"HTTP {e.code}: {body[:2000]}") from None
            except urllib.error.URLError:
                if attempt < 4:
                    time.sleep(delay); delay *= 2
                    continue
                raise

    def rows(self, sql: str) -> list[dict]:
        # wrap so that `set role` does not swallow the result set
        res = self._post(ROLE + f"select coalesce(json_agg(_q), '[]'::json) as j from ({sql}) _q")
        j = res[0]["j"] if res else []
        return json.loads(j) if isinstance(j, str) else j

    def run(self, sql: str) -> None:
        self._post(ROLE + sql)

    def rows_returning(self, sql: str) -> list[dict]:
        """A data-modifying statement with RETURNING (cannot be wrapped in a subquery)."""
        return self._post(ROLE + sql) or []


class PgDB:
    def __init__(self, url: str):
        import psycopg  # only needed on the local stack
        self.conn = psycopg.connect(url, autocommit=True)
        self.conn.execute("set role batch_writer")   # session-wide
        self.calls = 0

    def rows(self, sql: str) -> list[dict]:
        self.calls += 1
        with self.conn.cursor() as cur:
            cur.execute(f"select coalesce(json_agg(_q), '[]'::json) from ({sql}) _q")
            # psycopg returns the result of the last statement
            j = cur.fetchone()[0]
        return json.loads(j) if isinstance(j, str) else j

    def run(self, sql: str) -> None:
        self.calls += 1
        with self.conn.cursor() as cur:
            cur.execute(sql)

    def rows_returning(self, sql: str) -> list[dict]:
        self.calls += 1
        with self.conn.cursor() as cur:
            cur.execute(sql)
            cols = [c.name for c in cur.description]
            out = [dict(zip(cols, r)) for r in cur.fetchall()]
        return out


def connect():
    url = os.environ.get("GP_DB_URL")
    return PgDB(url) if url else ApiDB()


def lit(v) -> str:
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def jlit(obj) -> str:
    """A JSON value as an SQL literal (dollar-quoted, safe for any content)."""
    s = json.dumps(obj, separators=(",", ":"), default=str)
    tag = "$gpj$"
    assert tag not in s
    return f"{tag}{s}{tag}::jsonb"
