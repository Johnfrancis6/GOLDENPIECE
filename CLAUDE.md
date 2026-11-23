# GOLDENPIECE — working rules for every session

Android personal-finance prototype (fictitious data), reference phone Tecno Spark 50 (must stay smooth on low/mid-range hardware).
Owner: Franco. **Write to him in French**, short; every file in the repo stays in English (UI copy: French first, then English).

## Always
- Public repo: no secrets, no real personal data, fictitious banks/brokers/names, no third-party logos. Free tools only.
- Commit and push only to the branch your brief names; never push to `main` (Franco merges through pull requests).
- Never present an assumption as a fact: say what was measured and how.
- Challenges to a validated decision go to docs/CHALLENGES.md (decision → problem → alternative → trade-off → recommendation); Franco decides.

## Design work (design/)
- Skills: `design-plan` (goal → plan → Franco validates), `design-build-item` (one item end to end), `design-auto-review`
  (automatic checks before any preview is shown), `design-feedback-learner` (each correction becomes a rule),
  `design-handover` (state + next session). Use them instead of improvising the process.
- Read at start: design/STATE.md (current state), design/RULES.md (learned rules), README.md decisions D1-D13 (`sed -n '/^## Decisions/,/^## Inventory/p' design/README.md`).
  Do **not** read HANDOFF.md, BRIEF_03_DESIGN.md or tokens.json whole: find the section in design/INDEX.md and read only that range;
  query tokens with `python3 -c "import json;print(json.load(open('design/tokens.json'))['block']['statTiles'])"`.
- Previews start from design/tools/kit/template.html (tokens.css, Poppins GP, theme classes); icons from design/tools/icon.js.
- A hook runs design/tools/lint-preview.js on every preview written; fix its ERRORs before showing anything to Franco.
