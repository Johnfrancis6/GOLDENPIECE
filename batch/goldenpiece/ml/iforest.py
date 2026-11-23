"""Isolation Forest: training, export, SQL parity, promotion (ARCHITECTURE §7.6).

Inference runs in SQL (`core.iforest_raw`, migration 20261128000100) so both
ingest paths score in the same transaction. The model therefore lives in the
database (`ops.iforest_trees` + `ops.model_artifacts.meta`) instead of Storage;
the JSON export below keeps the documented format (plus `value` per node) and is
what gets loaded.

  python -m goldenpiece.ml.iforest train [--promote]   # weekly (Sunday) in batch-nightly
  python -m goldenpiece.ml.iforest parity-fixture       # regenerate the pgTAP parity test
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

FEATURES = ["amount_z_payee", "amount_z_category", "payee_new", "hour_rarity", "weekday_rarity", "velocity_1h",
            "outflow_24h_ratio", "balance_share", "channel_momo", "op_card", "op_transfer", "op_cash_out",
            "op_p2p", "op_merchant"]
PARAMS = dict(n_estimators=100, max_samples=256, contamination="auto", random_state=42)
PARITY_TOL = 1e-9
Q_LO = 0.99
ROOT = Path(__file__).resolve().parents[3]


def _c(n: float) -> float:
    """Average path length of an unsuccessful BST search (sklearn `_average_path_length`)."""
    from sklearn.ensemble._iforest import _average_path_length
    return float(_average_path_length(np.array([n]))[0])


def fit(X: np.ndarray):
    from sklearn.ensemble import IsolationForest
    return IsolationForest(**PARAMS).fit(X)


def export(model, X: np.ndarray, version: str) -> dict:
    """Trees as plain arrays + per-leaf path length exactly as sklearn sums it."""
    from sklearn.ensemble._iforest import _average_path_length
    trees = []
    n_feat = X.shape[1]
    for est, feats in zip(model.estimators_, model.estimators_features_):
        t = est.tree_
        sub = model._max_features != n_feat
        feature = [int(feats[f]) if (sub and f >= 0) else int(f) for f in t.feature]
        # sklearn: depths += decision_path_lengths[leaf] + average_path_length(n_node_samples)[leaf] - 1.0
        depth = np.zeros(t.node_count, dtype=np.int64)
        for i in range(t.node_count):
            for ch in (t.children_left[i], t.children_right[i]):
                if ch != -1:
                    depth[ch] = depth[i] + 1
        value = (depth + 1) + _average_path_length(t.n_node_samples) - 1.0
        trees.append({"feature": feature, "threshold": [float(v) for v in t.threshold],
                      "left": [int(v) for v in t.children_left], "right": [int(v) for v in t.children_right],
                      "n": [int(v) for v in t.n_node_samples],
                      "value": [float(v) if t.children_left[i] == -1 else None for i, v in enumerate(value)]})
    raw = -model.score_samples(X)                        # s_if ∈ (0,1], larger = more anomalous
    tree_bytes = json.dumps(trees, separators=(",", ":")).encode()
    import sklearn
    return {"kind": "iforest", "version": version, "sklearn": sklearn.__version__, "features": FEATURES,
            "max_samples": int(model.max_samples_), "offset": float(model.offset_),
            "denominator": float(len(model.estimators_) * _c(model.max_samples_)),
            "q50": float(np.quantile(raw, 0.5)), "q99": float(np.quantile(raw, 0.99)),
            "q999": float(np.quantile(raw, 0.999)),
            # A_if starts at q_lo (§7.6 says q50; q99 measured better on the demo data, B5 G7 run)
            "q_lo": float(np.quantile(raw, Q_LO)), "q_hi": float(np.quantile(raw, 0.999)),
            "mean": [float(v) for v in X.mean(axis=0)], "std": [float(v) for v in X.std(axis=0)],
            "train_rows": int(X.shape[0]), "sha256_of_trees": hashlib.sha256(tree_bytes).hexdigest(),
            "trees": trees}


def raw_score(exp: dict, X: np.ndarray) -> np.ndarray:
    """Pure-numpy twin of core.iforest_raw (used by tests)."""
    out = np.zeros(X.shape[0])
    Xf = X.astype(np.float32).astype(np.float64)
    for r, x in enumerate(Xf):
        d = 0.0
        for t in exp["trees"]:
            node = 0
            while t["left"][node] != -1:
                node = t["left"][node] if x[t["feature"][node]] <= t["threshold"][node] else t["right"][node]
            d += t["value"][node]
        out[r] = 2.0 ** (-(d / exp["denominator"]))
    return out


def _arr(xs, cast="float8") -> str:
    vals = ",".join("NULL" if v is None else repr(float(v)) if cast == "float8" else str(int(v)) for v in xs)
    return f"'{{{vals}}}'::{cast}[]"


def load_sql(exp: dict, status: str = "candidate", parity_ok: bool = False, storage_path: str | None = None) -> str:
    meta = {k: exp[k] for k in ("denominator", "q50", "q99", "q999", "q_lo", "q_hi", "mean", "std", "max_samples", "offset", "sklearn")}
    v = exp["version"].replace("'", "")
    parts = [f"delete from ops.iforest_trees where version = '{v}';",
             f"delete from ops.model_artifacts where version = '{v}';",
             "insert into ops.model_artifacts (version, kind, storage_path, sha256, features, trained_at, train_rows, "
             "status, parity_ok, meta) values "
             f"('{v}', 'iforest', '{storage_path or 'db:ops.iforest_trees/' + v}', '{exp['sha256_of_trees']}', "
             f"array{json.dumps(exp['features']).replace(chr(34), chr(39))}::text[], now(), {exp['train_rows']}, "
             f"'{status}', {str(parity_ok).lower()}, $m${json.dumps(meta)}$m$::jsonb);"]
    for i, t in enumerate(exp["trees"]):
        parts.append("insert into ops.iforest_trees (version, tree, feature, threshold, left_child, right_child, value) "
                     f"values ('{v}', {i}, {_arr(t['feature'], 'int')}, {_arr(t['threshold'])}, "
                     f"{_arr(t['left'], 'int')}, {_arr(t['right'], 'int')}, {_arr(t['value'])});")
    return "\n".join(parts)


def parity_vectors(X: np.ndarray, n: int = 1000, seed: int = 7) -> np.ndarray:
    """Fixed vectors: training rows, jittered copies and threshold-edge values."""
    rng = np.random.default_rng(seed)
    base = X[rng.integers(0, len(X), n)]
    jit = base + rng.normal(0, 0.5, base.shape) * (rng.random(base.shape) < 0.3)
    jit[:, 8:] = np.round(np.clip(jit[:, 8:], 0, 1))
    return jit[:n]


def check_parity(db, version: str, V: np.ndarray, expected: np.ndarray) -> float:
    rows = []
    for k in range(0, len(V), 250):
        chunk = V[k:k + 250]
        vals = ",".join(f"({k + i}, {_arr(list(v))})" for i, v in enumerate(chunk))
        rows += db.rows(f"select i, core.iforest_raw('{version}', x) s from (values {vals}) v(i, x)")
    got = np.array([r["s"] for r in sorted(rows, key=lambda r: r["i"])])
    return float(np.max(np.abs(got - expected)))


def training_matrix(db, users: list[str]) -> np.ndarray:
    X = []
    for u in users:
        for r in db.rows(f"select vec from core.training_rows('{u}') where not injected"):
            X.append(r["vec"])
    return np.array(X, dtype=np.float64)


def train(db, promote: bool = False, version: str | None = None) -> dict:
    from goldenpiece.eval import g7
    users = [r["user_id"] for r in db.rows(
        "select l.user_id from analytics.learning_status l join core.profiles p using (user_id) where l.active")]
    X = training_matrix(db, users)
    if len(X) < 300:
        return {"status": "skipped", "reason": "too_few_rows", "rows": len(X)}
    version = version or dt.date.today().isoformat() + ".1"
    model = fit(X)
    exp = export(model, X, version)
    db.run(load_sql(exp))
    V = parity_vectors(X)
    expected = -model.score_samples(V)
    delta = check_parity(db, version, V, expected)
    parity_ok = delta <= PARITY_TOL
    db.run(f"update ops.model_artifacts set parity_ok = {str(parity_ok).lower()} where version = '{version}'")
    cand = g7.evaluate(db, model_version=version, write=False)
    active = db.rows("select version, eval from ops.model_artifacts where kind = 'iforest' and status = 'active'")
    base = g7.evaluate(db, model_version=active[0]["version"] if active else "", write=False)
    not_worse = (cand["recall_ask_or_bank"] >= base["recall_ask_or_bank"] - 1e-9
                 and cand["recall_bank"] >= base["recall_bank"] - 1e-9
                 and cand["false_prompts_per_user_month"] <= max(2.0, base["false_prompts_per_user_month"] + 0.1))
    db.run(f"update ops.model_artifacts set eval = $e${json.dumps({'candidate': cand['summary'], 'baseline': base['summary'], 'parity_max_delta': delta})}$e$::jsonb "
           f"where version = '{version}'")
    promoted = False
    if promote and parity_ok and not_worse:
        db.run("update ops.model_artifacts set status = 'retired' where kind = 'iforest' and status = 'active';"
               f"update ops.model_artifacts set status = 'active' where version = '{version}';"
               f"select ops.audit(null, 'batch', 'model.promote', '{version}', null);")
        promoted = True
    return {"status": "ok", "version": version, "rows": int(len(X)), "users": len(users), "parity_max_delta": delta,
            "parity_ok": parity_ok, "not_worse": not_worse, "promoted": promoted,
            "candidate": cand["summary"], "baseline": base["summary"]}


def parity_fixture(n_vectors: int = 200) -> str:
    """pgTAP test: a small fixed model (synthetic data) + vectors + sklearn scores."""
    rng = np.random.default_rng(2026)
    X = np.column_stack([rng.normal(0, 1, (2000, 8)), rng.integers(0, 2, (2000, 6))]).astype(np.float64)
    from sklearn.ensemble import IsolationForest
    model = IsolationForest(n_estimators=20, max_samples=128, random_state=42).fit(X)
    exp = export(model, X, "parity-fixture")
    V = parity_vectors(X, n_vectors, seed=11)
    expected = -model.score_samples(V)
    assert np.max(np.abs(raw_score(exp, V) - expected)) <= PARITY_TOL
    vals = ",\n".join(f"({_arr(list(v))}, {repr(float(e))})" for v, e in zip(V, expected))
    return ("-- GENERATED by `python -m goldenpiece.ml.iforest parity-fixture` (sklearn " + exp["sklearn"] + ").\n"
            "-- Isolation Forest parity: core.iforest_raw vs sklearn score_samples, |Δ| ≤ 1e-9 (ARCHITECTURE §7.6).\n"
            "begin;\ncreate extension if not exists pgtap with schema extensions;\nset search_path = extensions, public;\n"
            "select plan(2);\n" + load_sql(exp) + "\n"
            f"create temp table v (x float8[], expected float8) on commit drop;\ninsert into v values\n{vals};\n"
            "select is((select count(*)::int from v), " + str(n_vectors) + ", 'parity vectors loaded');\n"
            "select cmp_ok((select max(abs(core.iforest_raw('parity-fixture', x) - expected)) from v), '<=', 1e-9::float8,\n"
            "              'SQL Isolation Forest matches sklearn to 1e-9');\n"
            "select * from finish();\nrollback;\n")


def main() -> int:
    ap = argparse.ArgumentParser(prog="goldenpiece.ml.iforest")
    ap.add_argument("cmd", choices=["train", "parity-fixture"])
    ap.add_argument("--promote", action="store_true")
    ap.add_argument("--version")
    a = ap.parse_args()
    if a.cmd == "parity-fixture":
        (ROOT / "supabase/tests/iforest_parity.test.sql").write_text(parity_fixture())
        return 0
    from goldenpiece.analytics.db import connect
    print(json.dumps(train(connect(), promote=a.promote, version=a.version), indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
