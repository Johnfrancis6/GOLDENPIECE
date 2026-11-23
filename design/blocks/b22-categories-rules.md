# B22 — Categories, rules and "Appliquer aux N opérations similaires ?"

**Validated by Franco on 2026-11-23** (choices A, A, A: one list card of
categories that opens a category screen; rules written as plain
sentences; the "apply to similar" question as a short bottom sheet with
a preview, two buttons and a pre-checked "create a rule" box). Tokens:
[../tokens.json](../tokens.json) (`block.categoriesRules`). Preview:
[../previews/b22-categories-rules.png](../previews/b22-categories-rules.png)
· source [../previews/b22-categories-rules.html](../previews/b22-categories-rules.html).

Builds on C6/C7 (rows, one list card), C21 (category badges), C12
(sub-page header), C9 (sheets), C16 (checkbox), C1 (buttons), C13
(chip), C19 (empty state).

## 1. Data

Categories tree `{id, name, icon, parent_id}` (12 defaults, user
sub-categories), rules `{id, match_text, category_id, source: user|ai}`,
counts per category (sub-categories, rules, operations this month,
amount this month). Similar operations for a recategorised one:
`{count, sample[3]{label, date, amount, old_category}}`.

## 2. D4 list (choice A)

Sub-page header (C12: `arrow-left`), large title "Catégories et
règles". **One list card**: C6 rows, C21 badge 40 + name (`body` 15/22)
+ summary 13/18 `text.secondary` "3 sous-catégories · 4 règles"
("Aucune sous-catégorie" when 0; rules part omitted when 0). Whole row
tappable, **no chevron**; hairline inset 68 (C6). Last row "+ Créer une
catégorie" (`plus` 20 + 15/22 SemiBold `brand.text`). Order: the C21
table order, user categories after "Transferts", "Autres" last.

## 3. Category screen

Header: back + `ellipsis` menu (Renommer, Changer l'icône, Supprimer —
not for "Autres"). Hero row: C21 **large badge 56** + name 26/34
SemiBold + "118 000 F ce mois · 69 opérations" 13/18 `text.secondary`.

| Section | Content |
|---|---|
| Sous-catégories | one card, rows **without badge** (all share the parent): name + "42 opérations"; last row "+ Ajouter une sous-catégorie"; tap → short C9 sheet (rename, delete) |
| Règles | one card, each rule one **sentence** (§4); last row "+ Ajouter une règle" |

Sections use `titleSection` 18/26, 24 above, 12 below. Deleting a
category or sub-category asks C10 confirm and moves its operations to
the parent (or "Autres"): "Les 18 opérations passeront dans Courses."

## 4. Rule sentence (choice A)

"Quand le libellé contient « KOLA SUPERMARCHÉ », classer dans
**Supermarché**" — `body` 15/22, the category name SemiBold, match text
in capitals as it appears on the statement. No badge in the category
screen (redundant); in a cross-category list (search results) the C21
badge 40 leads the row. A C13 neutral chip **"Proposée par l'IA"**
(12/16 SemiBold, `surface3`) appears **only** on AI-proposed rules
(source `ai`); user rules carry no chip. Tap → short C9 sheet: field
"Le libellé contient" (C2), category choice (C9 list, selected orange),
"Supprimer la règle" (destructive text button), primary "Enregistrer".

## 5. "Appliquer aux N opérations similaires ?" (choice A)

Shown after the user changes an operation's category (A4, tall C9
category picker) when ≥ 1 other operation has the same label. **Short
C9 sheet** (tall at 200 % font):

| Part | Rule |
|---|---|
| Title | "Appliquer aux 7 opérations similaires ?" (C9 header, wraps on 2 lines, close `x` top-aligned) |
| Text | "Ces opérations ont le même libellé « KOLA SUPERMARCHÉ ». Elles passeront de Autres à **Courses**." `body` |
| Preview | 3 C6 rows (old category badge 40, label, "12 nov. · Autres", amount) + "et 4 de plus" 13/18 `text.secondary` |
| Checkbox | C16, **checked by default**: "Faire de même pour les prochaines (créer une règle)" |
| Buttons | primary "Appliquer aux 7" + secondary "Seulement celle-ci", stacked, 52 dp (C1); pinned at the bottom when the sheet scrolls |

Result: C11 toast "7 opérations classées dans Courses" (+ "Règle
créée" when checked). Offline: changes queued, toast "en attente"
(C11/C14). Close / swipe / back = "Seulement celle-ci" (the one change
already made stays).

## 6. States

| State | Rule |
|---|---|
| No user rule | "Règles" card shows only "+ Ajouter une règle" + one line 13/18 "Corrigez une opération pour créer une règle automatiquement." |
| Loading | C18 row skeletons |
| Offline | edits allowed, C14 "en attente" on the changed rows |
| Conflict | C11 "modifié sur un autre appareil" |
| Large font | rows grow (no fixed height), sentences wrap; sheet becomes tall and scrolls, buttons pinned |

## 7. Motion

C6/C9/C11 defaults: sheet up 420 ms `enter`; rows of a new rule fade in
320 ms; deleted row collapses 320 ms. Reduced motion: fades ≤ 150 ms.

## 8. Accessibility

Category row: "Courses, 3 sous-catégories, 4 règles, bouton". Rule: the
sentence + "Proposée par l'IA" when present, "bouton, modifier". Sheet
title announced on open; checkbox state read; buttons 52 dp. Colour
never alone (names written).

## 9. Copy (FR / EN)

| Key | FR | EN |
|---|---|---|
| title | Catégories et règles | Categories and rules |
| summary | {n} sous-catégories · {r} règles | {n} sub-categories · {r} rules |
| noSub | Aucune sous-catégorie | No sub-category |
| createCat | Créer une catégorie | Create a category |
| addSub / addRule | Ajouter une sous-catégorie / Ajouter une règle | Add a sub-category / Add a rule |
| rule | Quand le libellé contient « {texte} », classer dans {catégorie} | When the label contains “{text}”, file under {category} |
| aiChip | Proposée par l'IA | Suggested by AI |
| applyTitle | Appliquer aux {n} opérations similaires ? | Apply to {n} similar operations? |
| applyText | Ces opérations ont le même libellé « {libellé} ». Elles passeront de {ancienne} à {nouvelle}. | These operations have the same label “{label}”. They will move from {old} to {new}. |
| more | et {n} de plus | and {n} more |
| makeRule | Faire de même pour les prochaines (créer une règle) | Do the same for future ones (create a rule) |
| apply / only | Appliquer aux {n} / Seulement celle-ci | Apply to {n} / Only this one |
| toast | {n} opérations classées dans {catégorie} | {n} operations filed under {category} |
| noRule | Corrigez une opération pour créer une règle automatiquement. | Correct an operation to create a rule automatically. |

## 10. Where used

D4 (S5, from the Spending screen and from Settings "Catégories et
règles"), A4 operation category change (S3, build sessions), filters
(B17) reuse the category list.
