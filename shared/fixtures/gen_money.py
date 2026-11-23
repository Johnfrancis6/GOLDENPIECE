"""Generate shared/fixtures/money.json — the money cases run by SQL, TS and Python.

Reference implementation: exact rational arithmetic (fractions.Fraction),
written independently of the three libraries it checks (ARCHITECTURE G3).
Deterministic: seed 2026. Run: python3 shared/fixtures/gen_money.py
"""
from __future__ import annotations

import json
import random
from fractions import Fraction
from pathlib import Path

EXP = {"XOF": 0, "XAF": 0, "EUR": 2, "USD": 2}
PEG = Fraction("655.957")  # XOF and XAF per EUR, exact


def round_half_even(x: Fraction) -> int:
    fl = x.numerator // x.denominator          # floor
    rem = x - fl
    if rem > Fraction(1, 2):
        return fl + 1
    if rem < Fraction(1, 2):
        return fl
    return fl if fl % 2 == 0 else fl + 1


def per_eur(cur: str, usd: Fraction | None) -> Fraction:
    if cur == "EUR":
        return Fraction(1)
    if cur in ("XOF", "XAF"):
        return PEG
    assert usd is not None
    return usd


def convert(minor: int, src: str, dst: str, usd: str | None) -> int:
    u = Fraction(usd) if usd is not None else None
    major = Fraction(minor, 10 ** EXP[src])
    out = major / per_eur(src, u) * per_eur(dst, u) * 10 ** EXP[dst]
    return round_half_even(out)


def parse(s: str, cur: str) -> int:
    return round_half_even(Fraction(s) * 10 ** EXP[cur])


def fmt(minor: int, cur: str) -> str:
    e = EXP[cur]
    sign = "-" if minor < 0 else ""
    a = abs(minor)
    if e == 0:
        return f"{sign}{a}"
    return f"{sign}{a // 10 ** e}.{a % 10 ** e:0{e}d}"


def allocate(minor: int, weights: list[int]) -> list[int]:
    total = sum(weights)
    shares = [Fraction(minor * w, total) for w in weights]
    base = [s.numerator // s.denominator for s in shares]
    left = minor - sum(base)
    order = sorted(range(len(weights)), key=lambda i: (-(shares[i] - base[i]), i))
    for i in order[:left]:
        base[i] += 1
    return base


def main() -> None:
    rng = random.Random(2026)
    cases: list[dict] = []
    curs = list(EXP)

    # exponents
    for c in curs:
        cases.append({"op": "exponent", "args": {"currency": c}, "expect": EXP[c]})

    # half-even division edge cases
    for n, d in [(5, 2), (7, 2), (-5, 2), (-7, 2), (1, 3), (2, 3), (-1, 3), (15, 10), (25, 10),
                 (-25, 10), (0, 7), (999999999999, 2), (10, 4), (-10, 4), (3, -2), (-3, -2)]:
        cases.append({"op": "div_round", "args": {"n": str(n), "d": str(d)},
                      "expect": round_half_even(Fraction(n, d))})

    # parse
    fixed_parse = [("1234.565", "EUR"), ("1234.575", "EUR"), ("0.005", "EUR"), ("0.015", "EUR"),
                   ("-0.005", "EUR"), ("2500.5", "XOF"), ("2501.5", "XOF"), ("-2500.5", "XOF"),
                   ("0", "USD"), ("12", "USD"), ("12.3", "USD"), ("1000000", "XAF"), ("0.5", "XAF"),
                   ("99.995", "USD"), ("-99.985", "USD")]
    for s, c in fixed_parse:
        cases.append({"op": "parse", "args": {"amount": s, "currency": c}, "expect": parse(s, c)})
    for _ in range(25):
        c = rng.choice(curs)
        s = f"{rng.choice(['', '-'])}{rng.randint(0, 9_999_999)}.{rng.randint(0, 999):03d}"
        cases.append({"op": "parse", "args": {"amount": s, "currency": c}, "expect": parse(s, c)})

    # format
    for m, c in [(0, "EUR"), (5, "EUR"), (-5, "EUR"), (123456, "EUR"), (-123456, "USD"), (250000, "XOF"),
                 (-1, "XAF"), (100, "USD")]:
        cases.append({"op": "format", "args": {"minor": m, "currency": c}, "expect": fmt(m, c)})
    for _ in range(12):
        c = rng.choice(curs)
        m = rng.randint(-10**12, 10**12)
        cases.append({"op": "format", "args": {"minor": m, "currency": c}, "expect": fmt(m, c)})

    # convert: peg exactness and ties
    fixed_conv = [(655957, "XOF", "EUR", None), (100000, "EUR", "XOF", None), (1, "EUR", "XOF", None),
                  (1, "XOF", "EUR", None), (327978, "XOF", "EUR", None), (327979, "XOF", "EUR", None),
                  (250000, "XOF", "XAF", None), (-250000, "XAF", "XOF", None), (0, "XOF", "USD", "1.0832"),
                  (100, "USD", "EUR", "1.25"), (125, "EUR", "USD", "1.1"), (5, "EUR", "USD", "1.5"),
                  (15, "EUR", "USD", "1.5"), (-15, "EUR", "USD", "1.5"), (1000000, "XOF", "USD", "1.0832"),
                  (12345, "USD", "XOF", "1.0832"), (12345, "USD", "XAF", "1.0832"),
                  (999999999999, "XOF", "EUR", None), (999999999999, "EUR", "XOF", None)]
    for m, s, d, u in fixed_conv:
        cases.append({"op": "convert", "args": {"minor": m, "from": s, "to": d, "usd_per_eur": u},
                      "expect": convert(m, s, d, u)})
    while sum(1 for c in cases if c["op"] == "convert") < 110:
        s, d = rng.choice(curs), rng.choice(curs)
        u = None
        if "USD" in (s, d):
            u = f"{rng.uniform(0.85, 1.35):.4f}"
        m = rng.randint(-50_000_000, 50_000_000) if rng.random() < 0.8 else rng.randint(-10**11, 10**11)
        cases.append({"op": "convert", "args": {"minor": m, "from": s, "to": d, "usd_per_eur": u},
                      "expect": convert(m, s, d, u)})

    # allocate (largest remainder, ties to lower index)
    for m, w in [(100, [1, 1, 1]), (101, [1, 1]), (5, [3, 3, 3, 3]), (0, [1, 2]), (250000, [70, 20, 10]),
                 (7, [1, 0, 1]), (1, [1, 1, 1])]:
        cases.append({"op": "allocate", "args": {"minor": m, "weights": w}, "expect": allocate(m, w)})
    for _ in range(13):
        k = rng.randint(2, 6)
        w = [rng.randint(0, 100) for _ in range(k)]
        if sum(w) == 0:
            w[0] = 1
        m = rng.randint(0, 10_000_000)
        cases.append({"op": "allocate", "args": {"minor": m, "weights": w}, "expect": allocate(m, w)})

    out = {"version": 1, "peg_per_eur": "655.957", "exponents": EXP,
           "rounding": "half-even, at the last step only", "cases": cases}
    path = Path(__file__).with_name("money.json")
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"{len(cases)} cases -> {path}")


if __name__ == "__main__":
    main()
