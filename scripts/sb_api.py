#!/usr/bin/env python3
"""Run SQL / migrations / pgTAP tests on a Supabase project through the
Management API (HTTPS only). For build sessions whose network blocks the
Postgres port; CI uses `supabase db push` / `supabase test db` instead.

  scripts/sb_api.py query  "<sql>"            run SQL, print JSON result
  scripts/sb_api.py migrate [--dry-run]      apply supabase/migrations not yet recorded
  scripts/sb_api.py test [files...]          run pgTAP files (default supabase/tests/*.sql), rolled back
  scripts/sb_api.py load-sim [--force]       (re)load simulated-bank templates from the generator (B2);
                                             a template whose generator version is unchanged is skipped

Project: SUPABASE_PROJECT_REF (default goldenpiece-dev = ynabfjwcdmaxfnppjtla).
Token: SUPABASE_ACCESS_TOKEN (in build sessions the proxy injects it).
Migrations are recorded in supabase_migrations.schema_migrations exactly
like the CLI, so a later `supabase db push` skips them.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = os.environ.get("SUPABASE_PROJECT_REF", "ynabfjwcdmaxfnppjtla")
ALLOWED = {"ynabfjwcdmaxfnppjtla"}  # never another project (AUTORUN_BACKEND.md)
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "sbp_" + "0" * 40)


def query(sql: str):
    if REF not in ALLOWED:
        sys.exit(f"refusing project {REF}")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            body = json.loads(body).get("message", body)
        except ValueError:
            pass
        raise RuntimeError(body) from None


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def migrate(dry: bool) -> None:
    query("create schema if not exists supabase_migrations;"
          "create table if not exists supabase_migrations.schema_migrations (version text not null primary key);"
          "alter table supabase_migrations.schema_migrations add column if not exists statements text[];"
          "alter table supabase_migrations.schema_migrations add column if not exists name text;")
    done = {r["version"] for r in query("select version from supabase_migrations.schema_migrations")}
    for f in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        m = re.match(r"^(\d+)_(.+)\.sql$", f.name)
        if not m or m.group(1) in done:
            continue
        print(("would apply " if dry else "applying ") + f.name, flush=True)
        if dry:
            continue
        sql = f.read_text()
        query(sql + f"\n;insert into supabase_migrations.schema_migrations (version, name, statements) "
                    f"values ({lit(m.group(1))}, {lit(m.group(2))}, array[{lit(sql)}]);")
    print("migrations up to date")


STMT_SPLIT = re.compile(r";[ \t]*\n")


def tap(path: Path) -> tuple[int, int]:
    """Run one pgTAP file: every top-level SELECT's rows are captured, then an
    exception returns the TAP output and rolls everything back."""
    src = path.read_text()
    body = []
    for stmt in STMT_SPLIT.split(src):
        s = "\n".join(l for l in stmt.splitlines() if not l.strip().startswith("--")).strip()
        if not s or s.lower() in ("begin", "rollback", "commit"):
            continue
        if re.match(r"(?is)^select\s", s):
            body.append(f"insert into pg_temp._tap(line) select * from ({s}) _t")
        else:
            body.append(s)
    sql = ("create temp table _tap(id serial, line text);\n"
           "grant all on pg_temp._tap to public; grant usage on sequence pg_temp._tap_id_seq to public;\n"
           + ";\n".join(body) + ";\nreset role;\n"
           "do $$ begin raise exception 'TAPOUT%', (select string_agg(line, E'\\n' order by id) from pg_temp._tap); end $$;")
    try:
        query(sql)
        out = "no output"
    except RuntimeError as e:
        msg = str(e)
        out = msg.split("TAPOUT", 1)[1] if "TAPOUT" in msg else "ERROR " + msg
    fails = [l for l in out.splitlines() if l.startswith("not ok") or l.startswith("ERROR")
             or "Looks like" in l]
    ok = len([l for l in out.splitlines() if l.startswith("ok ")])
    print(f"{path.name}: {ok} ok, {len(fails)} problems")
    for l in fails[:40]:
        print("   ", l)
    if fails:
        for l in out.splitlines():
            if l.startswith("#"):
                print("   ", l)
    return ok, len(fails)


def load_sim(force: bool) -> None:
    sys.path.insert(0, str(ROOT / "batch"))
    from goldenpiece.generator import sim_templates as st  # noqa: E402

    by_tpl: dict[str, list[tuple[str, str]]] = {}
    for tid, kind, stmt in st.sql_statements():
        by_tpl.setdefault(tid, []).append((kind, stmt))
    for tid, stmts in by_tpl.items():
        if not force:
            try:
                query(stmts[0][1])
            except RuntimeError as e:
                if "gp_skip" in str(e):
                    print(f"{tid}: unchanged")
                    continue
                raise
        body = "\n".join(s for k, s in stmts if k != "check")
        query("begin;\n" + body + "\ncommit;")
        print(f"{tid}: loaded ({sum(1 for k, _ in stmts if k == 'entries')} chunks)", flush=True)


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "query":
        print(json.dumps(query(sys.argv[2]), indent=1, default=str))
    elif cmd == "migrate":
        migrate("--dry-run" in sys.argv)
    elif cmd == "test":
        files = [Path(p) for p in sys.argv[2:]] or sorted((ROOT / "supabase/tests").glob("*.sql"))
        bad = sum(tap(f)[1] for f in files)
        sys.exit(1 if bad else 0)
    elif cmd == "load-sim":
        load_sim("--force" in sys.argv)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
