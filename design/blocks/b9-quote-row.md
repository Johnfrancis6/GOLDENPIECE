# B9 — Quote row

**Validated by Franco on 2026-11-23** (choices A, A, A: the 5 Home
quotes in one list card + "Voir tous les marchés"; one freshness line
under the card, special rows say it in their subtitle; sparkline and
change both over 1 month), **with a change:** a light colour under each
sparkline fading out downwards (G2 updated). Tokens:
[../tokens.json](../tokens.json) (`block.quoteRow`, `chart.sparkline`).
Preview: [../previews/b9-quote-row.png](../previews/b9-quote-row.png) ·
source [../previews/b9-quote-row.html](../previews/b9-quote-row.html).

Builds on C6 (list row), C7 (list card), G2 (sparkline), C5 (change),
C14 (freshness wording), F6 (formats), C1 (text button).

## 1. Data

Home: 5 × `{name, price, change_pct, as_of, proxy_of}` **plus**
`spark_30d` (30 daily points) and `change_30d` per quote — **to add on
the API** (brief §3.3 only lists the first five fields). P7: the same per
instrument, grouped (indices via ETF proxies, metals, energy, agri
monthly, crypto, FX incl. XOF peg).

## 2. Home anatomy

| Part | Content | Style |
|---|---|---|
| Section head | "Marchés" left, "sur 1 mois" right (baseline aligned) | `titleSection` 18/26 · `caption` `text.secondary` |
| List card | 5 C6 rows, one card, hairlines inset 16 | C7 list card |
| Freshness line | "Cours différés (~15 min) · au 22 nov., 14:05" | `caption` `text.secondary`, 8 under the card |
| Link | "Voir tous les marchés" → P7 | C1 text button 13/18 SemiBold `brand.text`, 48 dp target |

## 3. Row anatomy

min height 64 dp, padding 16 sides, gap 8, no leading badge:

| Column | Content | Style |
|---|---|---|
| Name | "BRVM Composite", "S&P 500", "Or", "Cacao", "Euro / F CFA" | `body` 15/22, wraps (no truncation) |
| Subtitle (only when special) | "Proxy : SPY", "Prix mensuel", "Parité fixe"; P7 stale: "Cours du 12 nov." | `caption` 13/18 `text.secondary` |
| Sparkline | G2, 56 × 32, light area under the line | gain / loss / `text.secondary` when flat |
| Value | price in its own currency/unit ("571,20 $", "2 650 $/oz", "8 120 $/t", "655,957 F"; index in points, no unit) over the change "+2,9 %" | `amountRow` 15/22 SemiBold tabular · 13/18 Medium tabular in the sparkline colour; right-aligned, min width 76 |

Short subtitles on Home; the full C14 wording ("Proxy : SPY ≈ S&P 500",
"Prix mensuel de référence") is shown in P7 rows and on the instrument
detail. A change that rounds to 0,0 % is `text.secondary` with a flat
grey line and no area (G2).

## 4. States

| State | Rule |
|---|---|
| Loading | C18 row skeletons (no sparkline drawn) |
| Stale quote | P7: subtitle "Cours du {date}" beyond 7 days; Home: freshness line shows the oldest `as_of` |
| Offline | cached quotes stay; C8 global banner |
| < 2 points | no sparkline, the space stays empty (G0) |
| Hidden amounts | quotes are not personal: always visible |
| Large font (200 %) | sparkline keeps its size; value column moves under the name (F2 §3) |

## 5. Motion

Sparklines draw once left → right on first view (G1 timing scaled:
700 ms, `enter`), area fades in with them; rows do not animate; new
prices cross-fade the value 320 ms. Reduced motion: drawn at once.

## 6. Accessibility

Row: "S&P 500, proxy SPY, 571,20 dollars, en hausse de 1,8 % sur un
mois". The sparkline is decorative (the change words carry the
information). The freshness line is read after the list. Texts ≥ 4.5:1;
direction never by colour alone (sign + words).

## 7. Performance

Five static Skia paths with one gradient each; FlashList in P7 with fixed
row heights up to 130 % font.

## 8. Where used

Home (S2), P7 markets (S4), instrument search results (P3).
