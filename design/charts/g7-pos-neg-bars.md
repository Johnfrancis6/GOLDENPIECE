# G7 — Positive / negative bars (contributions, D2)

**Validated by Franco on 2026-11-23** with the S4 layout (shown in the
P9 phone of [../previews/s4-placements.png](../previews/s4-placements.png)).
Tokens: [../tokens.json](../tokens.json) (`chart.posNegBars`).

Builds on G0, G3 (horizontal rows, label above the bar), B8 (frame),
C13 (chips), F1 (`gain` / `loss`).

## 1. Data

P9 `contributions` per asset or per class for the selected period (C12
period bar of the Performance tab), in the reference currency; currency
effect is a separate B7 tile, not a bar.

## 2. Anatomy (inside B8)

B8 header: title "Ce qui a compté" + "?" (B12: "La part de la
performance apportée par chaque placement."), summary sentence ("Le Fonds
S&P 500 a le plus aidé, le Bitcoin a le plus pesé."), C13 single-choice
chips **Par actif · Par classe** (no value line: the TWR/TRI tiles above
carry the totals).

Rows sorted by value descending (largest gain on top, largest loss at
the bottom); max 6 + "Autres" (net value of the rest):

| Part | Rule |
|---|---|
| Label line | name left 13/18 Regular `text.primary` (wraps), value right "+402 000 F" 13/18 SemiBold in `gain` / `loss`, sign always shown (U+2212 for minus) |
| Bar | 12 dp high, radius 3, 4 dp under the label line; starts at a **centre zero axis** (1 dp `#3A3A3A` dark / `#C7C7C7` light, 2 dp longer than the bar top and bottom) and grows right for gains (`gain`) and left for losses (`loss`); length = |value| / max |value| × half width |
| Row gap | 12 dp (row ≈ 46 dp) |
| Zero | value "0 F" in `text.secondary`, no bar |

Colour is never alone: sign and words in the value. "Voir en tableau"
(C1 text button) lists name / value / share of the performance.

## 3. Motion and states

Bars grow from the axis (scaleX from the zero side) 600 ms `enter`,
staggered 40 ms per row (≤ 7 rows); chip or period change: cross-fade
320 ms. Reduced motion: at once. Loading: C18 bar skeletons. Insufficient
data: B8 empty line "Pas encore de contribution sur cette période."
Hidden amounts: values "••• F", bars still drawn (they show shares, not
amounts). 200 % font: label and value stack; bars keep 12 dp.

## 4. Accessibility and performance

Each row is one element: "Fonds S&P 500, a ajouté 402 000 francs". ≤ 7
rects; transform-only animation.

## 5. Copy

| FR | EN |
|---|---|
| Ce qui a compté | What made the difference |
| Par actif · Par classe | By asset · By class |
| Le {a} a le plus aidé, le {b} a le plus pesé. | {A} helped most, {b} weighed most. |
