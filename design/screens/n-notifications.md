# N — Notifications (Android push)

**Validated by Franco on 2026-11-23** (choices A, A, A; preview validated
"je valide"): Oui / Non actions open B13 with the answer pre-selected
after device unlock; lock screen shows a general text only; Budgets and
Marchés at most 1 per day per channel with quiet hours 22:00-07:00.
Tokens: [../tokens.json](../tokens.json) (`screen.notifications`).
Preview: [../previews/n-notifications.png](../previews/n-notifications.png)
· source [../previews/n-notifications.html](../previews/n-notifications.html).

Builds on B13 (what Oui / Non open), B14 (bank notified, call button,
copy), B6 (budget states 80 % / 100 %), S4 P8 (concentration threshold),
B5 (learning finished), C15 badge wording, S7 notification rows
(channel switches, "Montants visibles").

## 1. Data

Push payload (FCM data message, built by the server, no amount unless the
user turned "Montants visibles" on — the server reads the setting, the
app never decides locally): `{type, alert_id?, channel, title_key,
args{op_type, operator, payee_short, time, bank, category, asset, share,
threshold, amount?}, sent_at}`. The app builds the notification from the
X copy keys (FR / EN by app language). Payee is shortened server-side
("Awa K."): first name + initial, never an account number.

## 2. Channels (Android `NotificationChannel`)

| Channel id | Name FR / EN | Importance | Default (S7) | Lock screen | Limits |
|---|---|---|---|---|---|
| `security` | Sécurité / Security | HIGH (heads-up + sound) | on | `VISIBILITY_PRIVATE` + public version | none (never limited, no quiet hours) |
| `budgets` | Budgets / Budgets | DEFAULT (sound, no heads-up) | on | PRIVATE + public version | 1 per day; 22:00-07:00 held, sent at 07:00 |
| `markets` | Marchés / Markets | DEFAULT | **off** | PRIVATE + public version | 1 per day; 22:00-07:00 held, sent at 07:00 |

- The S7 switches stop the server from sending a channel; the Android
  channel itself is created on first launch and also follows the system
  settings (if the user mutes it in Android, S7 shows the switch off with
  the line "Désactivé dans les réglages Android" and opens them on tap).
- "1 per day" = per channel; if several are due, the most important one
  is sent (budget 100 % > 80 %; highest concentration share), the others
  stay visible in-app only (L1, D3, P8).
- Quiet hours use the phone's local time zone. Learning finished is on
  `security` but posted **silent** (`setSilent(true)`).
- Notification permission (Android 13+) is asked in context (S1 O12 rule):
  at the first alert or first budget creation, never at launch.
- Group: all app notifications share the group key `gp`; a silent summary
  is posted when ≥ 2 are shown ("GOLDENPIECE · {n} notifications").

## 3. Anatomy (system card)

