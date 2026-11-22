# F3 — Spacing, grid, radii, elevation

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`spacing`, `layout`, `radius`, `elevation`). Preview:
[../previews/f3-spacing-layout.png](../previews/f3-spacing-layout.png).

## 1. Principles (taken from Finary, Franco's reference for this item)

1. **The hero amount sits on the page background**, not in a card. The
   Home gold glow (F1 `glow.homeHeader`) is its decor.
2. **Fewer boxes:** blocks are separated by space, a **1 dp hairline** and
   section titles, not by a card each.
3. **A list is one card:** rows inside one `surface1` card, separated by
   a hairline inset to the text start (not to the icon).
4. **Moderate radii:** cards and fields 12; buttons, chips, period
   selector, search bar and tab bar are **pills**; value/change tags
   almost square (4).
5. **Airy screen, dense cards:** 20 side margins, 32 between sections,
   24 around the hero; rows 64 high inside cards.
6. **Flat:** no shadow anywhere; depth = F1 surfaces + hairlines + scrim.

## 2. Spacing scale (dp, base 4)

| Token | dp | Typical use |
|---|---|---|
| `s1` | 4 | icon ↔ label inside a chip, tag padding |
| `s2` | 8 | between chips, between buttons in a row, icon buttons in a header |
| `s3` | 12 | section title ↔ its card, between tiles, row icon ↔ text, hero amount ↔ change line |
| `s4` | 16 | padding inside cards and tiles, row side padding |
| `s5` | 20 | **screen side margin** |
| `s6` | 24 | above / below the hero, around a divider, top bar ↔ hero |
| `s8` | 32 | **between sections** |
| `s10` | 40 | before a bottom-pinned primary button |
| `s12` | 48 | minimum touch target; large empty-state gaps |
| `s16` | 64 | list-row height; bottom bar height |

Only these values. No 6, 10, 14, 18 …

## 3. Layout (phone, 360 × 800 dp reference)

| Element | Rule |
|---|---|
| Screen margins | 20 left and right → content width 320 dp at 360 dp |
| Top bar | 56 high, after the status bar; avatar / icon buttons 40 (touch area 48) |
| Hero block | 24 below the top bar; label (caption) → amount 4; amount → change line 12; 24 below |
| Divider | 1 dp `border.hairline`, inset to the screen margins, 24 above and below |
| Section | title row 32 high (title left, ghost pill action right) → 12 → content; 32 to the next section |
| Card | `surface1`, hairline, radius 12, padding 16 (lists: 0 vertical, rows carry their own height) |
| List row | 64 high (2 lines) / 56 (1 line); 16 side padding; leading icon/avatar 40; 12 icon ↔ text; amount right-aligned; separator inset 68 (= 16 + 40 + 12) |
| Tiles | 2 columns, gap 12 → (320 − 12) / 2 = 154 dp each; padding 16 |
| Grid | 4 columns × 68 dp, gutters 16 inside the 320 dp content (used for tiles, buttons side by side, keypad 3 columns with gap 8) |
| Bottom tab bar | 64 high + system gesture area; full width `surface1` + top hairline |
| Bottom-pinned button | 52 high pill, 20 side margins, 16 above the system area, 40 clear space above it in the content |
| Sheet | top radius 20, handle 32 × 4, padding 20 sides, 24 top |
| Wider phones | content keeps 20 margins and grows; max content width 480 dp (centred) on tablets / landscape |

At 200 % font (F2 §3): spacing tokens do **not** scale; rows grow in
height, never in margin.

## 4. Radii

| Token | dp | Use |
|---|---|---|
| `radius.xs` | 4 | change/value tags (+1,5 %), small status tags, skeleton text lines |
| `radius.sm` | 8 | keypad keys, checkboxes, small thumbnails, dashboard sidebar items |
| `radius.md` | 12 | cards, list cards, tiles, input fields, banners, toasts |
| `radius.cardVisual` | 14 | bank-card visual (ISO card proportion 1.586:1) |
| `radius.lg` | 20 | bottom-sheet top corners, dialogs, widgets |
| `radius.pill` | 999 | buttons, chips, period selector, search bar, tab-bar active pill, avatars and icon buttons (circles) |

## 5. Elevation (no shadow)

| Level | Surface (F1) | Separation | Used for |
|---|---|---|---|
| 0 Page | `bg` | — | hero, section titles, dividers |
| 1 Card | `surface1` | 1 dp `border.hairline` | list cards, tiles, tab bar, top bar when scrolled |
| 2 Inside a card | `surface2` | none | inputs, keypad keys, pressed row, nested blocks |
| 3 Overlay | `surface1` + `scrim` behind | top radius 20 (sheet) or radius 20 (dialog) | bottom sheets, dialogs, toasts (toast: `surface3`, radius 12, no scrim) |

Shadows (`elevation`, `shadow*`) are **not used** on Android: they cost
GPU on low-end phones and are invisible on near-black. The focus ring
(F1 `focus`, 2 dp, offset 2 dp) is the only outline added on top.

## 6. Touch targets

- Minimum **48 × 48 dp** for every tappable element (WCAG 2.5.8 is 24;
  Android guideline 48). A 40 dp icon button gets a 48 dp hit area
  (`hitSlop` 4).
- 8 dp minimum between two adjacent targets.
- Pills of 32 dp height (chips, ghost actions, period selector) get
  `hitSlop` to reach 48.

## 7. Consequence for F1 (validated with this item)

The net-worth amount no longer sits in a card, so `glow.edge` (2 dp
ember → gold line) is used on **highlighted cards** only (bank-card
visual, highlighted alert or offer card), not on the net-worth block.
[colour.md](colour.md) is updated accordingly.

## 8. Performance notes

- Flat surfaces + hairlines: no shadow or blur layers to composite.
- Fixed row heights (64 / 56) let FlashList skip measurement (up to
  130 % font scale, F2 §3).

## 9. Where it is used

Every screen layout (S1-S7), components and blocks. The bank dashboard
(web) uses the same scale with denser rules defined in item D.
