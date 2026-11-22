# F1 — Colour

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`colour.*`). Preview: [../previews/f1-colour.png](../previews/f1-colour.png).

## 1. Purpose and character

A **near-black, neutral** interface where colour is rare and therefore
meaningful: an **ember → gold glow** carries the brand (GOLDENPIECE), the
**orange** fill marks the one primary action of a screen, and green /
pink-red / yellow carry gain, loss and warning. References given by
Franco: a dark digital-wallet app with an orange balance card (palette),
then a darker wallet app with a warm top glow and neutral greys (level of
darkness, refined brand colour).

Theme: **follows the phone setting** by default, manual choice in
Settings (system / dark / light). Every screen is designed **dark first**,
then checked in light.

## 2. Neutral tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#060606` | `#F4F4F4` | screen background |
| `surface1` | `#111111` | `#FFFFFF` | sections, cards, bottom bar, sheets |
| `surface2` | `#181818` | `#F0F0F0` | rows inside a section, keypad keys, inputs |
| `surface3` | `#222222` | `#E5E5E5` | secondary buttons, chips, avatar circles |
| `border.hairline` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.07)` | 1 dp outline of every `surface1` block (see §8) |
| `border.control` | `#737373` | `#858585` | boundary of inputs, switches, checkboxes (≥ 3:1) |
| `text.primary` | `#F5F5F5` | `#0A0A0A` | titles, amounts, body |
| `text.secondary` | `#A3A3A3` | `#5C5C5C` | subtitles, dates, labels, axis text |
| `text.disabled` | `#6E6E6E` | `#A3A3A3` | disabled controls only (exempt from contrast) |
| `inverse.fill` / `onFill` | `#F5F5F5` / `#060606` | `#0A0A0A` / `#FFFFFF` | active tab pill, selected chip |
| `scrim` | `rgba(0,0,0,0.64)` | `rgba(0,0,0,0.45)` | behind sheets and dialogs |
| `skeleton.base` / `highlight` | `#181818` / `#222222` | `#F0F0F0` / `#E5E5E5` | loading placeholders |

Greys are **neutral** (R = G = B): no warm or cool tint.

## 3. Brand

| Token | Dark | Light | Use |
|---|---|---|---|
| `brand.fill` | `#FF7A2F` | `#FF7A2F` | **primary button** (one per screen), FAB, key highlight |
| `brand.fillPressed` | `#E8661F` | `#E8661F` | pressed primary button |
| `brand.onFill` | `#060606` | `#060606` | text and icon on the orange fill |
| `brand.text` | `#FF7A2F` | `#B4410F` | links, "Démo" tag, selected icon, brand line in charts |
| `focus` | `#FF7A2F` | `#B4410F` | 2 dp focus ring |
| `tint.brand` | `rgba(255,122,47,0.13)` | `#FFE9DC` | background of brand tags |

