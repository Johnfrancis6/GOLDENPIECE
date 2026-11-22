# C9 — Bottom sheet

**Validated by Franco on 2026-11-22** (with one change: selected options
in orange text, also applied to the C12 period menu). Tokens:
[../tokens.json](../tokens.json) (`component.bottomSheet`). Previews:
[../previews/c9-bottom-sheet.png](../previews/c9-bottom-sheet.png),
animated [../previews/c9-bottom-sheet.html](../previews/c9-bottom-sheet.html)
(open, swipe to close, snap back, close button, reduced motion).

## 1. Purpose

A panel that rises from the bottom for short, focused content that keeps
the screen behind in context: explanations, filters, a choice, a custom
period. Style: Finary-clean (flat, no shadow, no nested cards).

## 2. Anatomy (top to bottom)

| Part | Rule |
|---|---|
| Handle | 32 × 4 dp, radius 2, `#737373` dark / `#858585` light, centred in a 20 dp zone |
| Header | 56 dp: title left (18/26 SemiBold, as C10), close button right (Lucide `x` 24 dp, 48 dp target, ghost icon button C1 with press feedback); padding 20 left, 8 right |
| Body | 20 dp side margins; content sits **directly on the sheet fill** (no card inside a sheet); scrolls inside the tall size |
| Footer (optional) | one large primary button C1 (52 dp, full width) pinned at the bottom, padding 16 / 20 / 16 + system inset; a 1 dp hairline appears above it only while content scrolls under it |
| Sheet | top radius 20; fill `#181818` dark (as C10) / `#FFFFFF` light; scrim `rgba(0,0,0,0.64)` dark / `rgba(0,0,0,0.45)` light |

## 3. Sizes (Franco: two fixed sizes)

| Size | Height | Use |
|---|---|---|
| Short | fits content, **max 60 %** of the screen | "?" texts (B12), custom period, small choices, confirmations with an action |
| Tall | **92 %** of the screen, body scrolls inside | filters (B17), A4 category change (B22), L4 / A3 "Pourquoi ?" (B15) |

No intermediate snap point and **no drag up to expand** a short sheet.
At 200 % font a short sheet that would pass 60 % becomes tall (scrolls).

## 4. Content inside a sheet

- Section title: 13/18 SemiBold `text.secondary`, 16 dp above, 4 below.
- Choice option: 48 dp row, 15/22 Regular `text.primary`.
  **Selected:** SemiBold **orange text** (`#FF9A5C` dark, 8.5:1 on the
  sheet; `#B4410F` light, 5.7:1) + `check` 20 dp in `brand.text` on the
  right (Franco). Same rule for the C12 period menu.
- Value rows (e.g. "Du 1 janv. 2026"): 64 dp, label 13/18
  `text.secondary` over value 15/22 SemiBold, icon right, hairline
  between rows.
- "?" text: ≤ 3 sentences; first sentence `text.primary`, the rest
  `text.secondary`; optional "En savoir plus" text button (C1).
- Single-choice sheets without a footer apply and close on tap; filter
  sheets apply with "Appliquer" (multiple changes at once).

## 5. Behaviour and motion (M3)

| Event | Motion |
|---|---|
| Open | sheet translates from below the screen to its height, **450 ms** (`sheet`), `enter` easing (soft ending); scrim fades in 320 ms |
| Drag down (handle or header; body too when scrolled to its top) | sheet follows the finger 1:1; scrim opacity follows (1 − distance / height); **no upward travel** |
| Release | closes if dragged > **30 %** of its height or flung faster than 1000 dp/s; otherwise returns in **320 ms**, `enter` easing, no bounce |
| Close (x, scrim tap, system back, swipe) | 315 ms (0.7 × open), `exit` easing; scrim fades out together |
| Reduced motion | no slide: sheet and scrim fade in/out in 150 ms; swipe still works (follows finger, no animated return: jumps back) |

Rules: **one sheet at a time**, never a sheet over a sheet (a step inside
a sheet replaces its content with a `quick` cross-fade). Swipe always has
the `x` button as alternative (D3). The screen behind does not move.

## 6. Accessibility

- Opening moves TalkBack focus to the title; the sheet is announced as a
  dialog; focus is trapped inside; closing returns focus to the trigger.
- The handle is decorative (not focusable); the `x` button is labelled
  "Fermer" / "Close".
- Targets ≥ 48 dp; texts ≥ 4.5:1 (selected orange measured above).
- At 200 % font the header title wraps on two lines (header grows); the
  footer button stays pinned.

## 7. Performance

Only `transform: translateY` on the sheet and `opacity` on the scrim, on
the UI thread (gesture handled natively, no JS per frame); no blur, no
shadow. The sheet content is rendered once before the open animation
starts; long lists inside a tall sheet are recycled.

## 8. Build instructions (micro-details)

Check at 100 % and 200 % font on 360 × 800 dp: short sheet height cap,
footer hairline appearance, gesture conflict between body scroll and
drag-to-close. Adjust gaps by 4 dp steps if needed and report in one line
(formats.md §7).

## 9. Where used

A4 category change, L4 and A3 "Pourquoi ?" (B15), every "?" text (B12),
filters (B17: A2, D4), custom period (C12 "Personnalisée", D1/D9),
instrument choice in P3, small confirmations in Settings.
