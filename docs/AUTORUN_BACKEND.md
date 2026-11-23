# Autonomous backend chain (B1 → B5) — launch brief

Franco, 2026-11-23: the backend sessions run **on their own until the
backend is done**, then hand over to the visual build. Each step runs in a
**new session**; a session may **correct earlier sessions' work**. Franco
is asked only for things only he can do (accounts, keys), **before** the
chain starts — everything below in "Franco's checklist" is done first.

## Franco's checklist (before launch)

| # | What | Where | Needed by |
|---|---|---|---|
| 1 | Create Supabase project **`goldenpiece-dev`**, region **eu-west-3 (Paris)**, free plan; save its DB password in a password manager (never in a chat). The account already has one active project (another app, London): the free plan allows 2 active projects, so the `goldenpiece-demo` project is created later (B10) after pausing that other project. | supabase.com → New project | B1 |
| 2 | GitHub repository secrets (Settings → Secrets and variables → Actions): `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access tokens), `SUPABASE_DB_PASSWORD_DEV` (password of #1); turn on **secret scanning** (Settings → Code security). | github.com/Johnfrancis6/GOLDENPIECE | B1 CI |
| 3 | Market data keys (free): Twelve Data, Finnhub, CoinGecko Demo, FRED → put each in the dev project's **Edge Function secrets** as `TWELVEDATA_API_KEY`, `FINNHUB_API_KEY`, `COINGECKO_API_KEY`, `FRED_API_KEY`. | Supabase → Project → Edge Functions → Secrets | B3 |
| 4 | GitHub fine-grained PAT (this repo only, permission Actions: write, 1 year) → Supabase Vault as `github_dispatch_pat` (SQL editor: `select vault.create_secret('<token>', 'github_dispatch_pat');`). | github.com/settings/tokens → Supabase SQL editor | B4 |
| 5 | Groq key → Edge Function secret `GROQ_API_KEY`. | console.groq.com → Supabase secrets | B5 |

Keys never go in a chat or in the repo. If a site asks for a card, stop and
tell the chain (it will mark the dependent step blocked and continue).

## Chain protocol (every session follows it)

1. Read this file, `docs/BUILD_PLAN.md` (its session's section),
   `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/API.md`, and
   `design/BACKEND_NEEDS.md` (its 10 contract changes are part of the
   backend: write them into `docs/API.md` and implement them in the session
   that builds the RPC concerned — `get_home` in B4/B5, `notify` payload
   in B5, `debts.lender` and 5Y monthly candles in B3/B4, analyst fields
   in B5).
2. Read `docs/CHAIN_LOG.md` (created by B1): what earlier sessions did,
   open defects. **Fix earlier defects first** if they block this step.
3. Work on branch `build/bN-<name>` created from the previous session's
   branch (B1 from `claude/brave-bardeen-g5ro94`). Never push to `main`;
   open a PR to `main` at the end (Franco merges them in order, whenever —
   the chain does not wait for merges).
4. Plan → build → **self-evaluate against the "Done" criteria** of
   BUILD_PLAN (tests, CI, timings). Loop until done or truly blocked.
   A blocked item (missing key, quota) is written in CHAIN_LOG and
   skipped; the chain continues.
5. Supabase: the session's proxy holds a Management API token; apply
   migrations to `goldenpiece-dev` only, never to another project.
6. End: append a section to `docs/CHAIN_LOG.md` (done / measured /
   assumed / defects / next), commit, push, open the PR, then **create
   the next session** (create_session on this repo, revision = this
   branch) with the prompt: "Read docs/AUTORUN_BACKEND.md on branch
   <this branch> and follow it exactly: you are session <next>." Then
   stop. After B5, the last backend session writes the handover for the
   visual build (B6) in `docs/CHAIN_LOG.md` and messages Franco instead
   of starting B6 (B6 needs the Tecno specs, Expo, Brevo and Sentry).
7. Write to Franco in French only when something needs him; files in
   English. Public repo: no secrets, no real personal data.

Order: **B1 Foundations → B2 Fake bank and provider → B3 Market data →
B4 Batch analytics → B5 Scoring, fraud, alerts.**
