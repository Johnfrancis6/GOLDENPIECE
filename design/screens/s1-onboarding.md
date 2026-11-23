# S1 — Launch and onboarding (O1-O18)

**Validated by Franco on 2026-11-23** (choices A, A, A, then "je valide"
on the preview: short sign-up flow with 5 dotted steps, card / questionnaire
/ account linking offered later from Home; one consents screen; preview as
a flow map + three key screens). Tokens: [../tokens.json](../tokens.json)
(`screen.onboarding`). Preview:
[../previews/s1-onboarding.png](../previews/s1-onboarding.png) (source
[../previews/s1-onboarding.html](../previews/s1-onboarding.html)).

Split (D13): this file and B19, B21 are designed; **B24** pieces (O6
persona card, O13c card-scan viewfinder, O14 questionnaire question, O15b
aggregator-style consent) and the **T** guided tour (O4, M11) are composed
by build sessions from validated items and reported in one line
(formats.md §7).

## 1. Flow

| Path | Screens | Step dots |
|---|---|---|
| First launch (everyone) | O1 Splash → O2 Language → O3 Country → O4 Guided tour → O5 Account or demo | O2 = 1/5, O3 = 2/5; O1, O4, O5 none (the tour has its own C17 dots) |
| Account branch | O7 Sign-up → O8 E-mail code → O10 Device security → O11 App PIN (when chosen, or when the phone has no lock) → O12 Consents → Home | O7-O8 = 3/5, O10-O11 = 4/5, O12 = 5/5 |
| Demo branch | O6 Persona → Home with the C14 "Démo" tag | none |
| Later, from Home | O13 Card (a-f), O14 Questionnaire, O15 Link account (a-c) — offered by B5 learning cards and C19 empty states (Comptes "Ajouter un compte"), never forced | O14 has its own 4-section C17 dots |
| Any time | O9 Login (from O7 "Déjà un compte ?"), O16 Install help (invite page, Settings), O17 Update required (at launch when version < `min_version`, blocking), O18 Lock (every opening after sign-up) | none |

Leaving the app mid-flow resumes at the last unfinished step. Back goes
to the previous step; on O2 back leaves the app. A demo user can create
an account later from Settings (→ O7, then the account branch).

## 2. Screens designed here

### O1 Splash
Native splash (`bg`), wordmark "GOLDENPIECE" in brand orange, line
"Prototype · données fictives" `caption` `text.secondary`; ≤ 3 s, no
network wait. The final app opening motion is M14 (designed last).

### O2, O5, O10, O13a, O13b, O16, O17 — B19
See [../blocks/b19-step-screen.md](../blocks/b19-step-screen.md) §4.
O5 copy: "Créer un compte ?" / "Gardez vos réglages et vos comptes reliés.
Ou découvrez l'app avec un profil fictif." / text button "Continuer en
démo" / primary "Créer un compte". O10 strong biometric: "Protégez
l'accès" / "Votre empreinte ouvrira l'app et confirmera les actions
sensibles." / "Plus tard" / "Activer l'empreinte".

### O3 Country (required)
Top bar with back + dots 2/5. Title "Votre pays de résidence" 24/32,
line "Cela ne change pas votre devise (F CFA par défaut)." `caption`.
C2 search pill "Rechercher un pays" 20 dp under. Heading "Suggestions"
(15/22 SemiBold) with 5 countries (the user's SIM country first when
known, then the F CFA zone), then "Tous les pays" A-Z (all ISO
countries, bundled, offline). Rows C6 56 dp: name left, dial code right
`text.secondary` tabular; one card per group; **no default selection**;
**tap = next step** (as B21). Search: accent-insensitive, name or code.

