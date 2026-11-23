"""B5: Isolation Forest export parity (numpy twin of core.iforest_raw) and G7 metrics."""
import numpy as np
import pytest

from goldenpiece.eval.g7 import metrics

sklearn = pytest.importorskip("sklearn")


def test_export_matches_sklearn_to_1e9():
    from goldenpiece.ml import iforest
    rng = np.random.default_rng(1)
    X = np.column_stack([rng.normal(0, 1, (1500, 8)), rng.integers(0, 2, (1500, 6))]).astype(float)
    model = iforest.fit(X)
    exp = iforest.export(model, X, "t")
    V = iforest.parity_vectors(X, 300)
    assert np.max(np.abs(iforest.raw_score(exp, V) - (-model.score_samples(V)))) <= iforest.PARITY_TOL
    assert len(exp["trees"]) == 100 and exp["max_samples"] == 256
    assert exp["q_lo"] <= exp["q_hi"]
    sql = iforest.load_sql(exp)
    assert sql.count("insert into ops.iforest_trees") == 100


def test_parity_fixture_is_self_consistent():
    from goldenpiece.ml import iforest
    s = iforest.parity_fixture(20)
    assert "select plan(2);" in s and "parity-fixture" in s


def row(tag, eb, total, learning=False):
    return {"tag": tag, "expected_band": eb, "total": total, "band": "x", "learning": learning}


def test_g7_metrics():
    rows = [row("R1_sim_swap", "bank", 80), row("R4_mule", "bank", 60), row("anomaly_amount", "ask", 45),
            row("anomaly_amount", "ask", 10, learning=True), row("R5_fake_investment", "none", 10),
            row(None, None, 41), row(None, None, 5), row(None, None, 75)]
    m = metrics(rows, {"u": 2.0})
    assert m["recall_bank"] == 0.5
    assert m["recall_ask_or_bank"] == 1.0                         # learning-phase anomaly left out
    assert m["recall_ask_or_bank_raw"] == pytest.approx(3 / 4)
    assert m["false_prompts_per_user_month"] == 1.0              # 2 clean ≥ 40 over 2 months
    assert m["precision_bank"] == 0.5
    assert m["silent_learning"] == 1 and not m["targets_met"]
