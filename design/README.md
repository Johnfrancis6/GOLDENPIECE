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
| C22 Status timeline (pulsing current step) | [components/status-timeline.md](components/status-timeline.md) · [preview](previews/c22-status-timeline.png) · [animated](previews/c22-status-timeline.html) | 2026-11-22 |
| C2 Input + C3 Code/PIN + C4 Keypad (filled fields, own keypad, shake on wrong code, 1 min lock) | [components/input-pin-keypad.md](components/input-pin-keypad.md) · [preview](previews/c2-c4-input-pin-keypad.png) · [animated](previews/c3-pin-error.html) | 2026-11-23 |
| B13 "C'est bien vous ?" (full screen, unlock on answer, Non → B14) | [blocks/b13-is-it-you.md](blocks/b13-is-it-you.md) · [preview](previews/b13-is-it-you.png) | 2026-11-23 |
| G0 Chart base + G1 Line/area + G2 Sparkline | [charts/g0-g1-g2.md](charts/g0-g1-g2.md) · [preview](previews/g0-g1-g2-charts.png) · [animated](previews/g0-g1-g2-charts.html) | 2026-11-22 |
| B1 Net-worth header | [blocks/b1-networth-header.md](blocks/b1-networth-header.md) · [preview](previews/b1-networth-header.png) | 2026-11-22 |
| B4 Alert card (Home strip = one card + link; > 70 highlighted; whole card tappable; compact variant) | [blocks/b4-alert-card.md](blocks/b4-alert-card.md) · [preview](previews/b4-alert-card.png) | 2026-11-22 |
| B5 Learning card (two orange rings days/operations, not dismissible, once "alertes actives" + OK) | [blocks/b5-learning-card.md](blocks/b5-learning-card.md) · [preview](previews/b5-learning-card.png) | 2026-11-22 |
| B6 Budget ring (Home two tiles total + worst category; "Reste"/"Dépassé de"; D3 row badge left, ring right) | [blocks/b6-budget-ring.md](blocks/b6-budget-ring.md) · [preview](previews/b6-budget-ring.png) | 2026-11-22 |
| B9 Quote row (5 Home quotes in one card, freshness line, 1-month sparkline + change; G2 sparklines now with a light fading area) | [blocks/b9-quote-row.md](blocks/b9-quote-row.md) · [preview](previews/b9-quote-row.png) | 2026-11-23 |
| B8 Chart frame (on the page, small value line driven by the scrub, visible summary sentence, month pill) | [blocks/b8-chart-frame.md](blocks/b8-chart-frame.md) · [preview](previews/b8-chart-frame.png) | 2026-11-23 |
| **S2 Home** (Alertes → Budget → Marchés; light glow gold only; centred small title on scroll; profile circle → Settings) | [screens/s2-home.md](screens/s2-home.md) · [preview](previews/s2-home.png) | 2026-11-23 |
| B7 Stat tiles (2 × 2 cards, plain sentence under the value, only "Évolution" coloured) | [blocks/b7-stat-tiles.md](blocks/b7-stat-tiles.md) · [preview](previews/b7-stat-tiles.png) | 2026-11-23 |
| G3 Bars (horizontal, category colours, black "v" arrow for last month inside the bar, top 6 + Autres) | [charts/g3-bars.md](charts/g3-bars.md) · [preview](previews/g3-bars.png) | 2026-11-23 |
| G5 Sankey (sources → Revenus → top 6 + Autres + Épargne; flows in destination colour; lists at large font) | [charts/g5-sankey.md](charts/g5-sankey.md) · [preview](previews/g5-sankey.png) | 2026-11-23 |
| B22 Categories & rules (one list card → category screen; rules as sentences; "Appliquer aux N" short sheet with preview, pre-checked rule box) | [blocks/b22-categories-rules.md](blocks/b22-categories-rules.md) · [preview](previews/b22-categories-rules.png) | 2026-11-23 |
| B10 Position, real-estate and debt rows (one card per group with subtotal and a light Lucide icon by the heading; value + unrealised tag; "À réévaluer" warning tag; debts not red) | [blocks/b10-holding-rows.md](blocks/b10-holding-rows.md) · [preview](previews/b10-holding-rows.png) | 2026-11-23 |
| B11 Allocation list + G4 Donut (thin ring, total in the centre, tap highlights a slice; Classe · Devise · Pays chips; gross assets incl. real estate) | [blocks/b11-allocation-list.md](blocks/b11-allocation-list.md) · [charts/g4-donut.md](charts/g4-donut.md) · [preview](previews/b11-g4-allocation.png) | 2026-11-23 |
| B12 "?" sheet (definition + your figure + how to read it; neutral Faible · Moyen · Élevé scale for risk figures; method sheet with folded "Formule") | [blocks/b12-help-sheet.md](blocks/b12-help-sheet.md) · [preview](previews/b12-help-sheet.png) | 2026-11-23 |
| G6 Candlestick (line by default + Courbe · Bougies switch; green/red filled; ≤ ~60 candles: 3M daily, 1A weekly, 5A monthly) | [charts/g6-candlestick.md](charts/g6-candlestick.md) | 2026-11-23 |
| G7 Positive/negative bars ("Ce qui a compté": centre zero axis, gains right in green, losses left in red, Par actif · Par classe) | [charts/g7-pos-neg-bars.md](charts/g7-pos-neg-bars.md) · [preview](previews/s4-placements.png) | 2026-11-23 |
| B18 Form (sub-page with x, kind chips, filled fields, live total, pinned Enregistrer, offline "En attente", sale > held refused) | [blocks/b18-form.md](blocks/b18-form.md) · [preview](previews/s4-placements.png) | 2026-11-23 |
| B14 "Votre banque a été prévenue" (full screen; B4 compact + C22 timeline + one advice banner; Appeler ma banque / Fermer; validated without preview) | [blocks/b14-bank-notified.md](blocks/b14-bank-notified.md) | 2026-11-23 |
| B15 "Pourquoi ?" sheet + G8 score gauge (bar with 40/70 marks and named zones, no number; ≤ 3 reasons with weight in words; "Votre appareil" only when relevant; validated without preview) | [blocks/b15-why-sheet.md](blocks/b15-why-sheet.md) · [charts/g8-score-gauge.md](charts/g8-score-gauge.md) | 2026-11-23 |
| Entry motion: C17 rings (light overshoot, full rings pulse) and G5 Sankey (hub draws, then bands grow out and saturate) | [foundations/motion.md](foundations/motion.md) · [animated](previews/m-entry-rings-sankey.html) · [frames](previews/m-entry-rings-sankey.png) | 2026-11-23 |
| B19 Step screen (96 dp tinted Lucide icon, neutral orange / warning yellow; centred title + ≤ 3 lines; primary pinned with one text button above; C17 dots only in the sign-up flow) | [blocks/b19-step-screen.md](blocks/b19-step-screen.md) · [preview](previews/b19-step-screen.png) | 2026-11-23 |
| B21 Institution picker (title + one neutral "simulation" tag and line; "Mobile money" then "Banques" in one-card lists; search when > 8; tap = next step; "Autre banque" → demo bank; fictitious names only) | [blocks/b21-institution-picker.md](blocks/b21-institution-picker.md) · [preview](previews/b21-institution-picker.png) | 2026-11-23 |
| B16 Settings list (grey 20 dp Lucide icon, no tile; value + chevron on one line; switch without chevron; last "Compte" group, "Supprimer mon compte" red without icon, confirmation required; value under the name at 200 %) | [blocks/b16-settings-list.md](blocks/b16-settings-list.md) · [preview](previews/b16-settings-list.png) | 2026-11-23 |
| B23 Device row (smartphone icon, model + "Actif … · city", "Cet appareil" tag; tap → C9 sheet with "Déconnecter cet appareil"; biometric/code, row fades, C11 toast) | [blocks/b23-device-row.md](blocks/b23-device-row.md) · [preview](previews/b23-device-row.png) | 2026-11-23 |
| **S7 Settings** (one scrolling page, 6 groups Général · Sécurité · Notifications · Mes données · Aide · Compte; profile card, demo card with "Créer mon compte"; "Montants visibles" off, sheet + unlock to turn on) | [screens/s7-settings.md](screens/s7-settings.md) · [preview](previews/s7-settings.png) | 2026-11-23 |
| **N Notifications** (3 channels Sécurité · Budgets · Marchés; 7 types; lock screen = general text; Oui / Non → unlock → B13 pre-selected; Budgets/Marchés ≤ 1 per day, quiet 22:00-07:00; amounts hidden by default) | [screens/n-notifications.md](screens/n-notifications.md) · [preview](previews/n-notifications.png) | 2026-11-23 |
| **W Widgets** (Patrimoine 2×2 with 30-day line, Patrimoine 2×1, Budget, Alertes; amounts "••• F" by default, config switch + unlock; follows system theme) | [screens/w-widgets.md](screens/w-widgets.md) · [preview](previews/w-widgets.png) | 2026-11-23 |
| **X Copy FR/EN** (one file, wins over item tables; reason codes long + short, feature names, "?" texts for 20 figures, C8/C10/C11/C18/C19 state messages; 836 strings measured at 360 dp, 100 %/200 %, 0 over) | [copy/fr-en.md](copy/fr-en.md) · [length check](copy/check/) | 2026-11-23 |
| **D Bank dashboard** (1280 px, light default; queue 420 + detail master-detail, decision bar pinned, J/K/L/F/C shortcuts; Réglages du modèle table + change log; login/TOTP, Ops, /legal, dark delegated) | [screens/d-bank-dashboard.md](screens/d-bank-dashboard.md) · [preview](previews/d-bank-dashboard.png) | 2026-11-23 |
| **S1 Onboarding** (flow map: 5 dotted steps Langue · Pays · Compte · Sécurité · Accords; demo branch via persona; O13-O15 offered later from Home; O3 country tap = next; O12 one consents list, controls right, service required; O18 biometric first, PIN fallback) | [screens/s1-onboarding.md](screens/s1-onboarding.md) · [preview](previews/s1-onboarding.png) | 2026-11-23 |
| **S6 Alerts** (header icon: 1 alert → that alert, ≥ 2 → L1; L1 = open alerts + "Historique des alertes"; history by month in compact rows; shield empty state; L5 once) | [screens/s6-alerts.md](screens/s6-alerts.md) · [preview](previews/s6-alerts.png) | 2026-11-23 |
| **S5 Spending** (pills Aperçu · Flux · Budgets; one shared month pill; Aperçu hero = G3 value; info banner "N opérations à classer"; Sankey without hub label) | [screens/s5-spending.md](screens/s5-spending.md) · [preview](previews/s5-spending.png) · [200 %](previews/s5-spending-200.png) | 2026-11-23 |
| **S4 Placements** (pills Portefeuille · Marchés · Risque · Performance; header eye + "+"; P6 line/candles; first screen hero + ≤ 3 blocks) | [screens/s4-placements.md](screens/s4-placements.md) · [preview](previews/s4-placements.png) | 2026-11-23 |
| F6 Display formats | [foundations/formats.md](foundations/formats.md) · [preview](previews/f6-formats.png) | 2026-11-22 |

