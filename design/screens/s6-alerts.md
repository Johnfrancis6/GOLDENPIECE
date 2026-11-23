# S6 — Alerts (L1-L5)

**Validated by Franco on 2026-11-23** (choices A, A, A: with one open
alert the header shield opens it directly; L1 shows open alerts only +
"Historique des alertes" link to the history screen, same as Settings;
learning card on top during learning, L5 shown once as the B5 finished
state, empty state "Aucune alerte en cours"). Preview (dark, 360 dp; 200 %
font on the right): [../previews/s6-alerts.png](../previews/s6-alerts.png)
· source [../previews/s6-alerts.html](../previews/s6-alerts.html).

Assembles validated items only: C12 (sub-page header, open-alert icon),
B4 (full and compact), C15, C14, B5, C19, B13, B14, B15 + G8, C11. No
Alertes tab (D8). Rules D11 and D12.

## 1. Entries (D8, refined)

| Entry | Opens |
|---|---|
| Header `shield-alert` icon (all tabs, only while ≥ 1 alert is open) | **1 open alert → that alert directly** (B13 if 40-70, B14 if > 70, the budget / concentration target for those kinds); **≥ 2 → L1** |
| Home strip "Voir les N alertes" (B4 §4) | L1 |
| Home strip card / push | that alert |
| Settings → "Historique des alertes" | History screen |

## 2. L1 — Alertes (open alerts only)

Sub-page: back arrow, large title "Alertes" (scrolls to a small centred
title, C12). Then:

| Part | Rule |
|---|---|
| Learning card | B5, on top, only during the learning phase (24 under) |
| Open alerts | B4 **full** cards, 12 apart, order: > 70 first, then 40-70, then budget / concentration, newest first inside each; only the newest > 70 card is highlighted (C7 glow edge) |
| History link | C1 text button with `history` 20: "Historique des alertes" (48 dp, left-aligned with the cards; centred under an empty state) |
| Empty (no open alert) | C19 with the **alerts illustration**: Lucide `shield` scaled 3.4 in `text.secondary` with its check in gold `#FFB45C` dark / `#D9822B` light (C19 variant; the piggy bank stays the default elsewhere); title "Aucune alerte en cours", text "Nous surveillons vos opérations.", no button; then the history link |

Answering an alert removes its card (B4 §6); when the last card leaves,
the empty state fades in (`quick`).

## 3. History screen — Historique des alertes

Sub-page: back, large title "Historique des alertes". Groups by month
("Novembre", 15/22 SemiBold, 20 above, 8 under), each one C7 list card
of **B4 compact rows** (title = short reason, subtitle = outcome · date;
right: C5 amount then the C15 badge or the C14 "Budget" / "Concentration"
tag). Rows open the alert detail read-only (B13/B14 in their final state,
no buttons except "Fermer"). Last 12 months, paged by month (FlashList).
Empty: C19 alerts illustration, "Aucune alerte pour l'instant".

## 4. L5 — learning finished

Shown **once**: the B5 card switches to its finished state ("Les alertes
d'anomalies sont actives" + grey "OK") on Home and on top of L1; OK or
the next visit after it was seen removes it everywhere. A push says the
same (N). No full-screen celebration.

## 5. States

| State | Rule |
|---|---|
| Offline | cached list + C8 offline banner under the header; answers queued (B13) show C14 "En attente" on the card |
| Hidden amounts | "••• F" in cards and rows |
| New alert while open (M6) | card enters at its place (B4 §6); header icon pops once |
| 200 % font | B4 head wraps (badge, then time), amount under the operation line; compact rows stack (value column under the text) |

## 6. Accessibility

L1 heading receives focus; each card is one node (B4 §7); live arrivals
announced politely. History month headings are headings. The header icon
reads "1 alerte en cours" / "3 alertes en cours".

## 7. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Alertes | Alerts |
| history | Historique des alertes | Alert history |
| empty | Aucune alerte en cours · Nous surveillons vos opérations. | No open alerts · We are watching your transactions. |
| historyEmpty | Aucune alerte pour l'instant | No alerts yet |
| headerIcon | {n} alerte(s) en cours | {n} open alert(s) |

## 8. Performance

L1 and history are FlashLists with two item types (full, compact); entry
animation only for live arrivals, never on the first render.

Validation: 2026-11-23.
