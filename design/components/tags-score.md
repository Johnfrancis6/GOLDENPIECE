# C14 Tags and badges · C15 Score badge

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.tag`, `component.scoreBadge`). Preview:
[../previews/c14-c15-tags-score.png](../previews/c14-c15-tags-score.png).

## 1. Tag anatomy (shared with the C5 change tag)

Radius 4, padding 2 × 6, gap 4, label 12/16 SemiBold, optional Lucide
icon 14 dp (stroke 1.75), no border. Never truncated; at 200 % font a
tag wraps to its own line.

## 2. C14 — Status tags

| Tag (FR / EN) | Kind | Dark fill / text | Light fill / text |
|---|---|---|---|
| Simulation / Simulation, En attente / Pending, other info | neutral | `#222222` / `#A3A3A3` (6.3:1) | `#E5E5E5` / `#5C5C5C` (5.3:1) |
| Cours différés (~15 min), Prix mensuel de référence, Proxy : SPY ≈ S&P 500 | neutral + `clock` icon | same | same |
| Démo / Demo | brand (always visible in demo mode) | `rgba(255,122,47,0.16)` / `#FF7A2F` (5.8:1) | `#FFE9DC` / **`#9A3608`** (6.2:1) |
| Refusé / Declined | loss | `rgba(255,107,122,0.16)` / `#FF6B7A` (5.5:1) | `#FCE3E6` / `#B21F33` (5.5:1) |

Neutral is the default; colour only when the state matters (Finary-like,
Franco: "ok").

**Count badge:** a **dot only** (8 dp, `loss`, 2 dp ring in the page
background) at the top-right of an icon; no number (Franco). The
accessibility label carries the count ("Alertes ouvertes : 3").

## 3. C15 — Score badge (fraud score 0-100)

| Band | Word (FR / EN) | Lucide icon | Dark fill / text | Light fill / text |
|---|---|---|---|---|
| < 40 | Normal / Normal | `circle-check-big` | `rgba(61,214,140,0.16)` / `#3DD68C` (7.4:1) | `#DDF3E7` / `#0B6B3A` (5.7:1) |
| 40-70 | À confirmer / To confirm | `rotate-cw-fading-clock` | `rgba(242,201,76,0.16)` / `#F2C94C` (8.5:1) | `#FBF0CC` / **`#735200`** (6.3:1) |
| > 70 | Banque prévenue / Bank notified | `shield-check` | `rgba(255,107,122,0.16)` / `#FF6B7A` (5.5:1) | `#FCE3E6` / `#B21F33` (5.5:1) |

Icons chosen by Franco (2026-11-22); they replace the ● ▲ ◆ shapes, so
the app has no hand-drawn glyphs left. Colour is never alone: icon +
word.

Display rules:

- **Lists of operations (A2, Home):** the badge appears **only when there
  is a risk** (À confirmer, Banque prévenue). "Normal" rows show nothing
  (Franco).
- **Alert list (L1) and dashboard:** every row shows its badge, Normal
  included.
- **Number** ("82/100", `amountHero` digits + "/100" 15 SemiBold
  `text.secondary`) appears **only in the alert detail** (L2-L4), next to
  the badge and the plain-language reasons.
- Light-theme texts are darkened like C5 so both themes read equally
  crisp.

## 4. Behaviour

Static. A badge that changes band (alert resolved) cross-fades
(`quick`, F5). No animation on lists.

## 5. Accessibility

Read as "Score : à confirmer" (lists) or "Score 82 sur 100, banque
prévenue" (detail). All tag texts ≥ 5.3:1 (tables above). Tags are not
buttons; a tappable filter chip is C6.

## 6. Where used

C14: demo banner and headers, link-account flow (O15), pending/declined
transactions (A2, A3), market prices (P-screens), alert icon dot.
C15: transaction rows with risk (A2, Home), alert list and detail (L1-L4),
bank dashboard (D).
