# B5 — Learning card

**Validated by Franco on 2026-11-22** (choices A, A, A: two learning
rings, days and operations; not dismissible; turns once into
"Les alertes d'anomalies sont actives" with an "OK" button). Tokens:
[../tokens.json](../tokens.json) (`block.learningCard`). Preview:
[../previews/b5-learning-card.png](../previews/b5-learning-card.png) ·
source [../previews/b5-learning-card.html](../previews/b5-learning-card.html).

Builds on C7 (plain card), C17 (learning rings 56 dp), C20 ("?"), C1
(secondary small button), F4 (Lucide icons).

## 1. Purpose

During the learning phase anomaly alerts are inactive (brief §2). The
card says so plainly, shows how far the app is, and reassures that
fraud protection is not off. It takes the place of the B4 alerts strip.

## 2. Data

`learning{days, days_target (30), ops, ops_target (30)}` (Home
`learning`, L1 header). Learning ends when **both** targets are reached.

## 3. Anatomy — learning state

Section title "Alertes" (`titleSection`, as B4) then a C7 plain card
(`surface1`, radius 12, padding 16):

| Line | Content | Style |
|---|---|---|
| Title | "Apprentissage de vos habitudes" + C20 "?" | 15/22 SemiBold `text.primary`; "?" 16 dp `text.secondary`, 48 dp target |
| Text | "Les alertes d'anomalies s'activeront après 30 jours et 30 opérations." | `caption` 13/18 `text.secondary`, 2 under |
| Rings | two C17 learning rings 56 dp (stroke 7, `#FF8C4A` dark / `#D0560F` light, track `#262626` / `#EBEBEB`), centre label "12/30" 12 SemiBold tabular; caption under each: "jours", "opérations" | 16 under the text, 32 between rings, left-aligned; caption 6 under the ring |
| Reassurance | Lucide `shield-check` 16 + "Les alertes de fraude restent actives pendant ce temps." | `caption` `text.secondary`, 16 under, gap 8 |

Not dismissible (Franco, choice A): it stays until learning ends.

"?" text (B12 sheet): "Pendant 30 jours, l'application observe vos
opérations habituelles (montants, bénéficiaires, heures) pour reconnaître
ce qui sort de l'ordinaire. Rien n'est bloqué." / "For 30 days the app
learns your usual operations (amounts, payees, times) to recognise what
is out of the ordinary. Nothing is blocked."

## 4. Anatomy — finished state (L5, shown once)

Same card: complete ring 56 dp in C17 **ok** green (`#4CD68F` /
`#16894F`) with a Lucide `check` 22 dp in the centre instead of a label,
16 dp to the left of the title "Les alertes d'anomalies sont actives"
(15/22 SemiBold) and the text "Une opération inhabituelle vous sera
désormais signalée." (13/18 `text.secondary`); under them a C1
**secondary small** button "OK" (40 dp, 48 dp target). Grey, not orange:
an acknowledgement, not a main action.

Tap "OK" → the card fades out and the B4 strip (or nothing, if no alert
is open) takes its place. Shown on Home and in L1 until "OK" is tapped
on any device; the push N "Learning finished" points here.

## 5. States

| State | Rule |
|---|---|
| Loading | C18 card skeleton (title bar + two 56 dp grey circles) |
| Offline | cached counts stay; no banner of its own (C8 global) |
| Demo | bundled values (12/30, 18/30); "Démo" tag stays in the header (C14) |
| One target reached | its ring is full but stays **orange** (ok green only when both are reached) |
| Large font (200 %) | rings keep 56 dp (graphics); captions and text wrap; rings may stack if they no longer fit side by side |

## 6. Motion

| Event | Motion |
|---|---|
| First view | each arc sweeps from 0 to its value, 1100 ms, `enter` easing (Skia path trim), second ring starts 80 ms later (stagger rows) |
| Count changes | arc sweeps old → new, 550 ms (`chartPeriodMorph`) |
| Becomes finished | arc completes, colour cross-fades orange → green 320 ms, check fades in 320 ms; text cross-fades |
| "OK" | card opacity 1 → 0, 224 ms (exit), the list closes up 320 ms |
| Reduced motion | drawn at once; fades ≤ 150 ms |

## 7. Accessibility

One group: "Apprentissage de vos habitudes. Les alertes d'anomalies
s'activeront après 30 jours et 30 opérations. 12 jours sur 30, 18
opérations sur 30. Les alertes de fraude restent actives pendant ce
temps." The "?" is its own button ("Aide : apprentissage"). Finished:
"Les alertes d'anomalies sont actives", then "Bouton, OK". Rings vs
track ≥ 3:1 (C17); texts ≥ 4.5:1 (F1).

## 8. Performance

Two static Skia arcs after one sweep; no per-frame JS; flat card.

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Apprentissage de vos habitudes | Learning your habits |
| text | Les alertes d'anomalies s'activeront après {d} jours et {o} opérations. | Unusual-activity alerts start after {d} days and {o} operations. |
| days / ops | jours / opérations | days / operations |
| fraud | Les alertes de fraude restent actives pendant ce temps. | Fraud alerts stay on in the meantime. |
| done.title | Les alertes d'anomalies sont actives | Unusual-activity alerts are on |
| done.text | Une opération inhabituelle vous sera désormais signalée. | You will now be told about any unusual operation. |
| done.ok | OK | OK |

## 10. Open point (not verified)

The reassurance line assumes the fraud rules (R1-R6: SIM swap, new
device at night…) stay active during learning; the brief only says
anomaly alerts are inactive. To confirm with the backend session; if
false, drop the line.

## 11. Where used

Home (in place of the B4 strip, S2), top of L1 (S6), guided tour (T).
