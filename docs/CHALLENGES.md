# Challenges — decisions questioned by Session 1

Format: decision → problem → alternative → trade-off → recommendation →
**Franco's answer**. C1-C9 validated by Franco on 2026-11-22.
Sources and dates are in [TOOLS.md](TOOLS.md) (all checked 2026-11-22).

| # | Decision challenged | Recommendation | Franco's answer |
|---|---|---|---|
| C1 | Compute on FastAPI/Render | Batch Python on GitHub Actions + live scoring in Supabase Edge Function | validated 2026-11-22 |
| C2 | Bank dashboard Next.js on Vercel | React SPA on Cloudflare Pages | validated 2026-11-22 |
| C3 | Android + iOS for the prototype | Android-only demo; iOS later | validated 2026-11-22 |
| C4 | Finnhub + Twelve Data cover markets | Add FRED; ETF proxies; cocoa/coffee monthly | validated 2026-11-22 |
| C5 | Historical VaR at 1 month | Show 1-month VaR scaled from 1-day, overlapping as a check | validated 2026-11-22 |
| C6 | Groq "open models" | `gpt-oss-20b`, labels pseudonymised | validated 2026-11-22 |
| C7 | Login method (not decided) | Email + password + biometrics; no SMS | validated 2026-11-22 |
| C8 | App detects SIM change | Simulated only; real source = operator API later | validated 2026-11-22 |
| C9 | Widgets in the first version | Phase 2, Android first | validated 2026-11-22 |

---

## C1 — Compute on Python FastAPI hosted free on Render (idea 11)

- **Decision:** VaR, beta, Isolation Forest and the 0-100 score run in a
  FastAPI service on Render Free.
- **Problem:** Render Free sleeps after 15 min idle and takes **about one
  minute** to wake (official). The alert flow (idea 10) is the heart of
  the client demo: "inject an anomaly → alert in seconds". A one-minute
  wait at that moment fails the demo. Also 512 MB / 0.1 CPU, and Render
  says free instances are not for production. The other free hosts
  failed: Hugging Face Docker Spaces now need PRO, Koyeb has no free
  instance, Fly.io and Cloud Run need a card.
- **Alternative:** split by timing need.
  - **Batch (minutes are fine):** volatility, beta, VaR/CVaR, drawdown,
    TWR/IRR, attribution, Isolation Forest training, user profiles →
    Python (pandas, numpy, scikit-learn) run by **GitHub Actions** on a
    schedule, writing results into Supabase tables.
  - **Live (seconds):** each new transaction or security event → a
    **Supabase Edge Function** (TypeScript) computes threshold scores,
    Isolation Forest score (model exported as JSON trees by the batch
    job), fraud rules, the combined score, then writes the alert and
    sends the push.
- **Trade-off:** + no cold start, no extra host, the app only reads
  precomputed tables (fast on 3G). − Isolation Forest inference exists
  in two languages (needs a parity test on fixed cases); schedules can
  start a few minutes late; a private repo has ~2,000 free Linux
  minutes/month (a public repo has no limit).
- **Recommendation:** adopt the split. Keep Render only as an optional
  "playground" API, not in the demo path.

## C2 — Bank dashboard in Next.js on Vercel (idea 11)

- **Problem:** Vercel's terms limit Hobby to personal or non-commercial
  use; its fair-use guide says "non-commercial personal use only". A
  prototype built for a client is commercial use.
- **Alternative:** a static React (Vite) app on **Cloudflare Pages**
  (free, 500 builds/month), reading Supabase directly with an `analyst`
  role and Supabase Realtime for live alerts.
- **Trade-off:** + free and allowed, no server code; − no Next.js server
  features (not needed here). Netlify is a second option (not checked).
- **Recommendation:** Cloudflare Pages.

## C3 — iOS in the prototype (implicit: "Android and iOS")

- **Problem:** push notifications on iOS, TestFlight and any iOS
  distribution need the **paid Apple Developer Program** (~99 USD/year
  [assumed price]). The free Apple account only installs on 3 devices
  from Xcode on a Mac, for 7 days (official). This breaks "free tools
  only" and needs a Mac. The target market is mostly Android [assumed].
