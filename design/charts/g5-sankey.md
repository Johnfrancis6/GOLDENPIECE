# G5 — Sankey: flows of the month

**Validated by Franco on 2026-11-23** (choices A, A, A: three columns
sources → "Revenus" → uses; flows in the destination category colour;
top 6 categories + "Autres" + "Épargne"). Tokens:
[../tokens.json](../tokens.json) (`chart.sankey`). Preview:
[../previews/g5-sankey.png](../previews/g5-sankey.png) · source
[../previews/g5-sankey.html](../previews/g5-sankey.html).

Builds on G0 (base), B8 (frame), C21 (category colours), C7 (list card
for the large-font view), C9 (table sheet), F6 (formats).

## 1. Data

`get_flows(p_month)` → `nodes[{id, kind: income|category|savings,
label_key|name}]`, `links[{source, target, value}]` (≤ 25). The app
draws **one hub**: every income node → "Revenus" → every use. Money is
not traced from a given source to a given expense (it goes through one
pot), so links = sources + uses; a real month has ≤ 6 + 8 = 14 links,
well under 25. Categories beyond the top 6 are summed into "Autres"
(server or client).

Spending > income: the gap is a **source** node "Épargne" (kind
savings, on the left, `warning` colour), and there is no "Épargne" use
on the right.

## 2. Anatomy (inside B8, D2)

B8 header: title "Flux du mois"; summary "Sur 650 000 F reçus, vous avez
dépensé 558 000 F et mis 92 000 F de côté." (overspend: "Vous avez
dépensé 48 000 F de plus que vos revenus ; la différence vient de votre
épargne."); value = income of the month (overspend: spending of the
month) with the words "Revenus du mois" / "Dépenses du mois" in the
change line; month pill.

Plot (320 dp wide on 360 dp, no horizontal scroll):

| Part | Rule |
|---|---|
| Columns | source nodes at x 104, hub at 160, use nodes at 216; nodes 8 dp wide, square ends |
| Hub label | "Revenus" 12/16 Medium `text.secondary`, centred above the hub, 22 dp band at the top |
| Heights | proportional to the amount (build: scale so the tallest column fits ≈ 340 dp); each node sits centred in a **label slot ≥ 34 dp**, gap 6 between slots |
| Labels | outside the nodes: name 12/16 Regular + amount 12/16 SemiBold tabular ("520 000 F"); left labels right-aligned, max 98 dp, 2 lines max (copy ≤ 16 characters: "Mobile money", "Autres revenus"); right labels left-aligned |
| Flows | cubic ribbons (control points at mid-x), widths = amounts, stacked top → bottom in node order; no stroke |
| Order | sources by amount (draw-from-savings last); uses by amount, then "Autres", then "Épargne" last |

## 3. Colours (choice A)

| Element | Dark | Light |
|---|---|---|
| Source nodes, hub | `#4CD68F` (C21 Revenus) | `#16894F` |
| Use nodes | C21 category icon colour (as G3) | same, light set |
| "Épargne" use | `#5FD0E8` | `#0B6F8F` |
| "Épargne" source (overspend) | `#F2C94C` warning | `#8A6200` |
| Flows | colour of the destination node, opacity **0.34** | opacity **0.26** |

Nodes vs page ≥ 4.0:1 (light) / ≥ 8:1 (dark) (same pairs as G3,
measured). Flows are decorative ribbons: every node has its name and
amount in text, so colour is never alone.

## 4. Interaction

- Tap a node or a flow → that path stays, everything else goes to 0.4
  (flows × 0.35); B8 value = its amount; change line = "Courses · 18 % de
  vos revenus" (sources: "Salaire · 80 % de vos revenus"; hub: back to
  the default). Release / tap elsewhere → back. No bubble.
- Previous / next buttons step through sources then uses.
- "Voir en tableau" → tall C9 sheet with two sections "D'où vient
  l'argent" / "Où il part": name · amount · % of income.

## 5. States

| State | Rule |
|---|---|
| No operations | the D1/D2 empty state (S5) |
| No income this month | G0 "Données insuffisantes" box + "Ajoutez vos revenus du mois pour voir d'où vient l'argent."; the table still lists the uses |
| One source | the hub is still drawn (same picture every month) |
| Hidden amounts | amounts "••• F", proportions stay; change line keeps "% de vos revenus" |
| Loading | C18 chart skeleton (three grey bars + soft ribbons) |
| **Large font (≥ 150 %)** | the plot is replaced by two C7 list cards "D'où vient l'argent" / "Où il part" (C21 colour dot 24 + name + amount, amount wraps under the name if needed; first 4 uses + "… N de plus"), then C1 text button "Voir le schéma" (opens the plot at its normal size, labels may then overlap: accepted, the lists are the accessible view) |

## 6. Motion (M8)

First view: nodes fade in 320 ms; flows draw left → right (Skia path
trim on the ribbon mask) 900 ms `enter`, stagger 60 ms. Month change:
node heights and ribbons morph 550 ms (`morph`), labels cross-fade.
Selection dim 150 ms. Reduced motion: drawn at once.

## 7. Accessibility

TalkBack summary = the B8 sentence. Nodes are focusable in order
(sources, hub, uses): "Salaire, 520 000 francs CFA, 80 % de vos
revenus"; "Courses, 118 000 francs CFA, 18 % de vos revenus". "Voir en
tableau" always present; the large-font list is the default view at
≥ 150 %. Targets: each label slot ≥ 34 dp tall + label width; the hit
area is extended to 48 dp vertically when neighbours allow.

## 8. Performance

≤ 15 ribbons + 15 rects in one Skia canvas, static after the draw;
≥ 45 fps target for the morph (G0).

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Flux du mois | Money flows this month |
| hub | Revenus | Income |
| summary | Sur {income} reçus, vous avez dépensé {spent} et mis {saved} de côté. | Out of {income} received, you spent {spent} and saved {saved}. |
| summaryOver | Vous avez dépensé {gap} de plus que vos revenus ; la différence vient de votre épargne. | You spent {gap} more than your income; the difference came from your savings. |
| share | {Nom} · {p} % de vos revenus | {Name} · {p}% of your income |
| from / to | D'où vient l'argent / Où il part | Where the money comes from / Where it goes |
| more | … {n} de plus | … {n} more |
| showChart | Voir le schéma | Show the diagram |
| noIncome | Ajoutez vos revenus du mois pour voir d'où vient l'argent. | Add this month's income to see where the money comes from. |

## 10. Where used

D2 (S5).

Fragile (to watch in the build): left labels longer than 16 characters;
months with many tiny sources (slots make the plot taller — cap at 6
sources, the rest grouped "Autres revenus").
