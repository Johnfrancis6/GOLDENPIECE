# Brief — Session 3: Design system, interactions, mock-ups

You are the **design agent** of GOLDENPIECE, a mobile personal-wealth
app prototype for French-speaking Africa. You start cold: everything you
need is in this brief and the files it links. Written by the
architecture agent (Session 2) at Franco's request.

## Repository and rules

- Repository `Johnfrancis6/GOLDENPIECE` (public), documents in `docs/`.
  Work on a branch, `git fetch` before every push, pull request to
  `main`; Franco merges.
- Public repository: **no secrets, no real personal data**. Every name,
  phone number, IBAN and amount in mock-ups is fictitious.
- Franco writes in French: answer in French; deliverables in English,
  **UI copy in French first, then English**.
- Ask questions a few at a time; for an ambiguous point, state your
  understanding in ≤ 5 lines and wait for validation.

## Read, in this order

1. [MEMOIRE.md](MEMOIRE.md) (French): the 11 validated ideas.
2. [TECH_ANALYSIS.md](TECH_ANALYSIS.md): screens, flows, accessibility
   (§5), performance budgets (§6), device-security matrix (§1.2b).
3. [ARCHITECTURE.md](ARCHITECTURE.md): §6 card OCR, §7 scoring (what an
   alert says and why), §8 offline rules, §12.1 countries.
4. [API.md](API.md) §2: **the exact data fields each screen receives**.
   Design with these fields; if a screen needs a field that is not
   there, say so (it is a contract change).
5. [CHALLENGES.md](CHALLENGES.md): validated decisions and the
   Session 2 challenges (answered by Franco on 2026-11-22).

## The product in one paragraph

An ordinary person installs the APK himself (Android, Tecno Spark 50 as
the reference phone), picks French or English and their country, takes a
guided demo tour, then signs up or continues in demo. They see their
bank and mobile-money accounts (simulated), net worth, spending by
category with budgets, a multi-asset portfolio with delayed market
prices, investment risk (volatility, beta, VaR/CVaR) and performance
(TWR, IRR, contribution, currency effect). Each operation gets a 0-100
risk score: < 40 nothing; 40-70 the app asks "C'est bien vous ?"; > 70
the (simulated) bank is alerted and decides. **The app never blocks a
payment.** All data is fictitious; the app must say so without feeling
like a toy.

---

## 1. Your scope

1. **Design system:** tokens (colour, type, spacing, radius, elevation,
   motion), light + dark themes, components (buttons, inputs, numeric
   keypad, amount display, list rows, cards, banners, bottom sheets,
   tabs, chips, progress, skeletons, empty states, toasts, dialogs,
   score badge, freshness label, "simulation" tag, "en attente" badge).
2. **Charts style** (drawn on device with Victory Native XL + Skia):
   line/area (net worth, drawdown), bars (spending), donut
   (allocation), Sankey (flows), candlestick (assets), sparkline, stat
   tiles, progress bars. Tooltips, period selector, scrub behaviour,
   "Voir en tableau" alternative.
3. **Every screen and every state** listed in §3 (mock-ups, phone size
   360 × 800 dp and 200 % font).
4. **Interactions and motion:** transitions, pull-to-refresh, scrub,
   bottom sheets, reduced-motion variants.
5. **Guided demo tour** (5-7 steps, skippable, replayable) and the
   in-app explanations ("?" sheets ≤ 3 sentences).
6. **Notification texts and look** (Android channels), FR/EN, amounts
   hidden by default.
7. **Iconography** (categories, operators as generic marks — no real
   logos unless their brand rules allow it), illustrations for empty
   states (light, small).

Out of scope: app code, data model, API (you may challenge them).

---

## 2. Global constraints

### 2.1 Every screen has these states

| State | Rule (ARCHITECTURE §8, TECH_ANALYSIS §2) |
|---|---|
| Loading | skeletons drawn from the cached layout; never a blank spinner when a cache exists |
| Loaded | — |
| Empty | specific text + one primary action (§3 lists them) |
| Error | inline banner "Impossible de mettre à jour — données du [date]" + "Réessayer"; cached data stays |
| Offline | read-only, banner "Hors ligne"; edits allowed where marked, shown with "en attente" badge |
| Stale | data age label ("il y a 2 h", "calcul du 3 déc."), banner if > 7 days |
| Learning phase | anomaly alerts inactive: card "Apprentissage de vos habitudes : 12/30 jours, 18/30 opérations" |
| Demo account | discreet permanent "Démo" tag + "Créer mon compte" entry |
| Amounts hidden | "•••" with an eye toggle (sensitive action to reveal) |

