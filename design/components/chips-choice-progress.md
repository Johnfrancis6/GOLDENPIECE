# C13 Chips · C16 Choice controls · C17 Progress (rings)

**Validated by Franco on 2026-11-22** (chips B: orange tint; controls
orange when on; progress drawn as **rings** instead of bars, inspired by
a reference he gave, with crisp, saturated colours). Tokens:
[../tokens.json](../tokens.json) (`component.chip`,
`component.choiceControl`, `component.progress`). Previews:
[../previews/c13-c16-chips-choice.png](../previews/c13-c16-chips-choice.png),
[../previews/c17-progress-rings.png](../previews/c17-progress-rings.png).

## 1. C13 — Chips

| Kind | Look | Use |
|---|---|---|
| Filter (multi) | 36 dp pill (≥ 48 dp target), padding 14, 14/20 Medium, `surface3`. **Selected:** brand tint (`rgba(255,122,47,0.13)` dark / `#FFE9DC` light), text `#FF9A5C` dark / `#B4410F` light SemiBold (8.4:1 / 4.8:1), leading `check` 16 dp, left padding 10 | A2, D4, L1, P7 filters; gap 8, wrap (or one scrolling row inside 20 dp margins, last chip cut) |
| Single choice | same, selected without check | P6 candlestick range (3M · 1A · 5A) and other short single choices (the period selector stays the C12 bar, D9) |
| Source (read-only) | 24 dp pill `surface3`, 12/16 Medium `text.secondary`, icon 14 dp: "règle" `list-checks`, "IA" `sparkles`, "vous" `user` | A3, A4 (category source) |

Selection change: fill and text swap at once; the check fades in (`quick`).

## 2. C16 — Choice controls

| Control | On | Off |
|---|---|---|
| Switch 52 × 32 | track `#FF7A2F`, thumb 24 dp `#060606` (7.8:1) | track `surface3` + 2 dp `border.control` (3.98:1 dark), thumb 20 dp `text.secondary` |
| Checkbox 22 dp, radius 6 | fill `#FF7A2F`, check `#060606` 16 dp | 2 dp `border.control` |
| Radio 22 dp | fill `#FF7A2F`, inner dot 8 dp `#060606` | 2 dp ring `border.control` |
| Choice list | rows (C6) with radio on the right; **selected text orange SemiBold** (same rule as C9/C12) | `text.primary` |

Same colours in light (track and fills stay `#FF7A2F` with black). The
whole row is the touch target. Motion: thumb slides 220 ms (`press`,
`standard`); on/off layers cross-fade; check and dot fade in with a
0.6 → 1 scale (220 ms). Reduced motion: instant.
TalkBack: native switch/checkbox/radio roles with state.

## 3. C17 — Progress

### 3.1 Rings (budget, learning) — replace bars

- Track: full circle `#262626` dark / `#EBEBEB` light. Arc: solid colour,
  **round cap**, starts at 12 o'clock, clockwise; no gradient, no blur,
  no transparency (the reference looked blurred: avoided).
- Centre label: percentage (or "12/30") SemiBold, tabular digits,
  `text.primary`, U+202F before %. The ring never carries the value
  alone: amounts and a status line sit next to it.

| Size | Ring | Stroke | Label | Where |
|---|---|---|---|---|
| Row | 52 dp | 6 | 11 | budget list (D3, B6) |
| Mini | 44 dp | 6 | 11 | Home "Plus gros poste" tile, next to the amount (never shrinks: flex none) |
| Tile | 64 dp | 7 | 13 | Home budget tiles, 2 per row (B6 compact) |
| Learning | 56 dp | 7 | 12 | B5 card ("12/30") |

| State | Dark | Light | Rule |
|---|---|---|---|
| ok | `#4CD68F` | `#16894F` | < 80 % |
| near | `#FFC940` | `#A36F00` | 80-100 % |
| over | `#FF7B6E` | `#D2412F` | > 100 % (ring full) |
| learning | `#FF8C4A` | `#D0560F` | B5 progress |

Contrast against the track: dark ≥ 5.99:1, light ≥ 3.51:1 (≥ 3:1, script).
Status line under the title: "Reste 38 000 F CFA" `text.secondary`; over:
"Dépassé de 1 500 F CFA" in `#FF7B6E` dark / `#C8283C` light (loss, text).

Motion (first view only): the arc sweeps from 0 to its value in 1100 ms with a **very light overshoot** (Franco, 2026-11-23, ring-gauge style): Skia path trim end = value × backOut(t, s = 0.9), peak ≈ +3 % of the value, then settles; the centre label counts 0 → value with `enter` (no overshoot); a ring at ≥ 100 % cannot pass the full turn, so it draws to full with `enter` and pulses scale 1 → 1.04 → 1 over the last 18 % of the time; nothing is drawn while trim = 0 (no round-cap dot); rings stagger 80 ms. Preview: [../previews/m-entry-rings-sankey.html](../previews/m-entry-rings-sankey.html); value
changes sweep from old to new in `chartPeriodMorph` 550 ms. Reduced
motion: drawn at once. TalkBack: "Alimentation, 62 % du budget, reste
38 000 francs CFA".

### 3.2 Step dots (questionnaire, tour)

Dots 8 dp, gap 8: done `selectedText` at 55 %, current a 24 × 8 pill
`#FF7A2F`, to come `border.control`; label "Étape 2 sur 5" 13/18
`text.secondary`. The current pill widens in `quick` (scaleX).

## 4. Performance

Rings are two Skia arcs per item, static after the one sweep; no
per-frame JS. Chips and controls animate opacity/transform only.

## 5. Build instructions

Check at 200 % font: ring labels keep their size (they are graphics),
status lines wrap under the title, the value column may move under the
text. Adjust and report in one line (formats.md §7).

## 6. Where used

C13: A2, A3, A4, D4, L1, P6, P7. C16: O2, O12, O14, Settings (switches,
theme radio list). C17: B5 (Home, L1), B6 (Home tiles, D3 list), O4,
O14, O15c, tour.
