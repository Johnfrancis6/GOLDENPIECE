# B12 — "?" explanation sheet (+ method sheet)

**Validated by Franco on 2026-11-23** (choices A, A, A: definition +
the user's own figure explained + how to read it; a neutral 3-level
scale for risk figures; "En savoir plus" opens a method sheet with the
calculation in words, the data used, the limits and a folded
"Formule"). Tokens: [../tokens.json](../tokens.json) (`block.helpSheet`).
Preview: [../previews/b12-help-sheet.png](../previews/b12-help-sheet.png) ·
source [../previews/b12-help-sheet.html](../previews/b12-help-sheet.html).

Builds on C20 ("?" trigger, "En savoir plus"), C9 (short and tall
sheets, value rows, section titles), C1 (text button), F2, F6.

## 1. Purpose

Make each jargon word understandable by a non-expert in one look, with
**their own number**, and keep the method one tap further (D11).

## 2. Short sheet ("?")

C9 short sheet (fits content, max 60 % of the screen), header = the word.

| Part | Content | Style |
|---|---|---|
| Sentence 1 — definition | "La volatilité mesure à quel point la valeur de votre portefeuille bouge." | `body` 15/22 `text.primary` |
| Sentence 2 — your figure | "Votre volatilité est de 12 % : sur un an, votre portefeuille monte ou baisse en général d'environ 12 %." | `body` `text.secondary`, 10 dp between paragraphs |
| Sentence 3 — how to read it | "C'est un niveau moyen, proche d'un portefeuille qui mêle actions et obligations." | same |
| Scale (risk figures only) | see §3 | 22 dp above |
| Link | "En savoir plus" → method sheet | C1 text button 15/22 SemiBold `brand.text` (`#FF9A5C` / `#B4410F` on the sheet), 48 dp target |

Rules: ≤ 3 sentences, never a raw formula here; numbers formatted by F6;
no advice ("vous devriez…"), only description. A word without a user
figure (e.g. "proxy") keeps sentence 1 and a plain example instead of
sentence 2; no scale.

## 3. Neutral scale (Faible · Moyen · Élevé)

Shown **only** for risk figures: volatility, max drawdown, VaR / CVaR
(1 d and 1 m). Not for performance (TWR, TRI, contributions) nor beta.

| Part | Rule |
|---|---|
| Track | 3 equal segments, 6 dp high, radius 3, gap 4, `#333333` dark / `#E0E0E0` light (decorative) |
| Marker | 12 dp dot `text.primary` with a 2 dp ring in the sheet fill, placed at the value on a linear axis (clamped to the ends) |
| Value | above the marker, 13/18 SemiBold `text.primary` ("12 %") |
| Labels | under the track: Faible (left) · Moyen (centre) · Élevé (right), 13/18 `text.secondary`; the reached level in `text.primary` SemiBold |
| Colour | **none** (no green/red): the word says the level |

Thresholds live with the copy of each figure (content keys), defaults:

| Figure | Faible | Moyen | Élevé | Axis |
|---|---|---|---|---|
| Volatilité (annual) | < 10 % | 10-20 % | > 20 % | 0-30 % |
| Perte maximale | > −10 % | −10 to −25 % | < −25 % | 0 to −40 % |
| VaR / CVaR 1 m (share of portfolio) | < 5 % | 5-10 % | > 10 % | 0-15 % |
| VaR / CVaR 1 d | < 1,5 % | 1,5-3 % | > 3 % | 0-4,5 % |

Build sessions may tune the thresholds with Franco; the look does not
change.

## 4. Method sheet ("En savoir plus")

C9 **tall** sheet (92 %), title "{Mot} · méthode", body scrolls:

| Section (C9 section title) | Content |
|---|---|
| Le calcul en mots | 1-3 sentences, `text.primary` |
| Données utilisées | C9 value rows: Période ("23 nov. 2025 au 22 nov. 2026"), Cours ("248 jours de bourse"), Hors calcul ("Immobilier, Cacao (prix mensuel)") — from the figure's `method` and the `excluded` list |
| Limites | 1-2 sentences, `text.secondary` |
| Formule (folded) | 48 dp row, hairline above, label 15/22 SemiBold, `chevron-down` / `chevron-up` 20 dp `text.secondary` (a disclosure, not a navigation chevron); opens a text in words with a 2 dp left rule (`#333333` / `#E0E0E0`), padding 12 |

The formula is written in words (Poppins GP has no √ σ ≈ glyphs, F2):
"Écart-type des rendements quotidiens du portefeuille, multiplié par la
racine carrée de 252 (jours de bourse dans une année)."

## 5. States

| State | Rule |
|---|---|
| Données insuffisantes | sentence 2 says what is missing: "Il faut 60 jours de cours, vous en avez 23." (from `status`, `minimums`); **no scale**; method sheet still available |
| Non calculable (TRI) | sentence 2: "Le TRI ne peut pas être calculé sur cette période : {raison}." |
| Hidden amounts | amounts in sentences become "••• F"; percentages stay (C5) |
| 200 % font | a short sheet passing 60 % becomes tall and scrolls (C9); the scale keeps its layout, labels may wrap under each other |
| Offline | content is local (copy + cached figures); works offline |

## 6. Motion

C9 sheet open/close (450 ms `sheet`, `enter`); method sheet stacks over
the short one (the short one stays under, back = close). Formule
unfolds: height reveal clipped + text fade, 320 ms (`quick`); reduced
motion: instant. The marker does not animate.

## 7. Accessibility

Focus moves to the title. Scale read as one element: "Niveau : moyen,
12 %, sur une échelle faible, moyen, élevé". Formule row is a button with
expanded/collapsed state. All texts ≥ 4.5:1 on the sheet (F1, C9).

## 8. Performance

Static views; the scale is three rounded rects and one dot. No blur.

## 9. Copy (keys per figure: `help.{figure}.definition|yours|read|method|limits|formula`)

| FR | EN |
|---|---|
| En savoir plus | Learn more |
| {Mot} · méthode | {Word} · method |
| Le calcul en mots · Données utilisées · Limites · Formule | How it is calculated · Data used · Limits · Formula |
| Période · Cours · Hors calcul | Period · Prices · Not included |
| Faible · Moyen · Élevé | Low · Medium · High |
| Il faut {n} jours de cours, vous en avez {m}. | {n} days of prices are needed, you have {m}. |
| Le passé ne prédit pas l'avenir. | The past does not predict the future. |

Figures to write (X step): volatilité, bêta, VaR, CVaR, perte maximale,
TWR, TRI, contribution, effet de change, concentration, proxy, prix
mensuel, score.

## 10. Where used

P8 risk figures, P9 TWR / TRI / contributions / currency effect, B7 tiles
(D1 indicators), P6 stats, every "?" (C20).
