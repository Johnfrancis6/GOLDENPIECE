# GOLDENPIECE design system

Reference for every build session: copy these items, do not invent new
ones. Brief: [docs/BRIEF_03_DESIGN.md](../docs/BRIEF_03_DESIGN.md).
Files are in English; UI copy is French first, then English.

## Validated items

| Item | File | Validated |
|---|---|---|
| Inventory and build order (this page) | [README.md](README.md) | 2026-11-22 |
| F1 Colour | [foundations/colour.md](foundations/colour.md) · [tokens.json](tokens.json) · [preview](previews/f1-colour.png) | 2026-11-22 |
| F2 Typography (Poppins GP) | [foundations/typography.md](foundations/typography.md) · [fonts/](fonts/) · [preview](previews/f2-typography.png) | 2026-11-22 |
| F3 Spacing, grid, radii, elevation (Finary principles) | [foundations/spacing-layout.md](foundations/spacing-layout.md) · [preview](previews/f3-spacing-layout.png) | 2026-11-22 |
| F4 Iconography (Lucide) | [foundations/icons.md](foundations/icons.md) · [preview](previews/f4-icons.png) | 2026-11-22 |
| F5 Motion (+ refined gradients, glow C) | [foundations/motion.md](foundations/motion.md) · [preview](previews/f5-motion.png) · [animated demo](previews/f5-motion.html) | 2026-11-22 |
| C1 Button | [components/button.md](components/button.md) · [preview](previews/c1-button.png) | 2026-11-22 |
| C5 Amount and change | [components/amount.md](components/amount.md) · [preview](previews/c5-amount.png) | 2026-11-22 |
| C14 Tags and badges + C15 Score badge | [components/tags-score.md](components/tags-score.md) · [preview](previews/c14-c15-tags-score.png) | 2026-11-22 |
| C6 List row + C7 Card | [components/list-row-card.md](components/list-row-card.md) · [preview](previews/c6-c7-list-row-card.png) | 2026-11-22 |
| C12 Navigation (4 tabs, header, section pills, period bar) | [components/navigation.md](components/navigation.md) · [preview](previews/c12-navigation.png) | 2026-11-22 |
| C8 Banner + C10 Dialog + C11 Toast | [components/feedback.md](components/feedback.md) · [preview](previews/c8-c10-c11-feedback.png) · [animated](previews/c8-c10-c11-feedback.html) | 2026-11-22 |
| C9 Bottom sheet (+ C12 period menu: selected option in orange) | [components/bottom-sheet.md](components/bottom-sheet.md) · [preview](previews/c9-bottom-sheet.png) · [animated](previews/c9-bottom-sheet.html) | 2026-11-22 |
| C18 Skeletons + C19 Empty state (+ "Connexion instable" stop) | [components/loading-empty.md](components/loading-empty.md) · [preview](previews/c18-c19-loading-empty.png) · [animated](previews/c18-c19-loading-empty.html) | 2026-11-22 |
| C13 Chips + C16 Choice controls + C17 Progress (rings) | [components/chips-choice-progress.md](components/chips-choice-progress.md) · [chips/controls](previews/c13-c16-chips-choice.png) · [rings](previews/c17-progress-rings.png) | 2026-11-22 |
| C20 Help triggers ("?", En savoir plus, eye with fingerprint to show) | [components/help-triggers.md](components/help-triggers.md) · [preview](previews/c20-help-triggers.png) | 2026-11-22 |
| C21 Institution + category badges (colour categories, operator monograms) | [components/badges.md](components/badges.md) · [preview](previews/c21-badges.png) | 2026-11-22 |
| F6 Display formats | [foundations/formats.md](foundations/formats.md) · [preview](previews/f6-formats.png) | 2026-11-22 |

Next item: **C22 Status timeline**. Foundations are complete; M14 App opening is left for the end. Micro-details not covered by a validated file are decided by build sessions, checked at 100 %/200 % font, and reported in one line, without asking Franco ([formats.md](foundations/formats.md) §7). Continuation notes for a new session: [HANDOFF.md](HANDOFF.md).

## Decisions taken with the inventory (Franco, 2026-11-22)

