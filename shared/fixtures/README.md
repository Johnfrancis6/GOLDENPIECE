# Shared fixtures

| File | Used by | Regenerate |
|---|---|---|
| `money.json` (210 cases: exponent, half-even division, parse, format, convert via the 655.957 peg and EUR cross, allocate) | `batch/tests/test_money.py`, `supabase/functions/_shared/money_test.ts`, `supabase/tests/money_fixtures.test.sql` | `python3 shared/fixtures/gen_money.py && python3 shared/fixtures/gen_money_sql.py` (CI fails if the committed files differ) |

Later: finance cases (B4), iforest parity (B5), provider contract (B2).
