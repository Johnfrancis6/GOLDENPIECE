"""Fictitious IBANs and MSISDNs for the simulated bank (ARCHITECTURE §3.3).

Layouts [assumed, no BCEAO/BEAC specimen checked from a session; the
public IBAN registry lists both zones with these lengths]:

- UEMOA, 28 chars: CC kk + bank code 5 (letter-letter-digits, e.g. SN901)
  + branch 5 + account 12 + RIB key 2.
- CEMAC, 27 chars: CC kk + bank code 5 digits + branch 5 + account 11 + RIB key 2.
- France (diaspora persona), 27 chars: same layout as CEMAC.

RIB key: French formula 97 − ((89·bank + 15·branch + 3·account) mod 97),
letters mapped A-I→1-9, J-R→1-9, S-Z→2-9 [assumed to apply to UEMOA
codes that contain letters]. Check digits: ISO 13616 mod 97.
The SQL twins (`sim.iban`, `sim.rib_key`) must give identical results:
`shared/fixtures/iban.json` is checked in Python and pgTAP.
"""
from __future__ import annotations

UEMOA = {"SN", "CI", "BJ", "BF", "GW", "ML", "NE", "TG"}
CEMAC = {"CM", "CF", "CG", "GA", "GQ", "TD"}

_RIB_LETTERS = {**{c: str(i + 1) for i, c in enumerate("ABCDEFGHI")},
                **{c: str(i + 1) for i, c in enumerate("JKLMNOPQR")},
                **{c: str(i + 2) for i, c in enumerate("STUVWXYZ")}}


def _rib_digits(s: str) -> int:
    return int("".join(_RIB_LETTERS.get(c, c) for c in s.upper()))


def rib_key(bank: str, branch: str, account: str) -> str:
    k = 97 - ((89 * _rib_digits(bank) + 15 * _rib_digits(branch) + 3 * _rib_digits(account)) % 97)
    return f"{k:02d}"


def check_digits(country: str, bban: str) -> str:
    s = (bban + country + "00").upper()
    num = int("".join(str(int(c, 36)) for c in s))
    return f"{98 - num % 97:02d}"


def account_length(country: str) -> int:
    return 12 if country in UEMOA else 11


def iban(country: str, bank: str, branch: str, account: str) -> str:
    """country ISO2, bank code (5), branch (5 digits), account (12 UEMOA / 11 otherwise)."""
    if len(bank) != 5 or len(branch) != 5 or len(account) != account_length(country):
        raise ValueError("bad IBAN part length")
    bban = bank + branch + account + rib_key(bank, branch, account)
    return country + check_digits(country, bban) + bban


def is_valid_iban(value: str) -> bool:
    s = value[4:] + value[:4]
    return int("".join(str(int(c, 36)) for c in s)) % 97 == 1


def mask_msisdn(msisdn: str, dial: str) -> str:
    """'+22199123467' → '+221 99 ••• •• 67' (design: last 2 digits shown)."""
    rest = msisdn[len(dial):]
    return f"{dial} {rest[:2]} ••• •• {rest[-2:]}"
