# B15 — "Pourquoi ?" sheet (L4, score explained)

**Validated by Franco on 2026-11-23** (choices A, A, A, without preview:
G8 gauge with named zones and no number; at most 3 reasons ordered by
weight, weight in words; a "Votre appareil" section only when relevant).
Tokens: [../tokens.json](../tokens.json) (`block.whySheet`). Built from
validated items only; first build checks it at 360 × 800, 100 % and
200 % font, no overlapping text (D12).

Builds on C9 (sheet, section titles), C15 (badge words), G8 (gauge),
B13 reason icons, B12 tone (short plain sentences), C1.

## 1. Data

Alert `{band, score, reasons[{code, params, weight}], context{new_device,
not_locked, weak_face_unlock}}`. `weight` = the reason's share of the
score (server).

## 2. Anatomy (C9 short sheet; becomes tall at 200 % font)

| Part | Content | Style |
|---|---|---|
| Header | title "Pourquoi cette alerte ?" + `x` (C9) | C9 header |
| Intro | one sentence by band: 40-70 "Cette opération ne ressemble pas à vos habitudes : nous vous demandons de confirmer." / > 70 "Plusieurs signes inhabituels réunis : votre banque a été prévenue." | 14/20 `text.secondary` |
| Gauge | **G8** | 16 under the intro |
| Reasons | section title "Ce qui a compté" (C9 section title); **≤ 3** rows ordered by weight: B13 reason icon 20 `text.secondary` · sentence 14/20 (same plain wording as B13, X) · weight word under it 12/16: **"Compte beaucoup"** (`text.primary` Medium) when weight ≥ 35 % of the score, else **"Compte un peu"** (`text.secondary`) | 24 under the gauge; rows 12 apart |
| Device | section title "Votre appareil", **only when a context flag is true**; 1-2 lines with icons: `smartphone` "Opération faite depuis un nouvel appareil" · `lock-open` "Téléphone non verrouillé par un code" · `scan-face` "Déverrouillage par le visage peu sûr sur ce modèle" (max 2, in that order) | 24 under the reasons |
| Footer | C1 text "Comment fonctionne le score ?" → B12 method sheet (words, data used, limits) | 48 dp target, 16 under |

No buttons Oui / Non in the sheet: the answer stays on B13 (one place to
answer).

## 3. States

| State | Rule |
|---|---|
| No reasons returned | reasons section replaced by "Plusieurs petits signes, aucun ne compte plus que les autres." |
| Score < 40 (opened from history) | intro "Cette opération ressemble à vos habitudes."; G8 on Normal; reasons only if any |
| Offline | cached content; nothing changes live |
| 200 % font | tall sheet, scrolls; G8 names stack (G8 §2) |

## 4. Motion

C9 open (`sheet`), G8 entry (G8 §3). Nothing else.

## 5. Accessibility

Reading order: title, intro, gauge (one node), "Ce qui a compté", each
reason with its weight, device lines, footer link. Never accusing: the
sentences describe the operation, not the person.

## 6. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Pourquoi cette alerte ? | Why this alert? |
| intro40 | Cette opération ne ressemble pas à vos habitudes : nous vous demandons de confirmer. | This operation doesn't match your habits: we're asking you to confirm. |
| intro70 | Plusieurs signes inhabituels réunis : votre banque a été prévenue. | Several unusual signs together: your bank has been notified. |
| reasons | Ce qui a compté | What counted |
| weightHigh / Low | Compte beaucoup / Compte un peu | Counts a lot / Counts a little |
| device | Votre appareil | Your device |
| newDevice | Opération faite depuis un nouvel appareil | Made from a new device |
| notLocked | Téléphone non verrouillé par un code | Phone not locked with a code |
| weakFace | Déverrouillage par le visage peu sûr sur ce modèle | Face unlock is weak on this model |
| method | Comment fonctionne le score ? | How does the score work? |

Reason sentences: one per reason code (AMOUNT_VS_PAYEE, NEW_PAYEE,
UNUSUAL_HOUR, …, R1-R6) written in X with their parameters, the same
words as B13.

## 7. Where used

B13 "Voir le détail du score", B14 "Pourquoi cette alerte ?", alert
history in Settings (S7), bank dashboard (D) in a denser form.

Validation: 2026-11-23.
