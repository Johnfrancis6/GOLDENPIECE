# B6 — Budget ring

**Validated by Franco on 2026-11-22** (choices A, A, A: Home = two tiles
"Ce mois" + worst category; amount under the ring = what is left, or
"Dépassé de …" in loss; D3 row = category badge left, ring right).
Tokens: [../tokens.json](../tokens.json) (`block.budgetRing`). Preview:
[../previews/b6-budget-ring.png](../previews/b6-budget-ring.png) ·
source [../previews/b6-budget-ring.html](../previews/b6-budget-ring.html).

Builds on C17 (rings: tile 64/7, row 52/6, states ok/near/over), C21
(category badges), C7 (tappable card), C6 (list row), C1 (secondary
small button), C5 (amount formats).

## 1. Data

| Where | Fields |
|---|---|
| Home | `budget{spent, budgeted, left, worst}` (`worst` = category with the highest spent/budgeted ratio: `{category_id, spent, budgeted, left}`) |
| D3 | per category `{category_id, spent, budgeted, left}` |

Percentage = round(spent / budgeted × 100). State (C17): **ok** < 80 %,
**near** 80-100 %, **over** > 100 % (ring full).

## 2. Home — two tiles (choice A)

Section title "Budget" (`titleSection`, 12 above). Two C7 **tappable**
tiles side by side, equal width, gap 12, padding 16, content stacked
with gap 12:

| Tile | Head (min height 24) | Ring | Status line |
|---|---|---|---|
| Left: total | "Ce mois" 13/18 Medium | C17 tile 64 dp, stroke 7, label "69 %" 13 SemiBold | "Reste 138 000 F" |
| Right: worst category | C21 small badge 24 (icon 14) + "Courses" 13/18 Medium | same, state colour of that category | "Reste 18 000 F" |

Both tiles open D3. If only one category has a budget, the right tile
shows it anyway (same as the total, accepted); if `worst` is in the
**ok** state, it is still shown (the tile is "your most advanced budget",
not an alarm).

## 3. Status line (choice A)

`caption` 13/18 `text.secondary`: "Reste {left}" (C5 abbreviated form
allowed: "Reste 1,2 M F"). Over budget: "Dépassé de {−left}" in
13/18 Medium `#FF7B6E` dark / `#C8283C` light (C17). Hidden amounts:
"Reste ••• F" / "Dépassé" alone; the percentage stays visible.

## 4. D3 — category row (choice A)

C6 row in one list card: C21 category badge 40 (icon 20) · 12 · name
(`body` 15/22) + status line (§3) · C17 **row ring 52 dp**, stroke 6,
label "82 %" 11 SemiBold, on the right (16 padding). Height ≥ 64 dp,
hairline inset 68. Order: highest percentage first (over, near, ok).
The category colour says *which* category; the ring colour says *how*
it is going: never mixed.

## 5. States

| State | Rule |
|---|---|
| No budget (Home) | one plain C7 card: "Fixez un montant par catégorie pour suivre vos dépenses du mois." (`caption` `text.secondary`) + C1 secondary small "+ Créer un budget" (Lucide `plus` 16) → D3 creation |
| No budget (D3) | C19 empty state (piggy bank) with the same sentence and a primary "Créer un budget" |
| Loading | C18: two tile skeletons (64 dp grey circle + bars) / row skeletons |
| Stale, offline | cached values stay; C8 global banner |
| Large font (200 %) | rings keep their size; tiles stack one under the other when the head or status wraps to 3+ lines; rows: status may wrap |

## 6. Motion

C17: arc sweeps 0 → value in 1100 ms (`enter`, Skia path trim) on first
view; tiles/rows stagger 80 ms; value change old → new 550 ms; a state
change (ok → near → over) cross-fades the arc colour 320 ms. Reduced
motion: drawn at once. Press: C7/C6 pressed fill, no scale.

## 7. Accessibility

Tile: one button, "Budget du mois, 69 % utilisé, reste 138 000 francs
CFA". Row: "Restaurant, 108 % du budget, dépassé de 4 000 francs CFA".
Ring vs track ≥ 3:1 (C17); texts ≥ 4.5:1; state is never colour alone
(percentage + "Reste"/"Dépassé" words).

## 8. Performance

Two Skia arcs per ring, static after the sweep; FlashList rows with a
fixed height up to 130 % font.

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| section | Budget | Budget |
| total | Ce mois | This month |
| left | Reste {amount} | {amount} left |
| over | Dépassé de {amount} | Over by {amount} |
| empty | Fixez un montant par catégorie pour suivre vos dépenses du mois. | Set an amount per category to follow your spending this month. |
| create | Créer un budget | Create a budget |

## 10. Where used

Home (S2), D3 budgets (S5), widget "budget left" (W, total tile),
notifications 80 % / 100 % (N, category + percentage).