- **Alternative:** the demo runs on **Android** (APK installed directly,
  15 free cloud builds/month). The code stays cross-platform; iOS is
  built when the client pays for the Apple account.
- **Trade-off:** + free, matches the market; − an iPhone-owning client
  cannot try it on their own phone.
- **Recommendation:** Android-only demo. **Question for Franco** (does
  the client need iOS?).

## C4 — Market data from Finnhub + Twelve Data (ideas 2, 6, 11)

- **Problem:** Twelve Data Basic has **no commodity market data** and no
  index data listed (official). Finnhub free is US-focused and its
  historical candles are likely premium (conflicting sources). So gold,
  oil, cocoa, coffee and world indices (memo idea 2) have no free
  official source in the provisional pair. VaR and beta need 1-2 years
  of daily history.
- **Alternative:** Twelve Data for daily history and FX; Finnhub for
  intraday quotes only; **FRED** for oil (daily) and cocoa/coffee
  (monthly IMF series); **US ETFs as proxies** for indices and metals
  (SPY, QQQ, FEZ, EEM, GLD, SLV, USO, DBA), labelled "proxy" on screen.
  Cocoa and coffee are shown as monthly reference prices and kept out of
  VaR (like real estate).
- **Trade-off:** + free and legal; − indices are ETF prices, not index
  points; cocoa/coffee are monthly. A paid plan later removes both.
- **Recommendation:** adopt. **Question for Franco:** are cocoa and
  coffee positions in the demo portfolios, or just market tickers?

## C5 — Historical VaR at 95 % over 1 month (idea 6)

- **Problem:** a historical 1-month VaR needs many independent 1-month
  returns. Two years of data give ~24 independent months; with
  overlapping 21-day windows the 5 % tail is estimated from very few
  independent events and moves a lot from day to day.
- **Alternative:** display 1-month VaR = 1-day historical VaR × √21
  (square-root-of-time, standard and stable), and compute the
  overlapping-window historical figure as a server-side check shown in a
  "details" panel.
- **Trade-off:** + stable, explainable number; − √21 assumes returns are
  independent (underestimates risk in trending markets).
- **Recommendation:** √21 scaling as the main figure, with the method
  written under it.

## C6 — Groq with "open models" (idea 5, 11)

- **Problem:** Groq's Llama models (`llama-3.1-8b-instant`,
  `llama-3.3-70b-versatile`) are now **Enterprise-only** (official
  models page). Also, transaction labels contain names and phone numbers
  ("Transfert à Awa Diop 77 123 45 67").
- **Alternative:** `openai/gpt-oss-20b` (open-weight, free: 30 RPM,
  1,000 RPD), 40 labels per request, JSON output constrained to the
  category list. Before sending: replace names, phone numbers and IBANs
  with placeholders. Fallback: rules only, then Gemini free tier.
- **Trade-off:** none against the memo; the model name changes.
- **Recommendation:** adopt.

## C7 — Login method (not decided in the memo)

- **Problem:** in the target market, phone-number login with SMS code is
  the norm, but SMS OTP needs a paid SMS provider. Free alternatives:
  email + password, magic link, TOTP MFA (free in Supabase).
- **Alternative:** prototype = **email + password**, then **biometric
  unlock** (fingerprint/face) and a 6-digit app PIN; optional TOTP MFA;
  pre-created **demo accounts** for the client. Phone number stored as a
  profile field (used by the fake data and fraud rules), not as a login.
- **Trade-off:** + free; − not the final UX for real users (phone + SMS
  later, paid).
- **Recommendation:** adopt for the prototype. **Question for Franco.**

## C8 — SIM-change detection (idea 9)

- **Problem:** a modern Android/iOS app cannot reliably read SIM changes
  (permissions removed or restricted) [assumed from OS policy, to
  verify]. Real SIM-swap signals come from the mobile operator.
- **Alternative:** SIM-change events exist **only in the fake database**
  (memo already says so); the app records only what it can see itself:
  new device id, new install, login time and place (coarse). Later: an
  operator SIM-swap API (e.g. GSMA Open Gateway) [assumed availability].
- **Recommendation:** state this clearly in the demo script so the
  client is not misled.

## C9 — Home-screen widgets in the first version (brief Part A.3)

