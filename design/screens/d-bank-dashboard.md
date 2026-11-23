# D — Bank dashboard (web, analyst, 1280 px)

**Validated by Franco on 2026-11-23** (choices A, A, A; preview validated
"je valide"): three screens designed here — queue + alert detail with
decision (master-detail on one page) and "Réglages du modèle"; login +
TOTP, Ops tab, `/legal` and the dark theme are **delegated to build
sessions** (composed from validated items, choices reported in one line,
as D10/D13). Light theme by default, dark option with the same tokens.
Tokens: [../tokens.json](../tokens.json) (`screen.bankDashboard`).
Preview: [../previews/d-bank-dashboard.png](../previews/d-bank-dashboard.png)
· source [../previews/d-bank-dashboard.html](../previews/d-bank-dashboard.html).

Builds on F1-F6 (light tokens), C1 buttons, C2 input, C7 cards, C13
chips, C14 tags, C15 score badge, B4 compact row logic, B13/B15 reason
rows, B14 statuses, B23 device rows, G3 bars (daily history), X copy
(reason long/short, `.analyst` variants). Backend: docs/ARCHITECTURE.md
§7.4-7.5 (score, bounded tuning), `api.analyst_*` RPCs, aal2.

## 1. Data

Queue: escalated alerts `{alert_id, band, score, kind, status, tx{amount,
op_type, cp_name}, reasons[0], created_at, decided{by, at, simulated}}`
(Realtime). Detail: `tx` ISO fields, `reasons[{code, params, weight}]`,
components `{A_thr, A_if, F, rules[], M, bumps[]}`, user notification /
answer events, 90-day daily debits + median, security events, devices.
Settings: `ref.fraud_rules`, user-level z0 changes, `ops.param_changes`.

## 2. Layout (1280 × 800, desktop first; min width 1100)

| Part | Rule |
|---|---|
| Top bar | 56, `surface1`, hairline under: logo circle 28 (brand fill, "G" placeholder until M14) + "GOLDENPIECE" 15 SemiBold · bank name 14 `text.secondary`; tabs File d'alertes · Réglages du modèle · Ops (pills, selected `surface3` + SemiBold); right: "En direct" (green dot 8 + `#0B6B3A` text, grey "Hors ligne" when Realtime drops), analyst name, avatar 32 |
| Queue (left) | 420 wide, `surface1`, right hairline; title "File d'alertes" 20/28 + search icon; filter chips (C13, 32 high) **Statut · Score · Type · 24 h** (one line, each opens a menu); groups "En analyse · {n}" then "Décidées aujourd'hui" (12/16 SemiBold caps `text.secondary`) |
| Queue row | 2 lines, padding 10 × 20, hairline above: line 1 C15 badge with score (or outcome tag Légitime / Fraude after decision) + kind 13 `text.secondary` + amount 14 SemiBold tabular (right); line 2 reason **short** (X) 13/18, one line ellipsis + age 12 `text.secondary` (right); "Décision simulée" C14 neutral tag before the age (demo personas, S2-4). Selected: fill `#FFF3EC` + 3 dp brand bar at left |
| Detail head | padding 20 × 28: C15 badge "Banque prévenue · {score}" + status "En analyse · reçue il y a {n} min"; title = op type + operator + payee, 24/32 SemiBold; sub "Utilisateur U-{id} · {account masked} · alerte A-{id}" 13/18 `text.secondary`; right: "K Précédente · Suivante J" |
| Detail body | two columns (≈ 1.15 : 1, gap 20), sections 15/22 SemiBold titles, C7 cards radius 12: **Opération** (key-value 13/18: Montant XOF, Comptabilisée dd/mm/yyyy hh:mm:ss, Sens with ISO code, Type, Contrepartie (+ "nouvelle"), Part du solde, Référence E2E) · **Pourquoi** (≤ 3 reasons: icon 18, **long** sentence `.analyst` variant, C14 code tag + "Compte beaucoup / un peu") · **Score** (rows A_thr, A_if, F + fired rules, M + bumps, total "{S} / 100" in band colour, formula 11/16 `text.secondary`) · **Réponse de l'utilisateur** (notified time, opened time, answer Oui/Non with device, or "Pas de réponse") · scrolled: **90 derniers jours** (G3-style daily debit bars 360 × 112, grey `#BDBDBD`, this operation brand orange, dashed median, first/last date, line "14 bénéficiaires · 1 nouveau · Plus gros débit avant : {montant}") · **Événements de sécurité** (icon + event + date, 30 days) · **Appareils** (B23 rows, lock method in words) |
| Decision bar | pinned at the bottom of the detail, 84 high, `surface1`, hairline above: comment field (C2, 48, radius 12, placeholder "Ajouter un commentaire (obligatoire pour « Fraude »)…", grows to 3 lines) + C1 secondary "Légitime L" + C1 destructive confirm "Fraude F" (`#C8283C`, white label 5.5:1) |
| Shortcut legend | 12/16 `text.secondary` above the decision bar, right-aligned, only after scrolling or on "?" |

## 3. Keyboard