Next item: **Onboarding and Settings complete** (B19, B21, S1; B16, B23, S7 — 2026-11-23; B24 and T delegated, D13). **N notifications, W widgets, X copy and D bank dashboard validated** (2026-11-23). Next: **M14 app opening (last)**. Accounts: left to build sessions (D10). Rules D11 (clean screens) and D12 (no overlapping text) apply. Micro-details not covered by a validated file are decided by build sessions, checked at 100 %/200 % font, and reported in one line, without asking Franco ([formats.md](foundations/formats.md) §7). Continuation notes for a new session: [HANDOFF.md](HANDOFF.md).

## Decisions taken with the inventory (Franco, 2026-11-22)

| # | Decision |
|---|---|
| D1 | Performance "Année" chip = **year to date** (API `YTD`); API `1Y` is not shown. Chips: Mois (`1M`), Année (`YTD`), Depuis le début (`ITD`), Personnalisée. |
| D2 | Contributions (P9) get a chart: **positive/negative bars** (G7). |
| D3 | No hidden swipe gestures on list rows. Swipe is used only to dismiss bottom sheets, always with a button alternative. |
| D4 | Theme: **follows the phone setting** by default; manual light/dark choice in Settings. The design is drawn dark-first. |
| D5 | Placements internal navigation: **section pills Portefeuille · Marchés · Risque · Performance** (Franco, 2026-11-23); allocation (P2) is a block of Portefeuille, a row opens P6, the one header action is "+" (add trade / property / debt). |
| D6 | Bank cards get a **gold sheen** animation (M13): colour in [colour.md](foundations/colour.md) §6, motion in F5. |
| D7 | Layout follows **Finary's principles** (F3): hero amount on the page (no card), fewer boxes, lists as one card, pills for buttons/chips, no shadows. The gold edge line is for highlighted cards only. |
| D8 | **No Alertes tab** (2026-11-22): bottom bar Accueil · Comptes · Dépenses · Placements; an open-alert icon appears in the header only while an alert is open (one alert → opens it directly, several → L1; S6 2026-11-23), plus the Home strip and push; past alerts in Settings ([icons.md](foundations/icons.md) §6). |
| D9 | **Period selector is an expandable bar "Période"** (C12, 2026-11-22), not pills; bottom-bar tabs do not animate. |
| D10 | **Accounts section (S3: B2, B3, B17, B20; B22 moves to Spending) is left to the build sessions** (Franco, 2026-11-23): they compose it from validated items (C6 rows, C21 badges, C14 tags, C15 badges, C2 search pill, C13 chips, C9 sheets, B20-style key-value lines from B13, C5 amounts) and report choices in one line (formats.md §7). Design goes on with **Spending (S5)**. |
| D11 | **Clean, uncluttered screens** (Franco, 2026-11-23, for Placements and after): few elements per screen, one idea per block, details behind a tap ("?", sheet, detail screen) rather than shown at once; when in doubt, remove. |
| D12 | **No overlapping text** (Franco, 2026-11-23, S5): at every revision, adjust elements for legibility; no text may overlap another text, mark or annotation (check 100 % and 200 % font; preview annotations sit outside the phone). |
| D13 | **Onboarding split** (Franco, 2026-11-23, option A): design sessions draw **B19** step screen, **B21** institution picker and the **S1** flow; **B24** single-screen pieces (card-scan viewfinder, persona card, questionnaire question, aggregator-style consent) and the **T** guided tour (M11) are left to build sessions, composed from validated items (B19, B13, C2-C4, C9, C16, C17, C21, B12) and reported in one line (formats.md §7). |

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
| N | Notifications | **validated 2026-11-23** → [screens/n-notifications.md](screens/n-notifications.md) |
| W | Widgets | **validated 2026-11-23** → [screens/w-widgets.md](screens/w-widgets.md) |
| X | Copy FR / EN | **validated 2026-11-23** → [copy/fr-en.md](copy/fr-en.md) |
| D | Bank dashboard (web, 1280 px) | **validated 2026-11-23** → [screens/d-bank-dashboard.md](screens/d-bank-dashboard.md) |

