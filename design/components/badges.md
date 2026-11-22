# C21 — Institution and category badges

**Validated by Franco on 2026-11-22** (categories in colour, choice B;
mobile-money operators as monograms like banks). Changes F4 §4
(categories were grey; mobile money was a `wallet` icon). Tokens:
[../tokens.json](../tokens.json) (`component.badge`). Preview:
[../previews/c21-badges.png](../previews/c21-badges.png).

## 1. Institution badge (bank or mobile-money operator)

- Circle; **2 initials** SemiBold `#060606` on a fixed colour from the
  dark chart series (`#D95926`, `#9085E9`, `#199E70`, `#3987E5`,
  `#C98500`, `#D55181`; initials ≥ 5.1:1), same in both themes; assigned
  once per institution id, never changes (F4).
- Banks **and** mobile-money operators use it (Franco); the row subtitle
  says "Banque" or "Mobile money" + masked number. All institutions are
  fictitious (Banque Baobab, Kola Money, Caisse Sahel, Savane Pay…); no
  real logos.
- Generic bank (picker header, unknown bank): Lucide `landmark` on
  `surface3`, as the C18 skeleton.

## 2. Category badge

Circle with a light tint of the category hue and the icon in the crisp
hue. Dark tint = hue at 16 % over `surface1`; light tint = hue at 12 %
over white. Icon vs tint ≥ 3:1 (measured by script).

| Category | Lucide | Dark (icon on tint) | Light (icon on tint) |
|---|---|---|---|
| Courses | `shopping-cart` | `#FF9A5C` on `#37271d` (6.82:1) | `#B8500F` on `#f6eae2` (4.24:1) |
| Transport | `bus` | `#6AA8FF` on `#1f2937` (6.05:1) | `#1F5FBF` on `#e4ecf7` (5.12:1) |
| Restaurant | `utensils` | `#FFC940` on `#372e19` (8.73:1) | `#8A6200` on `#f1ece0` (4.65:1) |
| Logement | `house` | `#A99BFF` on `#292737` (6.13:1) | `#5B47D1` on `#ebe9f9` (5.37:1) |
| Factures | `receipt-text` | `#9DB0C7` on `#272a2e` (6.50:1) | `#4A5D75` on `#e9ecee` (5.68:1) |
| Santé | `heart-pulse` | `#FF7B8A` on `#372224` (5.97:1) | `#C02D45` on `#f7e6e9` (4.71:1) |
| Éducation | `graduation-cap` | `#A8D86A` on `#29311f` (8.17:1) | `#4E7D12` on `#eaefe3` (4.21:1) |
| Loisirs | `gamepad-2` | `#F08ACB` on `#35242f` (6.37:1) | `#B0307E` on `#f6e6f0` (4.90:1) |
| Revenus | `banknote` | `#4CD68F` on `#1a3125` (7.50:1) | `#16894F` on `#e3f1ea` (3.82:1) |
| Épargne | `piggy-bank` | `#5FD0E8` on `#1d3033` (7.67:1) | `#0B6F8F` on `#e2eef2` (4.82:1) |
| Transferts | `arrow-left-right` | `#A3A3A3` on `#282828` (5.84:1) | `#5C5C5C` on `#ebebeb` (5.61:1) |
| Autres | `circle-ellipsis` | `#A3A3A3` on `#282828` (5.84:1) | `#5C5C5C` on `#ebebeb` (5.61:1) |

`receipt-text` replaces `receipt` (no dollar sign). New categories take
the next free hue from this table's family and are measured the same
way; never more than these hues in one list. Amounts stay `text.primary`
(income in `gain`, C5): colour marks the category, not good/bad.

## 3. Sizes

| Size | Circle | Initials | Icon | Where |
|---|---|---|---|---|
| Small | 24 | 10 | 14 | inside text, chips, filter sheet |
| Row | 40 | 13 | 20 | C6 rows (A1, A2, D1-D4, O13f, O15a) |
| Large | 56 | 18 | 28 | account detail header (A2), category detail (D4) |

## 4. Accessibility

Badges are decorative next to the name (TalkBack reads the row text);
alone (small size in a chip) they carry a label ("Courses",
"Banque Baobab"). Colour is never the only cue: icon or initials + name.

## 5. Where used

A1-A4, D1-D4 (category lists, budgets, Sankey labels), O13f, O15a,
B21 institution picker, filters (C13), notifications (N).
