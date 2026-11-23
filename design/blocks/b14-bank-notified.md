# B14 — "Votre banque a été prévenue" (L3, score > 70 or answer "Non")

**Validated by Franco on 2026-11-23** (choices A, A, A, without preview:
full screen like B13; primary "Appeler ma banque" + secondary "Fermer";
one safety advice in a C8 info banner under the timeline). Tokens:
[../tokens.json](../tokens.json) (`block.bankNotified`). No preview of its
own: built only from validated items; the first build checks it at
360 × 800, 100 % and 200 % font, with **no overlapping text** (D12).

Builds on C12 (sub-page header), C15 ("Banque prévenue" badge), B4
compact variant (operation line), C22 (status timeline), C8 (info
banner), C1 (large buttons), C11 (toast), B15 ("Pourquoi ?" sheet).

## 1. Data

Alert `{band, score, status (sent | analysing | legit | fraud), reasons[],
tx{amount, cp_name, booking_ts, account, op_type}, bank{name, phone},
timeline[{step, at}], answered{answer, at}}`. Updates arrive in real time
(push / Realtime); polling every 30 s while the screen is open as a
fallback.

## 2. Anatomy (360 × 800, 20 dp margins, top → bottom)

| Part | Content | Style |
|---|---|---|
| Header | back arrow (C12), no title | 56 dp |
| Badge | C15 "Banque prévenue" (`shield-check`, loss tint) | |
| Title | "Votre banque a été prévenue" | `titleScreen` 24/32, 8 under the badge, 2 lines max |
| Calm line | "L'application ne bloque jamais un paiement. C'est votre banque qui décide." | `caption` 13/18 `text.secondary`, 4 under |
| Operation | **B4 compact variant** in a C7 plain card: C21 monogram 40 · payee + op type ("Transfert vers Awa K.") / time ("Aujourd'hui, 03:10") · amount (C5, hidden amounts rule) | 20 under; not tappable here |
| Timeline | **C22**: "Alerte envoyée à Banque Baobab" (done, 03:11) → "La banque vérifie l'opération" (current, orange pulsing dot, detail "En général moins de 10 min") → "Décision de la banque" (to come) | 16 under |
| Advice | **C8 info** banner, icon `shield-alert` (`text.secondary`), text "Ne communiquez jamais votre code, même à quelqu'un qui dit appeler de votre banque." | 16 under; not dismissible; no action |
| Link | C1 text "Pourquoi cette alerte ?" → B15 sheet (L4) | 48 dp target, 8 under |
| Bottom (pinned) | C1 **primary** large "Appeler ma banque" (`phone` 20) → system dialer with `bank.phone` prefilled (no in-app call); C1 **secondary** large "Fermer" → back | gap 8; 16 above the system area |

First screen at 360 × 800: everything fits with the buttons pinned (D11:
badge + title + 3 blocks: operation, timeline, advice).

## 3. Flow

| Entry | Rule |
|---|---|
| From B13 "Non, ce n'est pas moi" | after the unlock, B13 is **replaced** (no back to B13), sub-page cross-fade (F5 `screen`); timeline starts with step 1 done |
| Score > 70 (push, B4 card, L1) | opens directly; no unlock to view; "Appeler ma banque" needs no unlock either |
| Back / Fermer | to where the user came from (Home when opened from the push); the alert stays open in the header icon (D8) until the decision |

## 4. States

| State | Rule |
|---|---|
| Analysing (default) | as §2 |
| Decision: confirmed (`legit`) | C22 final "Opération confirmée" + "Votre banque a vérifié : tout est en ordre." (gain); badge cross-fades to C15 Normal; buttons: **"Fermer" becomes primary**, "Appeler ma banque" removed; advice stays |
| Decision: blocked (`fraud`) | C22 final "Opération bloquée par la banque" + "Votre banque va vous contacter." (loss); "Appeler ma banque" stays primary, "Fermer" secondary |
| No bank phone | primary removed, "Fermer" becomes primary; the timeline detail adds "Votre banque vous contactera." |
| Offline | cached timeline + C8 offline banner under the header; live dot stays orange, freshness line "Mis à jour à 03:12" under the timeline |
| Hidden amounts | amount "••• F"; everything else visible |
| 200 % font | content scrolls; the two buttons stay pinned, stacked; the C22 time column moves under each step title |

## 5. Motion

Screen enter: F5 `screen`. Live updates follow C22 §3 (done marker
cross-fade 320 ms, new step fade + 8 dp rise, one looping halo). Badge
change cross-fades 320 ms. Button change on decision: cross-fade 320 ms.
Reduced motion: static dot, 150 ms fades.

## 6. Accessibility

Reading order: badge, title, calm line, operation (amount as words),
timeline (live region, polite), advice, link, buttons. "Appeler ma
banque" reads "Appeler Banque Baobab, bouton". Never accusing words; the
user is a victim, not a suspect.

## 7. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| badge | Banque prévenue | Bank notified |
| title | Votre banque a été prévenue | Your bank has been notified |
| calm | L'application ne bloque jamais un paiement. C'est votre banque qui décide. | The app never blocks a payment. Your bank decides. |
| step1 | Alerte envoyée à {banque} | Alert sent to {bank} |
| step2 | La banque vérifie l'opération · En général moins de 10 min | Your bank is checking the payment · Usually under 10 min |
| step3 | Décision de la banque | Bank's decision |
| legit | Opération confirmée · Votre banque a vérifié : tout est en ordre. | Payment confirmed · Your bank checked: everything is fine. |
| fraud | Opération bloquée par la banque · Votre banque va vous contacter. | Payment blocked by your bank · Your bank will contact you. |
| advice | Ne communiquez jamais votre code, même à quelqu'un qui dit appeler de votre banque. | Never share your code, even with someone who says they are calling from your bank. |
| why | Pourquoi cette alerte ? | Why this alert? |
| call / close | Appeler ma banque / Fermer | Call my bank / Close |

## 8. Where used

L3 (S6), after B13 "Non", push "Votre banque a été prévenue" (N),
guided tour alert example (T), bank dashboard (D) shows the same
timeline from the bank side.

Validation: 2026-11-23.
