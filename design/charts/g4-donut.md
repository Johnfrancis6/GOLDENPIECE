# G4 — Donut (allocation)

**Validated by Franco on 2026-11-23** (choices A, A, A: thin ring with
the total in the centre, tap highlights one slice; Classe · Devise · Pays
chips switch the donut in place; all assets incl. real estate, debts
excluded). Tokens: [../tokens.json](../tokens.json) (`chart.donut`).
Preview (with B11): [../previews/b11-g4-allocation.png](../previews/b11-g4-allocation.png) ·
source [../previews/b11-g4-allocation.html](../previews/b11-g4-allocation.html).

Builds on G0 (chart base), F1 §5 (chart palette, fixed order, "Autres"),
B8 (frame on the page), C13 (single-choice chips). Its legend is always
B11 ([../blocks/b11-allocation-list.md](../blocks/b11-allocation-list.md)).

## 1. Data

`allocation{class[], currency[], country[]}` with `{key, value_ref,
share}` (API `get_portfolio`). Base = **gross assets: positions + real
estate**; debts excluded (the summary and the centre say "actifs").
P8 exposures use the same chart on the risk-scope holdings.

## 2. Anatomy

| Part | Rule |
|---|---|
| Size | 200 × 200 dp, centred, 20 dp above (after the chips) and below (before B11) |
| Ring | stroke 16 dp on radius 84 (outer 92), butt caps, **2 dp gap** between slices (measured on the mid radius), gap shows the page background |
| Start | 12 o'clock, clockwise, slices in descending share, "Autres" last |
| Smallest slice | drawn at **≥ 1.5°** so a 0,5 % share stays visible; its % is in B11 |
| Colours | F1 §5 series, **fixed per entity**: class Actions s1 orange, Fonds s2 violet, Obligations s3 aqua, Immobilier s4 blue, Crypto s5 yellow, Matières premières / Liquidités s6 magenta; "Autres" grey. Currency and country keys take slots by share at first display and keep them for the session |
| Max slices | 6 + "Autres" (F1) |
| Centre (rest) | "Total des actifs" `caption` `text.secondary` / total 18/26 SemiBold tabular / "{n} classes" (or "devises", "pays") 13/18 Medium `text.secondary` |
| Centre (selected) | key name / its amount / its share |

The frame around it is B8 without value line and without period
(allocation is "now"): title "Répartition", one-sentence summary
("L'immobilier représente 86 % de vos actifs."), C13 single-choice chips
**Classe · Devise · Pays** (16 dp under the summary), donut, B11 list.
No "Voir en tableau": the B11 list is the table.

## 3. Interaction

| Action | Result |
|---|---|
| Tap a slice or a B11 row | that key selected: other slices **opacity 0.28**, centre shows the key, its B11 row gets the pressed fill (`#1C1C1C` / `#EDEDED`); list texts keep full contrast |
| Tap it again, or tap the centre | back to total |
| Tap a chip | donut and list switch to that grouping; selection cleared |
| Long press / drag | nothing (no scrub on a donut) |

Hit test on the ring only (angle + radius 76-100 dp, so a thin slice still
gets a ≥ 48 dp touch zone along the arc for B11; very thin slices are
selected through B11).

## 4. Motion

- First view: the ring **draws clockwise** from 12 o'clock, 700 ms,
  `enter` easing (Skia path trim); centre text fades in after 200 ms.
- Chip change: old ring fades out / new one fades in, 320 ms (`quick`);
  no morph between groupings (simpler, smooth on the Tecno).
- Selection: opacity changes 220 ms (`press`).
- Reduced motion: drawn at once, swaps instant.

## 5. Accessibility

The donut is one focusable image labelled with the summary sentence;
values are read from B11 rows. Colour never alone: names and % are in
B11 (light aqua, yellow, magenta are < 3:1 on white, F1 §5). Chips are a
radio group ("Répartition par classe, sélectionné").

## 6. Performance

≤ 7 arcs as Skia paths, no gradient, no shadow; selection = opacity on
paths; draw-on = path trim (allowed, F5). Re-render only on data/chip
change.

## 7. States

| State | Rule |
|---|---|
| Loading | grey ring skeleton (C18 tone) + list skeleton |
| One key only | full ring, no gap; summary "Tous vos actifs sont en {key}." |
| Empty (no assets) | frame hidden; P1 empty state (C19) |
| Hidden amounts | centre amount "••• F"; % and names visible |
| Large font (200 %) | donut keeps 200 dp; centre total abbreviates (F6 §3, "65,9 M F") if it does not fit the 168 dp hole |

## 8. Copy

| FR | EN |
|---|---|
| Répartition | Allocation |
| Classe · Devise · Pays | Class · Currency · Country |
| Total des actifs | Total assets |
| {n} classes · {n} devises · {n} pays | {n} classes · {n} currencies · {n} countries |
| L'{key} représente {pct} de vos actifs. | {Key} makes up {pct} of your assets. |
| Autres | Other |

## 9. Where used

P1 Portefeuille (allocation block, P2 merged into it — D5), P8 exposures.