| Key | Action |
|---|---|
| J / K | next / previous alert in the queue |
| L | decide "Légitime" (comment optional) |
| F | decide "Fraude" (focuses the comment first if empty; Enter confirms) |
| C | focus the comment |
| / | search the queue |
| ? | shortcut sheet |
| Esc | leave the field / close the sheet |

Shortcuts are disabled while typing (except Esc). A decision shows a C11
toast "Décision enregistrée · Annuler" (8 s) and moves to the next
alert; Annuler is allowed until the toast closes (then the push N 4a/4b
leaves). Focus ring 2 dp `brand.text` + 2 dp offset (`#B4410F`).

## 4. Réglages du modèle

Title 24/32 + sentence "Les seuils 40 et 70 ne bougent jamais. Les
paramètres ci-dessous évoluent dans leurs bornes, chaque changement est
enregistré." Right: C1 secondary **outlined** "Rétablir les valeurs par
défaut" (`rotate-ccw`, loss text `#C8283C` on page 5.0:1; the filled grey
variant was 4.4:1) → C10 dialog "Rétablir les valeurs par défaut ?" /
"Tous les paramètres reviennent à leur valeur de départ. Le journal est
conservé." / Annuler · Rétablir.

Table (C7 card): Paramètre · Groupe · Valeur · Défaut · Bornes ·
Changé; rows 13/18, numbers right-aligned tabular; a value different from
its default is SemiBold `#B4410F`. User-level z0 values are not listed
per user (only in the log). Right column 380: "Journal des changements"
(before → after, cause, alert id, actor, date; newest first, paged by
20) + model version line. Editing a value by hand is **not** offered in
the prototype (bounded automatic tuning only, ARCHITECTURE §7.5).

## 5. States

| State | Rule |
|---|---|
| Empty queue | C19 alerts illustration, "Aucune alerte en analyse" / "Les nouvelles alertes arrivent ici en direct." |
| New alert (Realtime) | row fades in at its place (F5 `quick` + 8 dp rise); page title count "(1) GOLDENPIECE"; no sound |
| Decided by another analyst | detail shows C8 info banner "Décidée par {nom} à {heure}" and the decision bar is replaced by the outcome |
| Realtime lost | "Hors ligne" in the top bar + C8 warning banner; decisions disabled |
| Session aal1 (no TOTP) | redirect to login + TOTP (delegated screen) |
| Simulated decision (demo) | tag "Décision simulée" in the queue and the detail head |

## 6. Motion and accessibility

Motion: F5 `quick` fades only (no slides between alerts). Reduced
motion: 150 ms fades. WCAG 2.2 AA: every pair measured (2026-11-23): loss
text on page 4.99:1, brand text on selected row 5.21:1, secondary text
on selected row 6.14:1, white on Fraude 5.49:1, "En direct" green 6.61:1,
secondary text on chips 5.31:1. Targets ≥ 32 px with pointer, 48 px
for the decision buttons; full keyboard path; queue is a listbox,
detail a region labelled by the title; chart has a text summary.

## 7. Copy (FR / EN)

Reason sentences: X §1 (dashboard uses `.analyst` variants where the
user sentence says "vous").

| Key | FR | EN |
|---|---|---|
| tabs | File d'alertes · Réglages du modèle · Ops | Alert queue · Model settings · Ops |
| live / offline | En direct / Hors ligne | Live / Offline |
| filters | Statut · Score · Type · 24 h | Status · Score · Type · 24 h |
| groups | En analyse · {n} / Décidées aujourd'hui | Under review · {n} / Decided today |
| simulated | Décision simulée | Simulated decision |
| status | En analyse · reçue il y a {n} min | Under review · received {n} min ago |
| nav | Précédente · Suivante | Previous · Next |
| sections | Opération · Pourquoi · Score · Réponse de l'utilisateur · 90 derniers jours · Événements de sécurité · Appareils | Operation · Why · Score · User's answer · Last 90 days · Security events · Devices |
| comment | Ajouter un commentaire (obligatoire pour « Fraude »)… | Add a comment (required for "Fraud")… |
| decide | Légitime · Fraude | Legitimate · Fraud |
| toast | Décision enregistrée | Decision saved |
| settings.title | Réglages du modèle | Model settings |
| settings.intro | Les seuils 40 et 70 ne bougent jamais. Les paramètres ci-dessous évoluent dans leurs bornes, chaque changement est enregistré. | The 40 and 70 thresholds never move. The parameters below change within their bounds, and every change is logged. |
| settings.reset | Rétablir les valeurs par défaut | Restore defaults |
| settings.columns | Paramètre · Groupe · Valeur · Défaut · Bornes · Changé | Parameter · Group · Value · Default · Bounds · Changed |
| settings.log | Journal des changements | Change log |
| empty | Aucune alerte en analyse / Les nouvelles alertes arrivent ici en direct. | No alerts under review / New alerts arrive here live. |

## 8. Delegated (build sessions)

Login + TOTP (B18 form + C2/C3 code entry, centred card 400 wide), Ops
tab (push latency, batch status, quotas, model evaluation, funnel: B7
tiles + G1/G3 charts, one chart per card), `/legal` (text page), dark
theme (same tokens as the app dark theme). Each is previewed at 1280 by
the build session and reported in one line.

Validation: 2026-11-23.
