---
name: design-build-item
description: Builds one design item (component, chart, block or screen of the GOLDENPIECE design system, or any mobile screen in design/) end to end — questions or defaults, preview HTML from the kit, automatic review, PNG for Franco, validation bookkeeping, commit and push. Use it for every item of design/PLAN.md, whenever Franco says "continue", "suivant", "passe à <item>", answers a question round ("A, A, B"), or validates ("je valide", "oui", "je valide mais …").
---

# design-build-item — one item, end to end

The loop that worked in 10 sessions, minus the waste they measured (rebuilt preview scripts, hand-edited
bookkeeping, bugs Franco found by eye, a context that grew to 360k tokens).

## 0. Context (small on purpose)
Read `design/RULES.md` (always), the item's row in `design/PLAN.md` (no PLAN.md yet: run `design-plan`, or for a single item take its row from the README inventory), and only the validated files it reuses —
by section, via `design/INDEX.md` (`sed -n 'A,Bp'`). Query tokens by path with python, never `cat tokens.json`.

## 1. Questions or defaults
- Mode **decide**: ≤ 3 questions in French, options A/B/C, recommended first, each one line (RULES P2). Stop and wait.
- Mode **default**: write "Je pars sur A, A, A : <one line each>" and go straight to the preview in the same reply.
- Never ask about micro-details (gaps, edge values): decide, write the rule in the item file (RULES P3).

## 2. Build the preview — in the `design-builder` subagent
Delegate with the Agent tool (`subagent_type: design-builder`) so renders, lint output and HTML stay out of the main
context. Give it: item id, file name, Franco's answers, the reused files (paths + line ranges), the RULES that apply.
It returns ≤ 15 lines: PNG path, lint summary (must be 0 errors), choices it made. If no subagent is available,
do the same steps yourself:
1. `cp design/tools/kit/template.html design/previews/<id>-<slug>.html`; layout with `var(--c-…)`, `.t-…`, `var(--s…)`.
   Mark blocks (`data-block`), header actions (`data-action`), rows (`data-row`, `data-side`) so D11 is checked.
2. Icons: `node design/tools/icon.js <name> <size>` (RULES I1-I2).
3. Review: `design-auto-review` (lint at 100 % and 200 %, fix every ERROR, then look at the PNG once).
4. Render for Franco: `node design/tools/render.js <html> --out <scratchpad>/<id>.png` (scale 2).

## 3. Send and wait
SendUserFile the PNG (display "render"; for motion, the HTML with "Rejouer"/"Ralenti ×3"). In French, ≤ 8 lines:
what he sees, what you decided alone, anything the review could not check (by eye items, assumptions).
End with "Tu valides <id>, ou tu veux des changements ?" and stop.

## 4. On validation
- "je valide, mais …" → run `design-feedback-learner` first (the change may be a new rule), apply, re-review.
- Write the item file (`design/<kind>/<id>-<slug>.md`, English: purpose, anatomy, tokens, states, 200 %, build notes).
- Add any new token values to tokens.json (never a colour outside it without saying so — RULES L6).
- `python3 design/tools/validate-item.py --id <ID> --name "<Name>" --summary "<answers; validated wording>" --files <md> --preview design/previews/<id>-<slug>.png`
  after `node design/tools/render.js <html> --repo` (writes the 100 KB repo PNG).
- Tick the item in design/PLAN.md, commit (one commit per item), push. Then, in the same reply, start the next item
  (its questions, or "je pars sur A, A, A" + preview). At a section end, add a 3-line self-critique to STATE.md
  (what is fragile, what was not checked).
- If the context is past ≈ 150k tokens or the plan marks a session break: `design-handover`.
