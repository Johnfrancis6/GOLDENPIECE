# F5 — Motion

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`motion`; gradients in `colour.glow`, `colour.bankCard`). Previews:
[../previews/f5-motion.png](../previews/f5-motion.png) and the animated
demo [../previews/f5-motion.html](../previews/f5-motion.html) (open it in
a browser; it uses `../fonts/`).

## 1. Character (Franco's choices)

- **Sober**, Finary-like: no springs, no bounces (the tab pop was removed
  in C12).
- **Not too fast:** a first version at 150-600 ms was judged too fast;
  durations were raised about 1.5×.
- **Soft endings:** everything that lands decelerates over a long tail
  (`enter` easing); nothing stops abruptly.
- **Smooth gradients** (variant C "Halo haut", see §6).

## 2. Easings (cubic-bezier)

| Token | Curve | Use |
|---|---|---|
| `standard` | 0.33, 0, 0.15, 1 | element moving from A to B on screen, press scale |
| `enter` | 0.22, 1, 0.36, 1 | anything appearing or landing (fade-in, rows, bars, line draw, menus) |
| `exit` | 0.4, 0, 1, 1 | anything leaving; exits last 0.7 × the enter duration |
| `morph` | 0.65, 0, 0.35, 1 | chart period change, gold sheen travel |
| `countUp` | easeOutQuint, 1 − (1 − x)^5 | amount count-up |

## 3. Durations (ms)

| Token | ms | Use |
|---|---|---|
| `press` | 220 | icon/button press scale 1 → 0.92 → 1 |
| `quick` | 320 | fades, toast in, skeleton → content, small state changes |
| ~~`tabActivate`~~ | — | removed in C12 (Franco): bottom-bar tabs do not animate |
| `screen` | 450 | screen enter (fade + 24 dp slide) — M1 |
| `sheet` | 450 | bottom-sheet open — M3 |
| `countUp` | 1100 | Home net worth: first open of the day and when the value changes — M7 |
| `chartLine` | 1100 | line drawn from left to right — M8 |
| `chartBars` | 700 | each bar grows from its base, 70 ms stagger — M8 |
| `chartPeriodMorph` | 550 | line reshapes to the new period — M8 |
| `ringEntry` | 1100 | C17 rings: path trim with a very light overshoot (backOut s 0.9, ≈ +3 %), full rings pulse 1.04; stagger 80 — M8 (Franco 2026-11-23) |
| `sankeyEntry` | 600 + 900 | G5: hub draws top → bottom 600, then bands grow out of the hub and saturate 900 with a soft end (0.16, 1, 0.3, 1), stagger 50 — M8 (Franco 2026-11-23) |
| `sheen` | 1400 | gold sheen pass — M13 |
| `appOpening` | 4300 | cold-start opening "Le plan", splash → Home — M14 (Franco 2026-11-23); timeline in §4b |

Stagger: list rows 80 ms, bars 70 ms, at most 6 staggered items (the rest
appear with the 6th). Enter distance: 8 dp up for content, 24 dp for screens.
Nothing lasts more than 5 s (brief).

## 4. Items defined here

| Item | Behaviour |
|---|---|
| M2 Press feedback | icon buttons: scale 0.92 on press, back on release (`press`, `standard`); buttons 0.97 (C1); rows and cards change fill only (C6). **Bottom-bar tabs: no animation** (C12). No haptics (C1). |
| M7 Changing amount | count-up to the new value (`countUp`), tabular digits so the width never jumps; change line and rows fade + 8 dp rise, 80 ms stagger. Otherwise (not first open, unchanged) a `quick` fade. |
| M8 Charts (base) | line draw `chartLine`; bars grow with stagger; period change morphs the line (`chartPeriodMorph`) and keeps the axes still. Details (scrub cursor, tooltips) with G0. Target ≥ 45 fps on the reference phone. |
| M13 Gold sheen | one soft gold band (`colour.glow.goldSheen`) crosses the bank card **once** when the card first becomes ≥ 50 % visible, and again on each tap; band fades in over the first 18 % and out after 70 %; travel −30 % → 130 % of the card width; no loop. |
| M14 App opening | **"Le plan"** (validated 2026-11-23): a dot draws the ring and a second the sparkle over dashed guides, the 8 coins drop onto the ring and the sparkle turns gold (the app icon mark, icons.md §11), GOLDENPIECE rises with a light bounce, 300 ms hold, the mark becomes the Home card, Home builds around it; 4.3 s, cold start only. See §4b. |

Other motion items (M1, M3-M6, M9-M12) use these tokens and are detailed
with their component or block.

## 4b. M14 App opening — "Le plan" (validated 2026-11-23)

Direction built from Franco's reference (Dribbble, Deel AI fintech explainer:
a dot draws the logo as construction lines, the outline fills with one
coloured accent piece, a blank card fills, the screen builds around it).
Source: [previews/m14-app-opening-plan.html](../previews/m14-app-opening-plan.html)
(Web Animations API, "Rejouer" / "Ralenti ×3", dark with an open alert +
light without). Mark updated to the app icon (direction A) on 2026-11-23 at Franco's request. Key frames: [previews/m14-app-opening-keyframes.png](../previews/m14-app-opening-keyframes.png).
Token: `motion.appOpening`.

