# C8 Banner · C10 Dialog · C11 Toast

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.banner`, `component.dialog`, `component.toast`). Previews:
[../previews/c8-c10-c11-feedback.png](../previews/c8-c10-c11-feedback.png),
animated [../previews/c8-c10-c11-feedback.html](../previews/c8-c10-c11-feedback.html)
(toast at the bottom, §3).

## 1. C8 — Banner (persistent state)

- Under the screen header, inside the 20 dp margins; radius 12; padding
  12 × 14; gap 10; Lucide icon 20 dp; text 13/18 Medium `text.primary`;
  optional action as a text button on the right ("Réessayer").
- **Stays while the problem exists**; no close button (Franco).

| Kind | Example (FR) | Icon | Dark fill / icon | Light fill / icon |
|---|---|---|---|---|
| warning | "Hors ligne. Données du 18 nov., 14:05." | `wifi-off` | `rgba(242,201,76,0.16)` / `#F2C94C` | `#FBF0CC` / `#735200` |
| error | "Synchronisation impossible." + Réessayer | `circle-alert` | `rgba(255,107,122,0.16)` / `#FF6B7A` | `#FCE3E6` / `#B21F33` |
| info | "Données de plus de 7 jours." | `history` | `#222222` / `#A3A3A3` | `#E5E5E5` / `#5C5C5C` |

Appears with a `quick` fade + 8 dp rise; leaves with a fade. Announced
once by TalkBack (polite live region).

## 2. C10 — Dialog

- Centred card over the scrim (`rgba(0,0,0,0.64)`), margins 20, radius
  20, padding 24/20/20; dark fill `surface2`, light `#FFFFFF`.
- Title 18/26 SemiBold; body 15/22 `text.secondary`; buttons in a row
  (48 dp, C1): **Annuler** (secondary) left, action right.
- **Typed delete** (delete account): field labelled "Tapez SUPPRIMER pour
  confirmer" (48 dp, radius 12, focus border `brand`); the **Supprimer**
  button (C1 destructive confirm) stays disabled until the exact word is
  typed (case-insensitive).
- Blocking variant (O17 update required): one button, no scrim dismiss,
  back does nothing.
- Motion: scrim fades (`quick`); card fades and scales 0.96 → 1
  (`quick`, `enter`). Reduced motion: fade only. Focus moves to the title;
  back closes (except blocking).

## 3. C11 — Toast (short confirmation)

- **Position: bottom**, above the bottom bar (or 16 dp above the system
  area on screens without it), 20 dp side margins (Franco: "ramène le
  bandeau en bas").
- Pill 48 dp high; dark fill `#222222` + 1 dp `rgba(255,255,255,0.10)`
  border, text `#F5F5F5`; light fill `#0A0A0A`, text `#FFFFFF`. Icon
  `circle-check` 20 dp in `gain` (`#3DD68C` both themes); action
  "Annuler" SemiBold in `#FF7A2F` dark / `#FF9A5C` light.
- Visible **4 s** (longer if it has an action and TalkBack is on: 8 s);
  one toast at a time, a new one replaces the old.
- **Unfold animation** (Franco): the background starts as a small pill
  at the centre (scaleX 0.12, transparent) and unfolds to full width
  (450 ms, `enter` easing, opacity in 200 ms); the content fades in after
  220 ms (320 ms). Exit: content fades (200 ms), background folds back to
  the centre (320 ms, `exit`) and fades. Transform and opacity only.
  Reduced motion: appears and disappears with a 150 ms fade.
- Variants: success (`circle-check`), queued offline ("En attente de
  connexion", `clock`), conflict ("Modifié sur un autre appareil",
  `circle-alert` in `warning`).

## 4. Accessibility

Banners and toasts are polite live regions; toasts never carry the only
way to do something (Annuler is also reachable from the item). Dialog
traps focus; buttons ≥ 48 dp; texts ≥ 4.5:1 (tag colours as C14).

## 5. Where used

C8: every screen state (offline, stale data, sync error). C10: Settings
(delete account, sign out), O17. C11: A4 category change, P3, Settings.
