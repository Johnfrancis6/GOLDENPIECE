# B10 — Position, real-estate and debt rows

**Validated by Franco on 2026-11-23** (choices A, A, A: value + unrealised
gain tag on the right; one list card per group with a heading and a
subtotal, no leading badge on rows; real estate older than 6 months gets
"À réévaluer"), **with a change:** a light illustrative Lucide icon left
of each group heading (Placements, Immobilier, Dettes). Tokens:
[../tokens.json](../tokens.json) (`block.holdingRows`). Preview:
[../previews/b10-holding-rows.png](../previews/b10-holding-rows.png) ·
source [../previews/b10-holding-rows.html](../previews/b10-holding-rows.html).

Builds on C6 (list row), C7 (list card), C5 (row amount, change tag),
C14 (tag anatomy, freshness wording), C15 (yellow "à confirmer" colours,
reused for the warning tag), F4 (Lucide), F6 (formats). Same decision on
D5 in the same round: Placements uses **section pills Portefeuille ·
Marchés · Risque · Performance**, header action "+" (README D5).

## 1. Purpose

Show what the user owns and owes in one glance: what it is worth now and
whether it gained or lost. Everything else (average cost, last price,
realised gain, freshness detail) lives in the asset detail (P6) or the
edit screen (P4, P5) — D11.

## 2. Data (API `get_portfolio`)

| Row | Fields used |
|---|---|
| Position | `name`, `class`, `qty`, `value_ref`, `unrealised_pct`, `freshness` (`delayed`/`monthly`/`manual`), `proxy_of` |
| Real estate | `name`, `value_ref`, `valued_on`, `stale` (> 6 months) |
| Debt | `name`, `balance_ref`, `rate_bp`, `monthly_payment` + lender name (**missing in `get_portfolio.debts`**, present in P5 fields: to add to the API — contract change for Franco; until then the subtitle shows the rate only) |
| Group subtotal | `totals` (per group) |

Not on the row: `avg_cost`, `last_price`, `realised`, `unrealised` amount
→ P6 "Ma position".

## 3. Group (section) anatomy

| Part | Content | Style |
|---|---|---|
| Heading | **icon** + name: Placements `chart-line`, Immobilier `house`, Dettes `hand-coins` | icon 20 dp, stroke 1.75, `text.secondary`, gap 8, centred on the title line (Franco's change); title `titleSection` 18/26 SemiBold |
| Subtotal | right, same line: "8 945 000 F", debts "−21 650 000 F" | 15/22 Medium tabular, `text.secondary` |
| List card | one C7 list card per group, hairlines inset 16 | 12 under the heading, 32 between groups (F3) |

The icons are decorative (not focusable, no label); they are the only
icons in the block. A group with no item is not shown (P1 empty state
handles the no-holdings case).

## 4. Row anatomy (C6, no leading item, no chevron)

min height 64 dp, padding 16 sides (vertical padding 10), gap 8, value
column right-aligned, gap 4 between its two lines. At most **2 lines per
side** (D11).

| Row | Left: title / subtitle | Right: value / under |
|---|---|---|
| Position | "Sonatel" / "Action · 120 titres"; special cases append: "· Proxy : SPY", "· Prix mensuel", "· Prix manuel" | "2 040 000 F" / C5 change tag of `unrealised_pct` ("+18,4 %", `trending-up`, gain; "−2,1 %", `trending-down`, loss; 0,0 % → grey text, no fill) |
| Real estate | "Appartement Cocody" / "Estimé le 14 sept. 2026" | "45 000 000 F" / nothing; if `stale`: **warning tag "À réévaluer"** (`calendar-clock` 14 dp) |
| Debt | "Prêt immobilier" / "Banque Lagune · 6,5 %" | "−18 400 000 F" (U+2212, `text.primary`, **not red**: a debt is not a loss) / "85 000 F/mois" caption `text.secondary` |

- Quantity unit by class: "titres" (shares), "parts" (funds),
  "g"/"oz" (metals), coin symbol for crypto ("0,012 BTC", F6 decimals),
  "obligations" or nominal for bonds — wording to fix in i18n.
- Order inside a group: value descending; debts by balance descending.
- Amounts in the reference currency, row suffix "F" (F6); positions in
  another currency still show the converted value (currency in P6).
- Subtitle wraps rather than truncates; the proxy part goes to a second
  subtitle line only at large font.

### Warning tag (new C14 kind "warning")

Same anatomy as C14; colours reused from C15 "À confirmer", already
measured: dark `rgba(242,201,76,0.16)` / `#F2C94C` (8.5:1), light
`#FBF0CC` / `#735200` (6.3:1). Icon + word, never colour alone.

## 5. Variants

| Variant | Where | Rule |
|---|---|---|
| Portfolio | P1 | three groups as above |
| Excluded ("Hors calcul de risque") | P8 | one list card, same row; subtitle = reason ("Immobilier", "Prix mensuel", "Historique insuffisant"); right = value only, no tag |
| Compact (no group heading) | P2 detail lists, search results | rows only |

## 6. States

| State | Rule |
|---|---|
| Loading | C18 row skeletons, group headings drawn (from cache layout) |
| Empty (no holdings at all) | C19 "Aucun placement" + "Ajouter un achat"; second action "Ajouter un bien immobilier" as text button (brief P1) |
| Pending trade (offline queued) | C14 "En attente" tag replaces the change tag; value in `text.secondary` (C6 pending) |
| Stale price | subtitle shows "Cours du {date}" (B9 rule, > 7 days) |
| Hidden amounts | values and subtotals "••• F"; **percentages stay visible** (C5 §5) |
| Large font (200 %) | value column moves under the name (F2 §3); tags wrap to their own line |
| Pressed | C6 pressed fill, no scale |

## 7. Interaction and motion

Tap a position → P6 asset detail; real estate → P4 edit/valuation;
debt → P5 edit. No swipe (D3). Value updates cross-fade 320 ms (as B9);
rows do not animate on entry. Reduced motion: no cross-fade.

## 8. Accessibility

Row = one focusable element: "Sonatel, action, 120 titres, 2 040 000
francs, plus-value latente plus 18,4 %"; "Terrain Bingerville, estimé le
3 février 2026, 12 000 000 francs, à réévaluer"; "Prêt immobilier,
Banque Lagune, taux 6,5 %, reste dû 18 400 000 francs, 85 000 francs par
mois". Group heading is a heading for TalkBack, read with its subtotal.
Touch target = whole row (≥ 64 dp). All texts ≥ 4.5:1 (C5, C14, C15
measurements).

## 9. Performance

FlashList with section headers, fixed heights up to 130 % font; flat
fills, no shadow; 3 static icons.

## 10. Copy

| FR | EN |
|---|---|
| Placements · Immobilier · Dettes | Investments · Real estate · Debts |
| {n} titres · {n} parts | {n} shares · {n} units |
| Proxy : {ticker} · Prix mensuel · Prix manuel | Proxy: {ticker} · Monthly price · Manual price |
| Estimé le {date} | Valued on {date} |
| À réévaluer | Revalue |
| {amount}/mois | {amount}/month |
| Hors calcul de risque | Excluded from risk |
| Historique insuffisant | Not enough history |

## 11. Where used

P1 Portfolio (S4), P8 excluded list, P2 drill-down lists.
