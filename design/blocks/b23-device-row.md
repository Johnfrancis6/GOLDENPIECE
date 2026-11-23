# B23 — Device row + remote sign-out (Settings → Appareils connectés)

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: model + last activity · approximate city, "Cet appareil"
tag; tap → C9 detail sheet with "Déconnecter cet appareil"; biometric or
code, then the row fades out and a C11 toast confirms). Tokens:
[../tokens.json](../tokens.json) (`block.deviceRow`). Preview:
[../previews/b23-device-row.png](../previews/b23-device-row.png)
(source [../previews/b23-device-row.html](../previews/b23-device-row.html)).

Builds on B16 (sub-page and list), C6, C7, C14 (neutral tag), C9 (sheet),
C1 (destructive confirm), C3 (unlock), C11 (toast).

## 1. Data

`devices[]{id, model, last_active_at, approx_city?, first_seen_at,
is_current}` (model as reported by the phone, e.g. "Tecno Spark 50"; city
from the IP, approximate, optional). Sorted: current device first, then
by `last_active_at` desc.

## 2. Anatomy

| Part | Rule |
|---|---|
| Page | B16 sub-page: back, title "Appareils connectés", line "Les téléphones où votre compte est ouvert." `caption`; one C7 list card 20 dp under; footnote "Touchez un appareil pour le déconnecter." |
| Row | C6 64 dp: Lucide `smartphone` 20 `text.secondary` · 12 · model `body` 15/22 (+ C14 neutral tag "Cet appareil" 8 dp after the name on the current device) / `caption` "Actif maintenant · Dakar", "Actif hier, 21:40 · Thiès", "Actif le 12 nov. · Dakar"; **no button, no chevron** on the row; city omitted when unknown |
| Sheet | C9 short: title = model; three key-value lines (B13 style, 15/22, label `text.secondary`, value Medium right): Dernière activité · Lieu approximatif · Première connexion; then C1 **destructive confirm** large "Déconnecter cet appareil" (fill `loss`, label `#060606` dark / white light). Current device: button "Me déconnecter ici" (→ O9 on this phone) |

## 3. Flow

Tap row → sheet. Tap the button → biometric prompt or app PIN (C3) →
sheet closes, the row fades out (220 ms) and the list closes the gap
(220 ms, transform only), C11 toast "{model} déconnecté". The signed-out
device shows O9 at its next opening (its session token is revoked
server-side). "Se déconnecter partout" (B16 "Compte" group) signs out
every device except this one, same confirmation.

## 4. States

| State | Rule |
|---|---|
| Only this device | list with one row; footnote becomes "Aucun autre appareil n'est connecté." |
| Offline | sheet button tappable → C11 toast "Pas de connexion"; nothing removed |
| Failure | C11 toast "Impossible de déconnecter. Réessayez."; row stays |
| 200 % font | the tag wraps under the name; key-values stack (label above value); no overlap (D12) |

## 5. Accessibility

Row reads "Itel A70, actif hier à 21 h 40, Thiès, bouton". Current
device reads "Tecno Spark 50, cet appareil". Toast announced politely.

## 6. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Appareils connectés | Connected devices |
| line | Les téléphones où votre compte est ouvert. | Phones where your account is open. |
| current | Cet appareil | This device |
| active.now | Actif maintenant | Active now |
| active.date | Actif {date} | Active {date} |
| foot | Touchez un appareil pour le déconnecter. | Tap a device to sign it out. |
| foot.alone | Aucun autre appareil n'est connecté. | No other device is signed in. |
| k.last · k.city · k.first | Dernière activité · Lieu approximatif · Première connexion | Last activity · Approximate location · First sign-in |
| btn | Déconnecter cet appareil | Sign out this device |
| btn.self | Me déconnecter ici | Sign out here |
| toast | {model} déconnecté | {model} signed out |
| error | Impossible de déconnecter. Réessayez. | Couldn't sign out. Try again. |