| # | Decision |
|---|---|
| D1 | Performance "Année" chip = **year to date** (API `YTD`); API `1Y` is not shown. Chips: Mois (`1M`), Année (`YTD`), Depuis le début (`ITD`), Personnalisée. |
| D2 | Contributions (P9) get a chart: **positive/negative bars** (G7). |
| D3 | No hidden swipe gestures on list rows. Swipe is used only to dismiss bottom sheets, always with a button alternative. |
| D4 | Theme: **follows the phone setting** by default; manual light/dark choice in Settings. The design is drawn dark-first. |
| D5 | Placements internal navigation (P1-P9) is decided at step S4 (proposal: top tabs Portefeuille · Marchés · Risque · Performance). |
| D6 | Bank cards get a **gold sheen** animation (M13): colour in [colour.md](foundations/colour.md) §6, motion in F5. |
| D7 | Layout follows **Finary's principles** (F3): hero amount on the page (no card), fewer boxes, lists as one card, pills for buttons/chips, no shadows. The gold edge line is for highlighted cards only. |
| D8 | **No Alertes tab** (2026-11-22): bottom bar Accueil · Comptes · Dépenses · Placements; an open-alert icon appears in the header only while an alert is open, plus the Home strip and push; past alerts in Settings ([icons.md](foundations/icons.md) §6). |
| D9 | **Period selector is an expandable bar "Période"** (C12, 2026-11-22), not pills; bottom-bar tabs do not animate. |

---

## Inventory

IDs are used in every later file. An item used on several screens is
listed once, with its screens. Screen codes (O1…, A1…, P1…, D1…, L1…)
are those of the brief §3.

### 1. Foundations (→ `tokens.json` + `foundations/`)

| # | Foundation | Content |
|---|---|---|
| F1 | Colour | brand, neutrals, surfaces; gain/loss; info/success/warning/error; 3 score bands (< 40, 40-70, > 70); chart series + patterns; light and dark; contrast checked by script |
| F2 | Typography | ≤ 2 families, Latin subset; tabular figures for amounts; type scale (hero amount → caption); behaviour at 200 % font |
| F3 | Spacing, grid, radii, elevation | 4/8 dp steps; margins on a 360 dp screen; radii; elevation by tint and hairline, no large shadows |
| F4 | Iconography | one vector icon set; category icons; fictitious bank/operator badges (monograms, no real logos) |
| F5 | Motion | durations, easing, springs; transform/opacity only; reduced-motion variants |
| F6 | Display formats | amounts (F CFA, €, $), abbreviations ("1,2 M F CFA"), signs and arrows, relative dates ("il y a 2 h"), percentages |

### 2. Components

| # | Component | Variants / states | Screens |
|---|---|---|---|
| C1 | Button | primary, secondary, text, destructive, icon-only; pressed, disabled, loading | everywhere |
| C2 | Input field | text, email, password (eye + strength), search, card number (masked, Luhn), date; error, help | O3, O7, O9, O13e, P3-P5, A2, D3 |
| C3 | Code / PIN entry | 6 boxes (email code), 6 dots (PIN); error, temporary lock | O8, O11, O18, sensitive actions |
| C4 | Numeric keypad | PIN variant, amount variant (live thousands separator) | O11, O14, O18, P3-P5, D3 |
| C5 | Amount and change | hero / row / compact; sign + arrow; hidden "•••"; abbreviated; read as words | everywhere |
| C6 | List row (base) | icon/badge, title, subtitle, value, chevron or switch; fixed height | base of B2, B3, B9, B10, B16 |
| C7 | Card (container) | plain, tappable, highlighted | Home, Alerts, Placements |
| C8 | Banner | info, warning, error + "Réessayer", offline, data > 7 days | all screens (states) |
| C9 | Bottom sheet | short / tall; handle; swipe to close + button | A4, L4, "?" texts, filters, custom period |
| C10 | Dialog | confirm; delete with typed "SUPPRIMER"; blocking (O17) | Settings, O17 |
| C11 | Toast | success, queued, conflict ("modifié sur un autre appareil") | A4, P3, Settings |
| C12 | Navigation | bottom bar 4 tabs (D8); open-alert header icon; screen header (back, title, actions); top tabs / segmented control | global, Placements, P2, P3 |
| C13 | Chips | filter, single choice (period), category source ("règle", "IA", "vous") | A2, A3, P6, P9, L1 |
| C14 | Tags and badges | "Démo", "simulation", "en attente", "refusé", freshness ("Cours différés (~15 min)", "Prix mensuel de référence", "Proxy : SPY ≈ S&P 500"), count badge | global |
| C15 | Score badge | 0-100, 3 bands, colour + shape + word | L1-L4, A2, A3, dashboard |
| C16 | Choice controls | switch, radio, checkbox, choice list | O2, O12, O14, Settings |
| C17 | Progress | bar (budget, learning), steps (questionnaire, tour), dots | B5, B6, O4, O14, O15c |
| C18 | Skeletons | row, card, chart, header | all (loading state) |
| C19 | Empty state | icon, specific sentence, one primary action | Home, P1, D1, D3, L1, A2 |
| C20 | Help triggers | "?" on jargon, "En savoir plus", eye hide/show (sensitive action) | everywhere |
| C21 | Institution / category badge | coloured monogram (fictitious bank or operator), category icon | A1-A3, O13f, O15a, D1-D4 |
| C22 | Status timeline | timestamped steps, live update | L3, dashboard |

