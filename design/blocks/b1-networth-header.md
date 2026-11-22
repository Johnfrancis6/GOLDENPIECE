# B1 — Net-worth header

**Validated by Franco on 2026-11-22** ("Patrimoine net" label with "?";
one change line following the chart period + a discreet "Aujourd'hui"
line, choice A). Tokens: [../tokens.json](../tokens.json)
(`block.networthHeader`). Preview:
[../previews/b1-networth-header.png](../previews/b1-networth-header.png).

## 1. Data (`api.get_home`)

`networth.net`, `change_day`, `change_month`, `as_of`; the period change
comes from the chart series of the selected period (G1, C12 bar).

## 2. Anatomy (top of Home, over the glow C "Halo haut", F5 §6)

| Line | Content | Style |
|---|---|---|
| Header bar | open-alert icon (only when an alert is open) + eye (C12, C20) | 56 dp |
| Large title | "Accueil" | `titleScreen` 24/32 SemiBold |
| Label | "Patrimoine net" + "?" (C20) + "Démo" tag (C14, demo only), 12 dp under the title | 13/18 Medium `text.secondary` |
| Hero | net worth, "13 439 800 F CFA" | `amountHero` 34/42 SemiBold, −0.5 letter spacing, tabular; count-up (C5, F5 M7) |
| Period change | C5 change: trending icon + "+2 239 800 F (+20,0 %)" in `gain`/`loss` + "depuis le 1er janv." / "sur 1 mois" / "depuis le début" in `text.secondary` | 14/20 Medium, 4 dp under the hero |
| Day line | "Aujourd'hui" + C5 change amount (small trending icon 14, `gain`/`loss`, Medium) + " · au 22 nov., 14:05" | 13/18 `text.secondary`, 2 dp under |
| Then | period bar (C12, 16 dp under) and the G1 chart | |

"?" text: "Tout ce que vous avez (comptes, placements, biens) moins vos
dettes." / "Everything you own (accounts, investments, property) minus
your debts."

## 3. States

| State | Rule |
|---|---|
| Hidden amounts | hero "••• F CFA"; period line and day line keep **percentages only** ("+20,0 %", "+0,1 %") (C5, C20) |
| Demo | "Démo" tag next to the label (always visible) |
| Stale (> 7 days) | as-of date stays; C8 info banner "Données de plus de 7 jours" under the header bar |
| Error / offline | cached values stay; C8 banner (C18 failed-load state only without cache) |
| Loading | C18: hero bar 28 dp + two text bars; label stays |
| Empty (no account) | C19 piggy bank: "Ajoutez un compte pour voir votre patrimoine" + "Ajouter un compte" |
| Scrub on the chart | hero shows the touched value, the period line shows the date, the day line hides; release restores (G0) |
| Large font (200 %) | hero may switch to the abbreviated form (C5); lines wrap |

## 4. Accessibility

Read as one group: "Patrimoine net, 13 439 800 francs CFA, en hausse de
2 239 800 francs, 20 %, depuis le 1er janvier. Aujourd'hui, plus 12 300
francs. Mis à jour le 22 novembre à 14 h 05."

## 5. Open point

Glow C in the light theme looks slightly pink in the preview; light
alphas still to check on the Tecno with S2 Home (F5 §6).

## 6. Where used

Home (top); the same structure without glow for P1 totals; the widget
(W) reuses the hero + day line.
