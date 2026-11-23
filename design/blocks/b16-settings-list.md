# B16 — Grouped settings list (Settings, O12)

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: grey Lucide icon 20 dp without tile; value on the right +
chevron on one line; sensitive actions in a last "Compte" group with
"Supprimer mon compte" in red, no icon, confirmation required). Tokens:
[../tokens.json](../tokens.json) (`block.settingsList`). Preview:
[../previews/b16-settings-list.png](../previews/b16-settings-list.png)
(source [../previews/b16-settings-list.html](../previews/b16-settings-list.html)).

Builds on C6 (list row), C7 (list card), C12 (sub-page header), C16
(switch, radio), C9 (choice sheets), F4 (Lucide). **The only place in the
app where chevrons are allowed** (C6).

## 1. Anatomy (360 × 800, 20 dp margins)

| Part | Rule |
|---|---|
| Header | C12 back arrow 56 dp; page title `titleScreen` 24/32, 4 dp under; on scroll the title moves into the bar (C12 small title) |
| Group heading | 15/22 SemiBold `text.primary`, 24 dp above, 8 dp below |
| Group | one C7 list card per group |
| Row | 56 dp min, padding 16; leading Lucide **20 dp `text.secondary`**, 12 gap; name `body` 15/22 `text.primary`; trailing one of: **value** 15/22 `text.secondary` right-aligned + `chevron-right` 20 `text.secondary` (sub-page or choice sheet) · **switch** C16 (no chevron) · **chevron only** (sub-page without value) · **nothing** (action that opens a confirmation) |
| Hairline | 1 dp `border.hairline`, inset to the text start (48 dp from the card edge; 16 dp next to a row without icon) |
| Footnote | optional, `caption` 13/18 `text.secondary`, 8 dp under the card, ≤ 2 lines |

A row has **one line per side** at 100 % (D11): names and values are
short ("Verrouillage auto · 1 min", "Appareils connectés · 2").

## 2. Row kinds

| Kind | Trailing | Tap |
|---|---|---|
| Choice (Langue, Devise, Thème, Verrouillage auto) | value + chevron | C9 sheet with C16 radio list (≤ 6 options) or sub-page (> 6) |
| Toggle (Économie de données, notification types) | switch | toggles in place; the whole row is the target |
| Sub-page (Appareils connectés, Catégories et règles, Accords) | value or count + chevron | sub-page (F5 `screen`) |
| Action (Rejouer la visite, Se déconnecter partout, Exporter mes données) | nothing | runs or opens a confirmation (C10 dialog / unlock) |
| Destructive (Supprimer mon compte) | chevron | **red** name in the C1 destructive-text colour (Medium; `#FF9AA4` dark, aligned with C1 on 2026-11-23 after the preview used `loss` `#FF6B7A`; `#C8283C` light, 5.5:1), **no icon**; opens the typed-confirmation page |

## 3. Sensitive actions

Last group "Compte", at the bottom of the page, with the footnote "Une
confirmation (empreinte ou code) est demandée pour ces actions." Each
action asks the biometric prompt / app PIN first (C3), then:
"Se déconnecter partout" → C10 dialog; "Exporter mes données" → C10
dialog then C11 toast "Export prêt"; "Supprimer mon compte" → page with a
typed word ("SUPPRIMER") and a destructive C1 button. In demo, the group
shows "Réinitialiser la démo" and "Créer mon compte" instead.

## 4. States

| State | Rule |
|---|---|
| Pressed | C6 pressed fill |
| Disabled (not available on this phone, e.g. fingerprint) | name and value `text.disabled`, subtitle line allowed: "Non disponible sur ce téléphone" |
| Offline | rows that need the server (devices, export, delete) stay tappable and show C11 toast "Pas de connexion" |
| 200 % font | the value moves **under the name** (`text.secondary`), chevron / switch stay right, vertically centred; rows grow; no overlap (D12) |

## 5. Motion

Switch per C16; sheet per C9; sub-page F5 `screen`. Value change after a
choice: cross-fade 220 ms. Reduced motion: instant.

## 6. Accessibility

Row reads name, value, role ("Langue, Français, bouton"; "Économie de
données, interrupteur, désactivé"). Group headings are headings. The red
row is also announced as "action irréversible". Icons are decorative.

## 7. Copy (FR / EN) — preview rows

| FR | EN |
|---|---|
| Paramètres | Settings |
| Général · Sécurité · Compte | General · Security · Account |
| Langue · Devise · Thème (Système / Sombre / Clair) | Language · Currency · Theme (System / Dark / Light) |
| Économie de données | Data saver |
| Déverrouillage · Verrouillage auto · Appareils connectés | Unlock · Auto-lock · Connected devices |
| Se déconnecter partout · Exporter mes données · Supprimer mon compte | Sign out everywhere · Export my data · Delete my account |
| Une confirmation (empreinte ou code) est demandée pour ces actions. | These actions ask for confirmation (fingerprint or code). |
