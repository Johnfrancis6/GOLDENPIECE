# Autonomous backend chain (B1 → B5) — launch brief

Franco, 2026-11-23: the backend sessions run **on their own until the
backend is done**, then hand over to the visual build. Each step runs in a
**new session**; a session may **correct earlier sessions' work**. Franco
is asked only for things only he can do (accounts, keys), **before** the
chain starts — everything below in "Franco's checklist" is done first.

## Franco's checklist (before launch) — steps checked on the web 2026-11-23

1. **Supabase project `goldenpiece-dev`** — done 2026-11-23: ref
   `ynabfjwcdmaxfnppjtla`, region **eu-west-1 (Ireland)** (not Paris;
   accepted: Ireland measured 142 ms vs Paris 137 ms, within the 10 ms
   tie-break of SETUP §1 — update ARCHITECTURE/SETUP mentions of eu-west-3).
   The environment's Supabase token is scoped to this project. Never touch
   project `ufdocijwbohedluvmrvj` (another app).
2. **GitHub Actions secrets** — github.com/Johnfrancis6/GOLDENPIECE →
   Settings → (left menu) Secrets and variables → Actions → tab Secrets →
   New repository secret: `SUPABASE_ACCESS_TOKEN` (a second scoped Supabase
   token, for CI) and `SUPABASE_DB_PASSWORD_DEV` (database password chosen
   when the project was created; Supabase → Project Settings → Database →
   Reset database password if lost).
3. **Secret scanning** — same repository → Settings → (left menu, Security
   section) Advanced Security → "Secret Protection": Enable, then "Push
   protection": Enable (free for public repositories).
4. **Market data keys** (free, no card): Twelve Data
   (twelvedata.com/register → dashboard → API keys), Finnhub
   (finnhub.io/register → finnhub.io/dashboard), CoinGecko Demo
   (coingecko.com/en/api/pricing → Demo → Developer Dashboard → "+ Add New
   Key"), FRED (fredaccount.stlouisfed.org → API Keys → Request API Key).
   Each goes into Supabase → project goldenpiece-dev → Edge Functions →
   Secrets → Add: `TWELVEDATA_API_KEY`, `FINNHUB_API_KEY`,
   `COINGECKO_API_KEY`, `FRED_API_KEY` (names may not start with SUPABASE_).
5. **GitHub fine-grained token** — profile photo → Settings → Developer
   settings → Personal access tokens → Fine-grained tokens → Generate new
   token: name `goldenpiece-batch`, expiration 1 year, Repository access
   "Only select repositories" → GOLDENPIECE, Permissions → Repository →
   Actions: Read and write → Generate token. Then Supabase → SQL Editor:
   `select vault.create_secret('<token>', 'github_dispatch_pat');` (or
   Integrations → Vault → Add new secret, name `github_dispatch_pat`).
6. **Groq key** — console.groq.com/keys → Create API Key (shown once,
   starts with `gsk_`) → Supabase Edge Functions secret `GROQ_API_KEY`.

Status 2026-11-23 (checked by API): Edge secrets TWELVEDATA/FINNHUB/COINGECKO/FRED present; Vault `github_dispatch_pat` present; **`GROQ_API_KEY` missing** (B5 categorise-llm blocked until added). GitHub secrets and secret scanning: Franco says done (not checkable from a session).

Needed to start: 1-3. Steps 4-6 can come later (B3, B4, B5 mark
themselves blocked and the chain continues).

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
