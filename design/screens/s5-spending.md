# S5 — Spending (D1-D4)

**Validated by Franco on 2026-11-23** (choices A, A, A: section pills
Aperçu · Flux · Budgets; "Catégories et règles" row at the end of Aperçu
+ Settings; `uncategorised_count` as a C8 info banner). Change asked by
Franco: **no "Revenus" label above the Sankey hub** (G5 updated), and
from now on every preview is adjusted so that **no text overlaps** (D12).
Preview (dark, 360 dp; dashed line = bottom of the first 800 dp screen,
its label sits under each phone so it covers nothing):
[../previews/s5-spending.png](../previews/s5-spending.png) · source
[../previews/s5-spending.html](../previews/s5-spending.html) · 200 % font
[../previews/s5-spending-200.png](../previews/s5-spending-200.png) · source
[../previews/s5-spending-200.html](../previews/s5-spending-200.html).

Assembles validated items only: C12 (header, section pills, bottom bar),
B8 (month pill, frames), C8 (info banner), B1-style hero, G3, B7, G5,
B6 rows, C1, C6/C7, C21, B22 (D4). Rule D11: first screen = hero + ≤ 3
blocks, one header action, ≤ 2 text lines per row side, one chart per
frame.

## 1. Tab screen frame

| Part | Rule |
|---|---|
| Header bar | right: open-alert icon (only when an alert is open, D8) + **eye** (C20). No other action: "Créer un budget" lives in the Budgets section |
| Large title | "Dépenses", then scrolls away; small centred title on scroll (S2) |
| Section pills | **Aperçu · Flux · Budgets**, 24 dp under; remembered per session; content cross-fades (C12) |
| Month pill | B8 month pill "Mois Novembre" (40 dp, `surface3`, chevron-down → C9 month list), **once, under the pills, shared by the three sections**; the charts below have no month pill of their own. 16 dp under |
| Bottom bar | Dépenses active (`chart-pie`) |

## 2. Sections (top → bottom)

| Pill | Content | First screen at 360 × 800 |
|---|---|---|
| **Aperçu** (D1) | C8 **info** banner "12 opérations à classer" + action "Classer" (only when `uncategorised_count` > 0; tap → A2 filtered on "À classer") · hero "Dépensé en novembre" **558 000 F CFA** + one sentence on the categories ("Le logement et les courses font 53 % de vos dépenses.") · **G3** directly under the hero (legend, top 6 + Autres, "Voir les 12 catégories", previous/next, "Voir en tableau", freshness) · 32 · **B7** "Ce mois en chiffres" 2 × 2 · 32 · one C7 card with the C6 row "Catégories et règles" / "12 catégories · 4 règles" (grey `tags` badge 40, no chevron) → D4 (B22) | banner + hero + G3 (7 rows) |
| **Flux** (D2) | **G5** frame: title "Flux du mois", summary sentence, value "650 000 F" + "Revenus du mois", plot (no hub label), previous/next + "Voir en tableau", freshness. No separate hero | the whole plot except the last use |
| **Budgets** (D3) | hero "Reste sur vos budgets" **58 000 F CFA** + "255 000 F dépensés sur 313 000 F prévus." (over all budgets: "Dépassé de {x}" in the B6 over colour) · 24 · one C7 card of **B6 D3 rows** (highest percentage first) · 16 · C1 **secondary** large full width "+ Créer un budget" (`plus` 20) → B18 budget form | all of it with 4 budgets |

### Hero ↔ G3 (Aperçu)

The hero **is** the G3 frame's value line (B8): G3 sits right under it, so
the scrub stays in view. Selecting a bar (tap, drag, previous/next) turns
the hero into "Courses en novembre" · "118 000 F CFA" and the sentence
into "↗ +15 % par rapport à octobre" (C5 colours); release → back. The
month change (−12 %) is shown **only** in the B7 "Évolution" tile, so no
figure appears twice on the page (D11).

### Banner

C8 info kind (`surface3` fill, icon `text.secondary`), icon **`tag`**
(not the default `history`), text 13/18 Medium, action "Classer" 13/18
SemiBold `brand.text` right-aligned; the whole banner is one 48 dp target.
Not dismissible: it goes away when the count reaches 0. At large font the
action wraps under the text (aligned with it).

## 3. States

| State | Screen |
|---|---|
| First load | C18 skeletons per section from the cached layout |
| No operations this month | Aperçu: C19 "Pas encore d'opérations ce mois-ci" (no banner, no G3, no tiles); Flux: same C19; Budgets unchanged |
| No budget | Budgets: B6 D3 empty state (C19 piggy bank + primary "Créer un budget"), no hero |
| No income this month | Flux: G5 `noIncome` sentence + "Ajouter un revenu"; B7 savings tile "Données insuffisantes" |
| Past month | the same layout for the chosen month; banner hidden; freshness "Mois clos" |
| Offline / error | cached content + C8 global banner under the header (above the info banner; only one info banner at a time) |
| Hidden amounts | amounts "•••", percentages, bars, rings and flows stay |
| 200 % font | G3 rows stack, B7 one column, G5 becomes two lists + "Voir le schéma", B6 status wraps; pills scroll (last pill cut) |

## 4. Performance

Each section is one scroll view; only the visible section is mounted
(others keep their scroll position). One G3 or one G5 per section, static
Skia paths. Pull-to-refresh (M5) on every section; the month pill change
reuses B8's 550 ms count-up.

## 5. Accessibility

Pills are a tab list ("Flux, onglet 2 sur 3, sélectionné"). Each
section's first heading receives focus on change. The month pill reads
"Mois, novembre, changer". The banner reads "12 opérations à classer,
bouton". G3 and G5 have their B8 summary as label and the table
alternative. The Sankey hub has no visible label; TalkBack reads it
"Revenus, 650 000 francs CFA".

## 6. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Dépenses | Spending |
| pills | Aperçu · Flux · Budgets | Overview · Flows · Budgets |
| monthPill | Mois {mois} | Month {month} |
| uncategorised | {n} opérations à classer · Classer | {n} transactions to sort · Sort |
| heroSpent | Dépensé en {mois} | Spent in {month} |
| heroShare | {a} et {b} font {p} % de vos dépenses. | {a} and {b} make up {p}% of your spending. |
| rulesRow | Catégories et règles · {n} catégories · {r} règles | Categories and rules · {n} categories · {r} rules |
| budgetsHero | Reste sur vos budgets | Left in your budgets |
| budgetsSub | {spent} dépensés sur {planned} prévus. | {spent} spent of {planned} planned. |
| createBudget | Créer un budget | Create a budget |

## 7. Where used / build notes

Tab "Dépenses". D4 (B22) is also reached from Settings (S7). A2 filtered
list is reached from the banner. Build: check at 360 × 800, 100 % and
200 % font, and that **no text overlaps any other text or mark** (D12);
report adjustments in one line (formats.md §7).

Validation: 2026-11-23.
