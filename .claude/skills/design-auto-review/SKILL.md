---
name: design-auto-review
description: Automatic quality review of a design preview before Franco sees it — typography scale, 4 dp grid, contrast of text and graphic marks in dark and light, overlapping text, clipped or flex-squeezed graphics, text that does not fit, off-token colours, D11 clean-screen thresholds, touch targets, and the 200 % font pass. Use it on every preview HTML in design/previews (it also runs by hook after each write), before sending any PNG, and whenever Franco reports something cut, overlapping, unreadable or cluttered.
---

# design-auto-review — scripts first, eyes last

Franco found bugs that a script finds in a second (the Home ring squeezed from 56 to 41 px survived a validation;
labels too long in S7, W, B21; an off-token red in B16; overlapping text before D12). This skill runs those checks
so his review is spent on taste, not on defects.

## Run
```
node design/tools/lint-preview.js design/previews/<file>.html            # 100 %, both themes (every .ph frame)
node design/tools/lint-preview.js design/previews/<file>.html --font2x   # 200 % font pass
```
Output is capped (`--max 12` lines per check; `--json out.json` for everything). Exit code 1 = errors.

| Check | Severity | Meaning / usual fix |
|---|---|---|
| overlap | ERROR | two text runs intersect (D12) → move, shorten, stack |
| clip | ERROR | graphic squeezed by flex shrink (→ `flex:none` / class `ic`), text cut by an overflow box or the phone edge |
| contr | ERROR | text < 4.5:1 (3:1 large); "mark" lines are graphics < 3:1 = warning (decorative tracks may pass) |
| annot | ERROR | a caption outside the phone covers it → move it under the phone |
| d11 | ERROR | > hero + 3 blocks on the first screen, > 1 header action, row side > 2 lines (needs data-* marks) |
| type | warn | size/line height not in tokens → use a `.t-…` class or raise a token |
| grid | warn | padding/margin/gap not a multiple of 4 |
| colour | warn | colour not in tokens.json → use the token, or raise it to Franco |
| tap | warn | interactive element < 48 dp |
| strip, contrEst | warn | last pill cut in a scroll strip / contrast against a gradient (check by eye) |

## Then
1. Fix every ERROR in the HTML and re-run until `errors: 0` (the 200 % pass may keep errors that are by design —
   fixed status bar, a chart that switches to lists; list them in the item's "200 %" section instead of hiding them).
   Use `data-lint-ignore="clip|overlap|type"` only for something deliberate, with an HTML comment saying why.
2. Warnings: fix type/colour ones (they drift the system); grid ones when cheap.
3. **One** look at the PNG (scale 1 is enough for yourself) for what scripts cannot judge: icon meaning at size
   (RULES I2), visual balance, D11 "when in doubt, remove", reduced elements, colour harmony with neighbours.
   Each issue you fix by eye that a script could catch → `design-feedback-learner` (add a check).
4. Report to the caller in ≤ 5 lines: errors fixed, warnings left and why, by-eye findings.

## What it cannot do
Measure performance (fps, GPU cost of gradients) or the real Tecno screen; judge taste. Say so; never claim it.
