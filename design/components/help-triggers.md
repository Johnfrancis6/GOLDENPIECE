# C20 — Help triggers ("?", "En savoir plus", eye)

**Validated by Franco on 2026-11-22** ("?" icon after the word; showing
hidden amounts asks for fingerprint or phone code). Tokens:
[../tokens.json](../tokens.json) (`component.help`). Preview:
[../previews/c20-help-triggers.png](../previews/c20-help-triggers.png).

## 1. "?" on jargon

- Lucide `circle-help` **16 dp**, `text.secondary`, placed right after
  the word (gap 2 dp), on the same baseline; never alone.
- Touch target **48 dp** centred on the icon (invisible hit slop; it may
  overlap padding, never another target).
- Tap → short C9 sheet: title = the word, ≤ 3 sentences (first in
  `text.primary`), optional "En savoir plus" (B12). Press feedback: icon
  scale 0.92 (`press`).
- Where: every jargon word (volatilité, bêta, VaR, CVaR, perte maximale,
  TWR, TRI, contribution, effet de change, score…), once per screen
  section — not on every repeat of the word.
- TalkBack: "Volatilité, aide, bouton" → opens the sheet.

## 2. "En savoir plus"

Text button C1 (`brand.text`, 15 SemiBold, 48 dp target) under a short
help sentence or at the end of a "?" sheet. Opens a **tall C9 sheet**
inside the app (method, example); never an external browser.

## 3. Eye — hide / show amounts (changes C5 §5)

| Action | Behaviour |
|---|---|
| Hide (tap `eye`) | **immediate**: amounts cross-fade to "••• F CFA" (`quick` 320 ms, no blur); icon becomes `eye-off`; percentages stay visible (C5) |
| Show (tap `eye-off`) | **sensitive action**: Android system prompt (BiometricPrompt, fingerprint or device code, drawn by the system). Success → amounts fade in; cancel or failure → stay hidden, nothing else |
| App closed after a reveal | amounts are **hidden again** at the next start |
| Hidden by the user | stays hidden across starts (C5) |
| Never hidden | amounts visible, no prompt |

Prompt copy: "Afficher les montants" / "Utilisez votre empreinte ou le
code de votre téléphone" (EN: "Show amounts" / "Use your fingerprint or
your phone's code"). A phone without lock screen: reveal is immediate
and Settings suggests setting a lock. Widgets and notifications follow
the hidden state (N, W).

Accessibility: eye labelled "Masquer les montants" / "Afficher les
montants"; amounts read "montant masqué".

## 4. Performance

Icon swap and text cross-fade only; the system prompt costs nothing to
the app's frame budget.

## 5. Where used

"?": P6, P8, P9, D1 indicators, L4/A3 score, B7 stat tiles. Eye: header
of Home, Comptes, Dépenses, Placements (C12), widgets.
