---
name: design-feedback-learner
description: Turns each piece of Franco's design feedback into a durable rule so the same correction is never needed twice — writes it to design/RULES.md, adds an automatic check to lint-preview.js when the rule is measurable, and applies it to already-validated items when he says so. Use it whenever Franco corrects or validates with a change ("je valide, mais…", "corrige", "désormais…", "à partir de maintenant…", "trop…", "pas assez…", "on ne voit pas…"), when he catches a defect in a preview, or when you fix something by eye that a script could catch.
---

# design-feedback-learner — every correction becomes a rule

D11 (clean screens) and D12 (no overlapping text) were written only after problems repeated. This skill writes the
rule the first time.

## Steps
1. **Extract the rule** behind the correction, general enough to reuse but true to his words. Example:
   "pas de 'Revenus' au-dessus du Sankey, et désormais ajuste pour la lisibilité, jamais de texte qui se chevauche"
   → item fix (remove the label) + rule L3 (no text overlaps, 100 % and 200 %).
   One-off taste for this item only → write it in the item file, not in RULES.
2. **Classify the check**: `lint:<check>` if a script can measure it (overlap, size, count, contrast, colour,
   length, spacing), `eye` if it needs a look, `ask` if it is a choice only Franco makes.
3. **Append** one row to the right table of `design/RULES.md` (Process, Look and layout, Icons, Motion):
   `| <next id> | <rule, one line> | <item/session, date> | <check> |`. Merge with an existing rule rather than
   adding a near-duplicate. A rule that changes a decision D1-D13 goes to README decisions too.
4. **Automate** when `lint:`: add the check to `design/tools/lint-preview.js` (a new key in `out`, a severity in `SEV`,
   a row in the design-auto-review table), then run it on all previews
   (`for f in design/previews/*.html; do node design/tools/lint-preview.js "$f" --max 2; done | grep -B1 ERROR`)
   to see which validated items break it. List them to Franco; fix only those he agrees to ("oui pour C12 aussi").
5. **Say it in one line** to Franco: "Règle ajoutée : <rule> (vérifiée automatiquement / à l'œil)."
6. Commit RULES.md (and lint changes) with the item.

## Why short
RULES.md is read whole by every design session; keep each rule one line and the file under ≈ 6 KB. When it grows,
merge rules, never drop one silently.
