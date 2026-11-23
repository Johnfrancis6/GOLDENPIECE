# G3 — Bars: spending by category vs previous month

**Validated by Franco on 2026-11-23** (choices A, A, A: horizontal bars,
one row per category; bars in the category colour; top 6 + "Autres" +
"Voir les 12 catégories"). Changes asked by Franco: the previous-month
level is a **small down-pointing arrow ("v")**, not a line, set **inside
the bar near its top edge with a slight gap**, **solid black, crisp
edges**. Tokens: [../tokens.json](../tokens.json) (`chart.bars`).
Preview: [../previews/g3-bars.png](../previews/g3-bars.png) · source
[../previews/g3-bars.html](../previews/g3-bars.html).

Builds on G0 (base: no grid, scrub drives the value, no bubble,
previous/next, "Voir en tableau"), B8 (frame), C21 (category colours and
badges), C5 (change rule), C1 (text button).

## 1. Data

`get_spending(p_month)` → `by_category[{category_id, spent, prev_month,
change_pct}]`, total spent. One series (this month) + one reference
value per category (previous month).

## 2. Anatomy (inside B8, D1)

B8 header: title "Dépenses par catégorie", summary "Vos dépenses ont
baissé de 12 % par rapport à octobre.", value = month total, change line
(C5: spending down = `gain` with `trending-down`), month pill "Mois
Novembre".

Legend (12/16 `text.secondary`, 8 under the pill): swatch "Novembre" ·
arrow "Niveau d'octobre".

Rows (one per category, **height 48 dp**, sorted by `spent` descending):

| Part | Rule |
|---|---|
| Badge | C21 small 24 (icon 14) |
| Name | 13/18 Regular, column 84 dp, one line (longest default: "Restaurant", "Transferts") |
| Bar | thickness **16 dp**, square left end, right radius 4, colour = the category's C21 icon colour (dark / light) |
| Amount | 13/18 SemiBold tabular, right-aligned, column 68 dp, short suffix "F" (F6) |
| Gaps | 8 between parts |

Scale: the longest of all `spent` and `prev_month` values shown = bar
track width − 12 dp (room for an outside arrow). Bars start at 0; no
axis, no grid (G0).

## 3. Previous-month arrow (Franco)

- Shape: down-pointing triangle, box 12 × 8 dp, drawn as a vector path
  with **sharp miter corners** (no anti-aliased clip), tip pointing at
  the bar.
- **Inside the bar** (previous month ≤ this month): top **2 dp under the
  bar's top edge**; fill `#060606` in dark (8.0-13.2:1 on the 12 bar
  colours); in light fill `#0A0A0A` + **1 dp white outline** (black
  alone falls to 2.9-4.5:1 on the darker light bars; white outline
  4.4-6.7:1 on them, black on white 18:1). Centred on the previous value,
  pulled back to ≤ bar end − 9 dp so it never touches the rounded end;
  equal months → it sits at the bar end.
- **Past the bar** (previous month > this month): same height, on the
  page, fill `text.primary` (`#F5F5F5` dark — black would vanish on the
  black page; `#0A0A0A` light), at the previous value but ≥ bar end + 7 dp.
- Never the only cue: the scrub line and the table give the exact value.

## 4. Categories shown (choice A)

Top 6 by `spent` + one **"Autres"** row (grey C21 "Autres" colour) that
sums the rest. Under the rows, C1 text button "Voir les 12 catégories"
+ `chevron-down` 16 (48 dp target) expands the full list in place
(rows slide in, 320 ms, `enter`); it becomes "Voir moins". With ≤ 7
categories there is no "Autres" and no button.

## 5. Interaction

- **Tap or drag across rows** → that row is selected: the other rows go
  to opacity 0.4 (bar, badge, name, amount, arrow); B8 value shows the
  category's `spent`; the change line becomes "Courses · ↗ +15 % par
  rapport à octobre" (C5 colour rule). Release → everything returns
  (G0 timing). No bubble.
- Previous / next buttons step through rows (same effect).
- Tap on the "Autres" row selects it like any row; "Voir les 12" is the
  only way to expand.
- "Voir en tableau" → tall C9 sheet: Catégorie · Novembre · Octobre ·
  Évolution.
- A category row does **not** open anything in G3 (category detail and
  rules live in D4/B22, reached from S5).

## 6. States

| State | Rule |
|---|---|
| No operations this month | the D1 empty state (S5); G3 not drawn |
| No previous month | no arrows, legend shows "Novembre" only; summary "Premier mois suivi." |
| Only 1 category | one row; still drawn |
| Hidden amounts | amounts "••• F"; bars and arrows stay (they show proportions, not amounts); B8 value "••• F" |
| Loading | C18 chart skeleton: 6 grey rows (circle + bar) |
| Large font (≥ 150 %) | each row stacks: badge + name + amount on one line, the bar full width under it (6 dp gap), 20 dp before the next row so each bar reads with its own name; bar thickness unchanged |
| Uncategorised operations | not in G3; S5 shows the `uncategorised_count` link |

## 7. Motion (M8)

First view: bars grow from the left, 700 ms `enter`, stagger 60 ms
(scaleX on a left origin, transform only); arrows fade in 200 ms after
500 ms. Month change: bars morph old → new width 550 ms (`morph`),
reordering rows cross-fade 320 ms. Selection dim 150 ms. Reduced motion:
drawn at once, selection without fade.

## 8. Accessibility

TalkBack summary = the B8 sentence. Each row is one node: "Courses,
118 000 francs CFA, en hausse de 15 % par rapport à octobre, 103 000
francs CFA". Colour never alone (badge icon + name + amount). Bars vs
page ≥ 4.0:1 (light) / ≥ 8.0:1 (dark), measured; arrow as §3. Targets:
rows 48 dp.

## 9. Performance

≤ 13 bars + 13 arrows: static Skia rects and paths; growth on transform
only; ≥ 45 fps target (G0).

## 10. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Dépenses par catégorie | Spending by category |
| legendNow | {Mois} | {Month} |
| legendPrev | Niveau d'{mois} / de {mois} | {Month} level |
| expand / collapse | Voir les {n} catégories / Voir moins | See all {n} categories / See less |
| scrubChange | {Catégorie} · {±p} % par rapport à {mois} | {Category} · {±p}% compared with {month} |
| firstMonth | Premier mois suivi. | First month tracked. |
| other | Autres | Other |

## 11. Where used

D1 (S5), inside B8 under the B7 tiles.

Build note (formats.md §7): check the name column at 100 % with the 12
default category names in FR and EN; if one wraps, shrink to the
ellipsis-free short label in X rather than narrowing the bar.