### 2.2 Accessibility (WCAG 2.2 AA, TECH_ANALYSIS §5)

Contrast text ≥ 4.5:1, large text and graphics ≥ 3:1 in both themes;
colour never alone (sign + arrow for gains/losses; patterns or labels
for chart series); touch targets 48 dp; every screen usable at 200 %
font (amounts abbreviate "1,2 M F CFA", never truncate); TalkBack labels
in French for every control; amounts read as words; every chart has a
summary label and a "Voir en tableau" alternative; every gesture has a
button alternative; respect reduced motion; no animation > 5 s; low
literacy: icons + short words, one action per onboarding screen, "?"
on every jargon word (VaR, bêta, TWR, TRI…).

### 2.3 Performance (TECH_ANALYSIS §6, reference Tecno Spark 50)

APK ≤ 30 MB per ABI (fonts: ≤ 2 families, subset Latin; icons as one
vector set; no Lottie files > 50 KB; no remote images except cached
logos ≤ 5 KB); cold start ≤ 3 s; charts ≥ 45 fps, ≤ 500 points per
series; lists use FlashList (fixed-height rows preferred); avoid blur,
large shadows and full-screen gradients on low-end GPUs; animations on
transform/opacity only.

### 2.4 Formatting

Amounts in minor units → display: XOF/XAF no decimals, thin space
thousands separator, "F CFA" suffix in French ("250 000 F CFA"), EUR
"1 234,56 €" (FR) / "€1,234.56" (EN), USD likewise. Reference currency
XOF by default, switchable (EUR, USD, XAF). Dates in the user's zone.
Market prices always with the freshness label: "Cours différés
(~15 min)", "Prix mensuel de référence", or "Proxy : SPY ≈ S&P 500".

---

## 3. Screens, states and data fields

Field names refer to API.md §2. "→" = navigation.

### 3.1 Launch and onboarding

| # | Screen | Data / fields | States and notes |
|---|---|---|---|
| O1 | Splash | — | native splash; ≤ 3 s; no network wait |
| O2 | Language | FR / EN | first launch only |
| O3 | Country of residence (required) | `countries[]{name, dial_code}`; search box; all ISO countries | offline (bundled); no default selection; note "Ne change pas votre devise (XOF par défaut)" |
| O4 | Guided demo tour (5-7 steps) | bundled demo data: net worth, accounts, spending, portfolio/risk, alert "C'est vous ?" example | skippable, replayable from Settings; works offline; ends on O5 |
| O5 | Create account or continue in demo | two buttons | — |
| O6 | Demo persona picker | 3 personas: salarié à Dakar, commerçante à Abidjan, investisseur de la diaspora | loading ≤ 2 s ("Préparation de votre démo"); error → retry |
| O7 | Sign-up | email, password (≥ 10 chars, strength hint, paste allowed) | field errors; "déjà un compte ?" → O9 |
| O8 | Email code | 6-digit code, resend (cool-down), hint "Vérifiez vos spams" (free e-mail sender, S2-10) | wrong / expired code |
| O9 | Login | email, password, "mot de passe oublié" | rate-limited message |
| O10 | Device security setup | detected level (strong / weak biometric / phone secret / none) → explanation + choice | 4 variants (TECH_ANALYSIS §1.2b); "none" shows warning "Votre téléphone n'est pas verrouillé" + leads to O11 |
| O11 | App PIN create / confirm | 6-digit keypad | trivial code refused; mismatch |
| O12 | Consents (4) | service (required, "prototype — données fictives"), AI categorisation (optional: what is sent, where), notifications (asked later in context), crash reports (optional) | each with "En savoir plus"; versions |
| O13a | Card — explanation | why (identify your bank), kept (6 first + 4 last digits), never kept (image, full number, CVV) | "Plus tard" |
| O13b | Card — camera permission rationale | — | denied → O13e; "ne plus demander" → O13e + settings link |
| O13c | Card — live scan | frame guide, hint texts, torch toggle | 20 s timeout → O13e; screenshot blocked |
| O13d | Card — confirm | masked number `4111 11•• •••• 1111`, brand, recognised bank or "Banque non reconnue" | correct → O13e |
| O13e | Card — manual entry | number field (Luhn check, no copy, no suggestions) | invalid number |
| O13f | Card — pick bank | `banks_for_country[]` (fictitious banks) | — |
| O14 | Questionnaire (4 sections) | income & fixed charges, goals, risk tolerance (5 questions → profile 1-5), habits | ≤ 3 min; saved per answer; "Plus tard"; numeric keypad for amounts |
| O15a | Link account — choose | Banque (démo), Orange Money, Wave, MTN MoMo (+ country operators) | "simulation" tag |
| O15b | Link account — consent (imitates an aggregator) | `institution_name, scopes[], history_days` | — |
| O15c | Link account — progress / result | `accounts[]{display_name, balance}` | error / retry |
| O16 | Install help | "Installer une app hors Play Store", Play Protect warning | shown from the invite page and Settings |
| O17 | Update required | `min_version` | blocking, one button |
| O18 | Lock / unlock | biometric prompt, phone secret, or app PIN | 5 failures → wait 1 min; 10 → full re-login |

