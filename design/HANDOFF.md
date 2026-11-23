# Session 3 handoff — design system, continuation

Updated 2026-11-22 (continuation 3: B4 alert card, B5 learning card, B6 budget ring, B9 quote row, B8 chart frame; continuation 2: C9, C18-C19,
C13-C16-C17, C20, C21, C22 — base components complete — G0-G1-G2 and
B1 validated; earlier sittings: all foundations, C1, C5, C6-C7, C8-C10-C11,
C12, C14-C15). First written
2026-11-22 by the first Session 3 (design) at Franco's request,
for the session that continues the design system. Read this file, then
[../docs/BRIEF_03_DESIGN.md](../docs/BRIEF_03_DESIGN.md) (the method and
the screen-by-screen data), then [README.md](README.md) (validated items,
inventory, build order, decisions D1-D9).

## Goal (unchanged)

Define everything the GOLDENPIECE app displays and how it moves, as a
reference design system of blocks and components validated one by one by
Franco, that build sessions copy instead of inventing. It must feel smooth
on a low/mid-range Android phone (Tecno Spark 50).

## Where we are

| Item | Status | File |
|---|---|---|
| Inventory + build order | validated 2026-11-22 | [README.md](README.md) |
| F1 Colour | validated 2026-11-22 | [foundations/colour.md](foundations/colour.md) |
| F2 Typography (Poppins GP) | validated 2026-11-22 | [foundations/typography.md](foundations/typography.md), [fonts/](fonts/) |
| F3 Spacing, grid, radii, elevation | validated 2026-11-22 | [foundations/spacing-layout.md](foundations/spacing-layout.md) |
| F6 Display formats | validated 2026-11-22 | [foundations/formats.md](foundations/formats.md) |
| F4 Iconography (Lucide) | validated 2026-11-22 | [foundations/icons.md](foundations/icons.md) |
| F5 Motion (+ glow C, sheen, bank card) | validated 2026-11-22 | [foundations/motion.md](foundations/motion.md) |
| C1 Button | validated 2026-11-22 | [components/button.md](components/button.md) |
| C5 Amount and change | validated 2026-11-22 | [components/amount.md](components/amount.md) |
| C14 + C15 Tags, score badge | validated 2026-11-22 | [components/tags-score.md](components/tags-score.md) |
| C6 + C7 List row, card | validated 2026-11-22 | [components/list-row-card.md](components/list-row-card.md) |
| C12 Navigation (4 tabs, header, section pills, period bar) | validated 2026-11-22 | [components/navigation.md](components/navigation.md) |
| C8 Banner + C10 Dialog + C11 Toast | validated 2026-11-22 | [components/feedback.md](components/feedback.md) |
| C9 Bottom sheet (selected options orange, also C12 period menu) | validated 2026-11-22 | [components/bottom-sheet.md](components/bottom-sheet.md) |
| C18 + C19 Skeletons (bank + orange wifi), empty state (piggy bank), "Connexion instable" stop | validated 2026-11-22 | [components/loading-empty.md](components/loading-empty.md) |
| C13 + C16 + C17 Chips (orange tint), controls (orange on), progress **rings** | validated 2026-11-22 | [components/chips-choice-progress.md](components/chips-choice-progress.md) |
| C20 Help triggers ("?" icon, eye: show needs fingerprint/code; C5 §5 updated) | validated 2026-11-22 | [components/help-triggers.md](components/help-triggers.md) |
| C21 Badges (categories in colour, operators as monograms; F4 §4 updated) | validated 2026-11-22 | [components/badges.md](components/badges.md) |
| C22 Status timeline | validated 2026-11-22 | [components/status-timeline.md](components/status-timeline.md) |
| G0 + G1 + G2 Charts (line + light gradient, scrub drives hero, sparklines by direction) | validated 2026-11-22 | [charts/g0-g1-g2.md](charts/g0-g1-g2.md) |
| B1 Net-worth header (first Home block) | validated 2026-11-22 | [blocks/b1-networth-header.md](blocks/b1-networth-header.md) |
| B4 Alert card (Home strip: one card + "Voir les N alertes"; > 70 gold edge; whole card tappable, Oui/Non only in L2; compact C6 variant) | validated 2026-11-22 | [blocks/b4-alert-card.md](blocks/b4-alert-card.md) |
| B5 Learning card (two C17 orange rings, fraud-reassurance line, L5 finished state with grey OK) | validated 2026-11-22 | [blocks/b5-learning-card.md](blocks/b5-learning-card.md) |
| B6 Budget ring (Home: two tiles "Ce mois" + worst category; D3: badge left, ring right) | validated 2026-11-22 | [blocks/b6-budget-ring.md](blocks/b6-budget-ring.md) |
| B9 Quote row (one card, freshness line under it, 1-month period; **G2 sparklines get a light fading area**, Franco 2026-11-23) | validated 2026-11-23 | [blocks/b9-quote-row.md](blocks/b9-quote-row.md) |
| B8 Chart frame (no card; title, summary sentence, 22 sp value driven by scrub, period bar or month pill, chart, controls, freshness) | validated 2026-11-23 | [blocks/b8-chart-frame.md](blocks/b8-chart-frame.md) |
| Tokens | v0.25.0: all foundations (colour, typography, spacing, layout, radius, elevation, format, icon, motion) + `component.*` (button, amount, changeTag, tag, scoreBadge, listRow, card, navigation, banner, dialog, toast, bottomSheet, skeleton, emptyState, chip, choiceControl, progress, help, badge, timeline) + `chart` (base, line, sparkline) + `block` (networthHeader, alertCard, learningCard, budgetRing, quoteRow, chartFrame) | [tokens.json](tokens.json) |

