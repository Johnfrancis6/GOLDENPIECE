# C5 — Amount and change

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.amount`, `component.changeTag`). Preview:
[../previews/c5-amount.png](../previews/c5-amount.png).

## 1. Purpose

Shows every money amount and its change. Formats come from F6
([formats.md](../foundations/formats.md)), colours from F1, type from F2,
motion from F5 (M7).

## 2. Variants

| Variant | Number | Currency / cents | Change |
|---|---|---|---|
| **Hero** (Home net worth, account total) | `amountHero` 34/42 SemiBold, `text.primary` | "F CFA" or ",56 €" **smaller and grey**: 18/24 SemiBold, `text.secondary` | change **line** under it: icon 16 + amount + "·" + % + period word in `text.secondary` ("aujourd'hui", "ce mois") — label 13/18 Medium in `gain`/`loss` |
| **Tile** (Home tiles) | 18/26 SemiBold | suffix 13 `text.secondary` ("185 400 F CFA", "1 234,56 €") | change **tag** under it |
| **Row** (lists) | `amountRow` 15/22 SemiBold, right-aligned; short suffix "F" (F6) | same size | change tag under the amount, right-aligned |
| **Compact** (charts tooltips, widgets) | 13-15 SemiBold, may abbreviate (F6 §3) | same size | % only |

## 3. Change tag

Small tag, radius 4 (F3), padding 2 × 6, gap 4, label 12/16 SemiBold,
Lucide icon 14 dp (stroke 1.75).

| | Dark | Light |
|---|---|---|
| gain fill / text | `rgba(61,214,140,0.16)` / `#3DD68C` — 7.4:1 | `#DDF3E7` / **`#0B6B3A`** — 5.7:1 |
| loss fill / text | `rgba(255,107,122,0.16)` / `#FF6B7A` — 5.5:1 | `#FCE3E6` / **`#B21F33`** — 5.5:1 |
| zero | no tag fill, "0 %" in `text.secondary`, no icon | same |

Light tag texts are darker than F1 `gain`/`loss` so both themes read
equally crisp (Franco: "visible et net" in dark and light); contrasts
measured on the composited fill over `surface1`.

## 4. Direction and colour rule

- **Icon follows the sign:** Lucide `trending-up` when the number goes up
  ("+"), `trending-down` when it goes down ("−") (Franco replaced the
  ▲ ▼ triangles, 2026-11-22).
- **Colour tells whether it is good for the user:** a rise in net worth
  is `gain`; a rise in spending ("Dépenses du mois" +8,1 %) is `loss`
  with `trending-up`. Each block that shows a change states which
  direction is good.
- Balances (stocks) carry no icon.

## 5. Hidden amounts ("•••")

- Only the **eye** in the screen header hides/shows all amounts (Franco);
  tapping an amount does nothing. Hiding is remembered across app
  starts; **showing again asks for fingerprint or phone code**, and a
  reveal lasts until the app is closed (C20, Franco 2026-11-22).
- Digits become "•••", currency and suffix stay ("••• F CFA", "••• F").
  The amount part of a change line is hidden; **percentages stay
  visible** (they do not reveal amounts).
- Transition: `quick` cross-fade (F5 M7), no blur.
- TalkBack: "montant masqué".

## 6. Behaviour

- Count-up on the hero (F5 M7: first open of the day and value change,
  1100 ms, easeOutQuint); tabular digits keep the width stable.
- At large font the hero may switch to the abbreviated form (F2 §3,
  F6 §3); row amounts move under the title when they do not fit.

## 7. Accessibility

Read as words with the exact value and the direction: "Patrimoine net,
2 027 700 francs CFA, en hausse de 12 500 francs CFA, plus 2,4 pour cent
aujourd'hui". The icon is decorative. All texts ≥ 4.5:1 (table §3, F1).

## 8. Performance

Plain text + one vector icon; the tag is a flat fill. Count-up runs on
the UI thread.

## 9. Where used

Home hero and tiles, account and portfolio lists, transaction rows,
budgets, alert cards, charts tooltips, widgets, notifications.
