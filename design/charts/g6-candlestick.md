# G6 — Candlestick (asset detail, P6)

**Validated by Franco on 2026-11-23** (choices A, A, A, without a
separate preview: "passe à la mise en page"; the candles are shown in
the S4 preview, P6 phone). Tokens: [../tokens.json](../tokens.json)
(`chart.candlestick`). Preview: [../previews/s4-placements.png](../previews/s4-placements.png).

Builds on G0 (base, scrub, previous/next, table), G1 (line), B8 (frame),
C13 (single-choice chips), F1 (`gain` / `loss`).

## 1. Choices

| # | Decision |
|---|---|
| 1 | **Line by default** (G1, `brand.text`, light fading area); C13 single-choice chips **Courbe · Bougies** switch to candles. A monthly series (agri, `freshness: monthly`) is always a line; the chips are hidden |
| 2 | Candle colours: **close ≥ open → `gain`**, close < open → `loss`, both **filled**; wick 1 dp same colour. Colour is never alone: the scrub value line reads "Ouverture … · Plus haut … · Plus bas … · Clôture …" in words |
| 3 | **≤ ~60 candles per range**: 3M = daily (~63), 1A = weekly (52), 5A = **monthly (60)**. API change: `get_asset(…, '5Y')` must aggregate monthly (today ≤ 260 weekly points) — contract change for Franco / build sessions |

## 2. Anatomy (inside B8, plot full width 360 dp, height 240)

| Part | Rule |
|---|---|
| Slot | plot width / n candles (≈ 5,2 dp at 63 on 328 dp of plot) |
| Body | 60 % of the slot (≈ 3 dp at 3M), min 2 dp; min body height 1 dp (doji = 1 dp line) |
| Wick | 1 dp, centred, from high to low |
| Grid / axis | G0: 3 horizontal grid lines with price labels right, 3-4 date labels under |
| Range chips | **3M · 1A · 5A** (C13 single choice) in the B8 selector slot, left; **Courbe · Bougies** on the right of the same row |
| Scrub | vertical cursor on the touched candle; B8 value line shows the close, the change line is replaced by "O 16 800 · H 17 150 · B 16 700 · C 17 000" spelled out for TalkBack |

## 3. Motion

Switch Courbe ↔ Bougies (shown as two icon segments `chart-spline` · `chart-candlestick` at the right of the range chips when one row cannot hold five text chips at 360 dp): cross-fade 320 ms (`quick`), no morph. Range
change: G1 period morph for the line; candles cross-fade. First view:
candles fade in left → right by groups of 10 (opacity only, 600 ms
total); reduced motion: at once.

## 4. Accessibility and performance

Chart labelled with the B8 summary sentence; "Voir en tableau" lists
date, open, high, low, close. ≤ 63 candles = ≤ 126 rects + lines in one
Skia picture: well within ≥ 45 fps.

## 5. Risks (not verified)

Legibility of 3 dp bodies on the Tecno Spark 50 (LCD, low density
assumed): check in the first build; if too thin, 3M drops to ~45
candles (last 45 sessions) rather than thinner bodies.

## 6. Copy

| FR | EN |
|---|---|
| Courbe · Bougies | Line · Candles |
| 3M · 1A · 5A | 3M · 1Y · 5Y |
| Ouverture · Plus haut · Plus bas · Clôture | Open · High · Low · Close |
| Prix mensuel : affiché en courbe | Monthly price: shown as a line |
