"""Money arithmetic (ARCHITECTURE G3). Same contract as the TS and SQL versions.

Amounts are integer minor units + ISO currency. Exponents: XOF 0, XAF 0,
EUR 2, USD 2. XOF/XAF <-> EUR through the exact peg 655.957; USD through
EUR (rate = USD per 1 EUR). Rounding: half-even, at the last step only.
All arithmetic is exact integer arithmetic (decimal strings are scaled to
integers), so the three languages give identical results.
"""
from __future__ import annotations

import re
from decimal import Decimal

EXPONENTS: dict[str, int] = {"XOF": 0, "XAF": 0, "EUR": 2, "USD": 2}
PEG_PER_EUR = "655.957"

_DECIMAL_RE = re.compile(r"^-?\d+(\.\d+)?$")


class MoneyError(ValueError):
    pass


def exponent(currency: str) -> int:
    try:
        return EXPONENTS[currency]
    except KeyError:
        raise MoneyError(f"unsupported currency {currency!r}") from None


def div_round(n: int, d: int) -> int:
    """n / d rounded half-even (exact)."""
    if d == 0:
        raise MoneyError("division by zero")
    if d < 0:
        n, d = -n, -d
    q, r = divmod(n, d)  # floor division, 0 <= r < d
    twice = 2 * r
    if twice > d or (twice == d and q % 2 != 0):
        q += 1
    return q


def _scaled(s: str) -> tuple[int, int]:
    """Decimal string -> (integer, 10**scale)."""
    if not _DECIMAL_RE.match(s):
        raise MoneyError(f"invalid decimal {s!r}")
    t = Decimal(s).as_tuple()
    digits = int("".join(map(str, t.digits)) or "0")
    if t.sign:
        digits = -digits
    exp = int(t.exponent)
    if exp >= 0:
        return digits * 10**exp, 1
    return digits, 10 ** (-exp)


def parse(amount: str, currency: str) -> int:
    n, d = _scaled(amount)
    return div_round(n * 10 ** exponent(currency), d)


def format_major(minor: int, currency: str) -> str:
    e = exponent(currency)
    sign = "-" if minor < 0 else ""
    a = abs(minor)
    if e == 0:
        return f"{sign}{a}"
    return f"{sign}{a // 10**e}.{a % 10**e:0{e}d}"


def _per_eur(currency: str, usd_per_eur: str | None) -> tuple[int, int]:
    if currency == "EUR":
        return 1, 1
    if currency in ("XOF", "XAF"):
        return _scaled(PEG_PER_EUR)
    if currency == "USD":
        if usd_per_eur is None:
            raise MoneyError("USD conversion needs usd_per_eur")
        return _scaled(usd_per_eur)
    raise MoneyError(f"unsupported currency {currency!r}")


def convert(minor: int, src: str, dst: str, usd_per_eur: str | None = None) -> int:
    """Convert minor units of src into minor units of dst."""
    es, ed = exponent(src), exponent(dst)
    if src == dst:
        return minor
    fp, fq = _per_eur(src, usd_per_eur)   # src per EUR = fp/fq
    tp, tq = _per_eur(dst, usd_per_eur)   # dst per EUR = tp/tq
    num = minor * 10**ed * tp * fq
    den = 10**es * tq * fp
    return div_round(num, den)


def allocate(minor: int, weights: list[int]) -> list[int]:
    """Split minor by integer weights; largest remainder, ties to the lower index."""
    if not weights or any(w < 0 for w in weights) or sum(weights) == 0:
        raise MoneyError("weights must be non-negative with a positive sum")
    total = sum(weights)
    base = [minor * w // total for w in weights]
    rems = [minor * w - b * total for w, b in zip(weights, base)]
    left = minor - sum(base)
    order = sorted(range(len(weights)), key=lambda i: (-rems[i], i))
    for i in order[:left]:
        base[i] += 1
    return base
