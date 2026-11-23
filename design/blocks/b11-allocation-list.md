# B11 — Allocation list (donut legend)

**Validated by Franco on 2026-11-23** with G4 (choices A, A, A). Tokens:
[../tokens.json](../tokens.json) (`block.allocationList`). Preview:
[../previews/b11-g4-allocation.png](../previews/b11-g4-allocation.png).

Builds on C6 / C7 (list row, list card), G4 (colours, selection), F6.

## 1. Purpose

The accessible legend and the table of G4: every slice as a readable
row. Always shown under the donut (never collapsed).

## 2. Anatomy

One C7 list card; rows C6 (min 64 dp, padding 16 sides, 10 vertical):

| Column | Content | Style |
|---|---|---|
| Swatch | 12 × 12 dp, radius 3, the G4 slice colour | 12 gap to the name |
| Name | "Immobilier", "Fonds", "F CFA", "Côte d'Ivoire", "Autres" | `body` 15/22, wraps |
| Value | share "86,4 %" over amount "57 000 000 F" | 15/22 SemiBold tabular · `caption` 13/18 `text.secondary` tabular, right-aligned |

Hairlines inset to the name (40 dp). Order = G4 order (share
descending, "Autres" last). Max 6 + "Autres"; tapping "Autres" opens a
short C9 sheet listing its keys (same rows, no swatch).

## 3. States and interaction

| State | Rule |
|---|---|
| Selected (with G4) | pressed fill on the row (`#1C1C1C` dark / `#EDEDED` light); text not dimmed |
| Tap row | selects the key in G4 (toggle); no navigation (D11: the class detail is the B10 group) |
| Hidden amounts | amount "••• F"; share visible |
| Loading | C18 row skeletons |
| 200 % font | value column moves under the name (F2 §3); swatch stays at the first line |

## 4. Accessibility

Row: "Immobilier, 86,4 %, 57 000 000 francs, sélectionné" (state when
selected). The swatch is decorative. Contrast: texts as C6 (≥ 4.5:1).

## 5. Copy

Share format "86,4 %" (one decimal, U+202F before %), F6. EN: "86.4%".

## 6. Where used

P1 under G4, P8 exposures (class, currency, country).