---

## Build order

1. **Foundations:** F1 Colour ✓ → F2 Typography ✓ → F3 Spacing / radii / elevation ✓ → F6 Formats ✓ → F4 Icons ✓ → F5 Motion ✓ (+ `tokens.json`).
2. **Base components:** C1 ✓, C5 ✓, C14 + C15 ✓, C6 + C7 ✓, C12 ✓, C8 + C10 + C11 ✓, C9 ✓, C18 + C19 ✓, C13 + C16 + C17 ✓, C20 ✓, C21 ✓, C22 ✓ (C2-C4 ✓ with the Alerts step).
3. **Chart base G0**, then G1 + G2 ✓.
4. **Home blocks:** B1 ✓, B4 ✓, B5 ✓, B6 ✓, B9 ✓, B8 ✓, then **S2 Home layout** ✓, the first full screen that tests the whole system.
5. **Alerts:** C2-C4 ✓ (input, needed for the unlock), B13 ✓, B14 ✓, B15 + G8 ✓, S6 ✓. The most important flow of the demo.
6. **Accounts:** left to the build sessions (D10, 2026-11-23).
7. **Spending:** B7 ✓, G3 ✓, G5 ✓, B6 ✓, B22 ✓; S5 layout pending (HANDOFF open points).
8. **Placements:** B10 ✓, B11 ✓, G4 ✓, B12 ✓, G6 ✓, G7 ✓, B18 ✓, S4 ✓ (2026-11-23).
9. **Onboarding:** B19, B21, B24, then S1, then T (guided tour).
10. **Settings:** B16, B23, then S7.
11. N (notifications), W (widgets), X (copy), D (dashboard).
12. M14 App opening (last, Franco 2026-11-22).
