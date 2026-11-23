# S2 — Home (Accueil)

**Validated by Franco on 2026-11-23** (choices A, A, A: sections
Alertes → Budget → Marchés under the chart; light-theme glow = gold bloom
only, no ember wash; on scroll the large title leaves and a small
**centred** title appears in a solid header bar). First full screen of
the system. Preview:
[../previews/s2-home.png](../previews/s2-home.png) · source
[../previews/s2-home.html](../previews/s2-home.html).

Assembles validated items only: C12 (header, bottom bar), B1 + G1/G0
(net worth and chart), B4 / B5 (alerts strip or learning card), B6
(budget tiles), B9 (markets), C18 / C19 / C8 (states).

## 1. Layout at 360 × 800 dp (top → bottom)

| # | Part | Rule |
|---|---|---|
| 0 | Glow C "Halo haut" | behind the top 330 dp, scrolls with the content; dark = bloom + wash; **light = gold bloom only** (§3) |
| 1 | Header bar 56 dp | left: **profile circle 32 dp** (user initials, C21 monogram colours) → Settings (S7); right: `shield-alert` + dot (only when an alert is open, D8) and the eye (C20) |
| 2 | Large title "Accueil" | `titleScreen` 24/32, 20 margin |
| 3 | B1 | label "Patrimoine net" + "?", hero, period change, "Aujourd'hui" line |
| 4 | Period bar + G1 chart | C12 bar 16 under B1, chart 210 dp full width, previous/next + "Voir en tableau" (G0) |
| 5 | Alertes | 32 under the controls: B4 strip (one card + "Voir les N alertes"), or B5 during learning, or nothing |
| 6 | Budget | 32 under: B6 two tiles, or the "Créer un budget" card |
| 7 | Marchés | 32 under: B9 card + freshness line + "Voir tous les marchés" |
| 8 | Bottom space | 24 dp + bottom bar height so the last link clears the bar |
| — | Bottom bar | C12, fixed, Accueil active (`brand.text`) |

Order rule (choice A): security first, then everyday money, then
markets. A section with nothing to show is removed, never shown empty
(except Budget, which offers "Créer un budget").

The profile circle is new (brief §3.8 "Settings from the Accueil
header"): shown **on Home only**, 32 dp in a 48 dp target, label
"Réglages et profil". It does not count against the one-action rule
(C12): it is the screen's navigation, like a back button.

## 2. Scroll (choice A, applies to every main screen — C12 updated)

- The large title and the glow scroll with the content.
- When the large title has passed under the bar, a small title
  "Accueil" (15/22 SemiBold) fades in **centred** in the bar (`quick`
  320 ms), the bar takes the page background `bg` and a 1 dp hairline
  at its bottom; scrolling back reverses it.
- Actions stay in place. Pull-to-refresh (M5) from the top: C18-style
  bank + wifi indicator, no spinner (detailed with M5 in S3).
- Tapping the active Accueil tab scrolls back to the top (C12).

## 3. Glow C, light theme (choice A)

The light preview looked pink because the ember wash tints the light
background. Light theme now uses **the bloom only**, in gold:
radial `55% 45%` at `76% 0%`, colour `#FFC880` → `#FFB45C`, alpha
`0.40 × (1 − t)^1.8`, 15 stops (tokens `colour.glow.homeHeader.layers`,
`light` arrays; `wash.light` is empty). Dark is unchanged. **Not
verified on the phone:** banding and tint on the Tecno Spark 50.

## 4. States

| State | Screen |
|---|---|
| First load | C18: B1 skeleton, chart skeleton, two tile skeletons, three row skeletons; header and title stay |
| No account | C19 piggy bank under the title: "Ajoutez un compte pour voir votre patrimoine" + "Ajouter un compte"; no other section |
| Offline / error | cached content; C8 banner under the header bar |
| Stale > 7 days | C8 info banner "Données de plus de 7 jours" (B1) |
| Demo | "Démo" tag next to the label (B1) |
| Hidden amounts | B1, B6 and B4 rules; markets stay visible |
| Live alert | B4 card enters (B4 §6); header alert icon appears (C12) |
| 200 % font | every block follows its own rule; sections stay in order; no horizontal scroll |

## 5. Performance

One static gradient layer (glow), one G1 chart, ≤ 2 rings and 5
sparklines, all drawn once; the screen is a single scroll view (not a
list), height ≈ 1 600 dp at 100 % font. Entry: blocks fade in with the
C18 → content rule (no stagger beyond 6 items, F5).

## 6. Accessibility

Reading order = visual order. Headings: "Accueil", "Alertes", "Budget",
"Marchés" are marked as headings for TalkBack navigation. Profile circle:
"Réglages et profil, bouton".
