# Session 3 handoff — design system, continuation

Written 2026-11-22 by the first Session 3 (design) at Franco's request,
for the session that continues the design system. Read this file, then
[../docs/BRIEF_03_DESIGN.md](../docs/BRIEF_03_DESIGN.md) (the method and
the screen-by-screen data), then [README.md](README.md) (validated items,
inventory, build order, decisions D1-D7).

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
| Tokens | v0.6.0: all foundations (colour, typography, spacing, layout, radius, elevation, format, icon, motion) | [tokens.json](tokens.json) |

**Next items, in order** (README "Build order"): base components
C1, C5, C14 + C15, C6 + C7, C12, C8 + C10 + C11, C9, C18 + C19, C13 + C16 +
C17, C20, C21, C22 → G0 + G1 + G2 → Home blocks → S2 Home layout → …

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
- He wants **clean screens like Finary** (few icons, one header action)
  and **light tap animations** on icons (icons.md §7-8, D8).
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

## Rules (from the brief, still binding)

Public repo: no secrets, no real personal data, fictitious banks and
names, no real operator/bank logos. No app code (tokens as JSON;
`fonts/build_poppins_gp.py` is asset tooling). Challenges to earlier
decisions go to `docs/CHALLENGES.md`, section "Session 3", in the format
decision → problem → alternative → trade-off → recommendation; Franco
decides. Done when every inventory item has its validated file.