The system draws the card (Tecno HiOS may differ from stock Android:
colours, radius and action style are the system's). The app controls:

| Part | Rule |
|---|---|
| Small icon | monochrome vector 24 dp (`ic_stat_gp`): the brand mark silhouette (8 coins on a ring + sparkle, foundations/icons.md §11), white on transparent — **replaces the "G" placeholder (Franco 2026-11-23)** |
| Accent | `setColor(#FF7A2F)` (brand orange; tints the icon circle where the system allows) |
| Title | ≤ 40 characters FR and EN (one line at 360 dp, 14 sp SemiBold) |
| Text | ≤ 90 characters; collapsed = 1 line (ellipsis by the system), expanded = `BigTextStyle` full text |
| Actions | ≤ 2, labels ≤ 16 characters (two actions share the width) |
| Large icon | none (no logos, cleaner card) |
| Timestamp | `sent_at` (system shows "2 min", "07:00", "hier") |
| Tap | opens the target screen (table §4); `setAutoCancel(true)` |

## 4. Types

Amount hidden = default. With "Montants visibles" on, `{amount}` is
inserted as shown in the "amount on" column (F6 format, "180 000 F").

| # | Type | Channel | Title FR | Text FR (unlocked) | Amount on | Public version (lock screen) | Actions | Tap → |
|---|---|---|---|---|---|---|---|---|
| 1 | Confirm it's you (40-70) | security | C'est bien vous ? | {op_type} {operator} vers {payee} à {time}. L'opération n'est pas bloquée. | {op_type} {operator} de {amount} vers {payee} à {time}. … | title same · "Une opération attend votre confirmation." | Oui, c'est moi · Non, pas moi | B13 |
| 2 | Reminder (once, +15 min, only if unanswered) | security | Une réponse vous attend | {op_type} {operator} vers {payee} à {time}. C'est bien vous ? | idem with "de {amount}" | title same · "Une opération attend toujours votre réponse." | same as 1 | B13 |
| 3 | Bank alerted (> 70, or after Non) | security | Votre banque a été prévenue | {op_type} {operator} vers {payee} à {time} signalé à {bank}. | idem with "de {amount}" | "Alerte de sécurité" · "Ouvrez l'application pour suivre l'analyse." | Appeler ma banque | B14 |
| 4a | Bank decision — legitimate | security | Opération confirmée | {bank} a vérifié le {op_type_lower} de {time} : tout est en ordre. | idem with "de {amount}" | "Décision de votre banque" · "Ouvrez l'application pour la voir." | — | B14 (decided) |
| 4b | Bank decision — fraud | security | Opération bloquée par la banque | {bank} va vous contacter. Ne communiquez jamais votre code. | (no amount) | same as 4a | Appeler ma banque | B14 (decided) |
| 5a | Budget 80 % | budgets | {category} : 80 % du budget | Il reste 20 % du budget jusqu'au {last_day}. | Il reste {left} jusqu'au {last_day}. | "Budgets" · "Un budget approche de sa limite." | — | D3 category |
| 5b | Budget 100 % | budgets | {category} : budget atteint | Vous avez utilisé tout le budget de {month}. | Vous avez utilisé les {budgeted} du budget de {month}. | "Budgets" · "Un budget est atteint." | — | D3 category |
| 6 | Concentration | markets | {asset} : {share} % du total | Au-dessus de votre seuil de {threshold} %. | (no amount) | "Placements" · "Un placement dépasse votre seuil." | — | P8 Concentration |
| 7 | Learning finished | security (silent) | Les alertes d'anomalies sont actives | Une opération inhabituelle vous sera désormais signalée. | — | same (no personal data) | — | Home (B5 finished card) |

Rules:
- **Reminder** replaces notification 1 (same notification id, alerts
  once more); it is sent once, 15 min after 1, only if still unanswered
  and the score is still 40-70. Answer, score > 70 or "already answered
  on another device" → notification 1 is cancelled on every device.
- **Bank alerted** replaces 1/2 if the score moves > 70. **Decision**
  replaces 3 (same id).
- Budget thresholds fire once per category per month each (80 %, then
  100 %); a budget edit that drops below 80 % re-arms them.
- Concentration fires once per asset per threshold crossing (re-armed
  when the share goes back under the threshold).
- Words are never accusing (B13 §2): "inhabituelle", never "suspecte".

## 5. Actions Oui / Non

- `setAuthenticationRequired(true)` (Android 12+): the system asks for
  device unlock first, also on the lock screen.
- After unlock, the app opens **B13 with the answer pre-selected**
  (button highlighted, other dimmed) and one confirm step: the B13
  biometric / app-PIN prompt of the answer (B13 §3). Nothing is sent from
  the notification itself (no accidental "Non" from a pocket).
- Oui → B13 flow (toast "Merci, c'est noté"); Non → B14.
- "Appeler ma banque" opens the dialer with the bank number (system
  unlock rules apply); the notification stays.

## 6. States

| State | Rule |
|---|---|
| Amounts hidden (default) | no amount in title or text; public version on lock screen |
| "Montants visibles" on | amount added as in §4; lock screen still shows the public version (Q2 A: details only after unlock) — the S7 sheet text warns about visibility after unlock |
| Offline at answer | B13 queued state (C11 queued toast) |
| Channel muted in Android | nothing posted; alerts stay in-app (S6, header icon D8); S7 footnote "Même désactivées, les alertes de sécurité restent visibles dans l'app." |
| Demo mode | no push (fictitious data); the guided tour (T) shows a still image of notification 1 |
| Language change | next notifications in the new language; posted ones are not rewritten |

## 7. Motion

System animations only. Opening B13 / B14 from a notification uses the
F5 `screen` transition.

## 8. Accessibility

TalkBack reads title then text then actions (system). Action labels are
self-explanatory ("Oui, c'est moi", "Non, pas moi"). Times in text as
"à 07:40" (F6). Colour is not used for meaning (system card). Text length
limits (§3) keep the collapsed line readable at 200 % font (ellipsis,
full text when expanded).

## 9. Performance

One FCM data message per event; no polling; notifications built
locally from copy keys (no images, no large icon). Cancels are pushed as
data messages (`type = cancel`, `alert_id`).

## 10. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| channel.security / budgets / markets | Sécurité / Budgets / Marchés | Security / Budgets / Markets |
| confirm.title | C'est bien vous ? | Was this you? |
| confirm.text | {op_type} {operator} vers {payee} à {time}. L'opération n'est pas bloquée. | {op_type} {operator} to {payee} at {time}. It is not blocked. |
| confirm.public | Une opération attend votre confirmation. | A payment is waiting for your confirmation. |
| action.yes / no | Oui, c'est moi / Non, pas moi | Yes, it was me / No, not me |
| reminder.title | Une réponse vous attend | We're waiting for your answer |
| reminder.text | {op_type} {operator} vers {payee} à {time}. C'est bien vous ? | {op_type} {operator} to {payee} at {time}. Was this you? |
| reminder.public | Une opération attend toujours votre réponse. | A payment is still waiting for your answer. |
| alerted.title | Votre banque a été prévenue | Your bank has been notified |
| alerted.text | {op_type} {operator} vers {payee} à {time} signalé à {bank}. | {op_type} {operator} to {payee} at {time} reported to {bank}. |
| alerted.public | Alerte de sécurité · Ouvrez l'application pour suivre l'analyse. | Security alert · Open the app to follow the review. |
| action.call | Appeler ma banque | Call my bank |
| legit.title / text | Opération confirmée / {bank} a vérifié le {op_type_lower} de {time} : tout est en ordre. | Payment confirmed / {bank} checked the {op_type_lower} at {time}: everything is fine. |
| fraud.title / text | Opération bloquée par la banque / {bank} va vous contacter. Ne communiquez jamais votre code. | Payment blocked by your bank / {bank} will contact you. Never share your code. |
| decision.public | Décision de votre banque · Ouvrez l'application pour la voir. | Your bank's decision · Open the app to see it. |
| budget80.title / text | {category} : 80 % du budget / Il reste 20 % du budget jusqu'au {last_day}. | {category}: 80% of budget / 20% of the budget left until {last_day}. |
| budget80.amount | Il reste {left} jusqu'au {last_day}. | {left} left until {last_day}. |
| budget100.title / text | {category} : budget atteint / Vous avez utilisé tout le budget de {month}. | {category}: budget reached / You have used all of your {month} budget. |
| budget100.amount | Vous avez utilisé les {budgeted} du budget de {month}. | You have used your {budgeted} {month} budget. |
| budget.public80 / public100 | Un budget approche de sa limite. / Un budget est atteint. | A budget is close to its limit. / A budget has been reached. |
| conc.title / text | {asset} : {share} % du total / Au-dessus de votre seuil de {threshold} %. | {asset}: {share}% of total / Above your {threshold}% threshold. |
| conc.public | Placements · Un placement dépasse votre seuil. | Investments · An investment is above your threshold. |
| learning.title / text | Les alertes d'anomalies sont actives / Une opération inhabituelle vous sera désormais signalée. | Anomaly alerts are on / We'll now tell you about any unusual payment. |
| group.summary | {n} notifications | {n} notifications |

Build: check every FR and EN string against §3 lengths at 360 dp and
200 % font; shorten and report in one line (formats.md §7).

## 11. Where used

Server alert pipeline (L2/L3 events), budget job, concentration job,
learning job; S7 Notifications group; B13, B14, D3, P8, B5 targets;
guided tour (T) still image; widgets (W) refresh on push.

Validation: 2026-11-23. Copy shortened by the X length check (2026-11-23): bank-alerted text without "Suivez l'analyse dans l'app." (≤ 90 characters), concentration title "{asset} : {share} % du total" (≤ 40 characters with the longest asset name).