### 3.2 Main navigation (proposal — you may change it)

Five tabs: **Accueil**, **Comptes**, **Placements** (portfolio, markets,
risk, performance), **Dépenses**, **Alertes** (badge = open count).
Settings from the Accueil header.

### 3.3 Home

| Block | Fields (`api.get_home`) | States |
|---|---|---|
| Net worth | `networth.net`, `change_day`, `change_month`, `as_of` | hidden amounts; stale |
| Mini chart | `spark_30d` (30 points) | < 2 points → text |
| Alerts strip | `alerts.open_count`, `alerts.top{kind, band, reason}` | none; learning card (`learning`) |
| Budget left | `budget{spent, budgeted, left, worst}` | no budget → "Créer un budget" |
| Market strip | 5 × `{name, price, change_pct, as_of, proxy_of}` | stale quotes |
| Empty | "Ajoutez un compte pour voir votre patrimoine" + button | |

### 3.4 Accounts and transactions

| # | Screen | Fields | States |
|---|---|---|---|
| A1 | Accounts list | `display_name, kind, institution/operator, iban_masked/msisdn_masked, balance, balance_ref, last_sync_at, simulated` | pull-to-refresh; sync error per account; "historique non disponible" |
| A2 | Account detail / transactions | list items `{booking_ts, cdt_dbt_ind, amount, label, cp_name, category_id, category_source, op_type, status, alert_id}`; search; filters (category, amount, date) | empty; pending (PDNG) style; flagged row (has alert) |
| A3 | Transaction detail | counterparty, references, type (dépôt, retrait, transfert, paiement marchand, frais…), value date, charges, momo details, category + source chip ("règle", "IA", "vous"), score + reasons if any | — |
| A4 | Change category (sheet) | category tree, "Créer une règle", preview "Appliquer aux 7 opérations similaires ?" | offline → "en attente"; conflict toast |

### 3.5 Placements

| # | Screen | Fields | States |
|---|---|---|---|
| P1 | Portfolio | positions `{name, class, qty, avg_cost, last_price, freshness, value_ref, unrealised(+%), realised, proxy_of}`, real estate `{name, value_ref, valued_on, stale}`, debts, totals | empty "Aucun placement" + "Ajouter un achat" / "Ajouter un bien immobilier"; real estate > 6 months warning |
| P2 | Allocation | donut + list by class / currency / country | — |
| P3 | Add trade | buy/sell, instrument search, date, quantity, price, currency, fees | sale > held → refused; offline queued; rejected later |
| P4 | Real estate add/edit + valuation | name, country, currency, value, date | — |
| P5 | Debts add/edit | name, lender, balance, rate, monthly payment, dates | — |
| P6 | Asset detail | candlestick `candles` (3M/1Y/5Y), stats, my position | monthly series → line not candles; proxy note |
| P7 | Markets | groups (indices via ETF proxies, metals, energy, agri monthly, crypto, FX incl. XOF peg), attributions | stale per row |
| P8 | Risk | `figures[]` (vol, beta, VaR/CVaR 1d and 1m, max drawdown) each with "?" and method; drawdown chart; exposures; concentration breaches + threshold edit; excluded list ("Hors calcul de risque") | "Données insuffisantes" per figure (`status`, `minimums`); no quoted asset → empty |
| P9 | Performance | TWR and TRI side by side with one-line explanations; period chips (Mois, Année, Depuis le début, Personnalisée → date range); contributions per asset/class; currency effect | custom period loading ≤ 1 s; "non calculable" IRR |

### 3.6 Spending

