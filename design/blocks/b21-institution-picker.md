# B21 — Institution picker (O13f, O15a)

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: two titled groups in one-card lists; one "simulation" tag
under the title; tapping a row goes straight to the next step). Tokens:
[../tokens.json](../tokens.json) (`block.institutionPicker`). Preview:
[../previews/b21-institution-picker.png](../previews/b21-institution-picker.png)
(source [../previews/b21-institution-picker.html](../previews/b21-institution-picker.html)).

Builds on C12 (back arrow), C14 (neutral "simulation" tag), C2 (search
pill), C6 (list rows), C7 (list card), C21 (institution monograms), C18
(skeleton), C19 (empty / failed load).

## 1. Purpose

Let the user say which (fictitious) bank or mobile-money operator they
use, in one tap, and make it clear nothing real is connected.

## 2. Data

O15a: `institutions_for_country[]{id, name, kind (mobile_money | bank)}`.
O13f: `banks_for_country[]{id, name}` + the scanned card's last 4 digits.
All institutions are fictitious (Banque Baobab, Caisse Sahel, Banque du
Fleuve, Kola Money, Savane Pay, Teranga Mobile…); **no real names or
logos**, including the operators named in the brief (replaced by
fictitious ones). Lists are bundled per country (offline).

## 3. Anatomy (360 × 800, 20 dp margins, top → bottom)

| Part | Rule |
|---|---|
| Header | C12 back arrow, 56 dp, no title in the bar |
| Title | `titleScreen` 24/32, 4 dp under; O15a "Relier un compte", O13f "De quelle banque est cette carte ?" |
| Tag + line | C14 **neutral** "simulation" tag, 8 dp under the title; then `caption` 13/18 `text.secondary`, 4 dp under: "Aucune vraie connexion n'est faite : les comptes sont fictifs." (O13f: "Carte •• 1111 · Aucune vraie connexion n'est faite.") |
| Search | C2 search pill 48 dp, 20 dp under, **only when the list has > 8 institutions**; filters as you type (name, accent-insensitive) |
| Groups | O15a: heading 15/22 SemiBold `text.primary` ("Mobile money" first, then "Banques"), 24 dp above, 8 dp below; each group is **one** C7 list card. O13f: banks only, one card, no heading |
| Row | C6, 64 dp min: C21 monogram 40 · 12 gap · name `body` 15/22 + type `caption` ("Mobile money" / "Banque"); **no chevron**; whole row tappable; hairline inset 68 dp |
| Last row | "Autre banque" / "Continuer avec la Banque (démo)", generic `landmark` 20 dp on `surface3` (C21 generic); last row of the banks card |

Order inside a group: as the bundled list (most used first), not
alphabetical; search results are alphabetical.

## 4. Behaviour

Tap a row → pressed fill → **next step at once** (O15a → O15b consent,
O13f → O13e/O13d continuation), F5 `screen` forward. No radio, no
"Continuer" button. Back returns to the previous step with the list
scrolled as left.

## 5. States

| State | Rule |
|---|---|
| Loading (list not bundled yet) | C18 skeleton: 3 rows in one card |
| Search, no result | C19 compact without illustration: "Aucun résultat pour « {q} »" + the "Autre banque" row under it |
| Already linked | row stays tappable; subtitle "Déjà relié · •• 4821"; tapping opens that account (A3) instead of linking twice |
| 200 % font | the screen scrolls; rows grow (no truncation); tag and line wrap; no overlap (D12) |
| Demo mode | the C14 "Démo" tag is in the app header as everywhere; "simulation" stays here |

## 6. Motion

Screen: F5 `screen`. Rows are static (no stagger). Pressed: C6 pressed
fill. Search filtering: rows appear/disappear with a 120 ms fade, no
layout animation. Reduced motion: instant.

## 7. Accessibility

Reading order: title (heading), "simulation", line, search, group heading
(heading), rows. Row label: "Kola Money, mobile money, bouton". Monogram
colour never alone (initials + name).

## 8. Performance

FlashList with fixed 64 dp rows up to 130 % font; ≤ 40 institutions per
country; no images (monograms are drawn).

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title.link | Relier un compte | Link an account |
| title.card | De quelle banque est cette carte ? | Which bank issued this card? |
| tag | simulation | simulation |
| line.link | Aucune vraie connexion n'est faite : les comptes sont fictifs. | No real connection is made: the accounts are fictitious. |
| line.card | Carte •• {last4} · Aucune vraie connexion n'est faite. | Card •• {last4} · No real connection is made. |
| group.mm | Mobile money | Mobile money |
| group.banks | Banques | Banks |
| other.title | Autre banque | Other bank |
| other.sub | Continuer avec la Banque (démo) | Continue with the demo bank |
| search | Rechercher | Search |
| empty | Aucun résultat pour « {q} » | No results for "{q}" |
| linked | Déjà relié · •• {last4} | Already linked · •• {last4} |
