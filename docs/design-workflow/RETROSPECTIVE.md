# Design workflow retrospective (GOLDENPIECE, 2026-11-22/23)

Input for the reusable design skills. Sources: design/HANDOFF.md, design/README.md,
design/NEXT_SESSION.md, git log of `claude/brave-bardeen-g5ro94` (50 commits),
and the run logs of the design sessions (cost figures read from the last
`result` event of 3 sessions; the others were not read to save tokens).

## Sessions

| # | Session | Scope | Measured cost / context at end |
|---|---|---|---|
| 0 | Architecture brief review | wrote BRIEF_03_DESIGN | — |
| 1 | Session 3: design system | inventory, F1-F3 | — |
| 2 | Session 3 (suite) | F6, F4, F5, C1-C12 | $11.6, 280-290k tokens per request, 34.6 M cache reads |
| 3 | C9 → | C9-C22, G0-G2, B1 | — |
| 4 | Continuation 3 | B4-B9, S2 Home, C2-C4, B13 | — |
| 5 | Dépenses (S5) | B7, G3, G5, B22 | — |
| 6 | Placements (S4) | B10-B12, G4, G6, G7, B18, S4 | — |
| 7 | Dépenses S5 then | S5, B14, B15, G8, S6 | — |
| 8 | Onboarding | B19, B21, S1, B16, B23, S7 | $7.1, 250k tokens per request, 18.3 M cache reads |
| 9 | Brave Bardeen (web) | N, W, X, D, Home v2 | $13.6, 357k tokens per request, 31.9 M cache reads |
| 10 | Session 4 | M14 opening, app icon | (running) |

## What went wrong

| Problem | Where | Evidence | Fix in the new workflow |
|---|---|---|---|
| Context grows to 250-360k tokens; every tool call re-reads it | sessions 2, 8, 9 | `first_request_input_tokens` 224k → 357k; cache reads ≈ 90 % of cost | one item per short context: build each item in a subagent / fresh session that reads only what it needs |
| Start-up reads ≈ 220 KB (≈ 60k tokens) | every session | HANDOFF 33 KB, README 28 KB, BRIEF 22 KB, CHALLENGES 25 KB, tokens.json 102 KB | a 2 KB `CLAUDE.md` + per-item context pack (only the tokens and validated files the item reuses) |
| HANDOFF grows as an append-only log (one header line is ~1 KB) | all | design/HANDOFF.md line 3 | state table generated from README; lessons go to a rules file, not to a narrative |
| Preview generator scripts lost with the scratchpad | session 3 | HANDOFF "Preview sources" | preview kit committed in the repo (`design/tools/`) |
| Preview bug survived validation: ring clipped by flex shrink | Home, found by Franco | commit 8afcf9f | automated clipping check (rendered box < declared size, `overflow` cut) |
| Labels too long, found by eye after rendering | S7, W, B21, N | "Montants visibles", widget labels, "Autre banque" | text-fit check at 100 % and 200 % (reuse copy/check/measure.js logic on the preview DOM) |
| Colour not from tokens | B16 red #FF6B7A vs C1 #FF9AA4 | commit 86cb59e | token check: every colour in a preview must exist in tokens.json |
| Wrong icon meaning (`receipt` shows "$") | early components | HANDOFF "Tooling" | icon allow-list with notes per glyph |
| Overlapping text, then a rule (D12) | S5 | commit ab652bd | overlap check (text boxes intersecting) at 100 % and 200 % |
| Cluttered screens, then a rule (D11) | Placements → | README D11 | element-count check against the D11 thresholds |
| Validated screen replaced after a reference image | Home v1 → v2 | CHALLENGES S3-2 | plan step asks for references per section before the first item |
| Session chain blocked at 8 sessions | Onboarding | "8ᵉ d'une chaîne… c'est la limite" | handover skill falls back to a ready-to-paste prompt; fewer, longer-lived orchestrator sessions |
| Light theme / 200 % / EN often "described, not previewed" | most self-critiques | HANDOFF open points | auto-review renders both themes and 200 % for free |

## What worked (keep)

| Practice | Evidence |
|---|---|
| ≤ 3 questions with labelled options and a recommended default | Franco answered "A, A, A" in almost every round from session 5 on |
| Preview only what decides the item, then write files + tokens + README + push in the same turn | rhythm noted in HANDOFF |
| Validation-with-change ("je valide, mais…") applied immediately | B10 icons, G3 arrow, S5 label |
| Measured vs assumed lists | HANDOFF tables, never stated assumptions as facts |
| Scripts beat eyes: WCAG contrast script, dataviz palette validator, copy length check (836 strings, 5 shortenings) | design/copy/check/ |
| Self-critique per section | HANDOFF open points |
| Delegating low-value items to build sessions (D10, D13) and validating without preview (B14, B15, G6) | README |
| Session self-creation with a NEXT_SESSION brief | sessions 1 → 10 |

## Where tokens were wasted

1. Re-reading a 250-360k context on every tool call (main cost).
2. Reading the 4 big docs + tokens.json at every start.
3. Rebuilding preview HTML from scratch each item (no shared kit), viewing PNGs at scale 2 for own checks.
4. Question rounds where the recommended default was always taken (could be "default unless you object").
5. Rework after Franco found issues a script could find (clipping, overlap, text length, off-token colour).
6. Writing narrative handovers instead of structured state.