- **Problem:** widgets need native targets, are not in Expo Go, refresh
  at most every 30 min on Android and 40-70 times/day on iOS, and add
  testing on many launchers.
- **Alternative:** ship the app first; add widgets (net worth, budget
  left, alerts count) in phase 2, Android first. Market tickers in a
  widget would be ≥ 30 min stale on top of the 15-min delay.
- **Recommendation:** phase 2, without a market-ticker widget.

---

## Franco's answers to the Session 1 questions (2026-11-22)

| # | Question | Answer |
|---|---|---|
| 7 | Who is the client? | An ordinary person (a lay end user), not an institution. |
| 8 | Priority country / currency | The user lives in Africa; **chooses their country at first launch**; reference currency **XOF by default, changeable manually**. |
| 9 | Demo date | None. The architecture agent sets the deadline. |
| 10 | Who installs | The client installs the app himself; a **guided demo (tour) at first launch**. |
| — | New feature | **OCR of the bank card at sign-up** to fill the card fields automatically (see C10). |
| 11 | Demo console in the bank dashboard | **No.** |
| 12 | Languages | **French and English only.** |
| 13 | Read-aloud (TTS) | **No.** |
| 14 | Unanswered 40-70 prompt → bank after 1 h? | **No**: the alert stays open in the app (reminder only). |
| 15 | Amount in notifications | **Hidden** by default. Wording and look: design agent. |
| 16 | Repository | **New public repository** (created by Franco). |
| 17 | Region RTT test from his phone | Yes (protocol in [SETUP.md](SETUP.md)). |
| 18 | Reference device | **Tecno Spark 50**. |
| 19 | Existing accounts | None yet (checklist in [SETUP.md](SETUP.md)). |
| — | Countries at first launch | **All countries** are offered (Franco). |
| — | Device security | **Each device uses its own security level** (Face ID, fingerprint, phone code, etc.) (Franco). |
| — | Card use (C10) | **Only to identify the bank** (Franco). |
| — | Division of work | Session 1 handles the technical part; the architecture agent writes the design agent's brief. |

## C10 — Bank-card OCR at sign-up (new feature, Session 1 recommendation)

- **Need (Franco):** at sign-up, scan the bank card with the camera to
  fill number, expiry and holder name automatically.
- **Problem:** a full card number (PAN) is payment-card data. Storing or
  sending it brings the app into PCI DSS scope; storing the CVV is
  forbidden by PCI DSS in all cases (PCI SSC FAQ). A cloud OCR would send
  the card image to a third party.
