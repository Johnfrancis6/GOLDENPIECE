# C18 Skeletons · C19 Empty state (+ failed-load state)

**Validated by Franco on 2026-11-22** (with changes: slower connection
animation, a stop state for an unstable connection with a wifi + "!"
illustration; the piggy bank is the default empty illustration).
Tokens: [../tokens.json](../tokens.json) (`component.skeleton`,
`component.emptyState`). Previews:
[../previews/c18-c19-loading-empty.png](../previews/c18-c19-loading-empty.png),
animated [../previews/c18-c19-loading-empty.html](../previews/c18-c19-loading-empty.html).

## 1. C18 — Skeletons (loading, M4)

Drawn from the cached layout (brief §2.1): the same rows, cards and
header as the loaded screen, in grey shapes.

| Part | Rule |
|---|---|
| Text bars | static (no pulse, no shimmer); fill `#222222` dark / `#E5E5E5` light; radius 6; heights 12 (title), 10 (subtitle); hero bar 28, radius 8 |
| Row icon slot | 40 dp circle `surface3` with a **grey bank icon** (Lucide `landmark` 20 dp, `text.disabled`) on every screen, Placements included (Franco) |
| Connection badge | 20 dp circle in the card fill (cut-out) at the icon's top right (−4 / −6 dp), Lucide `wifi` 14 dp: base arcs `text.disabled` at 55 % opacity |
| Connection animation | the orange arcs light **one by one**: dot → small → middle → large arc, hold, all fade out, loop; cycle **2.8 s** (Franco: slower), steps at 0 / 14 / 28 / 42 % of the cycle, each fades in over 8 % of the cycle, hold until 70 %, fade out by 86 %. Orange `#FF7A2F` dark / `#E8661F` light. All badges share one clock (they light together) |
| Screens without rows | one bank icon + badge, centred once in the main skeleton block (chart, card) |
| Loaded | skeleton fades out and content fades in together, `quick` 320 ms, `enter` easing; no layout jump (skeleton boxes = final boxes) |
| Reduced motion | no loop: the badge shows the orange dot only, arcs grey |

Only opacity animates (one opacity per arc path); the loop stops as soon
as the screen leaves view or loading ends.

## 2. Failed load — "Connexion instable" (stop)

When a request cannot complete (no answer after **15 s**, or the request
fails because the connection is unstable) **and nothing is cached**:

- The animation **stops**; the skeleton fades out (200 ms, `exit`) and
  the failure state fades in (320 ms, `enter`).
- Layout = C19 (below) with the illustration **wifi + exclamation mark**:
  Lucide `wifi` scaled to 82 × 56 dp in `text.secondary` and a "!" on
  its right in orange (`#FF7A2F` dark / `#E8661F` light), strokes 2.5 dp
  (the "!" 3.2 dp).
- Copy: "Connexion instable" / "Impossible de charger [vos comptes] pour
  le moment. Vérifiez votre connexion, puis réessayez." EN: "Unstable
  connection" / "We can't load [your accounts] right now. Check your
  connection, then try again."
- Primary button **"Réessayer"** with Lucide `rotate-cw` → back to the
  skeleton. When Android reports the network is back, the app retries
  once by itself.
- When cached data exists, this state is **not** used: the cached screen
  stays and the C8 banner ("Synchronisation impossible." + Réessayer)
  says it (C8 unchanged).

## 3. C19 — Empty state

| Part | Rule |
|---|---|
| Position | centred horizontally, 36 dp under the large title (C12), 20 dp margins |
| Illustration | **piggy bank with coins on the ground** by default on every empty screen (Franco may customise some later): Lucide `piggy-bank` scaled 3.4× in `text.secondary`, a ground line (`#3A3A3A` dark / `#D6D6D6` light), a stack of 3 coins on the left, one standing coin and one flat coin on the right in gold `#FFB45C` dark / `#D9822B` light; all strokes 2.5 dp, round caps (Lucide style); box 168 × 88 dp; static |
| Title | 18/26 SemiBold `text.primary`, 20 dp under the illustration |
| Sentence | 15/22 `text.secondary`, specific to the screen (brief §3), ≤ 2 lines at 100 % |
| Action | **one** primary button C1, auto width (padding 24), 52 dp, optional leading icon (`plus` to add, `rotate-cw` to retry), 24 dp under the text |

Examples: Comptes "Aucun compte pour l'instant" / "Ajoutez un compte
bancaire ou mobile money pour suivre votre argent ici." + "Ajouter un
compte"; Dépenses "Pas encore de budget" / "Fixez un montant par
catégorie pour savoir ce qu'il vous reste ce mois-ci." + "Créer un
budget". Each screen's sentence comes from the brief §3 empty list.

## 4. Accessibility

- Skeleton: the screen announces "Chargement" once (polite); skeleton
  shapes are hidden from TalkBack; the loop never flashes (< 3 changes/s).
- Illustrations are decorative (`aria-hidden`); the title carries the
  meaning. Texts ≥ 4.5:1 (F1 pairs); button 52 dp.
- 200 % font: text wraps, the illustration keeps its size, the block
  scrolls if needed.

## 5. Performance

Bars are static; the badge loop is 4 opacity animations on the UI thread
with a shared clock, paused off-screen. Illustrations are static vectors
drawn once. Target: no frame drop during loading on the reference phone.

## 6. Build instructions

Check at 100 %/200 % font that skeleton boxes match the loaded boxes
(no jump) and the 15 s timeout does not fire on a slow but working
network (measure on the Tecno; adjust to 20 s if needed and report in
one line, formats.md §7).

## 7. Where used

C18: every screen that loads (Home, A1-A4, P1-P9, D1-D4, L1). Failed
load: same screens without cache. C19: Home, P1, D1, D3, L1, A2 and
every list that can be empty.