**Primary button = orange fill + black text** (Franco's choice B). White
text on this orange is **forbidden** (2.6:1).

### Glow (brand light effects)

| Token | Definition | Where |
|---|---|---|
| `glow.homeHeader` | **updated in F5 (variant C "Halo haut")**: gold → orange → ember radial bloom at the top right over a vertical ember wash, many eased stops; values in tokens, see [motion.md](motion.md) §6; height 330 dp | top of **Home only**, behind header and net-worth card |
| `glow.edge` | linear 90°, ember → orange → gold, 2 dp high | top edge of **highlighted cards** only (bank-card visual, highlighted alert/offer card); not on the net-worth block, which sits on the page (F3 §7, 2026-11-22) |
| `glow.goldSheen` | **updated in F5**: linear 110° gaussian band of gold `#FFC478` with a light-gold core, 25 stops, normal blend; layer 1.8 × card width | bank cards (M13, see §6) |

Rules: glows are **decorative**: never under text that needs them for
contrast; text on top of a glow must pass against the darkest and the
lightest point of the glow. Glows are **static** gradients (no blur, no
animation except M13), drawn once.

## 4. Status and money colours

| Token | Dark | Light | Meaning | Always paired with |
|---|---|---|---|---|
| `gain` | `#3DD68C` | `#0E7A43` | gain, income, success, score < 40 ("Normal") | "+" sign and ▲, or ● + word |
| `loss` | `#FF6B7A` | `#C8283C` | loss, spending sign, error, score > 70 ("Banque prévenue") | "−" sign and ▼, or ◆ + word |
| `warning` | `#F2C94C` | `#8A6200` | warning, stale data, score 40-70 ("À confirmer") | ▲ + word |
| `info` | `#6AA8FF` | `#1F5FBF` | neutral information | ⓘ |
| `tint.*` | 13 % of the colour over the surface | `#DDF3E7`, `#FCE3E6`, `#FBF0CC`, `#E3EDFB` | chip and banner backgrounds | text in the full colour |

Choices:
- **Loss is pink-red**, not orange-red, so it is never confused with the brand.
- **Warning is a pure yellow**, far enough from the gold of the glow.
- **Colour is never alone** (WCAG 1.4.1): amounts carry sign + arrow;
  score badges carry a shape (● ▲ ◆) and a word.
- Spending rows show "−35 500 F" in `loss` only when the screen is about
  gains and losses (Home, account detail); category lists show spending
  in `text.primary` (spending is not an error).

## 5. Chart colours

| Token | Dark | Light |
|---|---|---|
| series 1 orange | `#D95926` | `#EB6834` |
| series 2 violet | `#9085E9` | `#6250D6` |
| series 3 aqua | `#199E70` | `#1BAF7A` |
| series 4 blue | `#3987E5` | `#2A78D6` |
| series 5 yellow | `#C98500` | `#EDA100` |
| series 6 magenta | `#D55181` | `#E87BA4` |
| "Autres" | `#6E6E6E` | `#8F8F8F` |
| grid / axis | `#1F1F1F` / `#3A3A3A` | `#ECECEC` / `#C7C7C7` |
| positive / negative (G7, drawdown) | `gain` / `loss` | `gain` / `loss` |

Rules:
- **Fixed order**, assigned to the entity (an asset class keeps its colour
  when a filter changes the list), never cycled. **Max 6 series**; beyond,
  fold into "Autres" (grey, always last, so in a donut it sits between
  series 6 and series 1).
- Validated with the data-viz palette validator (2026-11-22): worst
  adjacent colour-blind distance ΔE 13.2 dark (surface `#111111`) and
  16.3 light (surface `#FFFFFF`), target ≥ 8; normal-vision ≥ 19.3; all
  dark series ≥ 3:1 on the surface.
- Light mode: aqua, yellow and magenta are below 3:1 on white → the
  legend with names (B11) is **always visible** and "Voir en tableau"
  exists (already required).
- Single-series line charts (net worth, asset price) use `brand.text`;
  drawdown uses `loss`.
- Patterns for the forced-colours / colour-blind case: defined with G0.

## 6. Gold sheen on bank cards (M13, Franco 2026-11-22)

A band of gold light (`glow.goldSheen`) sweeps **once** across a bank-card
visual, like light on metal. Colour is fixed here; timing, trigger and
reduced-motion variant are fixed in F5 Motion. Constraints already known:
transform (translateX) of one static gradient layer clipped to the card,
no blur, no loop, 1.4 s (raised from ≤ 1 s by Franco in F5); with reduced motion → no sweep (static edge
glow only). Where: O13d (card confirmed), bank cards wherever shown (S3),
guided tour.

## 7. Accessibility: measured contrast (WCAG 2.2 AA)

| Pair | Dark | Light | Need |
|---|---|---|---|
| `text.primary` on `bg` / `surface1` | 18.6 / 17.3 | 18.0 / 19.8 | 4.5 |
| `text.secondary` on `bg` · `surface1` · `surface2` · `surface3` | 8.0 · 7.5 · 7.0 · 6.3 | 6.1 · 6.7 · 5.9 · 5.3 | 4.5 |
| `brand.onFill` on `brand.fill` (normal / pressed) | 7.8 / 6.1 | 7.8 / 6.1 | 4.5 |
| `brand.text` on `surface1` / `surface2` | 7.3 / 6.8 | 5.7 / 5.0 | 4.5 |
| `brand.text` on `tint.brand` | 6.7 | 4.8 | 4.5 |
| `gain` on `surface2` | 9.5 | 4.7 | 4.5 |
| `loss` on `surface2` | 6.5 | 4.8 | 4.5 |
| `warning` on `surface2` | 11.2 | 4.8 | 4.5 |
| `info` on `surface1` / `surface2` | 7.8 / 7.3 | 6.1 / 5.4 | 4.5 |
| status text on its `tint` (gain · loss · warning · info) | 8.1 · 6.0 · 9.3 · 6.4 | 4.7 · 4.5 · 4.8 · 5.2 | 4.5 |
| `border.control` on `surface1` / `surface2` | 4.0 / 3.7 | 3.7 / 3.2 | 3.0 |
| chart series on chart surface | ≥ 3.0 | 3 slots < 3 (legend + table) | 3.0 |

Forbidden pairs: white on `brand.fill` (2.6), `brand.fill` as text on
light surfaces (2.4–2.6: use `brand.text`), white on `glow.stops.ember`
for small text (3.6).

Contrast is re-checked by a script on `tokens.json` before each build
(TECH_ANALYSIS §5).

## 8. Performance notes (Tecno Spark 50)

- The reference phone is assumed to have an **LCD** screen [assumed: Tecno Spark 50 specs still to be read on the phone, SETUP.md]: blacks are not true black and
  `#060606` / `#111111` / `#181818` differ by ~1.07:1. Blocks are
  therefore separated by the **1 dp hairline** and by spacing, not by
  shade alone. No shadows.
- The Home glow is one static gradient (Skia `RadialGradient` or
  `expo-linear-gradient`) limited to the top 330 dp of one screen; other
  screens are flat. No blur, no full-screen gradient (brief §2.3).
- The gold sheen animates `transform` only (one layer, clipped).
- Dark-first does not save battery on LCD (it would on OLED); it is a style choice either way.

## 9. Where it is used

Every component, block, chart, widget and notification icon reads these
tokens. No hex value may appear in app code outside the token files.
