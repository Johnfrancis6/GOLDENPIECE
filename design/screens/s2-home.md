# S2 — Home (Accueil) — v2

**Validated by Franco on 2026-11-23 (v2)**, from a reference he gave
(mobile-bank layout: greeting, large balance card in a carousel, round
quick actions, two tiles, recent operations, floating bottom bar).
Choices A, A, A: net-worth card in the brand gradient with account cards
peeking (swipe), the chart moves behind the card ("Courbe"); four
actions Compte · Achat · Budgets · Classer; floating pill bar **with
labels**. Replaces v1 (chart, Alertes → Budget → Marchés sections, glow
C) — see [CHALLENGES S3-2](../../docs/CHALLENGES.md). Preview:
[../previews/s2-home-v2.png](../previews/s2-home-v2.png) · source
[../previews/s2-home-v2.html](../previews/s2-home-v2.html) (v1 kept for
history: [../previews/s2-home.png](../previews/s2-home.png)).

Assembles: C21 monogram (avatar, rows), C20 eye, D8 alert icon, B1 data
(net worth, day change), M13 gold sheen, C17 ring, C14 change tag, G2
sparkline, C6/C7 rows and cards, C12 bottom bar (v2), C8 / C18 / C19
states.

## 1. Layout at 360 × 800 dp (top → bottom)

| # | Part | Rule |
|---|---|---|
| 1 | Header 56 | avatar 40 (initials, C21 colour) → Settings (S7); "Bonjour, {prénom}" 17/24 SemiBold, 12 after the avatar; right: round icon buttons 44 (`surface2` dark / `#FFFFFF` light): `shield-alert` + red dot (only when an alert is open, D8) then the eye (C20), 8 apart |
| 2 | Card carousel | 8 under; card 296 × 184, radius 24, left margin 20; next card peeks 12 from the right edge (first card) or both sides (middle cards); snap paging |
| 3 | Page dots | 10 under; 6 × 6 dots, active 18 × 6 `brand.text`, inactive `surface3`; one per card |
| 4 | Alert banner (only with an open alert) | 14 under; 48 high, radius 14, `surface1`; 32 dp yellow circle (C15 confirm tint) with `rotate-cw-fading-clock` (40-70) or red tint with `shield-check` (> 70); text "C'est bien vous ?" / "Banque prévenue" 13/18 Medium; action "Répondre" / "Suivre" 13 SemiBold `brand.text`; tap → B13 / B14 (S6 rule for ≥ 2 alerts: "{n} alertes" → L1). During learning: the B5 card takes this place instead |
| 5 | Quick actions | 16 under; 4 circles 56 (`#1B1B1B` dark / `#FFFFFF` light, icon 22 `text.primary`), first one brand fill `#FF7A2F` with `#060606` icon; labels 12/16 Medium 6 under; row padding 28: **Compte** `plus` (→ B21 add account) · **Achat** `receipt-text` (→ B18 add purchase, P3) · **Budgets** `piggy-bank` (→ D3) · **Classer** `tags` (→ A2 filtered "À classer"; count badge 20 dp brand fill when `uncategorised_count` > 0, hidden at 0) |
| 6 | Two tiles | 18 under; two C7 cards (flex 1 : 1, gap 12, height 148, radius 20, padding 14): **Meilleure hausse** / "sur 1 mois" (12/16 `text.secondary`), asset name 16/22 SemiBold, C14 gain tag, G2 sparkline 126 × 24 in `gain` → P6 asset; **Plus gros poste** / "ce mois", C17 ring 56 in the category colour (C21) with "%" of month spending, amount 15/22 SemiBold + category 12/16 → D2 category |
| 7 | Dernières opérations | 22 under; title 17/24 SemiBold + "Voir tout" 13 SemiBold `brand.text` (→ A2 all accounts); one C7 card radius 20 of **3** C6 rows (monogram 40, name 15/22 Medium, "type · heure" 13/18, amount 15 SemiBold, credits in `gain`) |
| — | Bottom bar | C12 v2 floating pill (§ C12), Accueil active; a 150 dp fade of `bg` behind it so rows scrolling under it never show text under the bar's labels |

**First screen (D11)**: card (hero) + alert banner + actions + tiles =
hero + 3 blocks; the operations list starts at the fold. Without an
alert the list title is on the first screen.

## 2. The card (net worth)

- Fill: linear 135°, `#E8452A` 0 % → `#F2602B` 22 % → `#FF7A2F` 45 % →
  `#FF9A45` 68 % → `#FFB45C` 88 % → `#FFC97A` 100 % (static); one ring
  decoration (circle 220, stroke 26, `rgba(255,227,163,0.18)`) at the top
  right; M13 gold sheen crosses once on first view and on tap (F5).
