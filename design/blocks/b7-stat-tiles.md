# B7 — Stat tiles

**Validated by Franco on 2026-11-23** (choices A, A, A: 2 × 2 grid of
small cards; value + one plain sentence under it; values neutral, only
"Évolution" takes the gain/loss colour). Tokens:
[../tokens.json](../tokens.json) (`block.statTiles`). Preview:
[../previews/b7-stat-tiles.png](../previews/b7-stat-tiles.png) ·
source [../previews/b7-stat-tiles.html](../previews/b7-stat-tiles.html).

Builds on C7 (plain card), C20 ("?"), C5 (amount, change rule and
hidden amounts), F6 (formats), C18 (skeletons).

## 1. Purpose

Give a non-expert four plain figures about the month, each explained in
one sentence. First used in D1 (Spending); the same tile serves P6
stats, P8 risk figures and P9 TWR/TRI (S4), with their own copy.

## 2. Data (D1)

`get_spending(p_month)` → `indicators{savings_rate, reste_a_vivre,
fixed_share, mom_change}`, `income`. Context sentences use `income`,
saved amount (= income − spent) and fixed charges total. A figure the
server cannot compute comes back `null` → insufficient state (§5).

| Tile | Value | Sentence (FR) | "?" sheet (≤ 3 sentences) |
|---|---|---|---|
| Taux d'épargne | "14 %" | "92 000 F mis de côté ce mois" | "La part de vos revenus que vous n'avez pas dépensée. Ce mois : 92 000 F sur 650 000 F de revenus." |
| Reste à vivre | "312 000 F" | "Après loyer, factures et crédits" | "Ce qui reste de vos revenus une fois payées les charges fixes (loyer, factures, crédits). C'est l'argent disponible pour le reste du mois." |
| Charges fixes | "52 %" | "Loyer, factures et crédits" | "La part de vos revenus prise par les dépenses qui reviennent chaque mois. Vous pouvez choisir quelles catégories en font partie dans Catégories et règles." |
| Évolution | "−12 %" | "Dépenses par rapport à octobre" | "Vos dépenses de ce mois comparées au mois précédent, à la même date." |

Negative savings rate: value "−3 %" (neutral colour), sentence "Plus de
dépenses que de revenus".

## 3. Anatomy

Section title "Ce mois en chiffres" (`titleSection` 18/26, 12 under).
Grid 2 columns, gap 12; each tile is a **plain C7 card** (`surface1`,
radius 12, padding 16, not tappable: the "?" is the only target),
content stacked, gap 4:

| Part | Style |
|---|---|
| Label + "?" | 13/18 Medium `text.secondary`; C20 `circle-help` 16 after the word (gap 2), 48 dp target |
| Value | 22/28 SemiBold tabular `text.primary`, 4 above; amount suffix "F" 13/18 SemiBold `text.secondary` (C5 tile rule, short suffix) |
| Sentence | `caption` 13/18 `text.secondary`, ≤ 2 lines at 100 % font (copy written to fit; details go to the "?" sheet) |

Tiles in a row share the row height (grid stretch). Order fixed:
Taux d'épargne, Reste à vivre / Charges fixes, Évolution.

## 4. Colour rule (choice A)

Values are neutral. Only the change tile ("Évolution") uses C5: Lucide
`trending-down` / `trending-up` 18 before the value, value in `gain` when
spending falls, `loss` when it rises (dark `#3DD68C` / `#FF6B7A`, light
`#0E7A43` / `#C8283C`, F1 pairs already measured). 0 % → neutral, no
icon. No thresholds, no judgement colours on the other tiles.

## 5. States

| State | Rule |
|---|---|
| Insufficient | value replaced by "Données insuffisantes" 15/22 Medium `text.primary`; the sentence says what is missing: "Ajoutez vos revenus du mois" (savings), "Ajoutez vos revenus et charges fixes" (reste à vivre), "Il faut un mois précédent" (évolution). The "?" stays |
| Hidden amounts | amounts → "••• F" (value and sentence); percentages stay (C5) |
| Loading | C18: four tile skeletons (label bar, value bar, sentence bar) |
| Empty month | the whole D1 empty state applies (S5); tiles are not shown |
| Stale / offline | cached values; C8 global banner |
| Large font | when a label or value wraps (≈ 150 % and above), the grid becomes **one column**; sentences wrap freely; amounts may abbreviate (F6) |

## 6. Motion

On month change (B8 month pill): values count from old to new 550 ms
(C5), sentences cross-fade 320 ms. Reduced motion: fade ≤ 150 ms, no
count-up. No entry animation beyond the screen's.

## 7. Accessibility

Each tile is one TalkBack node: "Taux d'épargne, 14 %, 92 000 francs CFA
mis de côté ce mois" + the "?" button ("Taux d'épargne, aide, bouton").
Change tile reads the direction in words: "Évolution, en baisse de 12 %,
dépenses par rapport à octobre". Colour never alone (sign + icon +
words). Texts ≥ 4.5:1 (F1 pairs).

## 8. Performance

Static text in four views; no chart, no shadow.

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| section | Ce mois en chiffres | This month in figures |
| savings | Taux d'épargne · {amount} mis de côté ce mois | Savings rate · {amount} saved this month |
| savingsNeg | Plus de dépenses que de revenus | More spending than income |
| rav | Reste à vivre · Après loyer, factures et crédits | Left to live on · After rent, bills and loans |
| fixed | Charges fixes · Loyer, factures et crédits | Fixed costs · Rent, bills and loans |
| change | Évolution · Dépenses par rapport à {mois} | Change · Spending compared with {month} |
| insufficient | Données insuffisantes | Not enough data |
| missingIncome | Ajoutez vos revenus du mois | Add this month's income |
| missingIncomeFixed | Ajoutez vos revenus et charges fixes | Add your income and fixed costs |
| missingPrev | Il faut un mois précédent | A previous month is needed |

## 10. Where used

D1 (S5, under the month pill). Later: P6 stats, P8 risk figures, P9
TWR/TRI (S4) with the same anatomy and their own copy (X).

Build note (formats.md §7): check the sentences stay ≤ 2 lines at 100 %
on 360 dp in both languages; shorten the copy rather than the type.