### 3. Blocks

| # | Block | Screens |
|---|---|---|
| B1 | Net-worth header: net, day and month change, as-of, eye | Home, P1 totals, widget |
| B2 | Account row: name, masked number, balance, last sync, sync error, "simulation" | A1, O15c |
| B3 | Transaction row: normal, pending (PDNG), flagged (alert), queued offline | A2, A4 previews |
| B4 | Alert card: kind, score, reason, amount, actions; compact variant | Home strip, L1, dashboard queue |
| B5 | Learning card: "12/30 jours, 18/30 opérations" + bar | Home, L1 |
| B6 | Budget ring (C17, rings replace bars 2026-11-22): category, spent / budgeted, state ok/80/100; compact tile variant | Home, D3 |
| B7 | Stat tiles: value, "?", "Données insuffisantes" | D1 indicators, P6 stats, P8 risk figures, P9 TWR/TRI |
| B8 | Chart frame: title, summary sentence, period or month selector, chart, freshness, "Voir en tableau" | Home, P6, P8, P9, D1, D2 |
| B9 | Quote row: name, price, change, freshness, proxy; horizontal strip variant | Home (5 quotes), P7 |
| B10 | Position, real-estate (> 6 months warning) and debt rows | P1, P8 ("Hors calcul de risque") |
| B11 | Allocation list (accessible donut legend): swatch + pattern, %, amount | P2, P8 exposures |
| B12 | "?" sheet: ≤ 3 sentences + method | P8, P9, every jargon word |
| B13 | "C'est bien vous ?": transaction summary, plain reasons, Oui / Non | L2, tour |
| B14 | "Votre banque a été prévenue": live timeline, "L'application ne bloque jamais un paiement" | L3 |
| B15 | "Pourquoi ?" sheet: reasons, device context, score gauge with 40 and 70 marks | L4, A3 |
| B16 | Grouped settings list: section title + rows (chevron, switch, value) | Settings, O12 |
| B17 | Search + filters: bar, active chips, filter sheet | A2, O3, P3 (instrument), D4 |
| B18 | Form: fields, bottom-pinned button, offline "en attente", rejection | O7, O9, P3-P5, D3 |
| B19 | Step screen: icon, title, short text, one action, "Plus tard" | O2, O5, O10 (4 variants), O13a, O13b, O16, O17, L5 |
| B20 | Key-value details list | A3, O15b, dashboard |
| B21 | Institution picker: operators and fictitious banks, "simulation" | O13f, O15a |
| B22 | Category tree + rules + preview "Appliquer aux 7 opérations similaires ?" | A4, D4 |
| B23 | Device row + remote sign-out | Settings |
| B24 | Single-screen pieces: card-scan viewfinder (O13c), persona card (O6), questionnaire question (O14), aggregator-style consent (O15b) | as listed |

### 4. Charts (Victory Native XL + Skia)

| # | Chart | Screens |
|---|---|---|
| G0 | Common base: axes and grid, series palette and patterns, tooltip + scrub cursor, previous/next point buttons, TalkBack summary, table alternative, "< 2 points" state | all |
| G1 | Line / area: net worth, drawdown (area below zero), monthly series as line | Home (short), P6, P8 |
| G2 | Sparkline | Home, B9 (if kept) |
| G3 | Bars: spending by category vs previous month | D1 |
| G4 | Donut (allocation) | P2, P8 |
| G5 | Sankey (≤ 25 links, "Autres" grouping, no horizontal scroll) | D2 |
| G6 | Candlestick (3M / 1A / 5A) | P6 |
| G7 | Positive/negative bars (contributions, currency effect) — D2 | P9 |
| G8 | Score gauge 0-100 with 40 and 70 marks | B15 |

