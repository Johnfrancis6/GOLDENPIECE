# B4 — Alert card

**Validated by Franco on 2026-11-22** (choices A, A, A: Home strip = one
card for the top alert + "Voir les N alertes" link; > 70 highlighted with
the gold top edge, 40-70 plain; the whole card is tappable, no Oui/Non
buttons on the card). Tokens: [../tokens.json](../tokens.json)
(`block.alertCard`). Preview:
[../previews/b4-alert-card.png](../previews/b4-alert-card.png) ·
source [../previews/b4-alert-card.html](../previews/b4-alert-card.html).

Builds on C7 (card), C15 (score badge), C14 (tags), C21 (operator
monogram), C5 (row amount), C1 (text button), C6 (compact variant).

## 1. Purpose

Tell the person, calmly and in plain words, that an operation needs
their attention, and take them to the right screen in one tap: L2
"C'est bien vous ?" (40-70), L3 "Votre banque a été prévenue" (> 70), or
the budget / allocation screen. Tone: factual, never accusing (brief §3.7).

## 2. Data

| Where | Fields |
|---|---|
| Home strip | `alerts.open_count`, `alerts.top{kind, band, reason}` (no amount, no time) |
| L1 list | `{kind, band, score, status, reasons[], tx{amount, cp_name, booking_ts}, created_at}` |
| Dashboard queue (D) | same as L1, compact variant |

`kind`: anomalie, fraude, budget, concentration. The reason shown is the
first of `reasons[]`, phrased from the reason codes (X, FR/EN with
parameters), ≤ 70 characters in French.

## 3. Anatomy — full card (Home strip, L1 open alerts)

C7 card (`surface1`, radius 12, padding 16, no shadow). Top to bottom:

| Line | Content | Style |
|---|---|---|
| Head | left: C15 score badge (anomalie, fraude) **or** C14 neutral tag for budget (`wallet`, "Budget") / concentration (`chart-pie`, "Concentration"); right: relative time "il y a 2 min" (L1 only, F6) | badge 12/16 SemiBold; time `caption` 13/18 `text.secondary` |
| Reason | one sentence, e.g. "Montant 6 fois plus élevé que d'habitude pour ce bénéficiaire" | `bodyStrong` 15/22 Medium `text.primary`, 8 under the head, wraps, never truncated |
| Operation (L1 only, when `tx` exists) | C21 small monogram 24 · "Kola Money · retrait, 03:10" · C5 row amount right ("−450 000 F") | `caption` `text.secondary`; amount `amountRow` 15/22 SemiBold tabular; 12 under the reason, gap 8 |
| Action line | what the tap does, in `brand.text`: "C'est bien vous ? Répondez" (40-70, open), "Suivre l'analyse" (> 70), "Voir le budget", "Voir la répartition" | `label` 13/18 SemiBold, 12 under the line above |

The action line is **not** a separate button: the whole card is one
target (C7 tappable, pressed fill, no scale). Oui / Non live only in L2,
after the sensitive-action unlock (Franco, choice A).

**Emphasis (choice A):** band > 70 ("Banque prévenue") uses the C7
**highlighted** variant (2 dp `glow.edge` top line). 40-70 and
budget/concentration cards are plain. One highlighted card per screen at
most (C7): in L1 only the newest > 70 open alert is highlighted, the
others are plain.

## 4. Home strip (choice A)

Section title "Alertes" (`titleSection` 18/26, 12 above the card), then
**one** full card for `alerts.top` (the most severe open alert, then the
newest), then a C1 text button "Voir les N alertes" / "See all N alerts"
(13/18 SemiBold `brand.text`, 48 dp target, left-aligned with the card
text edge) — shown only when `open_count` ≥ 2; with one alert the card
alone is enough. Tapping the card opens that alert (L2 / L3); the link
opens L1.

| Condition | Strip |
|---|---|
| `open_count` = 0 | not shown (no empty card on Home) |
| Learning phase (`learning`) | replaced by B5 Learning card |
| Hidden amounts | Home card has no amount; L1 shows "••• F" in the operation line (C5) |
| Offline | card from cache stays; answers given offline show C14 "En attente" in the head |

## 5. Compact variant (resolved alerts in L1 "Toutes", dashboard queue)

A C6 row inside a list card: title = short reason ("Nouveau
bénéficiaire"), subtitle = outcome · date ("C'était vous · 18 nov.",
"Légitime · 12 nov.", "Fraude confirmée · 3 nov."), value column = C5
row amount with the C15 badge under it (every band shown, Normal
included, C15 rule for L1 and dashboard). No action line, no highlight.
Long titles wrap (C6, no truncation).

## 6. Behaviour and motion

| Event | Motion |
|---|---|
| New alert arrives live (M6) | card enters with opacity 0 → 1 and translateY 8 → 0 dp, 320 ms (`quick`), `enter` easing; cards below move down with the same timing; at most one header alert-icon pop (C12) |
| Alert answered here or on another device | badge cross-fades to its new band/status (C15), then the card leaves L1 open list with opacity 1 → 0 (224 ms, exit) and the list closes up (320 ms) |
| Home `alerts.top` changes | cross-fade of the card content, 320 ms |
| Press | C7 pressed fill, 220 ms, no scale |
| Reduced motion | fades only, ≤ 150 ms, no translation |

transform/opacity only; no blur, no shadow.

## 7. Accessibility

One focusable element per card, read in order: "Alerte, à confirmer.
Montant 6 fois plus élevé que d'habitude pour ce bénéficiaire. Savane
Pay, moins 180 000 francs, il y a 1 heure. Bouton, c'est bien vous ?
Répondez." The link "Voir les 3 alertes" is its own target (48 dp). Live
arrivals are announced politely ("Nouvelle alerte : à confirmer"), never
assertively. Colour never alone: badge icon + word (C15). Texts ≥ 4.5:1
(C15, F1 tables); at 200 % font the amount moves under the operation
text (F2 §3).

## 8. Performance

Static flat card, one gradient line only on > 70. L1 is a FlashList with
two item types (full, compact) so recycling stays cheap; entry animation
on one view per new item only, never on the initial list render.

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| section | Alertes | Alerts |
| link | Voir les {n} alertes | See all {n} alerts |
| action.confirm | C'est bien vous ? Répondez | Was this you? Answer |
| action.notified | Suivre l'analyse | Follow the review |
| action.budget | Voir le budget | See the budget |
| action.concentration | Voir la répartition | See the allocation |
| outcome.you | C'était vous | It was you |
| outcome.legit | Légitime | Legitimate |
| outcome.fraud | Fraude confirmée | Fraud confirmed |

## 10. Where used

Home alerts strip (S2), L1 alerts list (S6), bank dashboard queue (D,
compact), guided tour alert example (T). Build sessions check spacing at
100 % / 200 % font and report adjustments in one line (formats.md §7).