**Next items, in order** (README "Build order"): **S2 Home layout** (first full screen: check glow C light alphas
there) → Alerts (C2-C4, B13, B14, B15 + G8, S6) → … → … → M14 App opening (last).

Branch: `claude/brave-bardeen-g5ro94` (also holds Session 1-2 docs; not
yet merged into `main`; Franco merges through a pull request).

## How Franco works (observed in this session)

- He answers in short French messages ("je valide", "B", "oui") and gives
  **references as images** (app shots from design sites) or a website.
  For each item: ask for references/preferences in ≤ 3 questions, offer a
  default drawn from his earlier references if he gives none.
- He wants a **preview of only what decides the item**, then validates or
  asks for changes. On validation: write the file(s) in `design/`, update
  `tokens.json` and `README.md`, commit, push — in the same turn.
- Answer in French; files in `design/` in English; UI copy French first.
- When a reference breaks a rule (contrast, performance), say so with the
  measured number and propose 2-3 variants (he picked from such lists:
  F1 button B, Poppins GP).
- **Do not present micro-details** (edge values, exact gaps, alignment
  inside a component): decide them, write the rule, and leave a build
  instruction to check and adjust (formats.md §7). Ask him only about
  choices visible across many screens. For F6 he validated the defaults
  without a preview.
- Motion: he found 150-600 ms **too fast** and wants **soft, refined
  endings** and **smooth gradients harmonised like Finary** (motion.md).
  Previews of motion are an animated HTML sent with SendUserFile (render).
- He prefers **Lucide icons over hand-drawn glyphs** (trending-up/down,
  score icons) and light-theme texts darkened so both themes look
  equally crisp (C5, C15).
