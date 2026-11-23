# S7 — Settings

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: one scrolling page with 6 titled groups; a profile card at
the top (demo variant with "Créer mon compte"); "Montants visibles" off by
default, turning it on opens an explanation sheet then asks for the
biometric or code). Tokens: [../tokens.json](../tokens.json)
(`screen.settings`). Preview: [../previews/s7-settings.png](../previews/s7-settings.png)
(source [../previews/s7-settings.html](../previews/s7-settings.html)).

Built from B16 (rows, groups, sensitive group), B23 (Appareils connectés),
C7 (card), C21 (monogram), C14 ("Démo" tag), C1 (small primary), C9
(sheets), C16 (switches), C3 (unlock).

## 1. Entry

The 32 dp profile circle on the left of the Home header (S2) opens S7 as
a sub-page (F5 `screen`). No tab. Back returns to Home.

## 2. Layout (360 × 800, 20 dp margins, top → bottom)

| # | Part | Content |
|---|---|---|
| 1 | Header | back arrow; title "Paramètres" 24/32 (moves into the bar on scroll, C12) |
| 2 | Profile card | C7 card, padding 16, 20 dp under the title: C21 monogram 40 (user initials) · e-mail 15/22 Medium / "Compte créé le {date}" `caption`. Not tappable. **Demo:** monogram of the persona, "Profil démo" + C14 "Démo" tag / "{persona} · données fictives", then C1 small primary full width "Créer mon compte" (→ O7 and the account branch, S1) |
| 3 | Général | Langue · Devise · Thème (Système / Sombre / Clair, D4) · Économie de données (switch) |
| 4 | Sécurité | Déverrouillage (Empreinte / Code du téléphone / Code de l'app, within what the phone allows) · Verrouillage auto (1 / 5 / 15 min) · Code de l'app (change, C3) · Appareils connectés (count → B23) |
| 5 | Notifications | Sécurité · Budgets · Marchés (switches = Android channels; Sécurité and Budgets on, Marchés off by default) · **Montants visibles** (switch, off) ; footnote "Même désactivées, les alertes de sécurité restent visibles dans l'app." |
| 6 | Mes données | Catégories et règles (→ B22 / A4) · Budgets (→ D3) · Seuil de concentration (value "25 %", C9 sheet) · Questionnaire (value "3/4" sections done → O14) · Historique des alertes (→ L1 history, D8) · Accords (→ O12 list, versions) |
| 7 | Aide | Rejouer la visite (action → T) · Installer l'app (→ O16) · À propos ("Prototype · données fictives", version, attributions, legal texts) |
| 8 | Compte (last) | Se déconnecter partout · Exporter mes données · Supprimer mon compte (red, B16 §3); footnote on confirmation. **Demo:** group "Démo" with "Réinitialiser la démo" (action, C10 dialog) instead |

Icons (Lucide 20, `text.secondary`): globe, coins, sun-moon, gauge ·
fingerprint, timer, key-round, smartphone · shield-alert, piggy-bank,
trending-up, eye-off · shapes, wallet, chart-pie, clipboard-list,
history, file-check · play, download, info · log-out,
hard-drive-download, (none for delete).

D11: a settings page is a list; the first screen shows the profile card
and the Général group (a hero-free list page, accepted like L1). Every
row is one line per side at 100 %.

## 3. "Montants visibles"

Off by default (brief §3.9: amounts hidden in notifications). Turning it
on: the switch stays off and a C9 short sheet opens: title "Afficher les
montants ?", text "Les montants seront visibles dans les notifications,
une fois le téléphone déverrouillé. Toute personne qui utilise votre
téléphone pourra les lire." (aligned with N, 2026-11-23: the lock screen
always shows the general text), primary "Afficher les montants", text button "Garder
masqués". Primary → biometric / app PIN → switch turns on (C16 motion).
Turning it off needs no confirmation.

## 4. States

| State | Rule |
|---|---|
| Demo | profile card and last group as §2; rows that need an account (Appareils connectés, Exporter) are hidden |
| Offline | local settings work; server rows show C11 "Pas de connexion" on tap |
| Unsupported unlock | Déverrouillage lists only what the phone offers; others are not shown |
| 200 % font | B16 rule: values under names; the profile card stacks; the demo button wraps its label |

## 5. Copy (FR / EN)

| FR | EN |
|---|---|
| Compte créé le {date} | Account created on {date} |
| Profil démo · {persona} · données fictives | Demo profile · {persona} · fictitious data |
| Créer mon compte | Create my account |
| Notifications · Sécurité · Budgets · Marchés · Montants visibles | Notifications · Security · Budgets · Markets · Show amounts |
| Même désactivées, les alertes de sécurité restent visibles dans l'app. | Even when off, security alerts stay visible in the app. |
| Mes données · Catégories et règles · Seuil de concentration · Questionnaire · Historique des alertes · Accords | My data · Categories and rules · Concentration threshold · Questionnaire · Alert history · Consents |
| Aide · Rejouer la visite · Installer l'app · À propos | Help · Replay the tour · Install the app · About |
| Démo · Réinitialiser la démo | Demo · Reset the demo |
| Afficher les montants ? | Show amounts? |
| Les montants seront visibles dans les notifications, une fois le téléphone déverrouillé. Toute personne qui utilise votre téléphone pourra les lire. | Amounts will be visible in notifications once the phone is unlocked. Anyone who uses your phone can read them. |
| Afficher les montants · Garder masqués | Show amounts · Keep hidden |
