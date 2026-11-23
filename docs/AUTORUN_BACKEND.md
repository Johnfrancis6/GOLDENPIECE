# Autonomous build chain (B1 → B10) — launch brief

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

Status 2026-11-23 (checked by API): Edge secrets TWELVEDATA/FINNHUB/COINGECKO/FRED present; Vault `github_dispatch_pat` present; `GROQ_API_KEY` present (added by Franco, verified 2026-11-23). GitHub secrets and secret scanning: Franco says done (not checkable from a session).

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
   stop. **Franco, 2026-11-23: the chain runs on its own to the final
   product.** After B5 the backend hands over to the visual build
   ("the designer"): B5 writes the handover in CHAIN_LOG and creates B6
   directly — no stop.
7. Write to Franco in French only when something needs him; files in
   English. Public repo: no secrets, no real personal data.

Order: **B1 Foundations → B2 Fake bank and provider → B3 Market data →
B4 Batch analytics → B5 Scoring, fraud, alerts → B6 App shell,
onboarding, sync → B9 Bank dashboard → B7 Accounts, spending, markets →
B8 Wealth, risk, performance, alerts, push, card OCR → B10 Hardening and
release** (BUILD_PLAN §2). B10 ends the chain: it writes the final report
in CHAIN_LOG and messages Franco in French (release candidate ready to
install on the Tecno, client test script).


## Session sizing (Franco, 2026-11-23) — every session from B6 on

A session must stay light. Franco: "faire un plan par bloc et par étape
pour que les sessions ne soient pas trop chargées et passent la main
automatiquement".

1. **One part = one block group**, not a whole BUILD_PLAN session. Each
   BUILD_PLAN session (B6, B9, B7, B8, B10) is split into numbered parts
   (`B6.1`, `B6.2`, …) listed with their steps in `docs/CHAIN_LOG.md`
   ("Plan by block and step" of that session). The first part of a
   session writes that plan if it is missing; each part may refine the
   plan of the parts after it, never enlarge its own.
2. **Size of a part**: about 3-6 steps, each step one block/component or
   one flow piece with its test or screenshot. If a part is not done
   after its steps, cut it: commit what works, move the rest to the next
   part in the plan.
3. **End of every part** (no exception, no waiting for Franco):
   commit + push on the session branch → append a short CHAIN_LOG section
   (`B6.2 — …`: done / measured / defects / next part) → create the next
   session with `create_session` (this repo, revision = this branch) and
   the prompt: "Read docs/AUTORUN_BACKEND.md on branch <branch> and follow
   it exactly: you are session <next part>." → stop.
4. All parts of one BUILD_PLAN session share **one branch and one PR**
   (draft PR opened by the first part, marked ready by the last part).
   The last part of a session starts the first part of the next session
   (new branch from the current one, per the Order line above).
5. Questions for Franco (French) are asked once, by the part that needs
   the answer; the part marks the step blocked and continues.

## Visual build sessions (B6 → B10) — extra rules

- The design is **validated and final**: copy `design/` (tokens.json
  v0.55.0+, foundations, components, blocks, screens, motion, icon) — never
  invent a value; read design/HANDOFF.md "What build sessions do first".
  Delegated items (S3 Accounts, B24 + T tour, D login/TOTP/Ops/legal/dark)
  are composed from validated pieces; report each choice in one line.
- If branch `claude/design-workflow-skills` has merged skills (design
  auto-review etc.), use them for every screen: render on a 360 × 800
  emulator/preview, check typography, spacing, overlap/clipping, contrast,
  D11/D12, 200 % font, before committing.
- Screenshots of each built screen go in the PR (scale 1, small PNG).

## Franco's checklist for the visual build (do it while the backend runs)

| Needed by | What |
|---|---|
| B6 | **Tecno Spark 50 specs** (SETUP §2 table: Android version, RAM, storage, processor, resolution, operator) — write them in docs/SETUP.md or tell any session |
| B6 | **Expo** account (expo.dev, free) → Account settings → Access tokens → create `EXPO_TOKEN` → GitHub Actions secret `EXPO_TOKEN` |
| B6 | **Brevo** (free) → verify a sender address → SMTP & API → SMTP key → put it in Supabase → goldenpiece-dev → Authentication → Emails → SMTP settings (host smtp-relay.brevo.com, port 587) |
| B6 | **Sentry** (free) → create a React Native project → its DSN is public (no secret); create an auth token → GitHub secret `SENTRY_AUTH_TOKEN` |
| B9 | Cloudflare: already connected to the sessions (Pages) — nothing to do |
| B8 | **Firebase** (Spark, free) → project → Android app (package **`com.goldenpiece.app`**, nickname GOLDENPIECE; fixed 2026-11-23, B6 uses it as `android.package`) → service-account key (FCM v1) → upload it in expo.dev → project → Credentials → Android → FCM V1 |
| B10 | **UptimeRobot** (free) account; Firebase **App Distribution** enabled; keep an offline copy of the Android upload keystore when B10 creates it |

A session that reaches a step whose item is missing marks it blocked in
CHAIN_LOG, does the rest, and messages Franco in French once.


### Visual-build setup status (2026-11-23, Franco: "tout est en place")

- Supabase SMTP (checked by API): host smtp-relay.brevo.com, port 465,
  sender name GOLDENPIECE. **Check**: the sender e-mail field holds the
  Brevo SMTP login, not a verified sender address — Brevo may reject it;
  B6 tests one sign-up e-mail and tells Franco if it fails.
- Expo token, Sentry token (GitHub secrets), Firebase project + Android
  app `com.goldenpiece.app`, service-account JSON and
  `google-services.json` kept by Franco offline (B6/B8 ask him to upload
  them to Expo credentials / EAS secrets, never to the repo), UptimeRobot:
  Franco says done (not checkable from a session).
- **Missing: Tecno Spark 50 specs** (SETUP §2) — B6 asks Franco once.
