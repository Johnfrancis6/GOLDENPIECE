"""Live end-to-end checks of the B2 Edge Functions on goldenpiece-dev (GP_LIVE=1).

Needs GP_SUPABASE_URL and GP_PUBLISHABLE_KEY (public values); test users are
deleted through scripts/sb_api.py (Management API, token injected by the
session proxy). Validates every response against shared/schemas.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from tests.test_schemas import validator

LIVE = os.environ.get("GP_LIVE") == "1"
pytestmark = pytest.mark.skipif(not LIVE, reason="live check only with GP_LIVE=1")
ROOT = Path(__file__).resolve().parents[2]


def _sb():
    sys.path.insert(0, str(ROOT / "scripts"))
    import sb_api  # noqa: E402
    return sb_api


def call(path, body=None, token=None, method="POST"):
    url = os.environ["GP_SUPABASE_URL"].rstrip("/") + path
    key = os.environ["GP_PUBLISHABLE_KEY"]
    req = urllib.request.Request(url, data=json.dumps(body or {}).encode(), method=method, headers={
        "apikey": key, "Authorization": f"Bearer {token or key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def anon_user():
    st, s = call("/auth/v1/signup", {"data": {"language": "fr"}})
    assert st == 200, s
    return s["user"]["id"], s["access_token"]


@pytest.fixture
def users():
    made = []
    yield made
    if made:
        ids = ",".join(f"'{u}'" for u in made)
        _sb().query(f"delete from auth.users where id in ({ids})")


def test_demo_start_under_2s_and_schema(users):
    uid, tok = anon_user()
    users.append(uid)
    assert call("/functions/v1/account-demo-start", {"warmup": True})[0] == 200   # app does this during the tour
    t0 = time.monotonic()
    st, r = call("/functions/v1/account-demo-start", {"persona": "abidjan_trader", "lang": "fr"}, tok)
    elapsed = time.monotonic() - t0
    assert st == 200, r
    validator("account_demo_start.json").validate(r)
    assert r["accounts_count"] == 3 and r["transactions_count"] > 500
    print(f"demo clone: {elapsed:.2f} s end to end, {r['ms']} ms in the database")
    assert elapsed < 2.0
    # second start refused, reset works
    st, r2 = call("/functions/v1/account-demo-start", {"persona": "abidjan_trader"}, tok)
    assert st == 409 and r2["code"] == "CONFLICT"
    st, r3 = call("/functions/v1/account-demo-reset", {}, tok)
    assert st == 200 and r3["accounts_count"] == 3, r3
    st, s = call("/functions/v1/provider-sync", {}, tok)
    assert st == 200, s
    validator("provider_sync.json").validate(s)


def test_demo_refuses_bad_input(users):
    st, r = call("/functions/v1/account-demo-start", {"persona": "dakar_salaried"})
    assert st == 401
    uid, tok = anon_user()
    users.append(uid)
    st, r = call("/functions/v1/account-demo-start", {"persona": "nobody"}, tok)
    assert st == 400 and r["code"] == "INVALID"


def test_link_flow(users):
    uid, tok = anon_user()
    users.append(uid)
    st, r = call("/functions/v1/provider-link-start", {"institution": "kola_money", "scopes": ["balances", "transactions"]}, tok)
    assert st == 200, r
    validator("provider_link_start.json").validate(r)
    assert r["consent"]["simulated"] is True and r["consent"]["history_days"] == 365
    st, c = call("/functions/v1/provider-link-complete", {"link_id": r["link_id"], "approve": True}, tok)
    assert st == 200, c
    validator("provider_link_complete.json").validate(c)
    assert c["new_count"] > 300 and c["accounts"][0]["balance"]["m"] >= 0
    st, c2 = call("/functions/v1/provider-link-complete", {"link_id": r["link_id"], "approve": True}, tok)
    assert st == 409
    # bank + refusal path
    st, r = call("/functions/v1/provider-link-start", {"institution": "banque_baobab"}, tok)
    st, c = call("/functions/v1/provider-link-complete", {"link_id": r["link_id"], "approve": False}, tok)
    assert st == 200 and c["status"] == "revoked"
    # new wallet: no history, first entries come with time
    st, r = call("/functions/v1/provider-link-start", {"institution": "savane_pay", "options": {"new_wallet": True}}, tok)
    assert st == 200 and r["consent"]["history_days"] == 0
    st, c = call("/functions/v1/provider-link-complete", {"link_id": r["link_id"], "approve": True}, tok)
    assert st == 200 and c["accounts"][0]["balance"]["m"] >= 0


def test_server_functions_need_the_cron_secret():
    for fn in ("provider-tick", "ingest", "account-demo-cleanup"):
        st, r = call(f"/functions/v1/{fn}", {})
        assert st == 403 and r["code"] == "FORBIDDEN", (fn, r)