### 5. Animations

| # | Animation | Notes |
|---|---|---|
| M1 | Navigation: open/close screen, tab change, modal | |
| M2 | Press feedback, light haptics on key actions | |
| M3 | Bottom sheet: open, drag, scrim | |
| M4 | Loading → loaded: skeleton then fade | shimmer to test on the Tecno |
| M5 | Pull-to-refresh | |
| M6 | Live alert: row inserted, tab badge, banner | |
| M7 | Changing amount, and "•••" reveal | fade, no blur |
| M8 | Charts: entry, period change (morph), scrub cursor, growing bars | ≥ 45 fps |
| M9 | Input: PIN dot fill, field error, success check | |
| M10 | Toast in / out | |
| M11 | Guided tour: spotlight + bubble | |
| M12 | Status timeline advancing (L3) | |
| M13 | **Gold sheen on bank cards** (D6): a gold light band sweeps once across the card | O13d (card confirmed), bank cards wherever shown (S3), tour |
| M14 | **App opening** (Franco 2026-11-22): animation from splash to Home | to design **at the end** of the design system |

Every animation has a reduced-motion variant and lasts ≤ 5 s.

### 6. States (rule → item that shows it)

| State | Shown by |
|---|---|
| Loading | C18 |
| Empty | C19 |
| Error | C8, cached data kept |
| Offline | C8 + C14 "en attente" |
| Stale | C14 age + C8 beyond 7 days |
| Learning | B5 |
| Demo account | C14 "Démo" + "Créer mon compte" entry |
| Hidden amounts | C5 + C20 (eye) |

Specific cases: rejected, conflict, "Données insuffisantes", per-account
sync error, already answered on another device, lock (5 failures → 1 min
wait), camera permission denied, update required.

### 7. Screen layouts by section (→ `screens/`)

| # | Section | Screens |
|---|---|---|
| S1 | Launch and onboarding | O1-O18 |
| S2 | Home | |
| S3 | Accounts | A1-A4 |
| S4 | Placements | P1-P9 |
| S5 | Spending | D1-D4 |
| S6 | Alerts | L1-L5 |
| S7 | Settings | |

Each section is validated at 360 × 800 dp and at 200 % font.

### 8. Other deliverables

| # | Deliverable | Content |
|---|---|---|
| T | Guided tour | 5-7 steps |
| N | Notifications | 7 types, 3 channels, small icon, Oui / Non actions, hidden amounts |
| W | Widgets | net worth (2×1 and 2×2), budget left, open alerts; light and dark; "•••" |
| X | Copy FR / EN | reason codes, "?" texts, state messages |
| D | Bank dashboard (web, 1280 px) | queue, detail, decision, model settings, Ops tab; dense layout, keyboard shortcuts |

---

## Build order

1. **Foundations:** F1 Colour ✓ → F2 Typography ✓ → F3 Spacing / radii / elevation ✓ → F6 Formats ✓ → F4 Icons ✓ → F5 Motion ✓ (+ `tokens.json`).
2. **Base components:** C1 ✓, C5 ✓, C14 + C15 ✓, C6 + C7 ✓, C12 ✓, C8 + C10 + C11 ✓, C9 ✓, C18 + C19 ✓, C13 + C16 + C17 ✓, C20 ✓, C21 ✓, C22.
3. **Chart base G0**, then G1 + G2.
4. **Home blocks:** B1, B4, B5, B6, B9, B8, then **S2 Home layout**, the first full screen that tests the whole system.
5. **Alerts:** C2-C4 (input, needed for the unlock), B13, B14, B15 + G8, then S6. The most important flow of the demo.
6. **Accounts:** B2, B3, B17, B20, B22, then S3.
7. **Spending:** B7, G3, G5, B6 (already done), then S5.
8. **Placements:** B10, B11, B12, G4, G6, G7, B18, then S4.
9. **Onboarding:** B19, B21, B24, then S1, then T (guided tour).
10. **Settings:** B16, B23, then S7.
11. N (notifications), W (widgets), X (copy), D (dashboard).
12. M14 App opening (last, Franco 2026-11-22).