### O7 Sign-up, O9 Login
B18 form layout with C2 fields (e-mail, password with eye and strength
word), text link ("Déjà un compte ? Se connecter" / "Mot de passe oublié
?"), primary pinned ("Continuer" / "Se connecter"). Errors per C2;
rate limit on O9: C8 banner "Trop de tentatives. Réessayez dans 5 min."

### O8 E-mail code, O11 App PIN, O18 Lock
C3 + C4 frame (input-pin-keypad.md §2-3). O8: title "Code reçu par
e-mail", subtitle "Envoyé à {email} · Vérifiez vos spams", 6 boxes,
"Renvoyer le code (0:24)". O11: "Créez votre code" / "6 chiffres, pas
123456 ni votre date de naissance", then "Confirmez votre code";
trivial code → message "Ce code est trop simple." O18: no back, no dots;
"Entrez votre code" / "Pour ouvrir GOLDENPIECE"; the system biometric
prompt opens first when enrolled, this screen is the fallback, the
keypad fingerprint key reopens the prompt; 5 failures → 1 min wait (C3),
10 → full re-login (O9).

### O12 Consents
Top bar back + dots 5/5. Title "Vos accords", line "Vous pourrez les
changer dans Paramètres." One C7 list card, rows 64 dp, **control on
the right** (as C16):

| Row | Subtitle (1 line) | Control | Default |
|---|---|---|---|
| J'accepte le service | Prototype, données fictives · **Détails** | checkbox | unchecked (required) |
| Catégorisation par IA | Aucun nom envoyé · **Détails** | switch | off |
| Rapports de plantage | Anonymes · **Détails** | switch | off |

"Détails" (`brand.text` SemiBold, 48 dp target) opens a C9 sheet with the
full text (what is sent, where, version). Line under the card:
"Les notifications vous seront proposées plus tard, au bon moment." —
notifications are asked in context (first alert / budget). Primary
"Accepter et continuer" pinned, **disabled until the service box is
checked**. Each consent is stored with its version and date.

### O4, O6, O13c, O14, O15b
Delegated (D13): O4 = T guided tour (spotlight + bubble on demo Home,
5-7 steps, "Passer", replayable from Settings); O6 = 3 persona cards
(C7) with "Préparation de votre démo" loading ≤ 2 s; O13c, O14, O15b per
B24 in the README inventory.

## 3. States

| State | Rule |
|---|---|
| Offline | O1-O6, O10-O12 work offline; O7-O9 show C8 offline banner and keep the primary disabled; O17 primary needs a connection |
| Errors | inline (C2) or C8 banner; never a dialog except O17 |
| 200 % font | every screen scrolls with its primary pinned; keypads keep their digit size (C4 §4); dots label wraps under the dots; no overlap (D12) |
| Light theme | same layouts; colours from F1 |

## 4. Motion

Forward / back: F5 `screen` slide; B19 content stagger (b19 §6); dots
pill widens (C17). O1 → O2: cross-fade 320 ms. Reduced motion:
cross-fades only.

## 5. Accessibility

Each screen title is a heading and is announced on arrival; step label
read first ("Étape 2 sur 5"). Consents: checkbox/switch roles with
state; "Détails" reads "Détails sur le service, bouton". Country rows
read "Sénégal, indicatif plus 221".

## 6. Copy (FR / EN) — keys not in B19

| Key | FR | EN |
|---|---|---|
| O3.title | Votre pays de résidence | Your country of residence |
| O3.line | Cela ne change pas votre devise (F CFA par défaut). | This does not change your currency (CFA franc by default). |
| O3.search | Rechercher un pays | Search for a country |
| O3.suggest | Suggestions | Suggestions |
| O3.all | Tous les pays | All countries |
| O12.title | Vos accords | Your consents |
| O12.line | Vous pourrez les changer dans Paramètres. | You can change them in Settings. |
| O12.service | J'accepte le service | I accept the service |
| O12.service.sub | Prototype, données fictives | Prototype, fictitious data |
| O12.ai | Catégorisation par IA | AI categorisation |
| O12.ai.sub | Aucun nom envoyé | No name sent |
| O12.crash | Rapports de plantage | Crash reports |
| O12.crash.sub | Anonymes | Anonymous |
| O12.details | Détails | Details |
| O12.notif | Les notifications vous seront proposées plus tard, au bon moment. | We'll ask about notifications later, when they're useful. |
| O12.primary | Accepter et continuer | Accept and continue |
| O18.title | Entrez votre code | Enter your code |
| O18.sub | Pour ouvrir GOLDENPIECE | To open GOLDENPIECE |
| O18.forgot | Code oublié ? | Forgot your code? |