- He often validates **with a change in the same message** ("je valide
  mais …"): apply the change, write the files, commit, push, send the
  updated preview, and say the detail can still be adjusted.
- Animated previews (motion, toast) are one HTML page with embedded
  fonts sent with SendUserFile (display "render"); the repo copy in
  `previews/` points to `../fonts/`.
- Decisions this sitting: D8 no Alertes tab; D9 period = expandable bar
  "Période"; bottom-bar tabs **not animated**; toasts at the **bottom**
  with an unfold-from-centre animation; badges in operation lists only
  when there is a risk; no haptics; no chevrons except in Settings.
- He wants **clean screens like Finary** (few icons, one header action)
  and **light tap animations** on icons (icons.md §7-8, D8).
- Selected options in choice lists are **orange text** (`#FF9A5C` dark,
  `#B4410F` light) + SemiBold + check (C9, extended to C12); reuse it for
  every single/multi choice list (C13, C16).
- Franco designs some illustrations himself in words (C18 bank + wifi
  arcs lighting one by one; C19 piggy bank with coins on the ground; wifi
  + "!" for a failed load): build them from Lucide shapes, strokes 2.5 dp.
- Progress is shown as **rings**, not bars (Franco, from a reference with
  ring gauges): he wants colours **crisp and saturated** but harmonious,
  never blurred or washed out.
- He asked how many steps remain (2026-11-23): after B8, 41 items ≈ 30
  validation rounds; give such counts by section when asked.
- Typical rhythm (continuation 2): ask ≤ 3 questions with labelled
  options and a recommended default → he answers "A, oui" → build the
  preview (static PNG at scale 2, plus an animated HTML with embedded
  fonts when something moves) → he answers "je valide" (sometimes with
  a change) → write files, commit, push, then ask the next item's
  questions in the same reply.
- Previews must be checked by eye before sending: wrapped rows, clipped
  phones, a wrong Lucide glyph (e.g. `receipt` has a "$": use
  `receipt-text`) were caught this way.
- He asked for **"oui pour C12 aussi"**-type extensions: when a change
  should apply to a validated item, propose it and update that file.
- An ambiguous answer: state the interpretation in one line in the reply
  (e.g. theme "oui" was read as "follow the phone setting", D4).

## His references so far (style direction)

1. Dark wallet app, orange balance card → palette.
2. Darker wallet app, neutral greys, warm top glow → darkness + ember→gold
   glow; white buttons (he chose **orange buttons** instead).
3. Light finance app set in **Poppins** → typography.
4. **Finary** (finary.com; the app itself needs a login, only marketing
   screenshots are public) → layout principles: hero on the page, fewer
   boxes, lists as one card, pills, flat. He asked to use Finary's
   principles for F3; reuse them as the default for components unless he
   says otherwise.

## Measured (2026-11-22, this session)

| What | Result | How |
|---|---|---|
| Contrast of every F1 pair | all text ≥ 4.5:1, controls ≥ 3:1 (table in colour.md §7) | WCAG formula, node script |
| White on reference orange #FD7B2A | 2.6:1 → white on brand fill forbidden | same |
| Chart palette (6 series) | worst adjacent CVD ΔE 13.2 dark / 16.3 light; light slots aqua, yellow, magenta < 3:1 on white | dataviz skill `validate_palette.js` |
| Poppins features | no `tnum`, proportional digits, no U+202F, no arrows ▲▼, no ≈ | fontTools on Google Fonts TTF v4.004 |
| Poppins GP size | ≈ 16 KB per weight, 3 weights | built files in `fonts/` |
| Poppins width | a test sentence 5 % wider than Inter | canvas measureText in Chromium |
| Network from the container | GitHub raw files → 403; fonts.googleapis.com / fonts.gstatic.com, npm registry, cdn.jsdelivr.net → OK | curl |

## Assumed (not verified — do not state as fact)

- Fraud rules (R1-R6) stay active during the learning phase (B5
  reassurance line; brief only says anomaly alerts are off).
- API adds `spark_30d` and `change_30d` per Home quote (B9).
- Tecno Spark 50 has an **LCD** screen and low pixel density (its specs
  are still to be read on the phone, SETUP.md; Franco's pending answer).
- Widget sizes 2×1 and 2×2 cells (brief §3.11).
- The Home glow and the gold sheen cost nothing noticeable on the phone
  (static gradient / one translated layer): to measure in the first build.

## Open points

- D5: Placements internal navigation decided at step S4.
- M13 gold sheen: done in F5 (1.4 s, once on first view + on tap); where
  exactly bank-card visuals appear is decided with S3 (accounts).
- M14 App opening: Franco found the first proposal mediocre; design it
  **last**.
- Glow C light-theme alphas and banding on the Tecno: to check (S2).
- Done in F6 (formats.md): abbreviation rule used by F2 §3 ("1,2 M F CFA") and
  U+2212 minus / U+202F separators (Poppins GP has both).
- Arrows and status shapes (▲ ▼ ● ◆) are icons (F4), not text glyphs.

## Preview sources (reuse them)

Generator scripts and HTML of continuation 2 were in the session
scratchpad (lost with the container); the repo copies in `previews/*.html`
are the reusable sources: G1 chart functions (`chartSVG`, `smooth`,
`spark`) are in `previews/g0-g1-g2-charts.html`; glow C CSS is built from
`tokens.json → colour.glow.homeHeader.layers` (see `previews/b1-networth-header.html`); skeleton
wifi animation in `previews/c18-c19-loading-empty.html`; alert cards (B4,
score badges and monograms as CSS) in `previews/b4-alert-card.html`.

## Tooling that worked (free, in the container)

- Previews: one HTML page using the tokens and `@font-face` on
  `design/fonts/*.ttf` → Playwright Chromium screenshot
  (`deviceScaleFactor: 2` for the image sent to Franco, 1 for checks);
  send with SendUserFile (display "render"); check the PNG yourself first
  (class-name collisions and wrapped rows happened).
- Repo preview: same page at scale 1, PIL `quantize(colors=256)` → PNG
  ≈ 100 KB in `design/previews/`.
- Contrast: a small node script with the WCAG formula; chart palettes:
  the dataviz skill validator, run in dark and light against our surfaces
  (`#111111`, `#FFFFFF`).
- Annotated previews: measure element boxes with JS in the page and draw
  the spacing marks from them (do not hand-place marks).
- Lucide icons for previews: `npm pack lucide-static` (v1.77.0 checked)
  → extract → inline the SVGs from `package/icons/` (set width/height and
  scale `stroke-width` so the stroke stays 2 dp at 24, 1.75 dp at 20/16/14).
- The Home glow C as CSS: build the stops from
  `tokens.json → colour.glow.homeHeader.layers` (bloom radial
  `55% 45% at 76% 0%` over the vertical wash).

## Rules (from the brief, still binding)

Public repo: no secrets, no real personal data, fictitious banks and
names, no real operator/bank logos. No app code (tokens as JSON;
`fonts/build_poppins_gp.py` is asset tooling). Challenges to earlier
decisions go to `docs/CHALLENGES.md`, section "Session 3", in the format
decision → problem → alternative → trade-off → recommendation; Franco
decides. Done when every inventory item has its validated file.