- **Technical choice (Claude's):** OCR **on the device only** —
  `react-native-vision-camera` v4 + ML Kit text recognition frame
  processor (free, offline, Android) — then a parser (regex for 13-19
  digits, `MM/YY`, name line) and a **Luhn check**. The user always
  confirms or corrects the fields. The CVV is **never** scanned or
  stored. The server stores only **first 6 + last 4 digits** (truncated,
  not reversible), brand, expiry, holder name. The image is never saved.
  The BIN (first 6) links the card to a simulated bank in the fake data.
  The demo uses test card numbers.
- **Trade-off:** + free, private, works offline; − OCR accuracy on
  embossed/worn cards is imperfect [assumed] → manual entry always
  available; adds the camera permission and ~a few MB of ML Kit model
  [assumed, to measure against the 30 MB APK budget].
- **Franco's answer (2026-11-22):** the card is used **only to identify
  the user's bank** (from its first 6 digits). No payment, no other use.

---

# Session 2 — decisions questioned by the architecture agent (2026-11-22)

Format: decision → problem → alternative → trade-off → recommendation →
**Franco's answer**. Details in [ARCHITECTURE.md](ARCHITECTURE.md). Franco answered on
2026-11-22 (table and end of this section); documents updated.

| # | Decision challenged | Recommendation | Franco's answer |
|---|---|---|---|
| S2-1 | Card: store first 6 + last 4, brand, expiry, holder name (C10) | Store only BIN6 + last 4 + brand + bank | validated 2026-11-22 |
| S2-2 | ML Kit OCR model inside the APK (C10, implicit) | Unbundled model from Google Play services | no objection (technical) |
| S2-3 | 3 shared pre-seeded demo accounts (TECH_ANALYSIS §1.2) | Private demo copy per tester (anonymous sign-in + template) | validated; demo data **kept** on "Créer mon compte" |
| S2-4 | No demo console (Franco): > 70 alerts wait for a human analyst | "Simulated analyst" decides unattended demo alerts after 10 min | validated (10 min) |
| S2-5 | Play Integrity as a score factor (G9) | Phase 2; factor kept at 0 | no objection (technical) |
| S2-6 | Sensitive actions protected by the app (implicit) | Prototype: local gate + session; device-key signature later | no objection (technical) |
| S2-7 | "Learning phase without alerts" (idea 8) | Silences anomalies only; fraud rules active from day one | validated |
| S2-8 | "Analyst feedback adjusts the thresholds" (idea 10) | 40/70 bands fixed; feedback tunes parameters below, bounded and logged | validated |
| S2-9 | Learning: 30 days AND 30 operations (idea 8) | Imported history counts | validated (history counts) |
| S2-10 | Supabase built-in e-mail (implicit) | Custom SMTP; Resend if Franco has a domain, else Brevo | **free option, no domain** → Brevo (fallback: dedicated Gmail SMTP) |
| S2-11 | APK builds on Expo cloud (15/month) | Build on GitHub Actions (free, public repo); Expo for OTA + push | validated |
| S2-12 | Risk needs "1 quoted asset and 30 days of history" (TECH_ANALYSIS §1.6) | Current holdings × historical prices; per-figure minimums | no objection (technical) |

## S2-1 — What the card scan stores

- **Decision (C10):** store first 6 + last 4 digits, brand, expiry,
  holder name.
- **Problem:** Franco later fixed the card's only purpose: **identify
  the user's bank**. Expiry and holder name serve nothing then, yet they
  are personal data, and the name is useful to a fraudster. Collecting
  data without a purpose goes against the minimisation principle of the
  data-protection laws listed in TECH_ANALYSIS §7.
- **Alternative:** the parser reads only the number; the server stores
  `bin6`, `last4` (so the user recognises "•••• 1111"), `brand`, `bank_id`.
- **Trade-off:** + less data, simpler parser, fewer OCR errors to
  correct; − if a later feature needs expiry (card-expiry reminder), a
  new scan is needed.
- **Recommendation:** adopt.

## S2-2 — Where the OCR model lives

- **Decision (implicit in C10):** ML Kit text recognition bundled in the app.
- **Problem:** the bundled model adds a few MB per ABI [assumed ~4 MB]
  to an APK budget of 30 MB that already carries Skia, Reanimated,
  Vision Camera and SQLCipher.
- **Alternative:** the "unbundled" ML Kit variant, downloaded by Google
  Play services on first use (Tecno phones ship Play services).
- **Trade-off:** + ≈ 0 MB in the APK; − first scan needs network for
  the model download (≈ a few MB, once) and fails on phones without
  Play services → manual entry.
- **Recommendation:** unbundled; measure in B8; switch to bundled if
  the APK stays under budget anyway.

## S2-3 — Demo accounts: shared or private

- **Decision (TECH_ANALYSIS §1.2):** 3 pre-seeded demo profiles.
- **Problem:** if the client and testers log into the **same** demo
  account, one person's answer to "C'est vous ?" changes the others'
  screens, alerts disappear, data drifts; credentials must be shared.
- **Alternative:** "Continuer en démo" creates a **private copy**:
  Supabase anonymous sign-in + a copy of the chosen persona whose
  history ends "now" and whose future scenarios unfold over the next
  days. Copies are deleted after 7 days without use.
- **Trade-off:** + each tester has a clean, realistic demo, no shared
  password, scenarios timed to their session; − ≈ 2 MB per copy (cap
  40 copies in the size estimate), anonymous sign-ins need a rate limit.
- **Recommendation:** adopt. **Question:** when a demo user taps
  "Créer mon compte", keep their demo data or start empty?

## S2-4 — Who decides > 70 alerts when nobody watches the dashboard

- **Decision (Franco):** no demo console in the bank dashboard; demo
  alerts come from scheduled scenarios.
- **Problem:** the client tests alone. A > 70 alert reaches the bank
  queue and stays "en analyse" forever unless Franco or an analyst is
  online — the end of the flow (bank decision → push → status) is
  never seen.
- **Alternative:** a "simulated analyst" job: for **demo copies only**,
  an escalated alert not decided by a human within 10 minutes is
  decided from the scenario's ground truth, labelled "Décision simulée"
  in the dashboard. Not a console: nobody triggers anything.
- **Trade-off:** + the client sees the whole flow; − the decision is
  scripted (honest label needed); a human can still decide first.
- **Recommendation:** adopt, 10 min delay. **Question for Franco.**

## S2-5 — Play Integrity (G9)

- **Decision (TECH_ANALYSIS §7, G9):** Play Integrity verdict as a score
  factor.
- **Problem:** the APK is sideloaded, so the "app recognised" verdict is
  always negative [assumed from Play Integrity's design]; using it needs
  a Google Cloud project and server-side decryption; on fake data its
  value for the demo is low.
- **Alternative:** phase 2; the factor stays in the formula at 0.
- **Recommendation:** defer.

## S2-6 — Server-side proof of the sensitive-action unlock

- **Problem:** the server cannot know that the biometric/PIN prompt
  really ran before `answer_alert` or `account-delete`; a stolen session
  token could call the API directly.
- **Alternative (later):** a Keystore key pair per device, usable only
  after user authentication, signs a server nonce for sensitive calls.
- **Trade-off:** + strong proof; − native module, key lifecycle, more
  build time.
- **Recommendation:** prototype = local gate + session + rate limits;
  signatures in phase 2.

## S2-7 — Fraud rules during the learning phase

- **Decision (idea 8):** "phase d'apprentissage sans alerte".
- **Problem:** fraud patterns (SIM swap then transfer, mule account)
  don't need learned habits; a new user is the most exposed to account
  takeover. Silencing everything for 30 days misses them.
- **Alternative:** the learning phase silences the **anomaly** part only
  (thresholds and Isolation Forest); fraud rules and context are active
  from day one.
- **Recommendation:** adopt.

## S2-8 — What analyst feedback changes

- **Decision (idea 10):** the analyst's answer "ajuste les seuils".
- **Problem:** moving the 40/70 bands per decision would change Franco's
  validated rule for everyone and can drift after a few wrong clicks.
- **Alternative:** bands fixed; feedback tunes the parameters under
  them: per user-category anomaly threshold (±0.25 per decision, bounded
  2.5-4.5) and, weekly, each fraud rule's weight from its 28-day
  precision (±3, bounded). Every change logged and reversible
  (ARCHITECTURE §7.5). User answers "c'est moi" never lower fraud-rule
  weights.
- **Recommendation:** adopt.

## S2-9 — Does imported history count for learning?

- **Problem:** a linked account arrives with months of history. If the
  30 days / 30 operations count only from sign-up, a user with a year of
  history still waits a month for anomaly alerts; if history counts,
  the "learning" card is rarely seen.
- **Alternative:** history counts (what real systems do); the learning
  card is shown with new wallets (a "nouveau portefeuille" template) and
  users with little history.
- **Recommendation:** history counts. **Question for Franco.**

## S2-10 — Sign-up e-mails

- **Problem:** Supabase's built-in sender is for testing (low rate
  limits) [assumed, to verify in B6]; real testers need a free SMTP
  provider. Resend's free tier needs a **domain** you own; Brevo's works
  with a verified sender address but deliverability to Gmail may be
  weaker [assumed].
- **Recommendation:** Resend if Franco has (or buys, ≈ 10 USD/year
  [assumed]) a domain; otherwise Brevo. **Question for Franco.**

## S2-11 — Where Android builds run

- **Decision (TOOLS §1):** Expo cloud builds, 15 Android builds/month.
- **Problem:** with B6-B10 and fixes, 15 builds/month can run out at the
  worst time (client fixes); the free queue is low priority.
- **Alternative:** `expo prebuild` + Gradle release build on GitHub
  Actions (public repo = free minutes), signed with the keystore held in
  GitHub secrets; Expo stays for OTA updates and push.
- **Trade-off:** + unlimited builds; − we manage the keystore ourselves
  (Franco keeps an offline copy).
- **Recommendation:** adopt.

## S2-12 — When risk figures appear

- **Decision (TECH_ANALYSIS §1.6, §2.6):** "at least 1 quoted asset and
  30 days of history"; 60 daily returns to show a figure.
- **Problem:** VaR/vol/beta of a portfolio are computed from the
  **assets'** price history applied to current holdings (standard
  method); the user's own history is irrelevant there. 60 returns are
  too few for a 95 % historical VaR (3 tail points).
