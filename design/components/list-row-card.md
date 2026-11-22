# C6 List row · C7 Card

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.listRow`, `component.card`). Preview:
[../previews/c6-c7-list-row-card.png](../previews/c6-c7-list-row-card.png).

Builds on F3 (layout), F4 (icons, avatars), C5 (amounts), C15 (risk badge).

## 1. C6 — List row

**Anatomy (left → right):** leading 40 dp (bank avatar with initials,
category tile, or none) · 12 gap · title (`body` 15/22) + subtitle
(`caption` 13/18 `text.secondary`) · value column right-aligned (C5 row
amount, then C5 change tag or C15 risk badge under it, gap 4) · trailing
(chevron or switch, settings only).

| Rule | Value |
|---|---|
| Height | 64 dp minimum (F3); grows with text (no truncation) |
| Padding | 16 sides, inside a list card |
| Separator | 1 dp hairline, inset to the text start (68 dp from the card edge with a leading item, 16 without) |
| Grouping | rows of one list sit in **one** card (F3 "a list is one card") |
| Chevron | **none** on content rows (accounts, transactions, holdings, alerts): the whole row is tappable (Franco). Chevron `chevron-right` 20 dp `text.secondary` **only in Settings** rows that open a sub-page |
| Risk badge | only when there is a risk (C15) |
| Swipe | none (D3) |

**States**

| State | Dark | Light | Motion |
|---|---|---|---|
| Pressed | fill `#1C1C1C` (from `surface1` `#111111`) | fill `#EDEDED` (from `#FFFFFF`) | 220 ms (`press`), `standard`; **no scale** on rows and cards (Franco) |
| Pending (PDNG) | C14 "En attente" tag in the subtitle; amount in `text.secondary` | same | — |
| Flagged (has alert) | C15 badge under the amount | same | — |
| Disabled | 40 % opacity, not focusable | same | — |

At 200 % font the amount moves under the title (F2 §3); FlashList uses
fixed heights up to 130 % scale, measured above.

## 2. C7 — Card

| Variant | Look | Use |
|---|---|---|
| Plain | `surface1`, radius 12, padding 16, no border, no shadow | content blocks without action |
| Tappable | same + pressed fill (as rows) | tiles, alert card, offer |
| Highlighted | same + **2 dp top edge** `glow.edge` (ember → orange → gold), clipped by the radius | one featured card per screen at most (bank-card visual, highlighted alert/offer) |
| List card | plain card holding C6 rows, padding 0 | every list |

Between cards: 12 (tiles) or 32 between sections (F3). The hero amount is
never in a card (D7).

## 3. Accessibility

Row = one focusable element; label reads title, subtitle, amount, badge
("Transfert mobile, hier, moins 45 000 francs, score à confirmer").
Settings rows announce "ouvre une page". Touch target = the whole row
(≥ 64 dp). Pressed fills are not information, contrast rules apply to
texts only (F1).

## 4. Performance

Flat fills and one hairline; no shadow, no blur. Lists use FlashList
with recycled rows; the pressed fill is an opacity/colour swap on one
view.

## 5. Where used

C6: B2 accounts, B3 transactions, B9, B10 holdings, B16 settings, alert
list. C7: Home tiles, alert cards, Placements blocks, every list.
