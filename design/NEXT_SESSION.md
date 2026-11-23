# GOLDENPIECE design system — Session 4: refine and validate M14 (app opening), the last item

You continue the reference design system of the GOLDENPIECE app (Android personal-finance prototype, fictitious data; reference phone Tecno Spark 50; it must stay smooth on low/mid-range hardware) with Franco. Repository Johnfrancis6/GOLDENPIECE, branch `claude/brave-bardeen-g5ro94`: commit and push only there; never merge into main (Franco merges through a pull request when he asks). **Write to Franco in French**; every file in `design/` stays in English (UI copy: French first, then English).

## Goal
Finish the design system so build sessions copy validated files instead of inventing: every remaining inventory item validated by Franco and written in `design/`. **Only M14 remains** (N, W, X, D and Home v2 were validated on 2026-11-23). Remaining, in this order: ~~N notifications~~ (validated 2026-11-23) → **W home-screen widgets → X copy FR/EN → D bank dashboard (web) → M14 app opening (last)**.

## Standing rules from Franco
- **D11 — clean, uncluttered screens.** Default thresholds (state them; he can change them): at 360 × 800 the first screen shows the hero + at most 3 blocks; one header action (the eye is the cross-tab amount control, accepted with "+" on Placements); a list row has at most 2 text lines per side (settings rows: 1 line per side); one chart per frame; anything secondary goes behind a tap ("?" → B12 sheet, C9 sheet, detail screen). When in doubt, remove. Check every preview against these thresholds before sending.
- **D12 — no overlapping text.** At every revision, adjust elements for legibility: no text may overlap another text, a mark or a preview annotation, at 100 % and 200 % font. Preview annotations (fold label, captions) sit under the phone, never on it.
- **D10 / D13 — delegation.** Accounts (S3) and, in Onboarding, B24 pieces and the T guided tour are left to build sessions (composed from validated items, choices reported in one line).

## Read first, in this order
1. design/HANDOFF.md — state, how Franco works, measured vs assumed, preview tooling, open points, self-critiques per section.
2. docs/BRIEF_03_DESIGN.md — §2 global constraints; §3.9 notifications, §3.10 bank dashboard, §3.11 widgets.
3. design/README.md — validated items, inventory (N, W, X, D, M14 rows), build order, decisions D1-D13.
4. The validated files each item reuses (listed per item below). Do not contradict validated files without Franco's agreement (challenges → docs/CHALLENGES.md "Session 3").

