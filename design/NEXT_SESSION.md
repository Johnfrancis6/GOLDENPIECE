# GOLDENPIECE design system — Session 3 continuation: Alerts (B14, B15 + G8, S6), then Onboarding, Settings, N/W/X/D, M14

You continue the reference design system of the GOLDENPIECE app (Android personal-finance prototype, fictitious data; reference phone Tecno Spark 50, must stay smooth on low/mid-range hardware) with Franco. Repository Johnfrancis6/GOLDENPIECE, branch `claude/brave-bardeen-g5ro94` (commit and push only there; never merge into main — Franco merges through a pull request when he asks). Answer Franco in French.

## Goal
Finish the design system so build sessions copy validated files instead of inventing: every remaining inventory item validated by Franco and written in `design/`. Franco's order (2026-11-23): **the Spending tab first (S5 layout), then the others.**

## Franco's standing rule D11 (2026-11-23)
**Clean, uncluttered screens.** Default thresholds (state them, he can change them): at 360 × 800 the first screen shows the hero + at most 3 blocks; one header action (the eye is the cross-tab amount control, accepted with "+" on Placements); a list row has at most 2 text lines per side; one chart per frame; anything secondary goes behind a tap ("?" → B12 sheet, C9 sheet, detail screen). When in doubt, remove. Check every preview against these thresholds before sending.

## Franco's standing rule D12 (2026-11-23)
**No overlapping text.** At every revision, adjust elements for legibility: no text may overlap another text, a mark or a preview annotation, at 100 % and 200 % font. Preview annotations (fold label, captions) sit under the phone, never on it.

## Read first, in this order
1. design/HANDOFF.md — state, how Franco works, measured vs assumed, preview tooling, open points, self-critiques (Spending and Placements).
2. docs/BRIEF_03_DESIGN.md — §2 global constraints, §3.6 Spending (D1-D4), §3.7 Alerts (L1-L5), and the sections of the later items when you reach them.
3. design/README.md — validated items, inventory, build order, decisions D1-D11.
4. The validated files each item reuses (listed per item below). Do not contradict validated files without Franco's agreement (challenges → docs/CHALLENGES.md "Session 3").

## Validated so far (2026-11-22/23)
Foundations F1-F6; components C1-C22; charts G0-G7; blocks B1, B4-B13, B18, B22; screens S2 Home, **S4 Placements**, **S5 Spending** (2026-11-23; Sankey hub label removed) (reference for a full tab: section pills, first-screen check, 200 % check). Tokens v0.37.0. Accounts (S3: B2, B3, B17, B20) is left to build sessions (D10).

## Measured (do not re-measure unless a value changes)
- Contrast of every F1 pair (colour.md §7); C21 category colours as bars ≥ 4.0:1 light / ≥ 8.0:1 dark (g3-bars.md); C15 yellow pair reused for the B10 warning tag (8.5:1 dark / 6.3:1 light) — node WCAG script, 2026-11-22/23.
- Chart palette 6 series: worst adjacent CVD ΔE 13.2 dark / 16.3 light; light aqua, yellow, magenta < 3:1 on white → names/legend always visible — dataviz skill validator, 2026-11-22.

## Not verified (never present as fact)
Tecno Spark 50 screen type/density (assumed LCD); GPU cost of gradients/glow; widget sizes 2×1 / 2×2; G6 candles at 3M (≈ 3 dp bodies) on the phone; G5 Sankey at large font; risk-scale thresholds of B12 (defaults, not validated figure by figure). API gaps to raise: lender name in `get_portfolio.debts`, monthly 5Y candles, `spark_30d`/`change_30d` for Home quotes.

## Do first
S5 Spending is validated (screens/s5-spending.md). If this is a new session: greet Franco in French in 3 lines (Spending done; this session continues with Alerts; D11 and D12 apply), then ask the question round for **B15 "Pourquoi ?" sheet + G8 score gauge** (B14 validated 2026-11-23 without preview). If B15 questions were already asked in the previous session, ask Franco for his answers first. Franco said "avance sur les autres tâches": keep rounds short; he may validate without preview.

## Order (item by item)
1. Alerts: **B14** "Votre banque a été prévenue" (reuse C22 timeline, B4, B13) → **B15 "Pourquoi ?" sheet + G8 score gauge** (40/70 marks; reuse C15, C9, B12 style) → **S6 Alerts** (D8: no Alertes tab; open-alert header icon, Home strip, past alerts in Settings).
2. Onboarding: B19 step screen → B21 institution picker (fictitious banks/operators, monograms C21) → B24 single-screen pieces (card-scan viewfinder, persona card, questionnaire question, consent) → S1 → T guided tour (M11).
3. Settings: B16 grouped list (chevrons allowed only here) → B23 device row → S7.
4. N notifications (FR/EN, amounts hidden by default), W widgets, X copy FR/EN, D bank dashboard (web, 1280 px).
5. M14 App opening — last (Franco found the first proposal mediocre).
Ask Franco once, before Onboarding, whether he wants to design it fully or delegate parts to build sessions (as D10).

## Method for each item
- Ask ≤ 3 questions with labelled options and a recommended default; never ask about micro-details (decide them, write the rule, leave a build instruction as in formats.md §7).
- Preview only what decides the item: HTML with tokens and design/fonts → Playwright PNG at deviceScaleFactor 2 (split images taller than 8000 px); check it yourself by eye (wrapping, clipping, overlap, wrong Lucide glyph, D11 thresholds, text contrast when dimming) before SendUserFile (display "render"). Lucide: `npm pack lucide-static@1.77.0`.
- Measure every new colour pair by script (WCAG) and chart colours with the dataviz skill validator.
- Franco often validates with a change ("je valide mais …"): apply it, then in the same turn write design/<folder>/<item>.md (purpose, data, anatomy, tokens, variants, states, motion, accessibility, performance, copy FR/EN, where used, validation date), update tokens.json (bump minor version), README.md, HANDOFF.md, add a small PNG (scale 1, 256 colours) + HTML source (fonts via ../fonts) to design/previews/, commit, git fetch, push; then ask the next item's questions in the same reply.
- If Franco says "passe à …", validate the current item with his answers, write its file, and design the skipped items inside the next screen preview (as G7/B18 inside S4); say so in one line.
- When Franco asks for the remaining steps, give a table by section with counts.

## Constraints
Public repo: no secrets, no real personal data, fictitious banks/brokers/names, no real logos. Free tools only. WCAG 2.2 AA (contrast by script, 48 dp targets, 200 % font, reduced motion, colour never alone), charts ≥ 45 fps and ≤ 500 points per series, transform/opacity animations only (Skia path trim allowed), no blur or large shadows. design/ files in English; UI copy French first, then English. No app code (tokens JSON and asset tooling only).

## Deliver, then stop
After each item: send the preview and wait for Franco's validation or changes; never move to the next item before the current one is validated. At the end of each section (Spending, Alerts, …): HANDOFF.md updated with the next items and a short self-critique (what is fragile).
