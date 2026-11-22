# F2 — Typography

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`typography.*`). Preview: [../previews/f2-typography.png](../previews/f2-typography.png).
Font files: [../fonts/](../fonts/).

## 1. Family

**Poppins GP**: one family, three weights. It is Poppins (Indian Type
Foundry, SIL Open Font License 1.1), chosen from Franco's reference (a
light finance app set in Poppins), with two changes made for money:

| Change | Why |
|---|---|
| The ten digits share one advance width (**tabular figures**), glyphs centred | Poppins has no `tnum` feature and proportional digits ("1" = 320 units, "8" = 631). Without this, amount columns do not line up and a changing amount (chart scrub, live update) shifts sideways. |
| **U+202F narrow no-break space** added (60 % of a space) | Thousands separator ("250 000 F CFA"); `Intl.NumberFormat('fr-FR')` produces U+202F and Poppins lacks it. |
| Latin + French subset (U+0020-007E, U+00A0-00FF, Œ œ Ÿ, quotes, dashes, •, …, ‰, ‹ ›, €, ™, −) | Size: ≈ 16 KB per weight. |
| Family renamed "Poppins GP" | Required by OFL for a modified version. |

No digit-to-digit kerning exists in Poppins (checked), so the digits stay
aligned with kerning on. Letters are unchanged.

| Weight | File | Use |
|---|---|---|
| 400 Regular | `PoppinsGP-Regular.ttf` | body, captions |
| 500 Medium | `PoppinsGP-Medium.ttf` | row titles, labels, micro |
| 600 SemiBold | `PoppinsGP-SemiBold.ttf` | titles, amounts, buttons |

No italic, no Bold 700, no second family. Total ≈ 47 KB in the APK
(budget: ≤ 2 families, Latin subset). Rebuild: `python3
fonts/build_poppins_gp.py SRC_DIR OUT_DIR` from the original Poppins
v4.004 TTFs; licence in [../fonts/OFL.txt](../fonts/OFL.txt).

Glyphs **not** in the font: arrows (▲ ▼ ↑ ↓), ≈, ●, ◆. Arrows and status
shapes are **icons** (F4), never text characters. "≈" in "Proxy : SPY ≈
S&P 500" falls back to the system font (acceptable, one character).

## 2. Scale

Sizes in **sp** (they follow the phone's font setting), line heights in
sp, letter-spacing in dp.

| Token | Size / line | Weight | Extra | Use |
|---|---|---|---|---|
| `amountHero` | 34 / 42 | 600 | −0.5 · tabular · max scale 1.5 | net worth (B1), amount being typed (C4) |
| `titleScreen` | 24 / 32 | 600 | | screen title |
| `amountLarge` | 22 / 28 | 600 | tabular | stat tiles (B7), sheet headline amounts, TWR/TRI |
| `titleSection` | 18 / 26 | 600 | | section and card titles |
| `bodyStrong` | 15 / 22 | 500 | | list-row title, emphasised body |
| `amountRow` | 15 / 22 | 600 | tabular | amounts in rows and tables |
| `body` | 15 / 22 | 400 | | sentences, explanations ("?", reasons) |
| `button` | 15 / 20 | 600 | | buttons |
| `label` | 13 / 18 | 500 | | chips, tabs, tags, field labels |
| `caption` | 13 / 18 | 400 | | dates, subtitles, freshness labels |
| `micro` | 12 / 16 | 500 | | chart axes, count badges; **minimum size of the app** |

Rules:
- Text colour comes from F1: `text.primary` for titles, body and amounts;
  `text.secondary` for captions, labels and axes. Status colours only on
  amounts/changes and status chips, never on sentences.
- **Body is 15, not 16:** Poppins is wide (measured: a sentence is 5 %
  wider than in Inter at the same size).
- Captions stay Regular at 13; anything at 12 is Medium (thin strokes at
  12 sp blur on low-density screens such as the reference phone [assumed]).
- No all-caps sentences (harder to read for low-literacy users).
  Exception: month abbreviations on chart axes ("JANV.").
- Alignment: text left-aligned; amounts right-aligned in rows and tables;
  centred only on step screens (B19), the amount-entry screen and the
  hero of the alert decision (B13).
- Numbers are always formatted by F6 (to come): thin no-break space for
  thousands, comma for decimals in French, "−" (U+2212) for negatives.

## 3. Behaviour at large font (up to 200 %)

| Rule | Detail |
|---|---|
| Scaling on | `allowFontScaling` stays on everywhere. |
| Hero amount capped | `amountHero` uses `maxFontSizeMultiplier = 1.5` (≤ 51 sp). If it still does not fit the width, it switches to the abbreviated form ("1,2 M F CFA"); TalkBack still reads the exact amount. |
| No truncation | No "…" on amounts or titles. A list row that does not fit wraps; its amount moves under the title. |
| No fixed text heights | Text containers grow. Lists (FlashList) use a fixed row height up to 130 % font scale and switch to measured heights above. |
| Android 14+ | The system scales large text non-linearly up to 200 %; the scale above stays readable under both linear and non-linear scaling. |
| Check | Each screen (S1-S7) is validated at 100 % and 200 % on a 360 dp width. |

## 4. Accessibility

- Contrast of every text style: from F1 (`text.primary` ≥ 17:1,
  `text.secondary` ≥ 5.3:1 on every surface).
- Minimum size 12 sp (micro); body 15 sp; touch targets stay 48 dp
  whatever the text size.
- TalkBack reads amounts as words; abbreviated displays keep the full
  value in the accessibility label.

## 5. Performance notes

- 3 static TTF files, loaded once by `expo-font` at start (bundled, no
  network). ≈ 47 KB total.
- Tabular digits avoid re-layout jitter when amounts animate (M7, M8).

## 6. Where it is used

Every text in the app, widgets and notifications (Android notifications
use the system font; widgets use Poppins GP if the widget toolkit allows
custom fonts, else system font with the same sizes). The bank dashboard
(web) uses the same files as WOFF2 converted from these TTFs.
