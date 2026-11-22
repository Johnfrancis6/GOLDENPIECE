# C12 — Navigation

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.navigation`). Preview:
[../previews/c12-navigation.png](../previews/c12-navigation.png).

## 1. Bottom bar

- **4 tabs** (D8): Accueil · Comptes · Dépenses · Placements; Lucide
  `house`, `wallet`, `chart-pie`, `chart-line`, 24 dp.
- **Labels always visible** (12/16 Medium; active SemiBold).
- Height 64 dp + system inset; page background; 1 dp hairline on top.
- Active tab: icon and label `brand.text`; inactive `text.secondary`.
- **No icon animation** on the bottom bar (Franco, 2026-11-22): no press
  scale, no pop; the colour changes at once. (Replaces icons.md §8 for
  tabs; header icon buttons keep the press feedback.)
- Tapping the active tab scrolls its screen to the top.

## 2. Screen header

| State | Look |
|---|---|
| Top of a tab screen | 56 dp bar with actions on the right (open-alert icon only when an alert is open, then the eye); **large title** under it, left, `titleScreen` 24/32 SemiBold, scrolls with the page |
| Scrolled | the large title has scrolled away; a **small title** (15/22 SemiBold, left) fades in in the bar (`quick`, F5); 1 dp hairline under the bar |
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
  in light; options as 48 dp rows (15/22; selected SemiBold +
  `check` 20 dp in `brand.text`). The chevron turns up.
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
