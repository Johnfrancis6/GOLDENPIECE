# B8 — Chart frame

**Validated by Franco on 2026-11-23** (choices A, A, A: each chart has
its own small value line driven by the scrub, no bubble; the frame sits
on the page, full width, no card; a visible plain-language summary
sentence). Tokens: [../tokens.json](../tokens.json) (`block.chartFrame`).
Preview: [../previews/b8-chart-frame.png](../previews/b8-chart-frame.png) ·
source [../previews/b8-chart-frame.html](../previews/b8-chart-frame.html).

Builds on G0 (base rules: plot, scrub, previous/next, table view,
freshness, < 2 points), G1-G7 (the chart inside), C12 (period bar), C9
(month list), C20 ("?"), C5 (amount and change), C1 (text button).

## 1. Purpose

One frame for every chart that does not sit under the Home hero: P6
performance, P8 risk / drawdown, P9 contributions, D1 spending by
category, D2 flows. Home keeps B1 + G1 (the hero plays the value role).

## 2. Anatomy (top → bottom, on the page, 20 dp margins, plot full width)

| Part | Content | Style |
|---|---|---|
| Title | "Évolution du portefeuille" + C20 "?" when the title is jargon | `titleSection` 18/26 |
| Summary | one plain sentence from the selected period's numbers: "Votre portefeuille a gagné 8,4 % depuis le 1er janvier." / "Vos dépenses ont baissé de 12 % par rapport à octobre." ≤ 2 lines | `caption` 13/18 `text.secondary`, 2 under |
| Value | "4 812 300 F": last value (lines), month total (bars, Sankey) | `amountLarge` 22/28 SemiBold tabular, 12 under |
| Change | C5 change (trending icon + "+373 000 F (+8,4 %)" in gain/loss) + period words "depuis le 1er janv." | 13/18 Medium; words Regular `text.secondary`; 2 under |
| Selector | C12 "Période" bar, or a **month pill** "Mois Novembre" (same pill: 40 dp, `surface3`, chevron-down) opening the C9 month list (selected month orange, C9) | 16 under |
| Chart | G1-G7, plot full screen width, height 210 (P6 may use 240) | 8 under |
| Controls | previous / next 40 dp icon buttons + "Voir en tableau" (C1 text, right) | 8 under |
| Freshness | "Mis à jour le 22 nov., 14:05" or "Cours différés (~15 min) · au …" | 12/16 `text.secondary`, 8 under |

Between two frames on one screen: 32 dp (section gap, F3). No card, no
border (D7). One frame never holds two charts.

## 3. Scrub (choice A)

Touching the plot drives the frame's **value** line (value of the touched
point or bar); the change line is replaced by the date ("mardi 12 août
2026") or the bar label ("Courses, novembre"); the summary stays.
Release restores both (G0 timing). No tooltip bubble anywhere.

## 4. States

| State | Rule |
|---|---|
| < 2 points | value and change lines hidden; G0 dashed box "Données insuffisantes" + reason ("Il faut au moins deux mois d'opérations."); selector stays |
| Loading | C18 chart skeleton; title stays; summary bar skeleton |
| Hidden amounts | value "••• F"; change keeps the percentage only (C5); summary uses percentages only |
| Stale / offline | cached chart stays; freshness line shows the date; C8 global banner |
| Large font (200 %) | value may abbreviate (C5); summary wraps (no 2-line limit then); plot keeps its height |

## 5. Motion

Chart motion is G0-G7 (draw, morph on period change). On a period or
month change the summary and value cross-fade 320 ms, the value counts
from old to new (C5 count-up, 550 ms). Reduced motion: no count-up,
fades ≤ 150 ms.

## 6. Accessibility

The summary sentence is also the chart's TalkBack summary (G0): one text
for sight and screen reader. Order: title, "?", summary, value, change,
selector, chart (summary + previous/next), table view, freshness.
"Voir en tableau" is always present as the non-visual alternative.

## 7. Copy patterns (FR / EN)

| Case | FR | EN |
|---|---|---|
| line up / down | Votre {objet} a gagné / perdu {p} % {période}. | Your {object} gained / lost {p}% {period}. |
| spending vs previous | Vos dépenses ont baissé / augmenté de {p} % par rapport à {mois}. | Your spending fell / rose {p}% compared with {month}. |
| month pill | Mois {mois} | Month {month} |
| insufficient | Il faut au moins deux mois d'opérations. | At least two months of operations are needed. |

Build sessions write the per-chart sentences in X (copy), in this
pattern.

## 8. Where used

P6, P8, P9 (S4), D1, D2 (S5). Not on Home (B1 + G1).
