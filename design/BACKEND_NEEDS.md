# Backend needs before the visual build (2026-11-23)

The validated design was checked against [../docs/API.md](../docs/API.md)
(Session 2 contracts). Below: what the screens show that the API does not
return yet. Each line is a **contract change to make in a backend session
before (or with) the build session that draws the screen**. Nothing here
changes the design; if a change is refused, the design fallback is given.

## Must have (a validated screen cannot be built without it)

| # | Screen / item | Design needs | API today | Proposed change | Fallback if refused |
|---|---|---|---|---|---|
| 1 | S2 Home, card carousel | one card per account (≤ 8): name, kind, institution monogram, balance; card foot "{n} comptes · {m} placements" | `get_home` has no accounts; `list_accounts` is a second call | `get_home.accounts[{id, kind, display_name, institution, balance_ref}]` + `counts{accounts, positions}` | call `list_accounts` in parallel (+1 KB, 2 calls per open) |
| 2 | S2 Home, tile "Meilleure hausse · sur 1 mois" | best holding over 30 days, its change and a 30-point sparkline | only `market_strip` (5 market quotes, no series) | `get_home.top_mover{instrument_id, name, change_30d_pct, spark_30d[30]}` (null if no position) | tile shows "Placements / Ajoutez un achat" state |
| 3 | S2 Home, tile "Plus gros poste · ce mois" | biggest spending category this month, amount, share of month spending (C17 ring) | `budget.worst` = worst budget %, not the biggest category | `get_home.top_category{category_id, spent_ref, share}` | compute from the local transaction cache (month rows) |
| 4 | S2 Home, action "Classer" badge (12) | uncategorised count | only in `get_spending` | `get_home.uncategorised_count` | call `get_spending` for the month |
| 5 | W widgets, N notifications | alerts waiting for the user's answer ("à confirmer") vs open alerts | `alerts.open_count` only | `get_home.alerts.to_confirm_count` | widget shows open count only |
| 6 | N notifications (7 types) | FCM **data** message: `{type, channel, alert_id?, title_key, args{op_type, operator, payee_short, time, bank, category, asset, share, threshold, amount?}, sent_at}`; payee shortened server-side ("Awa K."); amount only when "Montants visibles" is on | `notify` sends `{user_id, alert_id, kind}`; triggers listed: decision, reminder, budget | adopt the N payload; add triggers **concentration breach** (nightly batch) and **learning finished** | app builds text from `kind` only (less precise, no payee) |
| 7 | S4 Placements, B10 debt row | "Prêteur · taux" | `debts[{id, name, balance_ref, rate_bp, monthly_payment}]`, no lender | add `lender` to `debts[]` and `upsert_debt` | subtitle shows the rate only |
| 8 | S4 P6, G6 candles 5Y | monthly candles, ≤ 60 | weekly, ≤ 260 | `get_asset(…,'5Y')` aggregates monthly | thin weekly candles (not legible at 360 dp) |
| 9 | D bank dashboard, queue | `band`, `tx{amount, op_type, cp_name}`, `decided{by, at, simulated}` per row | `items[{alert_id, created_at, score, kind, reasons[], user_ref, country, bank_id, status, age_min}]` | add the three fields | detail fetched per row (slow queue) |
| 10 | D alert detail, score breakdown | `reasons[{code, params, weight}]`, components `{A_thr, A_if, F, rules[], M, bumps[]}`, user notification/answer events | `score_breakdown{a_thr, a_if, f, m}` | add `weight`, `rules[]`, `bumps[]`, `user_events[]` | breakdown shows the 4 totals only |

## Nice to have / decisions (no API change)

- **Dernières opérations (Home, 3 rows)**: read from the local transaction
  cache (offline-first), not from `get_home`. Decision, no change.
- 90-day daily debits + median (D): computed in the dashboard from
  `history_90d`. No change.
- P8 exposures per currency/country and P9 contributions per class: already in
  `get_risk.exposures` and `get_performance.contributions.class`. OK.
- Reason codes: the X copy tables (`copy/fr-en.md`) must use the same code list
  as the scoring (`ARCHITECTURE.md`); the backend session checks both lists
  match and adds any missing key.

## Order

Backend session first (items 1-6 touch `get_home` and `notify`, used from the
first build session), then 7-8 with the Placements build, 9-10 with the
dashboard build.