## Validated so far (2026-11-22/23)
Foundations F1-F6; components C1-C22; charts G0-G8; blocks B1, B4-B16, B18, B19, B21, B22, B23; screens S1 Onboarding, S2 Home, S4 Placements, S5 Spending, S6 Alerts, S7 Settings, N Notifications (screens/n-notifications.md), W Widgets (screens/w-widgets.md); X Copy FR/EN (copy/fr-en.md, length check in copy/check/); D Bank dashboard (screens/d-bank-dashboard.md); S2 Home v2 + C12 floating pill bar (Franco's reference layout, CHALLENGES S3-2); entry motion of rings and Sankey (motion.md). Tokens v0.53.0. Sections complete: Home, Placements, Spending, Alerts, Onboarding, Settings. Accounts (S3) is left to build sessions (D10).

## Measured (do not re-measure unless a value changes)
- Contrast of every F1 pair (colour.md §7); C21 category colours as bars ≥ 4.0:1 light / ≥ 8.0:1 dark (g3-bars.md); C15 yellow pair (8.5:1 dark / 6.3:1 light); B19 icon circles (orange glyph 6.4:1 dark / 4.8:1 light; yellow 9.6:1 / 6.3:1); B16 red text light `#C8283C` on white 5.5:1 — node WCAG script, 2026-11-22/23.
- Chart palette 6 series: worst adjacent CVD ΔE 13.2 dark / 16.3 light; light aqua, yellow, magenta < 3:1 on white → names/legend always visible — dataviz skill validator, 2026-11-22.

## Not verified (never present as fact)
Tecno Spark 50 screen type/density (assumed LCD); GPU cost of gradients/glow; widget sizes 2×1 / 2×2 (assumed); G6 candles at 3M on the phone; G5 Sankey at large font; B12 risk-scale thresholds; SIM country readable for the O3 suggestions. API gaps to raise: lender name in `get_portfolio.debts`, monthly 5Y candles, `spark_30d`/`change_30d` for Home quotes.

## Do first
Greet Franco in French in 3 lines: N, W, X, D and the new Home (v2) are validated; only M14 remains; this session refines the "Le plan" opening animation with his two changes. Then apply them **without a question round** (he already gave them) and send the updated animated preview.

**M14 state (2026-11-23).** Franco gave a Dribbble reference (Deel — AI Fintech Explainer Video Animation, by Dipa Product: a dot pops, draws the logo as construction lines with dot heads and dashed guides, the outline fills with one coloured accent piece; a blank card fills with content; the app screen builds around the card). The direction built from it is **"Le plan"**: source [previews/m14-app-opening-plan.html](previews/m14-app-opening-plan.html) (fonts via ../fonts; Web Animations API; "Rejouer" / "Ralenti ×3"; dark with an open alert + light without). Timeline (ms): dot pops 0-300 (back easing) → dashed guides draw 150-650 and fade 1150-1550 → dot 1 draws the coin circle 300-1000, dot 2 draws the "G" 560-1160 (dots ride the stroke tip with CSS `offset-path`) → filled coin fades in 1150-1600 (gold disc, dark G, ember `#E8452A` bar = accent piece) → wordmark "GOLDENPIECE" letters rise 1250-1700 (28 ms stagger) → mark + wordmark leave 1650-1950 → blank card grows at screen centre 2000-2450 then fades → real card (Home v2 gradient) at centre 2400, content rises, amount count-up from 2550 → card moves up to its Home place 2850-3500 → status bar, header, peek card, dots, banner, 4 action circles (scale 0.6 → 1, back easing, 70 ms stagger), tiles, list, pill bar 2950-3900.

**Applied in session 4 (2026-11-23), sent, pending Franco's validation:** wordmark letters now start at 1150 (with the coin fill), 24 ms stagger, 360 ms each, keyframes translateY 12 → −2.5 px (60 %) → +0.5 px (82 %) → 0 (light bounce, soft settle); last letter settles at 1750; **hold 300 ms** (1750-2050) with mark + wordmark still; every step from the mark exit onwards shifted by +400 ms (`H` in the source): wordmark exit 2050, mark exit 2100, blank card 2400, real card 2800, card moves up 3250-3900, Home builds 3350-4300. **New total ≈ 4.3 s** (was 3.8 s). Key frames checked by eye (no card/wordmark overlap). If Franco wants ≈ 4.1 s: shorten the hold to 150 ms (H = 250).

**Franco's changes (2026-11-23), as requested:**
1. **"un léger rebond sur la phrase"** — the wordmark "GOLDENPIECE" (the only phrase in the animation): letters rise with a light bounce (back-out easing, overshoot ≈ 4-6 % / 2-3 dp, soft settle), keep the stagger. If he meant something else, he will say so.
2. **"un léger retard avant l'apparition de l'écran d'accueil"** — add a short hold (≈ 250-400 ms) after the wordmark is complete and before the mark leaves / the card appears, so the brand reads before Home builds. Total ≈ 4.1-4.2 s; say the new total.
Check key frames by eye (Playwright `seek(t)` on paused animations: no overlap between the card and the wordmark, D12), keep transform/opacity/path-trim only, reduced motion = 150 ms fade to Home. Commit the updated source as pending, send it with SendUserFile (render; embed the fonts as base64 in the sent copy so it renders outside the repo).

**On validation:** write M14 in [foundations/motion.md](foundations/motion.md) (§4 table + a "M14 App opening" section: sequence, timings, easings, Skia notes — `PathMeasure` for the dot on the stroke tip, path trim for strokes, one opacity cross-fade outline → fill —, native splash handoff: Android 12 splash shows the filled coin on `bg`, the animation starts from the dot only on cold start, warm start goes straight to Home with a 320 ms fade; reduced motion), tokens `motion.appOpening`, a key-frame strip PNG (scale 1, `-colors 256`) in previews/, README (M14 validated, **design system complete**), HANDOFF (final self-critique + what build sessions do first), and propose the coin-G mark as the app icon / notification small icon (replacing the placeholders in N and D) — ask Franco in one line. Then give the remaining-steps table (should be: nothing left in design; delegated items listed) and stop.

## Items, in order
1. **N — Notifications — validated 2026-11-23** (brief §3.9; README inventory row N): 7 types (confirm it's you 40-70 with Yes / No actions, reminder once after 15 min, bank alerted > 70, bank decision, budget 80 % / 100 %, concentration, learning finished), 3 Android channels (Security, Budgets, Markets), small monochrome icon, **amounts hidden by default** (S7 "Montants visibles" switch, off; turning it on needs a sheet + unlock), FR/EN text. Reuse: B13 (what Yes / No open), B14, C15 badge wording, S7 notification rows. Preview: Android-style notification cards (collapsed / expanded, lock screen with hidden amounts), light and dark.
2. **W — Home-screen widgets — validated 2026-11-23** (brief §3.11; row W): net worth (2×1 and 2×2), budget left, open alerts; light and dark; "•••" hidden-amount option; local data only, refresh ≥ 30 min or on app open/push; no market ticker. Reuse: B1 hero amount, C5 amounts, C17 rings (B6), D8 alert icon.
3. **X — Copy FR/EN — validated 2026-11-23** (row X): reason codes for alerts (B13/B15 reasons — still to write for all codes), "?" texts (B12), state messages (C8, C11, C19). Deliver as tables in design/ (one file), checked for length at 360 dp in FR and EN.
4. **D — Bank dashboard (web, 1280 px) — validated 2026-11-23** (brief §3.10; row D): login + TOTP, live queue with filters, alert detail (transaction fields, reasons, score breakdown, 90-day history, security events, devices, user answer), decision fraud / legitimate + comment, "Model settings", Ops tab, keyboard shortcuts, "Simulated decision" label. Same tokens, denser layout. Ask Franco once whether to design it fully or delegate parts to build sessions (as D10/D13).
5. **M14 — App opening** (row M14): direction **"Le plan"** chosen from Franco's reference (see Do first); earlier directions A pièce / B halo / C trait d'or (previews/m14-app-opening.html, on Home v1) are superseded.

## Method for each item
- Ask ≤ 3 questions with labelled options and a recommended default; never ask about micro-details (decide them, write the rule, leave a build instruction as in formats.md §7).
- Preview only what decides the item: HTML with tokens and design/fonts → Playwright PNG at deviceScaleFactor 2 (split images taller than 8000 px); check it yourself by eye (wrapping, clipping, overlap, wrong Lucide glyph, D11 thresholds, text contrast when dimming) before sending it with SendUserFile (display "render"). Lucide: `npm pack lucide-static@1.77.0` into the scratchpad. Generator scripts live in the scratchpad (lost with the container); the HTML sources in design/previews/ are the reusable references.
- Commit the preview HTML source as "pending Franco's validation" when you send it (a stop hook requires a clean, pushed tree).
- Measure every new colour pair by script (WCAG) and chart colours with the dataviz skill validator.
- Franco often validates with a change ("I validate, but …"): apply it, then in the same turn write design/<folder>/<item>.md (purpose, data, anatomy, tokens, variants, states, motion, accessibility, performance, copy FR/EN, where used, validation date), update tokens.json (bump the minor version), README.md, HANDOFF.md, this file, add a small PNG (scale 1, 256 colours, `convert … -colors 256 PNG8:`) + the HTML source (fonts via ../fonts) to design/previews/, commit, git fetch, push; then ask the next item's questions in the same reply.
- If Franco says "move on to …", validate the current item with his answers, write its file, and design the skipped items inside the next preview; say so in one line.
- When Franco asks for the remaining steps, give a table by section with counts.

## Handing over to a new session
When Franco asks to continue in a new session: update this file (strictly in English), push, then **create the session yourself** (Franco, 2026-11-23) on this repository and branch with an English prompt telling it to read design/NEXT_SESSION.md on branch claude/brave-bardeen-g5ro94 and follow it exactly, and give Franco its link.

## Constraints
Public repo: no secrets, no real personal data, fictitious banks/brokers/names, no real logos. Free tools only. WCAG 2.2 AA (contrast by script, 48 dp targets, 200 % font, reduced motion, colour never alone), charts ≥ 45 fps and ≤ 500 points per series, transform/opacity animations only (Skia path trim allowed), no blur or large shadows. design/ files in English; UI copy French first, then English. No app code (tokens JSON and asset tooling only).

## Deliver, then stop
After each item: send the preview and wait for Franco's validation or changes; never move to the next item before the current one is validated. At the end of each section: HANDOFF.md updated with the next items and a short self-critique (what is fragile).