- **Alternative:** current holdings × asset history (backfilled 5
  years); per-figure minimums: vol 60 returns, beta 120, VaR/CVaR 250,
  1-month overlapping check 500; only drawdown uses the user's own
  value series (≥ 30 days). Assets below the minimum are listed and
  excluded.
- **Recommendation:** adopt.

## Franco's answers to the Session 2 questions (2026-11-22)

| # | Question | Answer |
|---|---|---|
| 1 | Region RTT test | Run 1 done: London 131, Paris 137, Ireland 142, Frankfurt 143 ms → **eu-west-3 (Paris)** by tie-break (< 10 ms) |
| 4 | Demo data on "Créer mon compte" | **Kept** (anonymous user upgraded in place) |
| 5 | Simulated analyst (S2-4) | OK |
| 6 | Demo scenario cadence | Yes (one every ~3 days, 08:00-21:00, first at +3 min, > 70 next day 10:00) |
| 7 | Fraud rules during learning (S2-7) | OK |
| 8 | Imported history counts (S2-9) | Yes |
| 9 | Bands fixed, bounded tuning (S2-8) | OK |
| 10 | E-mail provider (S2-10) | A **free alternative** (no domain purchase) → Brevo free, verified sender; fallback dedicated Gmail SMTP |
| 11 | APK builds on GitHub Actions (S2-11) | OK (Franco keeps an offline copy of the keystore) |
| 12 | Firebase App Distribution + GitHub link | OK |
| 13 | Card: BIN6 + last 4 + brand + bank (S2-1) | OK |
| 14 | Bank names | **Fictitious banks only** |
| 15 | Country needing dedicated data | No |
| 2 | Tecno Spark 50 specs | pending (needed before B6, 2026-12-15) |
| 3 | Deadline 2027-01-29 and ~3 sessions/week | pending |

