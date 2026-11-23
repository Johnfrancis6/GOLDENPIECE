# B13 — "C'est bien vous ?" (L2, score 40-70)

**Validated by Franco on 2026-11-23** (choices A, A, A: full screen;
the screen opens without unlock and the fingerprint/code is asked when
Oui or Non is tapped; Oui → toast and back, Non → B14 directly).
Tokens: [../tokens.json](../tokens.json) (`block.isItYou`). Preview:
[../previews/b13-is-it-you.png](../previews/b13-is-it-you.png) · source
[../previews/b13-is-it-you.html](../previews/b13-is-it-you.html).

Builds on C12 (sub-page header), C15 (badge), C7 (card), C21 (operator
monogram), C5 (amount, hidden), B20 pattern (key-value lines), C1
(large buttons), C3 / C20 (unlock), C8 (info banner), C11 (toast), B14,
B15.

## 1. Data

Alert `{band, score, status, reasons[], tx{amount, cp_name, booking_ts,
account, op_type}, answered{by_device, answer, at}}`.

## 2. Anatomy (360 × 800, 20 dp margins)

| Part | Content | Style |
|---|---|---|
| Header | back arrow (C12), no title | 56 dp |
| Badge | C15 "À confirmer" | |
| Title | "C'est bien vous ?" | `titleScreen` 24/32, 8 under the badge |
| Calm line | "Nous vérifions cette opération avec vous. Elle n'est pas bloquée." | 13/18 `text.secondary` (brief: the app never blocks) |
| Operation card | C7 plain: C21 monogram 40 + operator / op type and payee ("Savane Pay", "Transfert vers Awa K."); amount `amountLarge` 22/28 SemiBold; key-value lines "Date — Aujourd'hui, 03:10", "Compte — Kola Money •• 4821" (13/18, label `text.secondary`, value Medium, hairline above each) | 20 under |
| Reasons | "Pourquoi cette question ?" 15/22 SemiBold; **at most 3** reasons, each a Lucide icon 20 `text.secondary` + 14/20 text; never accusing ("une heure où vous ne faites pas d'opérations", not "heure suspecte") | 24 under |
| Link | C1 text "Voir le détail du score" → B15 sheet (L4) | 48 dp target |
| Bottom (pinned) | hint `fingerprint` 16 + "Votre empreinte vous sera demandée." 12/16 `text.secondary`; C1 primary large **"Oui, c'est moi"**; C1 secondary large **"Non, ce n'est pas moi"**; gap 8; 16 above the system area | |

Reason icons (from the reason codes, X): amount vs payee/category
`chart-no-axes-column-increasing`; unusual hour `moon`; new payee
`user-plus`; velocity / daily outflow `repeat`; new device `smartphone`;
unusual combination `shuffle`; location/context `map-pin`.

## 3. Flow

| Step | Rule |
|---|---|
| Open | from the B4 card, the push (N) or L1; the screen shows **without unlock** (choice A); back returns to where the user came from (Home when opened from the push) |
| Tap Oui or Non | system biometric prompt, fallback app PIN (C3); the server checks the unlock proof (CHALLENGES S2-6) |
| Oui | C11 success toast "Merci, c'est noté", back to the previous screen; the B4 card leaves (B4 §6) |
| Non | straight to B14 "Votre banque a été prévenue" with the advice "Ne communiquez jamais votre code, même à quelqu'un qui dit appeler de votre banque." — no "Êtes-vous sûr ?" dialog (answering Non blocks nothing) |
| Unlock cancelled / failed | stay on the screen, nothing sent; C3 lock rules apply |

## 4. States

| State | Rule |
|---|---|
| Hidden amounts | amount "••• F" until the unlock of the answer; everything else visible |
| Already answered (other device) | buttons replaced by a C8 **info** banner "Vous avez déjà répondu « Oui, c'est moi » sur un autre appareil, à 03:14." + C1 secondary "Fermer" |
| Reminder sent (15 min) | no change on screen; the push is softer (N) |
| Offline | answer queued: buttons work, toast "Réponse envoyée dès le retour du réseau" (C11 queued) + C14 "En attente" on the B4 card |
| Score moved > 70 meanwhile | screen replaced by B14 (cross-fade) |
| 200 % font | content scrolls; the two buttons stay pinned, stacked |

## 5. Motion

Screen enters with the C12 sub-page transition (F5 `screen`); toast and
B14 transitions as their own items. No motion of its own; reduced motion
follows F5.

## 6. Accessibility

Reading order: badge, title, calm line, operation (amount read as
words), "Pourquoi cette question ?", reasons, link, hint, Oui, Non.
Buttons labelled exactly "Oui, c'est moi" / "Non, ce n'est pas moi".
`FLAG_SECURE` is not needed here (no secret), it is on the PIN step.

## 7. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | C'est bien vous ? | Was this you? |
| calm | Nous vérifions cette opération avec vous. Elle n'est pas bloquée. | We are checking this operation with you. It is not blocked. |
| why | Pourquoi cette question ? | Why are we asking? |
| detail | Voir le détail du score | See the score details |
| hint | Votre empreinte vous sera demandée. | You will be asked for your fingerprint. |
| yes / no | Oui, c'est moi / Non, ce n'est pas moi | Yes, it was me / No, it wasn't me |
| thanks | Merci, c'est noté | Thank you, noted |
| answered | Vous avez déjà répondu « {réponse} » sur un autre appareil, à {heure}. | You already answered "{answer}" on another device at {time}. |

## 8. Where used

L2 (S6), guided tour alert example (T), notifications actions (N).