- Text `#1A0A03` everywhere on the card (measured: 4.88:1 on the ember
  end, 12.8:1 on the gold end). White text is not allowed on the card.
- Content: pill "Patrimoine net" (12/16 SemiBold, fill
  `rgba(255,240,220,0.35)`, 7.4:1); amount 32/40 SemiBold tabular
  (C5; abbreviated by F6 if it does not fit 256 dp); day change line
  13/18 Medium with `trending-up/down` 16 ("+12 300 F aujourd'hui");
  footer 12/16 Medium "{n} comptes · {m} placements" + chip "Courbe"
  (`chart-line` 14, same pill fill).
- Tap on the card or "Courbe" → **Patrimoine** sub-page (C12 sub-page):
  the v1 top of Home moved there unchanged — B1 (label, hero, period
  change, Aujourd'hui line) + period bar + G1 chart + "Voir en tableau".
- Next cards: one per account (bank, mobile money, broker), same size,
  fill `surface1`/`#FFFFFF` with C21 monogram, account name, balance,
  masked number; the bank-card visual (M13) applies only to cards. Tap →
  A2 account. Order = Accounts tab order. Hidden amounts: "••• F" on
  every card, day change in % only.

## 3. Hidden amounts, states

| State | Screen |
|---|---|
| Hidden amounts (eye) | card amount "••• F", change in %; tile 2 amount "••• F" (ring % stays); rows "••• F" |
| First load | C18: card-shaped skeleton (radius 24), 4 grey circles, two tile skeletons, three row skeletons |
| No account | card replaced by the C19 piggy bank + "Ajoutez un compte pour voir votre patrimoine" + "Ajouter un compte"; actions row shows only "Compte"; no tiles, no list |
| No placement | tile 1 becomes "Placements" / "Ajoutez un achat pour suivre sa valeur" → B18 |
| No spending this month | tile 2 "Ce mois" / "Pas encore de dépense" |
| Offline / error / stale | C8 banner under the header (same rules as v1) |
| Demo | C14 "Démo" tag in the card pill row |
| Learning phase | B5 card in place of the alert banner (taller); no banner |
| 200 % font | card grows in height (amount abbreviates first), actions labels wrap to 2 lines, tiles stack in one column, list unchanged |

## 4. Motion

Card carousel: native snap (spring off, `standard` 450 ms settle). Entry
after M14 (to be chosen): blocks fade + 8 dp rise, 80 ms stagger,
amount count-up (M7). Bottom bar: no animation (C12). Reduced motion:
fades 150 ms.

## 5. Performance

One static gradient + one sheen layer (on view only), 1 ring, 1
sparkline, 3 rows: lighter than v1 (no G1 on Home, no 5 market
sparklines). Carousel = horizontal pager with ≤ 8 cards, only visible
ones rendered.

## 6. Accessibility

Reading order: greeting, alert button, eye, card ("Patrimoine net,
13 439 800 francs CFA, en hausse de 12 300 francs aujourd'hui, 4 comptes,
3 placements, bouton, ouvre la courbe" + "carte 1 sur 4, balayez pour les
comptes"), banner, actions ("Ajouter un compte", "Ajouter un achat",
"Budgets", "Classer, 12 opérations"), tiles, list. Carousel also
reachable by TalkBack scroll actions. Targets ≥ 48 dp (circles 56,
header buttons 44 in 48 targets). Contrast measured 2026-11-23: card
text ≥ 4.88:1, pill 7.39:1, bar active `#FF9A5C` on `#0A0A0A` 9.45:1,
inactive `#BDBDBD` 10.5:1 (light pill), `#A3A3A3` on `#1B1B1B` 6.83:1
(dark pill).

## 7. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| hello | Bonjour, {prénom} | Hello, {first name} |
| card.label | Patrimoine net | Net worth |
| card.day | {±montant} aujourd'hui | {±amount} today |
| card.foot | {n} comptes · {m} placements | {n} accounts · {m} investments |
| card.chart | Courbe | Chart |
| banner.confirm / notified | C'est bien vous ? / Banque prévenue | Was this you? / Bank notified |
| banner.answer / follow | Répondre / Suivre | Answer / Follow |
| actions | Compte · Achat · Budgets · Classer | Account · Purchase · Budgets · Sort |
| tile.best | Meilleure hausse · sur 1 mois | Top riser · over 1 month |
| tile.top | Plus gros poste · ce mois | Biggest expense · this month |
| list | Dernières opérations · Voir tout | Latest operations · See all |

## 8. Where used

Accueil tab; end frame of M14; guided tour (T) first stop.

Validation: 2026-11-23 (v2).
