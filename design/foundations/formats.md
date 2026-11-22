# F6 — Display formats

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`format`). Preview: [../previews/f6-formats.png](../previews/f6-formats.png).

Every number, amount, percentage, date and time in the app goes through
one shared formatter that follows this file. Screens never build such a
string themselves. Font rules (tabular digits, U+202F glyph) are in
[typography.md](typography.md); colours of gains and losses in
[colour.md](colour.md) §4.

## 1. Characters

| Character | Code | Use |
|---|---|---|
| narrow no-break space | U+202F | French thousands separator ("250 000"); before "%" in French ("2,4 %") |
| no-break space | U+00A0 | between a number and its currency or unit ("250 000 F CFA", "1 234,56 €", "5 min") |
| minus sign | U+2212 | every negative value ("−8 000 F"). Never the hyphen "-". |
| plus sign | U+002B | explicit gains and changes ("+12 500 F CFA") |
| en dash | U+2013 | ranges ("1–18 nov.") |
| bullet | U+2022 | hidden digits ("••• F CFA") and masked card numbers |

Change icons (Lucide `trending-up`/`trending-down`, C5) and status shapes are **icons** (F4), never text glyphs.

## 2. Amounts

Amounts arrive in minor units (API.md §2) and are converted once by the
formatter. XOF and XAF have no decimals; EUR and USD always show 2.

| Currency | French | English |
|---|---|---|
| XOF / XAF — default | `1 250 000 F CFA` | `1,250,000 F CFA` |
| XOF / XAF — list rows | `1 250 000 F` | `1,250,000 F` |
| EUR | `1 234,56 €` | `€1,234.56` |
| USD | `1 234,56 $` | `$1,234.56` |

Rules:

- **Full amount everywhere by default.** No abbreviation in rows,
  details, alert cards or sheets.
- **List rows** (transactions, accounts, holdings) use the short suffix
  "F". Everything else (hero, tiles, details, alerts, copy) uses "F CFA".
- XAF is shown as "F CFA" too; the country context tells it apart. When
  both XOF and XAF appear on one screen (rare), detail screens add the
  code in `text.secondary`: "250 000 F CFA · XAF".
- Thousands are always grouped, also at 4 digits ("1 234").
- Zero: "0 F CFA".
- Hidden amounts (privacy mode, widgets "•••"): digits become "•••",
  sign and currency stay: "••• F CFA". TalkBack reads "montant masqué".
- Reference currency conversions are labelled "≈" in `text.secondary`
  before the converted value: "≈ 381,12 €". Poppins lacks "≈" (HANDOFF
  "Measured"), so it is the Lucide icon `equal-approximately` (F4).

## 3. Abbreviations

Used **only where space is lacking**: the hero amount when it does not
fit at large font (typography.md §3), chart axes, home-screen widgets.

| Value | French | English |
|---|---|---|
| ≥ 1 000 000 | `1,2 M F CFA` | `1.2M F CFA` |
| ≥ 1 000 000 000 | `3,4 Md F CFA` | `3.4B F CFA` |
| chart axes only, ≥ 1 000 | `250 k` | `250k` |

- One decimal, dropped when it is 0: "2 M F CFA", not "2,0 M".
- Rounded to nearest; the unit is chosen **after** rounding
  (999 960 000 → "1 Md", not "1 000 M").
- Below 1 000 000, text never abbreviates (only axes use "k").
- Axes carry no currency; the chart title or legend states it.
- The accessibility label always holds the exact full amount.

## 4. Signs, changes and percentages

| Case | Display | Colour (F1) |
|---|---|---|
| Gain / income / positive change | `+12 500 F CFA` + `trending-up` icon | `gain` |
| Loss / spending / negative change | `−8 000 F CFA` + `trending-down` icon | `loss` |
| Zero change | `0 F CFA`, `0 %`, no arrow | `text.secondary` |
| Balance (stock, not a change) | no "+"; "−" only if negative (overdraft) | `text.primary`; `loss` if negative |
| Transaction row | always signed: `−35 500 F`, `+150 000 F` | per colour.md §4 (spending in `text.primary` on category lists) |

Percentages:

- Changes and returns: **1 decimal**, always signed: "+2,4 %", "−0,8 %",
  "+12,0 %". From 100 % up, no decimal: "+250 %".
- A value that rounds to 0,0 shows "0 %" (neutral, no arrow).
- Shares of a whole (donut, allocation, budget used): no sign, no
  decimal: "42 %"; shares of one chart are rounded by largest remainder
  so they add up to 100.
- Change line (hero, tiles): arrow once, amount, then percentage:
  "[trending-up] +12 500 F CFA · +2,4 % aujourd'hui" (C5).
- Scores (0-100) are integers without unit.
- Market prices keep their freshness label (brief §2.4): "Cours différés
  (~15 min)", "Prix mensuel de référence", "Proxy : SPY ≈ S&P 500".

## 5. Dates and times

All in the user's time zone. Time is **24 h, "14:05"**, in both languages.

| Age | French | English |
|---|---|---|
| < 1 min | `À l'instant` | `Just now` |
| < 60 min | `Il y a 5 min` | `5 min ago` |
| < 24 h, today | `Il y a 2 h` | `2 h ago` |
| yesterday | `Hier` (`Hier, 14:05` where the time matters: alerts, transactions detail) | `Yesterday` (`Yesterday, 14:05`) |
| older, this year | `18 nov.` | `Nov 18` |
| other year | `18 nov. 2025` | `Nov 18, 2025` |
| future | `Dans 3 jours`, `Demain` | `In 3 days`, `Tomorrow` |

- French month abbreviations: janv., févr., mars, avr., mai, juin,
  juil., août, sept., oct., nov., déc. Chart axes may use the all-caps
  form ("JANV.", typography.md exception).
- **List group headers:** "Aujourd'hui", "Hier", "Lundi 18 novembre"
  (+ year if not the current one). English: "Today", "Yesterday",
  "Monday, November 18".
- Periods: "Novembre 2026"; ranges "1–18 nov."; "Depuis le début".
- Detail screens show the absolute form: "18 nov. 2026, 14:05".
- Countdowns (code resend, lock wait): "0:45".
- Relative labels are recomputed when the screen gains focus and when a
  list re-renders; no per-row timer.

## 6. Accessibility

- TalkBack reads amounts as words with the full value: "moins huit mille
  francs CFA", never "M" or "k".
- The arrow icon is decorative (the sign already carries the meaning).
- Relative dates have the absolute date in their accessibility label.
- Formats are identical at 200 % font; only the hero may switch to the
  abbreviated form (§3).

## 7. Fine details — left to build sessions

Franco does not review micro-details. For a case this file does not
cover (rare edge value, exact gap between amount and arrow, alignment
inside a given component), the build session:

1. follows the closest rule above and the validated components;
2. checks the result on a 360 dp width at 100 % and 200 % font, light
   and dark;
3. adjusts the component so nothing wraps badly, overlaps or is cut;
4. lists the choice in its report (one line), without asking Franco.

Only choices that change what the user sees across many screens (a new
format, a new abbreviation) come back to Franco.

## 8. Where used

Every amount (C5 amount and change), change tag, chart axis and tooltip
(G0-G8), list row and group header, alert card, widget and notification.
