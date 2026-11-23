# C12 — Navigation

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.navigation`). Preview:
[../previews/c12-navigation.png](../previews/c12-navigation.png).

## 1. Bottom bar — v2 floating pill (Franco 2026-11-23, with S2 v2)

- **4 tabs** (D8): Accueil · Comptes · Dépenses · Placements; Lucide
  `house`, `wallet`, `chart-pie`, `chart-line`, 22 dp.
- **Labels always visible** (11/14 Medium; Franco chose labels over the
  icon-only pill of his reference).
- **Floating pill**: 16 dp from the sides and from the system inset,
  height 68, radius 34; fill `#1B1B1B` dark, `#0A0A0A` light (dark pill
  on the light theme, as the reference); no shadow (F3: no large
  shadows), a 150 dp `bg` fade under it on scrolling screens so content
  never shows under the labels.
- Active tab: icon in a 44 × 30 capsule `rgba(255,122,47,0.18)`, icon
  and label `#FF7A2F` (dark) / `#FF9A5C` (light pill, 9.45:1); inactive
  `#A3A3A3` (6.83:1 on `#1B1B1B`) / `#BDBDBD` (10.5:1 on `#0A0A0A`).
- **No icon animation** (Franco, 2026-11-22): the colour and capsule
  change at once.
- Tapping the active tab scrolls its screen to the top. Screens reserve
  68 + 16 + 24 dp of bottom padding so the last item clears the pill.
- v1 (flat 64 dp bar with hairline) is replaced on every tab screen.

## 2. Screen header

| State | Look |
|---|---|
| Top of a tab screen | 56 dp bar with actions on the right (open-alert icon only when an alert is open, then the eye); **large title** under it, left, `titleScreen` 24/32 SemiBold, scrolls with the page |
| Scrolled | the large title has scrolled away; a **small title** (15/22 SemiBold, **centred**, S2 2026-11-23) fades in in the bar (`quick`, F5); the bar takes the page background and a 1 dp hairline under it |
| Home only | a 32 dp **profile circle** (initials) on the left of the bar opens Settings (S2, 2026-11-23) |
| Sub-page | `arrow-left` back button (48 dp target) + small title + at most one action (`ellipsis` menu) |

Actions follow the Finary-clean rule (icons.md §7): one action, plus the
alert icon when needed. Android back gesture and button go back.

## 3. Section tabs (pills)

For sections inside a screen (Placements: Portefeuille · Marchés · Risque
· Performance, D5).

- Pills 40 dp, 15/22 Medium, padding 16, gap 8, radius pill.
- Selected: inverse fill (`#F5F5F5` + `#060606` text dark; `#0A0A0A` +
  `#FFFFFF` light), SemiBold. Others: `surface3` fill, `text.primary`.
- When they do not fit, the row scrolls horizontally inside the 20 dp
  margins; the last pill is cut at the edge to show it scrolls.
- Changing section: content cross-fades (`quick`); no slide.

## 4. Period selector — expandable bar "Période"

Franco replaced the period pills by **one expandable bar** (2026-11-22).

- **Closed:** a 40 dp pill, `surface3`: label "Période" (13 Regular,
  `text.secondary`) + current value ("Année", 13 SemiBold) +
  `chevron-down` 20 dp. Touch target ≥ 48 dp.
- **Open:** a menu card appears under it, over the content (does not
  push the layout): width 240, radius 12, `surface2` + 1 dp border
  (`rgba(255,255,255,0.10)`) in dark, white + `rgba(0,0,0,0.14)` border
  in light; options as 48 dp rows (15/22; selected SemiBold in
  `selectedText` — `#FF9A5C` dark, `#B4410F` light, changed with C9 on
  2026-11-22 — + `check` 20 dp in `brand.text`). The chevron turns up.
- Options: Mois (`1M`), Année (`YTD`), Depuis le début (`ITD`),
  Personnalisée → opens the custom-range bottom sheet (C9) (D1).
- Closes on choice, on tap outside, or with back. The chart then morphs
  to the new period (F5 `chartPeriodMorph`).
- Motion: menu fades in and rises 8 dp (`quick`, `enter`); chevron turns
  180° (`quick`). Reduced motion: appears at once.
- Accessibility: announced as "Période, Année, menu déroulant"; options
  are a radio list.

## 5. Performance

Static bars; only opacity/transform animate (small-title fade, menu
fade/rise, chevron rotation).

## 6. Where used

Bottom bar and header on every main screen; section pills in
Placements; the period bar on every chart with periods (Home, Placements
performance, Spending, account detail).
