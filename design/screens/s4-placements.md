# S4 — Placements (P1-P9)

**Validated by Franco on 2026-11-23** (with G7 and B18 drawn inside it).
Preview (dark, 360 dp, dashed line = bottom of the first 800 dp screen):
[../previews/s4-placements.png](../previews/s4-placements.png) · source
[../previews/s4-placements.html](../previews/s4-placements.html).

Assembles validated items only: C12 (header, section pills, period bar,
bottom bar), B1 (hero), G4 + B11, B10, B9, C8, B7, B8 + G1, B12, G6, G7,
B18, C13, C20, C5. Rule D11: first screen = hero + ≤ 3 blocks, one header
action, ≤ 2 text lines per row side, one chart per frame.

## 1. Tab screen frame

| Part | Rule |
|---|---|
| Header bar | right: open-alert icon (only when an alert is open, D8), **eye** (C20), **`plus`** → C9 short sheet "Ajouter un achat ou une vente · Ajouter un bien immobilier · Ajouter une dette". The eye is the cross-tab amount control; `plus` is the one screen action (Franco validated the two icons) |
| Large title | "Placements", then scrolls away; small centred title on scroll (S2) |
| Section pills (D5) | **Portefeuille · Marchés · Risque · Performance**, 24 dp under; the row scrolls, last pill cut at the edge; remembered per session; content cross-fades (C12) |
| Bottom bar | Placements active |

## 2. Sections (top → bottom; 32 dp between blocks)

| Pill | Content | First screen at 360 × 800 |
|---|---|---|
| **Portefeuille** (P1 + P2) | B1-style hero "Valeur nette" + "?" (assets − debts, "44 295 000 F CFA", month change, freshness) · B8-style "Répartition" G4 + B11 (Classe · Devise · Pays) · B10 groups Placements, Immobilier, Dettes | hero + Répartition |
| **Marchés** (P7) | freshness sentence on top ("Cours différés (~15 min) · au … · variation sur 1 mois") · one B9 card per group: Indices, Métaux, Agriculture, Devises, Énergie, Crypto (sparklines per B9) · sources line | 3 groups, no hero |
| **Risque** (P8) | C8 warning banner if a concentration threshold is passed (tap scrolls to Concentration) · B7 2 × 2 tiles Volatilité, Perte maximale, VaR 1 mois, Bêta (each "?" → B12) + text button "Voir VaR 1 jour et CVaR" (C9 short sheet with the 4 values) · B8 "Baisses depuis le sommet" G1 drawdown (1 year, no period bar) · Concentration (B10 rows of breaches only + "Modifier le seuil" → C9 sheet with C4 amount keypad in %, + line "Les autres placements sont sous le seuil.") · Exposition (C13 chips + B11 list **without donut**) · Hors calcul de risque (B10 excluded variant) | banner + tiles + chart title |
| **Performance** (P9) | C12 period bar (Mois · Année · Depuis le début · Personnalisée, D1) · B7 two tiles **TWR** and **TRI** (value with C5 icon/colour, one sentence each, "?" → B12; TRI "non calculable" state) · B8 "Ce qui a compté" **G7** (Par actif · Par classe) · B7 wide tile "Effet de change" | period + tiles + G7 |

The pill order follows the user's questions: what do I own → how are
markets → how risky → how did I do.

## 3. Sub-pages

| Screen | Layout |
|---|---|
| **P6 Asset detail** (tap a B10 position or a P7 row) | sub-page header (back + name); hero: class · market caption, price "17 000 F CFA", day change, freshness; proxy note as C14 tag under the caption when `proxy_of`; B8 with C13 range chips 3M · 1A · 5A left and the Courbe · Bougies icon segments right, G1 line by default or G6 candles (240 dp); "Ma position" key-value card (Valeur, Titres, Prix moyen d'achat, Plus-value latente; réalisée only when ≠ 0) + text button "Ajouter un achat ou une vente" (opens B18 prefilled); "Chiffres clés" B7 two tiles (Volatilité, Bêta vs benchmark); attribution line |
| **P3 Add trade** | B18 (Achat · Vente) |
| **P4 Real estate / P5 Debt** | B18 with their fields; P4 adds "Nouvelle estimation" (value + date) as the main action when editing |

## 4. States

| State | Screen |
|---|---|
| First load | C18 skeletons per section from the cached layout |
| Empty portfolio | Portefeuille: C19 "Aucun placement" + "Ajouter un achat" + text button "Ajouter un bien immobilier"; Risque and Performance: C19 "Ajoutez un placement coté pour voir votre risque" |
| No quoted asset (only real estate) | Risque: C19 empty + the Hors calcul list |
| Données insuffisantes | per B7 tile (B7 §5), B12 says what is missing |
| Custom period | Performance loads ≤ 1 s: tiles and G7 show skeletons, old values do not stay |
| Offline / error | cached content + C8 banner under the header |
| Rejected trade | C8 error banner on Portefeuille (B18 §2) |
| Hidden amounts | amounts "•••", percentages visible everywhere |
| 200 % font | blocks follow their own rules (rows stack, tiles one column, donut centre abbreviated); pills scroll |

## 5. Performance

Each section is one scroll view; only the visible section is mounted
(others keep their scroll position). Charts: one G4, one G1 or G6, one
G7 at most per section, all static Skia paths. Pull-to-refresh (M5) on
every section.

## 6. Accessibility

Pills are a tab list ("Risque, onglet 3 sur 4, sélectionné"). Each
section's first heading receives focus on change. Charts have their B8
summary sentence as label and a table alternative.
