# C2 Input field · C3 Code / PIN entry · C4 Numeric keypad

**Validated by Franco on 2026-11-23** (choices A, A, A: filled fields
with the label above and a 2 dp focus/error border; the app's own keypad
for PIN and amounts; wrong code = short shake + red dots + remaining
tries, 1 min lock after 5 failures). Tokens:
[../tokens.json](../tokens.json) (`component.input`, `component.pinEntry`,
`component.keypad`). Preview:
[../previews/c2-c4-input-pin-keypad.png](../previews/c2-c4-input-pin-keypad.png)
· source [../previews/c2-c4-input-pin-keypad.html](../previews/c2-c4-input-pin-keypad.html)
· animated [../previews/c3-pin-error.html](../previews/c3-pin-error.html).

## 1. C2 — Input field

**Anatomy:** label above (13/18 Medium `text.secondary`, 6 dp gap) ·
field 52 dp high, radius 12, padding 16 sides, fill `surface2`
(`#181818` dark / `#FFFFFF` light), value `body` 15/22 `text.primary` ·
optional leading icon 20 dp `text.secondary` (card, search) · optional
trailing icon button 20 dp in a 48 dp target (eye, clear) · help or
error line under it (13/18, 6 dp gap).

| State | Dark | Light |
|---|---|---|
| Rest | fill only | fill + 1 dp inner line `rgba(0,0,0,0.10)` so the white field reads on `#F4F4F4` |
| Placeholder | `#8C8C8C` (5.3:1 on `#181818`) | `#757575` (4.6:1 on white) |
| Focus | 2 dp border `focus` `#FF7A2F`, caret 2 dp same colour | 2 dp border `focus` **`#B4410F`** (brand orange is 2.6:1 on white, too weak for a border) |
| Error | 2 dp border `loss` `#FF6B7A` + message `circle-alert` 16 + text 13/18 Medium `loss` | `#C8283C` (5.5:1) |
| Disabled | 40 % opacity | same |

Help line: 13/18 `text.secondary` ("Nous vous enverrons un code à 6
chiffres."). An error replaces the help line; it appears when the field
loses focus or on submit, never while typing the first characters.

| Variant | Rule |
|---|---|
| Text / e-mail | e-mail keyboard for e-mail; errors in plain words ("Cette adresse n'est pas complète.") |
| Password | trailing eye (`eye` / `eye-off`) shows / hides; **strength as a word**, not a bar: `shield-check` 16 + "Mot de passe solide" (`gain`), `shield-alert` + "Mot de passe moyen" (`warning` text), `shield-x` + "Mot de passe trop faible" (`loss`) |
| Search | 48 dp **pill** (`surface3`), `search` 20 leading, `x` clear when not empty; no label (placeholder "Rechercher") |
| Card number | `credit-card` leading; groups of 4 while typing; Luhn check on blur ("Ce numéro de carte n'est pas valide. Vérifiez les chiffres."); after blur the middle digits are masked "4970 12•• •••• 4821" (only BIN6 + last 4 are kept, CHALLENGES S2-1) |
| Date | "JJ/MM/AAAA" mask with the numeric keyboard, or a date sheet (C9) |
| Amount in a form | opens the C4 amount keypad screen, not an inline field |

## 2. C3 — Code / PIN entry

| Variant | Look |
|---|---|
| PIN (6 dots) | dots 14 dp, gap 16, centred, 40 dp under the subtitle; empty = 2 dp ring `border.control`; filled = `text.primary` |
| E-mail code (6 boxes) | boxes 44 × 56 dp, radius 12, gap 8, fill as C2, digit 22 SemiBold; current box has the 2 dp focus border + caret; paste of 6 digits fills all boxes |

Screen frame: back arrow (C12), title `titleScreen` 24/32 centred
("Entrez votre code", "Code reçu par e-mail"), subtitle 13/18
`text.secondary` ("Pour répondre à l'alerte", "Envoyé à …"), then the
dots or boxes, a message line (18 dp reserved, no jump), a C1 text link
("Code oublié ?", "Renvoyer le code (0:24)", active when the countdown
ends), and the C4 keypad pinned at the bottom.

**Wrong code (choice A):** filled dots turn `loss`, the row shakes
horizontally 360 ms (−8, +7, −5, +3, 0 dp, `standard` easing; transform
only), message "Code incorrect. Il vous reste {n} essais." (13/18 Medium
`loss`, `circle-alert` 16) fades in 320 ms; after 1.8 s the dots empty
and the message stays. After **5 failures**: dots at 40 %, keypad at
40 % and disabled, message "Trop d'essais. Réessayez dans 0:42"
(`lock-keyhole` 16, countdown tabular, `text.secondary`), 1 min; then
everything returns. Reduced motion: no shake, colour + message only.

**Typing:** each dot fills in 120 ms with a 1.15 → 1 scale (`enter`);
the 6th digit submits automatically (no "Valider" button).

**Fingerprint first:** for a sensitive action the system biometric
prompt opens first; "Utiliser le code" leads here; the keypad's
fingerprint key reopens the prompt (C20).

## 3. C4 — Numeric keypad

- 3 × 4 grid inside the 20 dp margins, keys 64 dp high, row gap 8,
  digits 26/32 Medium `text.primary`, **no letters**.
- Pressed key: a pill of `surface3` behind the digit, 220 ms (`press`),
  no scale, no haptics (Franco).
- Bottom row, PIN variant: `fingerprint` 28 · 0 · `delete` 26.
  E-mail code: empty · 0 · delete.
- **Amount variant:** the amount shows above in `amountHero` 34/42,
  centred, with the currency "F CFA" 15 Medium `text.secondary`; thousand
  separators (U+202F) appear live ("150 000"); bottom-left key = "," only
  for currencies with decimals (€, $), empty for F CFA; leading zeros are
  ignored; a C1 primary "Continuer" is pinned under the keypad in forms
  (B18).
- Long-press on delete clears the entry.

## 4. Accessibility

Fields: label is the accessible name; errors announced ("Erreur : cette
adresse n'est pas complète"). PIN: "Code, 3 chiffres sur 6 saisis"; a
wrong code is announced politely; the lock countdown announces at start
and end only. Keys are 64 dp targets with labels ("Effacer",
"Empreinte digitale"). At 200 % font the keypad digits keep their size
(graphic targets) and field labels wrap. All texts ≥ 4.5:1 (measured
2026-11-23); the dark field fill vs the page is 1.1:1 — see
[CHALLENGES S3-1](../../docs/CHALLENGES.md#s3-1--input-field-boundary-in-the-dark-theme).

## 5. Security

The PIN never goes through the system keyboard (no keyboard learning,
no third-party keyboards); `FLAG_SECURE` on PIN screens (no screenshots
or recent-apps preview); digits are never shown, not even briefly.

## 6. Where used

C2: O3, O7, O9, O13e, P3-P5, A2 (search), D3. C3: O8 (e-mail code), O11
and O18 (PIN), every sensitive action (L2 answers, show amounts, export,
delete). C4: O11, O14, O18, P3-P5, D3.
