# B19 — Step screen (onboarding and one-off full screens)

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: 96 dp tinted icon circle; primary button pinned at the
bottom with the text button just above it; C17 step dots only in the
sequential sign-up flow). Tokens: [../tokens.json](../tokens.json)
(`block.stepScreen`). Preview:
[../previews/b19-step-screen.png](../previews/b19-step-screen.png)
(source [../previews/b19-step-screen.html](../previews/b19-step-screen.html)).

Builds on C1 (buttons), C12 (back arrow), C16 (choice list), C17 (step
dots), C15 (yellow warning pair), F4 (Lucide icons), F5 (motion).

Used by: O2 Language, O5 Create account / demo, O10 Device security
(4 variants), O13a Card explanation, O13b Camera rationale, O16 Install
help, O17 Update required, L5 (alerts first-time explanation).

## 1. Purpose

One screen = one idea = one action (brief §2.2, low literacy). The user
reads an icon, a short title and at most three lines, then taps one
button. Optional steps offer a quiet way out ("Plus tard").

## 2. Data

Static copy per step (`step.id`, `title`, `text`, `primaryLabel`,
`secondary?` {label, action}, `icon`, `tone` neutral | warning,
`progress?` {index, total}, `slot?` (choice list, version line)).
O17 reads `min_version` and the installed version; O10 reads the
detected security level.

## 3. Anatomy (360 × 800, top → bottom)

| Part | Rule |
|---|---|
| Top bar | 56 dp. Back arrow C12 (48 dp target, left 8) — absent on the first step (O2) and on blocking screens (O17). Step indicator centred: C17 dots + "Étape n sur N" 13/18 `text.secondary`, 6 dp gap |
| Icon | Lucide 48 dp, stroke 1.75, in a **96 dp circle**, centred, 56 dp under the top bar. Neutral: circle brand tint `rgba(255,122,47,0.16)` dark (≈ `#2E190D`) / `#FFE9DC` light, glyph `#FF7A2F` dark (6.4:1) / `#B4410F` light (4.8:1). Warning (O10 weak/none, L5 if needed): C15 yellow pair, circle `rgba(242,201,76,0.16)` / `#FBF0CC`, glyph `#F2C94C` (9.6:1) / `#735200` (6.3:1). Static, decorative (TalkBack ignores it) |
| Title | `titleScreen` 24/32 SemiBold, centred, 24 dp under the icon, ≤ 2 lines at 100 % |
| Text | 15/22 Regular `text.secondary`, centred, 8 dp under, ≤ 3 lines at 100 % |
| Slot (optional) | 28 dp under the text: a C16 choice list in one C7 card (O2: Français / English, radio right, selected orange SemiBold), or a version line 13/18 `text.secondary` 16 dp under (O17: "Votre version 0.3.0 · minimum 0.4.0"). Never more than one slot |
| Bottom (pinned) | 20 dp side margins, 16 dp above the system area. C1 **text button** 48 dp (`brand.text`), then 4 dp, then C1 **primary large** full width 52 dp. Text button absent when the step has no way out |

The text button is "Plus tard" by default; a step may replace it with a
more useful single action (O10: "Verrouiller mon téléphone" opens the
Android security settings). Never two text buttons.

## 4. Variants

| Step | Icon | Tone | Top bar | Text button | Primary |
|---|---|---|---|---|---|
| O2 Language | `languages` | neutral | dots, no back | none (required) | Continuer |
| O5 Account or demo | `user-round-plus` | neutral | dots + back | "Continuer en démo" | Créer un compte |
| O10 strong biometric | `fingerprint` | neutral | dots + back | Plus tard | Activer l'empreinte |
| O10 weak biometric | `scan-face` | warning | dots + back | Plus tard | Créer un code |
| O10 phone secret | `smartphone` | neutral | dots + back | Plus tard | Utiliser mon code de téléphone |
| O10 none | `lock-open` | warning | dots + back | Verrouiller mon téléphone | Créer un code |
| O13a Card explanation | `credit-card` | neutral | dots + back | Plus tard | Scanner ma carte |
| O13b Camera rationale | `camera` | neutral | dots + back | Saisir à la main | Autoriser la caméra |
| O16 Install help | `download` | neutral | back only | none | J'ai compris |
| O17 Update required | `refresh-cw` | neutral | none (blocking) | none | Mettre à jour |
| L5 Alerts explanation | `shield-check` | neutral | back only | none | J'ai compris |

Step dots appear **only in the sequential sign-up flow** (O2 → O12); the
exact N is fixed by S1 (preview shows 6 as a placeholder). One-off screens
(O16, O17, L5) have no dots. Copy above is the default; build sessions may
shorten it to fit the line limits (formats.md §7).

## 5. States

| State | Rule |
|---|---|
| Primary loading | C1 loading state (spinner in the button), text button disabled |
| Offline | O2, O10, O13a/b, O16, L5 work offline; O17 primary opens the invite page when online, else C11 toast "Pas de connexion" |
| 200 % font | icon circle 64 dp (glyph 32), top bar grows to fit the label; content scrolls under a 40 dp fade to `bg`; both buttons stay pinned and wrap their label (centred); no text overlaps (D12) |
| Back on O17 | system back does nothing (blocking); the app cannot be used below `min_version` |

## 6. Motion

Enter (forward): F5 `screen` slide. Content: icon fades in + scale 0.92 → 1,
then title and text fade in with 8 dp rise, 60 ms stagger, 220 ms each
(`enter`); buttons are present from the start (no delay to act). Dots: the
current pill widens (C17). Reduced motion: 150 ms cross-fade only.

## 7. Accessibility

Reading order: step label ("Étape 5 sur 6"), title (heading), text, slot,
text button, primary. Targets ≥ 48 dp. The icon is decorative; the tone is
carried by the words (warning titles state the risk), never by colour alone.

## 8. Performance

Static vectors, one SVG per screen, no illustration files, no Lottie;
animations on opacity/transform only.

## 9. Copy (FR / EN) — preview steps

| Key | FR | EN |
|---|---|---|
| progress | Étape {n} sur {N} | Step {n} of {N} |
| later | Plus tard | Later |
| O2.title | Choisissez votre langue | Choose your language |
| O2.text | Choose your language | Choisissez votre langue |
| O2.primary | Continuer | Continue |
| O10none.title | Votre téléphone n'est pas verrouillé | Your phone is not locked |
| O10none.text | Sans code ni empreinte, quelqu'un qui prend votre téléphone peut ouvrir l'app. Créez un code GOLDENPIECE à 6 chiffres. | Without a code or fingerprint, anyone who picks up your phone can open the app. Create a 6-digit GOLDENPIECE code. |
| O10none.secondary | Verrouiller mon téléphone | Lock my phone |
| O10none.primary | Créer un code | Create a code |
| O17.title | Mise à jour nécessaire | Update required |
| O17.text | Cette version n'est plus prise en charge. Installez la nouvelle pour continuer. Vos données sont conservées. | This version is no longer supported. Install the new one to continue. Your data is kept. |
| O17.version | Votre version {v} · minimum {min} | Your version {v} · minimum {min} |
| O17.primary | Mettre à jour | Update |

## 10. Build instructions

Compose one `StepScreen` component with the props of §2; every variant is
data. Check each step at 360 × 800, 100 % and 200 % font; report wording
changes in one line.
