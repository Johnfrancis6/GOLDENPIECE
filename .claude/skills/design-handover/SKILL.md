---
name: design-handover
description: Ends a design session cleanly and opens the next one — updates design/STATE.md and a short NEXT_SESSION.md, checks the tree is clean and pushed, creates the next Claude Code session on the same repo and branch with a one-line prompt, and gives Franco the link (or a ready-to-paste prompt when session creation is blocked). Use it when Franco asks to continue in a new session ("nouvelle session", "continue ailleurs", "ouvre la suite"), at a session break planned in design/PLAN.md, or when the context passes ≈ 150k tokens.
---

# design-handover — short state, new session, link

Old handovers were 33 KB narratives every session re-read. The state now lives in files that tools keep
(STATE.md, PLAN.md, RULES.md, README); the handover only points to them.

## Steps
1. **Finish the current item** or record exactly where it stopped (question asked? preview sent?) in PLAN.md Status.
2. **STATE.md**: add the section self-critique if a section ended (≤ 3 lines: fragile, not checked, assumed).
3. **NEXT_SESSION.md** — rewrite it whole, English, ≤ 40 lines:
   ```
   # Next design session — <date>
   Branch: <branch> (commit/push only there). Write to Franco in French.
   Read: CLAUDE.md, design/STATE.md, design/RULES.md, design/PLAN.md (only these; the rest by INDEX.md ranges).
   Now: <item id + exact step: "ask the questions for B25" / "B25 preview sent, waiting for validation">.
   Then: <next 2-3 items from PLAN.md>.
   Do first: greet Franco in French in 2 lines, then <the step above>.
   ```
4. **Clean tree**: `git status --short` must be empty except ignored files (stray PNG renders go to the scratchpad,
   not the repo); `git fetch && git status -sb` shows the branch is not behind; commit, push.
5. **Create the session** (mcp `create_session`): `source_url` the repo, `source_revision` the branch, `title`
   "<Project> design — <section>", prompt:
   `Read design/NEXT_SESSION.md on branch <branch> and follow it exactly. Work and push only on <branch>.`
   Give Franco the link in French, one line.
6. **If creation fails** (a chain of sessions that created each other stops at the 8th — observed 2026-11-23 — or
   any refusal): give Franco the same prompt in a code block and say: "Démarre-la toi-même dans Claude Code sur
   <repo>, branche <branch>, avec ce message." A session he starts resets the chain.

## Fewer handovers
Most handovers were forced by a context that had grown past 250k tokens. With item builds in the
`design-builder` subagent, a session should last a whole section; hand over at section ends.
