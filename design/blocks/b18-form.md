# B18 — Form (P3 add trade; P4, P5, D3 and onboarding forms)

**Validated by Franco on 2026-11-23** with the S4 layout (P3 phone of
[../previews/s4-placements.png](../previews/s4-placements.png)). Tokens:
[../tokens.json](../tokens.json) (`block.form`).

Builds on C2 (fields, error), C4 (amount keypad), C9 (date sheet), C12
(sub-page header), C13 (single-choice chips), C1 (primary button), C11
(toast), C14 ("En attente").

## 1. Anatomy (full-screen sub-page)

| Part | Rule |
|---|---|
| Header | C12 sub-page with **`x`** (close, asks C10 "Abandonner la saisie ?" only if something was typed) + small title "Nouvelle opération"; no other action |
| Kind | C13 single-choice chips (P3: **Achat · Vente**), 8 under the header, 20 above the first field |
| Fields | C2 filled fields, 16 dp apart, one column; two short related fields may share a row (Quantité + Prix unitaire, gap 12) at 100 % font only |
| Summary line | "Montant de l'achat / de la vente" left 13/18 `text.secondary`, total right 15/22 SemiBold; updates live |
| Footer | pinned C1 primary 52 dp "Enregistrer" (hairline above while content scrolls under) + one caption line under it about offline saving (12/16 `text.secondary`, centred) |

Field order P3: Placement (search pill → instrument search, B9 rows as
results) · Date (calendar icon → C9 date sheet, default today) · Quantité
· Prix unitaire (currency = instrument currency, shown as suffix; tap the
suffix to change) · Frais (facultatif). P4: Nom · Pays · Devise · Valeur
· Date d'estimation. P5: Nom · Prêteur · Reste dû · Taux · Mensualité ·
Dates.

## 2. Validation and states

| State | Rule |
|---|---|
| Required missing | button stays enabled; on tap, first invalid field gets the C2 error and focus |
| Sale > held | error on Quantité: "Vous détenez 120 titres." (from the position, local check) |
| Server rejects later (`status: rejected`, `reason_key`) | the queued row shows C14 "Refusé" + a C8 error banner on P1 "Une opération n'a pas été acceptée" → opens the form prefilled with the reason under the field |
| Offline | Enregistrer saves locally: C11 toast "Enregistré · en attente de connexion"; the B10 row shows "En attente" (C14) until sent |
| Saving online | button shows a 20 dp spinner in place of the label ≤ 1 s, then closes the form with toast "Opération ajoutée" |
| 200 % font | one field per row, footer stays pinned, content scrolls |

## 3. Motion and accessibility

Form opens as a full-screen sub-page (M1); errors appear without shake
(only C3 PIN shakes). Each field has its label read; errors are
announced (live region); the total line is read after changes.

## 4. Copy

| FR | EN |
|---|---|
| Nouvelle opération · Achat · Vente | New transaction · Buy · Sell |
| Placement · Date · Quantité · Prix unitaire · Frais (facultatif) | Investment · Date · Quantity · Unit price · Fees (optional) |
| Montant de l'achat / de la vente | Purchase / Sale amount |
| Enregistrer | Save |
| Vous détenez {n} titres. | You hold {n} shares. |
| Sans connexion, l'opération est gardée « En attente » et envoyée plus tard. | Offline, the transaction is kept "Pending" and sent later. |
| Abandonner la saisie ? | Discard this entry? |
