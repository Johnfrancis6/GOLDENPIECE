"""Every JSON Schema in shared/schemas is valid and its examples validate.
With GP_LIVE=1 (+ GP_SUPABASE_URL, GP_PUBLISHABLE_KEY) also validates the
live anon responses of the dev project."""
import json
import os
import urllib.request
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

DIR = Path(__file__).resolve().parents[2] / "shared/schemas"
SCHEMAS = {p.name: json.loads(p.read_text()) for p in sorted(DIR.glob("*.json"))}
REGISTRY = Registry().with_resources(
    [(s["$id"], Resource.from_contents(s)) for s in SCHEMAS.values()])


def validator(name):
    return Draft202012Validator(SCHEMAS[name], registry=REGISTRY, format_checker=FormatChecker())


@pytest.mark.parametrize("name", list(SCHEMAS))
def test_schema_valid(name):
    Draft202012Validator.check_schema(SCHEMAS[name])
    assert SCHEMAS[name]["$id"].endswith("/" + name)


@pytest.mark.parametrize("name", [n for n, s in SCHEMAS.items() if "examples" in s])
def test_examples(name):
    v = validator(name)
    for ex in SCHEMAS[name]["examples"]:
        v.validate(ex)


def test_money_rejects_float():
    v = Draft202012Validator({"$ref": "https://goldenpiece.invalid/schemas/common.json#/$defs/money"}, registry=REGISTRY)
    assert not v.is_valid({"m": 12.5, "c": "XOF"})
    assert v.is_valid({"m": 12, "c": "XOF", "r": 12})


@pytest.mark.skipif(os.environ.get("GP_LIVE") != "1", reason="live check only with GP_LIVE=1")
@pytest.mark.parametrize("rpc,schema", [("health_public", "health_public.json"), ("countries", "countries.json"),
                                        ("legal_texts", "legal_texts.json")])
def test_live_anon(rpc, schema):
    url = os.environ["GP_SUPABASE_URL"].rstrip("/") + f"/rest/v1/rpc/{rpc}"
    req = urllib.request.Request(url, data=b"{}", method="POST", headers={
        "apikey": os.environ["GP_PUBLISHABLE_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        validator(schema).validate(json.loads(r.read()))
