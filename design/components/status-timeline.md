# C22 — Status timeline

**Validated by Franco on 2026-11-22** (colours by state; current step
with a slow pulsing halo, choice A). Tokens: [../tokens.json](../tokens.json)
(`component.timeline`). Previews:
[../previews/c22-status-timeline.png](../previews/c22-status-timeline.png),
animated [../previews/c22-status-timeline.html](../previews/c22-status-timeline.html).

## 1. Anatomy

- One card (C7 plain, padding 18/16/6); steps stacked vertically, 18 dp
  apart; 24 dp marker column, 14 dp gap, text, time on the right
  (13/22 `text.secondary`, tabular digits, "14:05").
- Connector: 2 dp line, `#2E2E2E` dark / `#DDDDDD` light, from under a
  marker to the next one (grey whatever the state: sober).
- Step text: title 15/22 Medium; optional detail 13/18 `text.secondary`.

## 2. States

| State | Marker | Title |
|---|---|---|
| Done | 24 dp circle `gain` (`#3DD68C` / `#0E7A43`) + `check` 14 dp (`#060606` dark / `#FFFFFF` light) | `text.primary` |
| Current | 12 dp dot `#FF7A2F` dark / `#E8661F` light + **halo**: a copy of the dot scales 1 → 2.4 and fades 0.5 → 0, cycle **2.8 s**, `enter` easing (same rhythm as the C18 wifi) | `text.primary` + detail ("En général moins de 10 min") |
| To come | 14 dp ring, 2 dp `border.control` | `text.secondary` |
| Final: confirmed | done marker | SemiBold in `gain`: "Opération confirmée" + one sentence |
| Final: blocked | 24 dp circle `loss` + `x` 14 dp | SemiBold in `loss`: "Opération bloquée par la banque" + "Votre banque va vous contacter." |

## 3. Live update (M12)

- A step that completes: marker cross-fades to done (320 ms, `enter`);
  its title may change tense ("vérifie" → "a vérifié") and gets its time.
- A new step (or the decision) appears with fade + 8 dp rise (`quick`,
  `enter`); the card grows without animating its height (content below
  moves at once).
- TalkBack: polite live region; reads the new step ("Opération
  confirmée, 14:09").
- Reduced motion: no halo (static orange dot); new steps fade in 150 ms.

## 4. Copy (L3, FR then EN)

"Alerte envoyée à [banque]" / "Alert sent to [bank]" · "La banque
vérifie l'opération" / "Your bank is checking the payment" · "Décision
de la banque" / "Bank's decision" · "Opération confirmée" / "Payment
confirmed" · "Opération bloquée par la banque" / "Payment blocked by
your bank". Bank names fictitious.

## 5. Performance

One looping halo (transform + opacity) at most per screen, paused
off-screen; updates arrive by push or polling and only add/replace rows.

## 6. Where used

L3 (B14 "Votre banque a été prévenue"), alert detail history, bank
dashboard (D) decision history (denser variant, same markers).
