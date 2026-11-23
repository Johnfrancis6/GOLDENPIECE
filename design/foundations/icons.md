# F4 — Iconography

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`icon`). Preview: [../previews/f4-icons.png](../previews/f4-icons.png).

## 1. Set

- **Lucide** (lucide.dev, ISC licence, free; package `lucide-react-native`
  in the app, `lucide-static` for previews). Checked version: 1.77.0.
- Outline only, round caps and joins. Lucide has **no filled variants**:
  the active state is shown by colour and label weight, never by fill.
- Change direction uses Lucide **`trending-up` / `trending-down`**
  (Franco, C5, 2026-11-22; replaces the ▲ ▼ triangles), 16 dp in change
  lines, 14 dp in change tags (the only size under 16).
- Score levels use Lucide `circle-check-big` / `rotate-cw-fading-clock` /
  `shield-check` (Franco, C15, 2026-11-22). "≈" (Poppins lacks it,
  formats.md §2) is Lucide `equal-approximately`. No hand-drawn glyphs
  remain.
- No real bank or operator logos (public repo, brief).

## 2. Sizes and strokes (dp)

| Size | Stroke (absolute) | Use |
|---|---|---|
| 24 | 2 | bottom bar, screen header actions, empty states |
| 20 | 1.75 | inside 40 dp avatars/tiles, inside buttons, section title icon |
| 16 | 1.75 | chips, inline with 13 sp text |

The stroke stays the same in dp whatever the size (`absoluteStrokeWidth`).
Touch target is always ≥ 48 dp around an icon button (24 icon + 12 padding).

## 3. Colour

| Context | Colour (F1) |
|---|---|
| default, header actions | `text.primary` |
| section title icon, secondary | `text.secondary` |
| active tab | `brand.text` (+ label SemiBold) |
| inactive tab | `text.secondary` |
| open-alert icon | `loss` + 8 dp dot |
| change icons, status shapes | `gain` / `warning` / `loss` (C5 §4: colour = good/bad for the user) |

## 4. Avatars and category tiles (40 dp circles)

- **Categories:** Lucide icon 20 dp in the category hue on a light tint
  of it (C21, Franco 2026-11-22; replaces the grey tiles).
- **A bank:** its initials (2 letters, SemiBold 13) in `#060606` on a fixed
  colour per bank, taken from the dark chart series (`colour.chart.dark.series`)
  in both themes; measured contrast of the initials ≥ 5.1:1. The colour is
  assigned once per bank (by bank id) and never changes.
- **Banks in general** (section title "Banques", bank picker, generic
  bank): Lucide `landmark`.
- **Mobile money account:** operator **monogram** like a bank (C21,
  Franco 2026-11-22); "Mobile money" in the subtitle.

## 5. Icon map (starting list)

| Meaning | Lucide name |
|---|---|
| Accueil / Comptes / Dépenses / Placements (bottom bar) | `house` / `wallet` / `chart-pie` / `chart-line` |
| Open alert (header, only when ≥ 1 alert is open) | `shield-alert` |
| Hide / show amounts | `eye` / `eye-off` |
| Search, settings, help "?" | `search`, `settings`, `circle-help` |
| Back, close, add, more, next | `arrow-left`, `x`, `plus`, `ellipsis`, `chevron-right` |
| Banks | `landmark` |
| Mobile money | `wallet`, `smartphone` |
| Courses, transport, restaurant, logement, factures, santé, éducation | `shopping-cart`, `bus`, `utensils`, `house`, `receipt-text`, `heart-pulse`, `graduation-cap` |
| Revenus, épargne, transferts | `banknote`, `piggy-bank`, `arrow-left-right` |

Build sessions extend the map with Lucide icons in the same style and
list additions in their report (formats.md §7 rule).

## 6. Navigation decision (D8)

- Bottom bar has **4 tabs**: Accueil · Comptes · Dépenses · Placements.
  There is **no Alertes tab**.
- When at least one alert is open, the `shield-alert` icon with a dot
  appears in the screen header (all four tabs), next to the hide-amounts
  action; with **one** open alert it opens that alert directly, with two
  or more the alert list (L1) (S6, Franco 2026-11-23). It also shows as the Home alert
  strip (B4) and as a push notification. No open alert → no icon.
- Past alerts: Settings → "Historique des alertes".

## 7. Clean screens (Finary)

- Header: title + **one** action (hide amounts); the open-alert icon is
  the only possible second one. Search lives in the list it filters.
- Section titles are plain text; only "Banques" carries its icon.
- No decorative icons in sentences, buttons carry an icon only when the
  label alone is ambiguous.

## 8. Behaviour on tap

| Event | Animation | Reduced motion |
|---|---|---|
| Press on an icon button (header, cards) | scale 1 → 0.92 on press, back on release, 220 ms (F5) | colour change only |
| Bottom-bar tab | **no animation** (Franco, C12, 2026-11-22): colour changes to `brand.text` at once | same |
| Open-alert icon appears | fade + scale 0.8 → 1, once | appears without motion |

Transform and opacity only (no blur, no colour animation on the GPU
path). Exact curves and durations are set in F5 Motion.

## 9. Accessibility

- Every icon button has a label ("Masquer les montants", "Alerte
  ouverte, 1"). Icons next to a text label are decorative.
- Meaning is never carried by an icon alone in content (arrows come with
  the sign, shapes with a word).
- Icons stay 24/20/16 dp at 200 % font; labels grow.

## 10. Performance

Icons are vector components tree-shaken from Lucide (only imported icons
ship). No icon font, no PNG.
