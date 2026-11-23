# W — Home-screen widgets (phase 2, designed now)

**Validated by Franco on 2026-11-23** (choices A, A, A; preview validated
"oui"): net worth 2×2 = amount + day change + 30-day line; amounts hidden
"••• F" by default, shown only through the widget configuration screen
with unlock; solid background following the phone's light/dark theme,
card radius, orange only for the alert icon (rings keep their C17 state
colours). Tokens: [../tokens.json](../tokens.json) (`screen.widgets`).
Preview: [../previews/w-widgets.png](../previews/w-widgets.png) · source
[../previews/w-widgets.html](../previews/w-widgets.html).

Builds on B1 (net worth label, day change), C5 (amounts, hidden "••• F"),
C14 change tag (gain / loss), G1 line (no axis), C17 rings / B6 budget
states, D8 alert icon (`shield-alert`), F6 formats (abbreviation).

## 1. Data (local only)

Read from the app's local store (last snapshot), never from the network:
`networth{value, day_change_pct, as_of, history_30d[30]}`,
`budget{left, spent, budgeted}`, `alerts{open_count, to_confirm_count}`.
Refresh: Android `updatePeriodMillis` 30 min (floor) + on app open, on
data sync and on push (N). No market ticker, no live quotes.

## 2. Sizes (assumed, not verified on the Tecno)

| Widget | Cells | Target size (dp) | Resizable |
|---|---|---|---|
| Patrimoine 2×2 | 2 × 2 | 164 × 176 | no (2×1 is its own widget) |
| Patrimoine 2×1 | 2 × 1 | 164 × 80 | horizontally only (wider = same content) |
| Budget | 2 × 1 | 164 × 80 | horizontally only |
| Alertes | 2 × 1 | 164 × 80 | horizontally only |

Build: read the real cell size from `AppWidgetManager` options; if the
content does not fit, apply the rules of §4 and report in one line.

## 3. Anatomy

All widgets: background `surface2` dark `#181818` / `surface1` light
`#FFFFFF` (follows the system theme, not the app setting), radius 20
(clipped by the launcher radius where Android 12+ imposes one), padding
14-16 (12 for the horizontal 2×1), no shadow, no gradient, no blur.

| Widget | Content |
|---|---|
| Patrimoine 2×2 | label "Patrimoine net" 12/16 Medium `text.secondary`; amount 20/26 SemiBold tabular (C5); C14 change tag (day change, `trending-up/down` 14) 4 under; G1 line 30 days, 132 × 44, stroke 2, `#FF7A2F` dark / `#D0560F` light, no axis, no fill, no dot; footer "30 jours · {as_of HH:mm}" 12/16 `text.secondary` |
| Patrimoine 2×1 | row 1: label "Patrimoine" + C14 day-change tag (right); row 2: amount 20/26 SemiBold |
| Budget 2×1 | C17 ring 44 (stroke 5, label "69 %" 11 SemiBold, B6 state colour ok / near / over, track `#262626` / `#EBEBEB`) + text: "Budget" 12/16 `text.secondary`, amount 14/20 SemiBold, "restant" 12/16 `text.secondary`; over budget: "dépassé" in over text colour (`#FF7B6E` / `#C8283C`) |
| Alertes 2×1 | 36 dp circle tint `rgba(255,122,47,.16)` / `#FFE9DC` with `shield-alert` 20 `#FF7A2F` / `#B4410F`; "{n} alertes" 14/20 SemiBold; "{k} à confirmer" 12/16 `text.secondary` (or "Banque prévenue" if a > 70 alert is open) |
| Alertes 2×1, none | circle `gain` tint with `shield-check` green (`#3DD68C` / `#0E7A43`); "0 alerte"; "Tout est calme" |

## 4. States

| State | Rule |
|---|---|
| Amounts hidden (default) | every amount "••• F"; percentages (day change, budget %) stay visible (B6 rule) |
| Amounts shown | widget configuration screen (opens when the widget is placed, and on long-press "Réglages" where the launcher allows): one B16 switch row "Afficher les montants" (off) → biometric / app PIN → on; one setting per widget instance |
| Amount too long | F6 abbreviation ("12,5 M F") when the full amount does not fit the width; full amount in the accessibility label |
| No data yet (demo or before first sync) | Patrimoine: "—" + footer "Ouvrez l'app pour mettre à jour"; Budget without budget: text "Créer un budget" (tap → D3); Alertes: "0 alerte" |
| Stale > 24 h | footer / label shows the date "hier 07:30" or "21 nov." (F6) |
| Demo mode | fictitious values with the C14 "Démo" tag replacing the footer |
| Logged out / app locked out | the widget shows only "GOLDENPIECE" and "Ouvrir l'app" (no data) |

Tap targets: the whole widget (≥ 48 dp). Patrimoine → Home; Budget → D3
(budgets); Alertes → S6 rule (1 open alert → that alert, ≥ 2 → L1, 0 →
Home). Opening the app follows the app lock (C3) as usual.

## 5. Motion

None (RemoteViews): values swap without animation. The ring is drawn
statically (bitmap or `ProgressBar` drawable).

## 6. Accessibility

Each widget is one button with a content description, e.g. "Patrimoine
net, 12 480 000 francs CFA, en hausse de 0,4 % aujourd'hui, mis à jour à
07:30" — hidden: "Patrimoine net, montant masqué, en hausse de 0,4 %
aujourd'hui". "Budget du mois, 69 % utilisé, reste 138 000 francs CFA".
"2 alertes ouvertes, dont 1 à confirmer". Text ≥ 12 sp; at 200 % font
the widget keeps its size and the amount abbreviates (§4); never
truncate the percentage. Colour never alone: ring label + words; tag
icon + sign.

## 7. Performance

RemoteViews with static layouts; line drawn once per refresh into a
bitmap ≤ 264 × 88 px (≤ 30 points); no network call from the widget
provider; WorkManager job only on the 30-min period.

## 8. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| nw.label2x2 / 2x1 | Patrimoine net / Patrimoine | Net worth / Net worth |
| nw.footer | 30 jours · {heure} | 30 days · {time} |
| budget.label / left / over | Budget / restant / dépassé | Budget / left / over |
| budget.none | Créer un budget | Create a budget |
| alerts.count | {n} alertes (1 alerte, 0 alerte) | {n} alerts (1 alert, 0 alerts) |
| alerts.toConfirm | {k} à confirmer | {k} to confirm |
| alerts.notified | Banque prévenue | Bank notified |
| alerts.none | Tout est calme | All clear |
| noData | Ouvrez l'app pour mettre à jour | Open the app to update |
| config.show | Afficher les montants | Show amounts |
| config.title | Réglages du widget | Widget settings |
| locked | Ouvrir l'app | Open the app |
| picker names | Patrimoine · Patrimoine (petit) · Budget du mois · Alertes | Net worth · Net worth (small) · Monthly budget · Alerts |

## 9. Where used

Android home screen (launcher widget picker); refreshed by N pushes and
app sync.

Validation: 2026-11-23.