| ms | Step | Easing | Skia note |
|---|---|---|---|
| 0-300 | dot 1 (8 dp, `#FF7A2F`) pops at the top of the ring, scale 0 → 1 | back (0.34, 1.45, 0.64, 1) | circle, scale |
| 150-650, fade 1150-1550 | 5 dashed guides (bounding box of the mark + horizontal axis) draw, 60 ms stagger, then fade | standard / exit | dashed `PathEffect`, scale X/Y from the centre |
| 300-1000 | dot 1 rides the stroke tip and draws the ring through the coin centres (R 42 on a 144 mark) | morph | path trim end; dot position from `PathMeasure.getPosTan` at the same length |
| 480-1350 / 560-1160 | dot 2 pops (480), draws the sparkle outline (half-side 20) 560-1160, both dots fade 1150-1350 | morph | same as above |
| 1150-1600 | the filled mark cross-fades in over the outline (scale 0.94 → 1): the **8 coins drop onto the ring** clockwise from the top (scale 0.4 → 1, back easing, 35 ms stagger, 400 ms; white 62 % dark / `#0A0A0A` 42 % light) and the **sparkle turns gold** (dark `#FFE3A3 → #FF9A45`, light `#FFB45C → #E8452A`); outline fades 1200-1500 | back / enter / exit | **one opacity cross-fade** + per-coin scale, no path morph |
| 1150-1750 | wordmark GOLDENPIECE (SemiBold 20/28, tracking 3, `brand.text`) letters rise with a **light bounce**: translateY 12 → −2.5 dp (60 %) → +0.5 dp (82 %) → 0, opacity 0 → 1 by 60 %; 24 ms stagger, 360 ms each | enter, then standard | per-glyph transform (or 11 text nodes) |
| 1750-2050 | **hold**: mark + wordmark still (Franco: the brand reads before Home) | — | — |
| 2050-2400 | wordmark leaves (opacity → 0, +8 dp) 2050-2350; mark leaves (scale 0.7, opacity → 0) 2100-2400 | exit | |
| 2400-3200 | blank card (`surface.2`, radius 24) grows at the screen centre, scale 0.4 → 1 by 2850, fades out by 3200 | enter / standard | |
| 2800 → | real Home v2 card (gradient) appears at the centre under the blank one; content rises 8 dp, 70 ms stagger from 2900; amount count-up 2950-4050 (`countUp`) | standard / countUp | |
| 3250-3900 | card moves up to its Home place (−212 dp, −12 dp) | morph | translate only |
| 3350-4300 | Home builds: status bar 3350, header 3450 (−8 dp), banner 3500 (+16 dp), peek card 3550 (+40 dp X), dots 3600, 4 action circles 3550 (scale 0.6 → 1, back, 70 ms stagger), tiles 3550, list head 3650, list 3700 (+24 dp), pill bar 3750 (+24 dp), each 450-550 ms | enter / back | |

Rules:
- **Native splash handoff.** Android 12+ `SplashScreen` shows the **brand
  mark** (icons.md §11) on `bg` (adaptive icon foreground, no wordmark), kept until the
  first frame is ready. On **cold start** the native splash exits with a
  150 ms fade to `bg` and the animation starts from the dot (the filled mark
  comes back at 1150 ms, so the brand is consistent). **Warm / hot start**
  (process alive, < 30 min) skips M14: straight to Home with a 320 ms
  (`quick`) fade. After unlock (biometric/PIN, B16), M14 is not replayed.
- **Data.** Home data loads during the animation; the card shows the cached
  net worth. If data is late at 2800 ms, the card shows the C8 skeleton and
  the count-up starts when the value arrives; the animation never waits.
- **Skip.** A tap anywhere after 600 ms jumps to the Home end state with a
  `quick` fade. Never more than once a cold start.
- **Reduced motion.** No dot, guides or bounce: 150 ms fade from the splash
  mark to Home.
- **Only transform, opacity and path trim** (no blur, no shadow, no layout
  animation); ≤ 2 paths trimmed at once; target ≥ 55 fps on the reference
  phone, to measure in the first build (fallback: drop the guides).
- Total 4.3 s (≤ 5 s rule). Copy: none besides the wordmark (a brand name,
  not translated).

## 5. Reduced motion (Android "remove animations")

- No transform animations: no scale, slide, pop, count-up, line draw,
  bar growth or sheen. Values appear at once.
- Opacity fades kept, at most 150 ms.
- The gold sheen is replaced by the static edge glow (`glow.edge`).
- M14 app opening: 150 ms fade from the splash mark to Home.

## 6. Gradients refined with F5 (changes F1, agreed by Franco)

| Token | Before (F1) | Now |
|---|---|---|
| `glow.homeHeader` | one radial, 4 stops, looked muddy/brown | variant **C "Halo haut"**: a gold→orange→ember **bloom** at the top right (radial, centre 76 % / 0 %, 15 eased stops, alpha 0.60 dark) over a **vertical ember wash** fading to the background (13 eased stops, alpha 0.20 dark); height 330 dp |
| `glow.goldSheen` | 45 % band, 5 stops, blend "screen" (hard band edges) | gaussian band, 25 stops, normal blend, layer 1.8 × card width |
| `colour.bankCard` | — | linear 160°: `#1C1915` → `#141312` → `#111111` (barely warm black), hairline border |

Many eased stops reduce visible colour banding on 8-bit LCD screens; to
check on the Tecno Spark 50 [assumed LCD]. Light theme (S2, 2026-11-23): **gold bloom only**, no ember wash
(the wash looked pink), alpha 0.40; banding still to check on the phone.

## 7. Performance

- Only `transform` and `opacity` are animated, on the UI thread; no blur,
  no shadow, no layout animation.
- Gradients are static Skia shaders drawn once; the sheen is one
  pre-drawn layer moved with `translateX`, clipped by the card.
- Count-up updates text on the UI thread at most once per frame.
- To measure in the first build: Home glow + count-up, sheen, chart
  draw at ≥ 45 fps on the reference phone.

## 8. Where used

Every screen (press, M1 screens, M3 sheets), Home (M7, glow), bank cards
(M13: O13d, S3, tour), all charts (M8), guided tour (M11 uses `quick`
fades and `enter` easing).
