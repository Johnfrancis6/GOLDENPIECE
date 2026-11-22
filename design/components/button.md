# C1 — Button

**Validated by Franco on 2026-11-22.** Tokens: [../tokens.json](../tokens.json)
(`component.button`). Preview: [../previews/c1-button.png](../previews/c1-button.png).

## 1. Purpose

Every tappable action with a text label, plus icon-only buttons. One
primary action per screen area.

## 2. Variants

| Variant | Dark | Light | Use |
|---|---|---|---|
| **Primary** | fill `brand.fill` `#FF7A2F`, label `#060606` | same | the main action ("Continuer", "Oui, c'est moi") |
| **Secondary** | fill `surface3` `#222222`, label `text.primary` | fill `surface3` `#E5E5E5`, label `text.primary` | the alternative ("Plus tard", "Non") — **grey solid** (Franco) |
| **Text** | label `brand.text`, no fill | label `brand.text` `#B4410F` | low-weight links in cards ("Voir tout") |
| **Destructive text** | label **`#FF9AA4`** (lighter than `loss`, Franco: more contrast) | label `loss` `#C8283C` | starts a destructive flow ("Supprimer le compte") |
| **Destructive confirm** | fill `loss` `#FF6B7A`, label `#060606` | fill `loss` `#C8283C`, label `#FFFFFF` | only the final confirmation in a sheet ("Supprimer") |
| **Icon** | 40 dp circle `surface3` + 24 dp icon, or icon alone ("ghost") | same | add, more, header actions |

Rules: one primary per screen area; primary and secondary side by side
or stacked with the primary first (top or left); never two primaries.

## 3. Sizes (dp)

| Size | Height | Label style | Padding | Where |
|---|---|---|---|---|
| Large | 52 | `button` 15/20 SemiBold | 20 sides, full width | bottom-pinned (F3: 20 margins, 16 above system area, 40 clear above) |
| Small | 40 | 13/18 SemiBold | 16 sides (text button 12) | inside cards, sheets, rows |
| Icon | 40 | — | — | header (icon 24) |

Radius: pill (999). Gap between buttons: 8. Every button has a **≥ 48 dp
touch area** (40 dp buttons get invisible hit slop).

## 4. States

| State | Look | Motion (F5) |
|---|---|---|
| Pressed | primary → `brand.fillPressed` `#E8661F`; secondary → `#2E2E2E` dark / `#D6D6D6` light; scale 0.97 | `press` 220 ms, `standard` |
| Disabled | fill `surface2`, label `text.disabled`; not focusable for action, still read ("désactivé") | — |
| Loading | label replaced by Lucide `loader-circle` 20 dp turning (1 turn / 900 ms, linear); width kept; taps ignored | reduced motion: spinner replaced by a 3-dot opacity pulse |
| Focus (keyboard / switch) | 2 dp `focus` ring, 2 dp offset | — |

No haptics on buttons (Franco, 2026-11-22).

## 5. Accessibility (measured)

| Pair | Contrast |
|---|---|
| `#060606` on primary `#FF7A2F` | ≥ 4.5 (F1 §7) |
| secondary label on `surface3` | 14.6 dark / 15.7 light |
| text button `brand.text` on bg | 7.8 dark / 5.2 light |
| destructive text `#FF9AA4` on bg dark | 10.0 (was 7.4 with `loss`) |
| destructive text `#C8283C` on bg light | ≥ 4.5 (F1 `loss`) |
| destructive confirm label | 7.4 dark / 5.5 light |

The grey secondary fill has 1.3:1 against the page: allowed (WCAG 1.4.11
does not require a boundary when the label identifies the control); it is
the Finary look. Labels are verbs, French first ("Continuer" /
"Continue"). Icon buttons always have an accessibility label. At 200 %
font the label wraps on 2 lines and the button grows; it never
truncates.

## 6. Performance

Flat fills, no shadow or gradient; press animation on transform only.

## 7. Where used

Everywhere: onboarding steps, sheets, alert decision (B13 "Oui, c'est
moi" / "Non"), settings, empty states.
