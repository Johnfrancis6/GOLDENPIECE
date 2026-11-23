# Design rules learned from Franco

One line per rule, newest last. Kept by the `design-feedback-learner` skill: every "je valide, mais…" or
correction becomes a rule here. **Check** says how it is enforced: `lint:<check>` = design/tools/lint-preview.js
catches it automatically; `eye` = look for it on the PNG before sending; `ask` = a choice only Franco makes.
Read this file whole (it stays short); decisions D1-D13 are in README.md.

## Process

| # | Rule | Source | Check |
|---|---|---|---|
| P1 | Write to Franco in French, short; files in `design/` in English; UI copy French first, then English. | Session 3 | eye |
| P2 | For each item ask at most 3 questions, each with labelled options A/B/C and a recommended default; offer a default drawn from his references when he gives none. | Session 3 | eye |
| P3 | Preview only what decides the item; do not present micro-details (exact gaps, edge values): decide them and write the rule. | Session 3 | eye |
| P4 | "je valide, mais …" = validated with a change: apply it, write files, commit, push, send the updated preview, say it can still be adjusted. | Session 3 | eye |
| P5 | An ambiguous answer: state your interpretation in one line in the reply. | Session 3 (D4) | eye |
| P6 | When a reference breaks a rule (contrast, performance), give the measured number and 2-3 variants. | Session 3 | eye |
| P7 | Low-impact items may be validated without a preview when Franco says so ("pas besoin de preview"); record the defaults in the file and flag them in the self-critique. | Alerts, G6 | eye |
| P8 | Ask for references once per section, before its first item (Home v1 was redrawn after a late reference). | Home v2 | ask |
| P9 | Never copy a third-party logo or screen; draw an original in the same spirit and say so. | App icon | ask |
| P10 | Never present an assumption as a fact; keep "measured" vs "assumed" apart. | Session 3 | eye |
| P11 | When Franco asks to continue in a new session: update NEXT_SESSION.md, push, create the session yourself, give him the link. | Alerts | eye |
| P12 | Previews: run design/tools/lint-preview.js (100 % and --font2x) and fix every ERROR before sending; then look at the PNG yourself. | Home ring bug | lint:all |

## Look and layout

| # | Rule | Source | Check |
|---|---|---|---|
| L1 | Clean screens like Finary: hero on the page, fewer boxes, lists as one card, pills, flat, no shadows (D7). | F3 | eye |
| L2 | D11: at 360 × 800 the first screen shows the hero + at most 3 blocks; one header action; a list row ≤ 2 text lines per side (settings rows 1); one chart per frame; secondary content behind a tap. When in doubt, remove. | Placements | lint:d11 |
| L3 | D12: no text overlaps another text, mark or annotation at 100 % and 200 % font; annotations go under the phone. | S5 | lint:overlap, lint:annot |
| L4 | Fixed-size graphics (rings, icons, avatars) never shrink: `flex: none` (class `ic`). | Home ring | lint:clip |
| L5 | Labels must fit their slot in FR (≤ 2 lines, settings 1 line); shorten the copy rather than shrink the type. | S7, W, B21 | lint:clip, eye |
| L6 | Colours only from tokens.json; a new colour is a token change raised to Franco. | B16 red | lint:colour |
| L7 | Text contrast ≥ 4.5:1 (3:1 large), controls and meaningful marks ≥ 3:1, in both themes; white on brand fill is forbidden (2.6:1). | F1 | lint:contr |
| L8 | Light-theme marks must stay visible (translucent white on light background disappears). | App icon | lint:contr (marks) |
| L9 | Selected options in choice lists: orange text (`#FF9A5C` dark, `#B4410F` light) + SemiBold + check. | C9 | eye |
| L10 | Progress is shown as rings, crisp and saturated colours, never washed out. | C17 | eye |
| L11 | No chevrons except in Settings; no hidden swipe gestures (D3); no haptics. | C6, C12 | eye |
| L12 | Toasts at the bottom with an unfold-from-centre animation; status banners at the top. | C11 | eye |

## Icons

| # | Rule | Source | Check |
|---|---|---|---|
| I1 | Lucide only (design/tools/icon.js), never hand-drawn glyphs; stroke 2 dp at 24, 1.75 dp at 20/16/14. | F4 | eye |
| I2 | `receipt` shows a "$": use `receipt-text`. Check each new glyph's meaning at its real size. | C21 | eye |
| I3 | Few icons; light illustrative icons by group headings are welcome, in `text.secondary`, 20 dp. | B10 | eye |
| I4 | Light tap animation on icons; bottom-bar tabs do not animate. | F4, D9 | eye |

## Motion

| # | Rule | Source | Check |
|---|---|---|---|
| M1 | Slower than 150-600 ms; soft, refined endings; gradients smooth and harmonised like Finary. | F5 | ask |
| M2 | Motion previews: one animated HTML with "Rejouer" and "Ralenti ×3" buttons; key frames with render.js --times. | Entry motion | eye |
| M3 | Transform/opacity animations only (Skia path trim allowed); no blur or large shadows; charts ≥ 45 fps, ≤ 500 points per series. | Brief §2 | eye |
