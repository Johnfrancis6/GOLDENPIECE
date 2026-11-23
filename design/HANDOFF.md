# Session 3 handoff — design system, continuation

Updated 2026-11-23 (Onboarding session: D13 option A — design B19, B21, S1; B24 and T to build sessions; **B19, B21, S1 validated — Onboarding complete**; B16, B23, **S7 validated — Settings complete**; next N in a new session. Spending S5 session: **S5 validated** with A, A, A + "Revenus" hub label removed, D12 no overlapping text; next Alerts B14. Placements session: B10, B11 + G4, B12, G6, G7, B18 and **S4 validated** — Placements complete; next S5 decision then Alerts. Spending session: B7, G3, G5, B22 validated; S5 layout pending; next Placements in a new session. Continuation 3: B4 alert card, B5 learning card, B6 budget ring, B9 quote row, B8 chart frame, S2 Home, C2-C4, B13; Franco then asked to delegate Accounts and open a new session for Spending; continuation 2: C9, C18-C19,
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
| C2 + C3 + C4 Input, code/PIN, keypad (light focus border `#B4410F`; field-boundary contrast in CHALLENGES S3-1) | validated 2026-11-23 | [components/input-pin-keypad.md](components/input-pin-keypad.md) |
| B13 "C'est bien vous ?" (full screen; unlock when answering; Non → B14 without confirm) | validated 2026-11-23 | [blocks/b13-is-it-you.md](blocks/b13-is-it-you.md) |
| G0 + G1 + G2 Charts (line + light gradient, scrub drives hero, sparklines by direction) | validated 2026-11-22 | [charts/g0-g1-g2.md](charts/g0-g1-g2.md) |
| B1 Net-worth header (first Home block) | validated 2026-11-22 | [blocks/b1-networth-header.md](blocks/b1-networth-header.md) |
| B4 Alert card (Home strip: one card + "Voir les N alertes"; > 70 gold edge; whole card tappable, Oui/Non only in L2; compact C6 variant) | validated 2026-11-22 | [blocks/b4-alert-card.md](blocks/b4-alert-card.md) |
| B5 Learning card (two C17 orange rings, fraud-reassurance line, L5 finished state with grey OK) | validated 2026-11-22 | [blocks/b5-learning-card.md](blocks/b5-learning-card.md) |
| B6 Budget ring (Home: two tiles "Ce mois" + worst category; D3: badge left, ring right) | validated 2026-11-22 | [blocks/b6-budget-ring.md](blocks/b6-budget-ring.md) |
| B9 Quote row (one card, freshness line under it, 1-month period; **G2 sparklines get a light fading area**, Franco 2026-11-23) | validated 2026-11-23 | [blocks/b9-quote-row.md](blocks/b9-quote-row.md) |
| B8 Chart frame (no card; title, summary sentence, 22 sp value driven by scrub, period bar or month pill, chart, controls, freshness) | validated 2026-11-23 | [blocks/b8-chart-frame.md](blocks/b8-chart-frame.md) |
| **S2 Home** (first full screen; light glow = gold bloom only; small title centred on scroll, C12 updated; profile circle → Settings) | validated 2026-11-23 | [screens/s2-home.md](screens/s2-home.md) |
| B7 Stat tiles (Spending session; A, A, A: 2 × 2 grid, plain sentence, only Évolution coloured; one column at large font) | validated 2026-11-23 | [blocks/b7-stat-tiles.md](blocks/b7-stat-tiles.md) |
| G3 Bars (A, A, A + Franco: last-month level = small black "v" arrow inside the bar, 2 dp under its top edge, crisp; white 1 dp outline in light) | validated 2026-11-23 | [charts/g3-bars.md](charts/g3-bars.md) |
| G5 Sankey (A, A, A: 3 columns with a "Revenus" hub, flows in destination colour, top 6 + Autres + Épargne; overspend = yellow "Épargne" source; ≥ 150 % font → two lists) | validated 2026-11-23 | [charts/g5-sankey.md](charts/g5-sankey.md) |
| B22 Categories & rules (A, A, A: list card → category screen, no chevron; rules as plain sentences, "Proposée par l'IA" chip only on AI rules; "Appliquer aux N" short sheet, rule box pre-checked) | validated 2026-11-23 | [blocks/b22-categories-rules.md](blocks/b22-categories-rules.md) |
| B10 Position / real-estate / debt rows (A, A, A + Franco: light Lucide icon by each group heading — `chart-line`, `house`, `hand-coins`; D5 decided: pills Portefeuille · Marchés · Risque · Performance) | validated 2026-11-23 | [blocks/b10-holding-rows.md](blocks/b10-holding-rows.md) |
| B11 + G4 Allocation (A, A, A: thin donut 200 dp / 16 dp ring, total in centre, tap highlights; Classe · Devise · Pays chips; gross assets incl. real estate; list = legend, % over amount) | validated 2026-11-23 | [blocks/b11-allocation-list.md](blocks/b11-allocation-list.md), [charts/g4-donut.md](charts/g4-donut.md) |
| B12 "?" sheet (A, A, A: 3 sentences with the user's own figure; neutral 3-level scale only for risk figures, thresholds as content; method sheet: words, data used, limits, folded formula in words) | validated 2026-11-23 | [blocks/b12-help-sheet.md](blocks/b12-help-sheet.md) |
| G6 Candlestick (A, A, A, no separate preview — Franco: "passe à la mise en page"; G7 and B18 are designed inside the S4 preview) | validated 2026-11-23 | [charts/g6-candlestick.md](charts/g6-candlestick.md) |
| **S5 Spending** (A, A, A + Franco: no "Revenus" label above the Sankey hub; D12 no overlapping text) | validated 2026-11-23 | [screens/s5-spending.md](screens/s5-spending.md) |
| B14 "Votre banque a été prévenue" (A, A, A, no preview: "je valide cette partie pas besoin de preview") | validated 2026-11-23 | [blocks/b14-bank-notified.md](blocks/b14-bank-notified.md) |
| B15 "Pourquoi ?" sheet + G8 score gauge (A, A, A, no preview) | validated 2026-11-23 | [blocks/b15-why-sheet.md](blocks/b15-why-sheet.md), [charts/g8-score-gauge.md](charts/g8-score-gauge.md) |
| B19 Step screen (A, A, A; preview validated "je valide") | validated 2026-11-23 | [blocks/b19-step-screen.md](blocks/b19-step-screen.md) |
| B21 Institution picker (A, A, A; preview validated "je valide"; "Autre banque" shortened to stay ≤ 2 lines) | validated 2026-11-23 | [blocks/b21-institution-picker.md](blocks/b21-institution-picker.md) |
| B16 Settings list (A, A, A; preview validated "je valide") | validated 2026-11-23 | [blocks/b16-settings-list.md](blocks/b16-settings-list.md) |
| B23 Device row (A, A, A; preview validated "je valide"; B16 red text aligned with C1 destructive text #FF9AA4) | validated 2026-11-23 | [blocks/b23-device-row.md](blocks/b23-device-row.md) |
| **S7 Settings** (A, A, A; preview validated "je valide"; "Montants dans les notifications" shortened to "Montants visibles" for D11) | validated 2026-11-23 | [screens/s7-settings.md](screens/s7-settings.md) |
| **S1 Onboarding** (A, A, A; flow map + O3, O12, O18 previewed; "je valide") | validated 2026-11-23 | [screens/s1-onboarding.md](screens/s1-onboarding.md) |
| **N Notifications** (A, A, A; preview validated "je valide"; S7 "Montants visibles" sheet text aligned: amounts visible once unlocked, lock screen stays general) | validated 2026-11-23 | [screens/n-notifications.md](screens/n-notifications.md) |
| **W Widgets** (A, A, A; preview validated "oui"; labels shortened to fit 164 dp: "Patrimoine", "Budget / restant", "0 alerte") | validated 2026-11-23 | [screens/w-widgets.md](screens/w-widgets.md) |
| **X Copy FR/EN** (A, A, A; no preview; length script: 836 strings, 0 over after 5 shortenings, incl. N bank-alerted text and concentration title) | validated 2026-11-23 | [copy/fr-en.md](copy/fr-en.md) |
| **D Bank dashboard** (A, A, A; preview validated "je valide pass directement a la preview de M14"; 3 screens designed, login/TOTP, Ops, /legal, dark delegated) | validated 2026-11-23 | [screens/d-bank-dashboard.md](screens/d-bank-dashboard.md) |
| **M14 App opening "Le plan"** (Franco's Deel reference; changes applied: light bounce on GOLDENPIECE, 300 ms hold before Home; "Oui") + Home "Plus gros poste" ring fixed (C17 Mini 44 dp, was clipped) | validated 2026-11-23 | [foundations/motion.md §4b](foundations/motion.md), tokens `motion.appOpening` (v0.54.0) |
| **S2 Home v2 + C12 pill bar** (Franco reference image; A, A, A; preview validated "je valide"; CHALLENGES S3-2) | validated 2026-11-23 | [screens/s2-home.md](screens/s2-home.md), [components/navigation.md](components/navigation.md) |
| **S6 Alerts** (A, A, A; preview validated "je valide") | validated 2026-11-23 | [screens/s6-alerts.md](screens/s6-alerts.md) |
| G7 Positive/negative bars + B18 Form + **S4 Placements** (validated together, "je valide"; header eye + "+" accepted; Courbe · Bougies as icon segments) | validated 2026-11-23 | [charts/g7-pos-neg-bars.md](charts/g7-pos-neg-bars.md), [blocks/b18-form.md](blocks/b18-form.md), [screens/s4-placements.md](screens/s4-placements.md) |
| Tokens | v0.37.0 (+ `chart.posNegBars`, `block.form`, `screen.placements`; v0.36.0 `chart.candlestick`; v0.35.0 `block.helpSheet`; v0.34.0 `chart.donut`, `block.allocationList`; v0.33.0 `block.holdingRows`; v0.32.0 added `block.statTiles`, `chart.bars`, `chart.sankey`, `block.categoriesRules`): all foundations (colour, typography, spacing, layout, radius, elevation, format, icon, motion) + `component.*` (button, amount, changeTag, tag, scoreBadge, listRow, card, navigation, banner, dialog, toast, input, pinEntry, keypad, bottomSheet, skeleton, emptyState, chip, choiceControl, progress, help, badge, timeline) + `chart` (base, line, sparkline) + `block` (networthHeader, alertCard, learningCard, budgetRing, quoteRow, chartFrame, isItYou) + `screen` (home) | [tokens.json](tokens.json) |

**Design system complete (2026-11-23).** M14 was the last item. Nothing is left to design; what remains goes to build sessions (below).

**Backend first:** [BACKEND_NEEDS.md](BACKEND_NEEDS.md) lists 10 API contract changes the validated screens need (get_home accounts/top mover/top category/uncategorised/to-confirm counts, N push payload, debt lender, 5Y monthly candles, dashboard fields). A backend session makes items 1-6 before the first visual build session.

**What build sessions do first** (in this order):
1. Copy `tokens.json` (v0.54.0) into the app theme as is; load Poppins GP from `fonts/`; never invent a value missing from it — raise it instead.
2. Build the foundations and components (F1-F6, C1-C22, G0-G8) as a gallery screen and check it on the Tecno Spark 50: screen type/density, glow C banding, gradients' GPU cost, G6 candles at 3M, ≥ 45 fps charts, ≥ 55 fps M14.
3. Compose the delegated items from validated pieces and report choices in one line each: S3 Accounts (D10), B24 + T guided tour (D13), D login/TOTP, Ops, /legal, dark.
4. Wire M14 last on cold start (native splash handoff, warm start fade, reduced motion, skip), per motion.md §4b.
5. Export the brand mark (icons.md §11, direction A) from one SVG source to the adaptive icon, monochrome layer, splash and `ic_stat_gp`; check it at 24 dp in the status bar and on the Tecno launcher.

Starting prompt for a next session: [NEXT_SESSION.md](NEXT_SESSION.md) (design system complete, app icon chosen).

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
- 2026-11-23: "tu commences à suivre mes principes" = validation of B13;
  he delegates whole sections to build sessions when the validated
  components cover them (D10 Accounts).
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

- 2026-11-23 (Placements session): "A, A, A" for D5 + B10, then "je valide mais" adding light illustrative icons by the group headings (made `text.secondary`, 20 dp: discreet, D11).
- 2026-11-23 (Spending session): answered "A, A, A" to every question round; one change on G3 (previous-month level as a small **black "v" arrow** inside the bar, crisp, with a gap from the edge — he describes such shapes precisely in words). Asked for **clean, uncluttered screens** for what follows (D11).
- 2026-11-23 (Spending S5): "A, A, A", then "Corrige et continue": remove the word "Revenus" above the Sankey, and **from now on adjust elements for legibility at every revision, never let text overlap** (D12). He reads previews closely: preview annotations (fold label) must not cover content either; put them under the phone.
- 2026-11-23 (end of Alerts): "désormais crée la session toi-même" — when Franco asks to continue in a new session, **create it yourself** (claude-code-remote create_session on this repo and branch, prompt = read design/NEXT_SESSION.md and follow it), after updating NEXT_SESSION.md and pushing.
- 2026-11-23 (after S5): asked for **custom entry animations** on charts — rings draw like the ring gauges of a well-known fitness app with a very light bounce; Sankey hub draws first, then bands fill out and saturate with a soft end. Validated ("je valide") from the animated preview with Rejouer / Ralenti ×3 buttons: keep offering those two buttons in motion previews.

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

- API adds `spark_30d` and `change_30d` per Home quote (B9).
- Tecno Spark 50 has an **LCD** screen and low pixel density (its specs
  are still to be read on the phone, SETUP.md; Franco's pending answer).
- Widget sizes 2×1 and 2×2 cells (brief §3.11).
- The Home glow and the gold sheen cost nothing noticeable on the phone
  (static gradient / one translated layer): to measure in the first build.

## Open points

- S5 Spending: **done** (validated 2026-11-23, see screens/s5-spending.md).
- Spending self-critique (2026-11-23): **G5 Sankey** is the fragile item — labels limited to ~16 characters on the left, tiny sources get 34 dp slots (plot grows), flows in light theme are pale (0.26) and may look washed out on the Tecno LCD; at ≥ 150 % font it falls back to lists (the plot is not tested at large font). **G3** at 200 % stacks rows (tested in preview only); the previous-month arrow is nudged up to 9 dp to stay readable, so it is approximate near the bar end. **B7** context sentences are written to fit 2 lines in FR; EN length not checked. **B22** sheet at 200 % scrolls with pinned buttons (seen in preview, scroll not tested).

- D5 decided 2026-11-23: section pills Portefeuille · Marchés · Risque · Performance, header eye + "+" (S4).
- API gaps (Placements): `get_portfolio.debts` has no lender name (B10 debt subtitle "Prêteur · taux"); `get_asset(…, '5Y')` must aggregate **monthly** (G6, ≤ ~60 candles; today ≤ 260 weekly). Also P9 contributions per class and P8 exposures per currency/country are assumed available in the risk/performance payloads. Raise as contract changes.
- Risk-scale thresholds (B12 §3) are defaults written by the design session, not validated figure by figure by Franco; build sessions may tune them with him.
- Home v2 self-critique (2026-11-23): **replaces a validated screen** on a reference image; the Patrimoine sub-page (old Home top) was not previewed again. Card text `#1A0A03` on ember is 4.88:1 — any darker ember stop would fail. Floating pill hides content: every tab screen needs the bottom padding + fade (only Home previewed). Account cards in the carousel are drawn only as a peek. 200 % font described, not previewed. Glow C stays in tokens but is now unused.
- Dashboard self-critique (2026-11-23): **only light theme previewed**; dark and the delegated screens (login + TOTP, Ops, /legal) have no drawing. Queue width 420 leaves the reason short form ~230 px: long short-forms ellipsize. The score breakdown shows raw components (A_thr, A_if, F, M) — fine for analysts, unreadable for anyone else. Hand-editing parameters is deliberately absent. Min width 1100 not previewed. Detail columns assume ≥ 1280.
- Copy self-critique (2026-11-23): **"?" texts were written without a Franco review sentence by sentence** (he chose A, A, A); the risk-scale thresholds and level sentences (low/mid/high) are content to confirm. **Item tables use slot guesses by key** (title/button/badge/other), so a string can pass while its real slot is narrower; reason short forms assume a ~200 dp compact-row title. ICU plurals are named but not written per string. EN is plain neutral English, not reviewed by a native speaker. Chart strings are outside the check.
- Widgets self-critique (2026-11-23): **cell sizes 164 × 80 / 176 dp are assumed**; HiOS launcher grid not checked — the 2×1 budget text column is ~86 dp wide, so "138 000 F" fits but 7-digit amounts abbreviate. Ring track `#262626` on `#181818` is faint (validated C17 token, not re-measured on this surface). 200 % font only described (abbreviation), not previewed. The day-change tag has no "aujourd'hui" word on the widget (meaning carried by the accessibility label and B1 habit). EN lengths not checked.
- Notifications self-critique (2026-11-23): the card look is the **system's** (Tecno HiOS not checked): the preview is stock-Android-like; colours, radius and action tint may differ. **Small icon is a placeholder** ("G" in a coin) until M14 / app icon. Action labels "Oui, c'est moi" / "Non, pas moi" assumed to fit two-per-row at 360 dp (not checked at 200 % font on the device). `setAuthenticationRequired` needs Android 12+ (Tecno Spark 50 assumed Android 14). Quiet hours use phone time zone; server needs it. EN copy lengths not checked.
- Settings self-critique (2026-11-23): **S7 is a long single page** (~27 rows): fine as a list, but the first screen is only the profile card + Général — no other screen of the app is this long; watch scrolling on the Tecno. **"Montants visibles"** is a short label; its meaning relies on the group heading "Notifications" and the sheet. B16 red text was previewed with `loss` `#FF6B7A` then aligned to C1 destructive text `#FF9AA4` (dark) without a new look by Franco. B23 shows real phone model names (reported by the device, not logos). Settings at 200 % was previewed only for B16 (S7 not re-checked as a whole). EN copy lengths not checked.
- Onboarding self-critique (2026-11-23): **O4 tour, O6 personas, O13c viewfinder, O14 questionnaire and O15b consent are delegated** (D13) — nobody has drawn them; the first build must preview them against B19/B21 and report. **Step dots skip O4-O5** (dots 1-2, then tour and fork without dots, then 3-5): may read as a jump; watch in tests. **O12 "Détails"** is a short link inside the subtitle (to keep 2 lines, D11): its 48 dp target overlaps the row; build must make the link and the row control separate targets. **O3 suggestions** assume the SIM country is readable (not verified on the Tecno). Light theme seen only on O17 and B21 O13f; EN copy lengths not checked; O1 wordmark is a placeholder until M14.
- Alerts self-critique (2026-11-23): **B14, B15 and G8 were validated without preview** — the first build must check them at 360 × 800 / 200 % and report; G8 names at 360 dp ("Banque prévenue" right-aligned under a 30 % segment) are the tightest fit. **Header icon opening one alert directly** changes D8: a user who expects the list lands on B13/B14 (back returns to the tab). The **shield empty illustration** is a new C19 variant (gold check) not previewed in light theme. History rows: outcome · date wraps to 2 lines on long reasons (allowed, ≤ 2 lines). Reason sentences (X) are still to write for all codes.
- S5 self-critique (2026-11-23): the **Aperçu hero doubles as the G3 value line** (new pattern; the selected-bar state is described, not previewed). **Sankey** without hub label: the hub is a bare green bar, understood through the value line "Revenus du mois" — watch it in tests. At **200 %**, Aperçu's first screen ends on the G3 legend (bars start on screen 2) and Flux shows lists only. The old "S5 Spending layout not done" open point is closed. Dark only (light not re-checked as a whole screen); EN copy lengths not checked.
- Placements self-critique (2026-11-23): **G6 candles at 3M** = 63 candles, bodies ≈ 3 dp on 360 dp — legible in the Chromium preview, **not verified on the Tecno** (LCD, density assumed); fallback written (45 candles). **P8 Risque at 200 %** is the densest screen: banner + 4 one-column tiles push the drawdown chart to the 3rd screen; tile sentences are cut to 2 lines in FR only (EN not checked). **G4 centre** abbreviates at 200 % ("65,9 M F") — the full total is then only in the hero. **Header has two icons** (eye + "+"), an accepted exception to D11. **P6 "Ma position"** grows to 5 rows when realised ≠ 0. The S4 preview is dark only (light uses validated block colours; not re-checked as a whole screen). G7 and B18 had no separate question round (Franco: "passe à la mise en page"): their defaults are in their files.
- M13 gold sheen: done in F5 (1.4 s, once on first view + on tap); where
  exactly bank-card visuals appear is decided with S3 (accounts).
- M14 App opening: **validated 2026-11-23** ("Le plan", 4.3 s, motion.md §4b). Self-critique: the dot riding the stroke tip uses CSS `offset-path` in the preview; on Skia it needs `PathMeasure` per frame — cheap, but untested on the Tecno. 4.3 s is long for a daily app: it plays on **cold start only**, can be skipped after 600 ms, and warm starts fade straight to Home; if testers find it long, cut the guides first (−400 ms), then the hold. The handoff from the Android 12 native splash (filled coin) to the dot is a deliberate jump (coin → dot → coin): watch it in tests; fallback = start M14 from the filled coin at 1150 ms (≈ 3.1 s total).
- App icon (2026-11-23): Franco sent a third-party Dribbble logo and asked to use it with a gold touch; it was **not copied** (public repo, no third-party logos) — an original mark in the same spirit was drawn, A chosen, and M14 adapted to draw it. Self-critique: the ring of 8 coins gets busy below 24 dp (status bar): the small icon is a flat silhouette, still to check on the device; translucency must be flattened at export (stacked alpha differs between renderers).
- Final self-critique (design system, 2026-11-23): everything was previewed in Chromium at 360 × 800, **never on the Tecno**; colour contrast is measured, performance is not. Fragile points: glow C banding on an LCD; G5 Sankey and P8 Risque at 200 % font; Home tiles at 200 % (148 dp fixed height — the ring tile now wraps its text under the ring, the build must let the tile grow); delegated screens (S3, T, B24) nobody has drawn; widget sizes assumed; small icon still a placeholder. A preview bug survived validation (the "Plus gros poste" ring clipped by flex shrink, found by Franco): build sessions must check every fixed-size graphic with `flex: none` / fixed constraints.
- Glow C: light theme changed to gold bloom only (S2); banding and tint on
  the Tecno still to check in the first build.
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