| # | Screen | Fields | States |
|---|---|---|---|
| D1 | Month overview | bars `by_category{spent, prev_month, change_pct}`, indicators (taux d'épargne, reste à vivre, part des charges fixes, évolution), month switcher, `uncategorised_count` | empty "Pas encore d'opérations ce mois-ci" |
| D2 | Flows (Sankey) | `nodes`, `links` (≤ 25) | small screen: horizontal scroll forbidden → collapse "Autres"; table alternative |
| D3 | Budgets | per category `{amount, spent, pct, state ok/80/100}`; add/edit | none → create |
| D4 | Categories & rules | tree with sub-categories, user rules list, edit/delete | — |

### 3.7 Alerts

| # | Screen | Fields | States |
|---|---|---|---|
| L1 | Alerts list | `{kind (anomalie, fraude, budget, concentration), band, score, status, reasons[], tx{amount, cp_name, booking_ts}, created_at}`; filter open/all | empty; learning-phase card; offline note |
| L2 | "C'est bien vous ?" (40-70) | transaction summary, reasons in plain words, buttons **Oui, c'est moi** / **Non, ce n'est pas moi** | needs the sensitive-action unlock first; already answered (other device); reminder sent |
| L3 | Bank alerted (> 70) / escalated | "Votre banque a été prévenue", live status timeline (en analyse → légitime / fraude), "L'application ne bloque jamais un paiement" | Realtime update; decided |
| L4 | "Pourquoi ?" sheet | score breakdown in words (not raw numbers): reasons, device context, simple bar of the score vs 40/70 | — |
| L5 | Learning finished | "Les alertes d'anomalies sont actives" | — |

Reason codes to phrase (FR/EN, with parameters): AMOUNT_VS_PAYEE (×6),
AMOUNT_VS_CATEGORY, NEW_PAYEE, UNUSUAL_HOUR (03:10), VELOCITY,
DAILY_OUTFLOW, UNUSUAL_COMBINATION (+2 features), R1 SIM swap + takeover,
R2 credential change + drain, R3 fake deposit / OTP theft, R4 mule
pattern, R5 fake investment, R6 night cash-out on new device; context:
new device, phone not locked, weak face unlock. Tone: factual, calm,
never accusing.

### 3.8 Settings

Reference currency; language; amounts in notifications (hidden by
default); data saver; lock delay (1/5/15 min); security (unlock method
within what the device allows, app PIN, devices list with remote
sign-out, sign out everywhere); notifications per type (Sécurité,
Budgets, Marchés); categories and rules; budgets; concentration
threshold; consents; questionnaire; replay the tour; install help;
export my data (sensitive); delete my account (sensitive, typed
confirmation); about ("prototype — données fictives", attributions,
legal texts); demo reset (demo only); "Créer mon compte" (demo only).

### 3.9 Notifications (Android channels Sécurité / Budgets / Marchés)

| Type | Default text constraint |
|---|---|
| Confirm it's you (40-70) | no amount, no account number; actions Oui / Non open the app (unlock required) |
| Reminder (once, 15 min) | same, softer |
| Bank alerted (> 70) | no amount |
| Bank decision | légitime / fraude |
| Budget 80 % / 100 % | category, no amount unless setting |
| Concentration | asset + share |
| Learning finished | — |

### 3.10 Bank dashboard (web, analyst — desktop first, 1280 px)

Login + TOTP; queue (live, filters: status, score, kind, age);
alert detail (transaction ISO fields, reasons, score breakdown, 90-day
history, security events, devices, user answer); decision **fraude /
légitime** + comment; "Réglages du modèle" (parameters, bounds, change
log, reset); Ops tab (push latency, batch status, quotas, model
evaluation, funnel); `/legal`. Same tokens as the app, denser layout,
keyboard shortcuts for decisions. Simulated decisions labelled
"Décision simulée" (S2-4, accepted).

---

## 4. Deliverables

In `docs/design/` (or a Figma-free format: SVG/PNG exports + Markdown
specs, since all tools must be free):

1. `DESIGN_SYSTEM.md` — tokens (with contrast table light/dark),
   components, chart styles, motion.
2. `SCREENS.md` — every screen of §3 with every state, mock-up images,
   field mapping to API.md.
3. `COPY_FR_EN.md` — all UI strings, reason codes, notification texts,
   tour script, "?" explanations (≤ 3 sentences each).
4. `tokens.json` — machine-readable tokens for the app and dashboard.
5. Updates to [CHALLENGES.md](CHALLENGES.md), section "Session 3".

Done when Franco has validated the five items.

## 5. Authority to challenge

You may challenge any decision (Franco's, Session 1's, Session 2's) if
you judge it underperforming. Format: decision → problem → alternative
→ trade-off → recommendation. Do not apply it yourself: Franco decides.
A field you need that API.md does not give is a challenge to Session 2's
contract, written the same way.
