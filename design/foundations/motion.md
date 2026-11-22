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
| `sheen` | 1400 | gold sheen pass — M13 |

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

Other motion items (M1, M3-M6, M9-M12) use these tokens and are detailed
with their component or block. **M14 App opening** (Franco, 2026-11-22) is
left for the end of the design system; the native splash O1 stays as is
until then.

## 5. Reduced motion (Android "remove animations")

- No transform animations: no scale, slide, pop, count-up, line draw,
  bar growth or sheen. Values appear at once.
- Opacity fades kept, at most 150 ms.
- The gold sheen is replaced by the static edge glow (`glow.edge`).

## 6. Gradients refined with F5 (changes F1, agreed by Franco)

| Token | Before (F1) | Now |
|---|---|---|
| `glow.homeHeader` | one radial, 4 stops, looked muddy/brown | variant **C "Halo haut"**: a gold→orange→ember **bloom** at the top right (radial, centre 76 % / 0 %, 15 eased stops, alpha 0.60 dark) over a **vertical ember wash** fading to the background (13 eased stops, alpha 0.20 dark); height 330 dp |
| `glow.goldSheen` | 45 % band, 5 stops, blend "screen" (hard band edges) | gaussian band, 25 stops, normal blend, layer 1.8 × card width |
| `colour.bankCard` | — | linear 160°: `#1C1915` → `#141312` → `#111111` (barely warm black), hairline border |

Many eased stops reduce visible colour banding on 8-bit LCD screens; to
check on the Tecno Spark 50 [assumed LCD]. Light-theme alphas are scaled
from dark [to confirm on S2 Home light].

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