---

# Session 3 (design system)

## S3-1 — Input field boundary in the dark theme

- **Decision (C2, Franco 2026-11-23):** filled fields, no border at
  rest (fill `#181818` on page `#060606`), label above.
- **Problem:** WCAG 2.2 SC 1.4.11 asks that the visual cue identifying a
  control reach 3:1 against what is next to it. Measured: field fill vs
  page **1.1:1** (dark); light theme uses a 1 dp `rgba(0,0,0,0.10)`
  line, ≈ 1.3:1. The label above and the position make fields
  recognisable, which many audits accept, but a strict audit can flag it.
- **Alternative:** a 1 dp `border.control` line at rest (`#737373` dark
  4.3:1, `#858585` light 3.4:1), 2 dp focus/error borders unchanged.
- **Trade-off:** + strict 1.4.11 compliance, fields obvious for
  low-vision users; − slightly busier forms, less Finary-flat.
- **Recommendation:** keep the validated look for the prototype; switch
  to the 1 dp line if an accessibility review asks for it (one token,
  `component.input.restBorder`). Franco decides.

## S3-2 — Home v2 replaces the validated Home v1

- **Decision (Franco 2026-11-23):** "je préfère cette disposition" with
  a mobile-bank reference → Home v2 (greeting, net-worth card carousel,
  four round actions, two tiles, latest operations, floating pill bar
  with labels). Validated "je valide".
- **Consequences:** the G1 chart, period bar and B1 hero move to a
  "Patrimoine" sub-page opened from the card; the Marchés section leaves
  Home (B9 stays in Placements → Marchés); glow C "Halo haut" is no
  longer used on Home (kept in tokens, unused); C12 bottom bar becomes a
  floating pill with labels; M14's end frame is the new Home.
- **Trade-off:** + clearer first screen (D11), faster Home (no chart),
  brand carried by the card; − net-worth history is one tap further;
  market quotes no longer on Home.
