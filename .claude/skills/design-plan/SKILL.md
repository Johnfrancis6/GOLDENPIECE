---
name: design-plan
description: Turns Franco's design goal into a short, validated plan before any design work starts — sections, items in order, which items need his eye and which can take defaults, references to ask for, cost estimate. Use it whenever Franco states a new mobile/app design goal or a batch of screens to design or redesign ("je veux designer…", "on fait l'écran…", "refais la section…", "nouvelle app", "nouvelle section"), even if he does not ask for a plan; also when he asks how many steps remain.
---

# design-plan — goal → plan → Franco validates

Franco gives a goal; you decide the plan; he validates once; then `design-build-item` runs item by item.
His time is the scarce resource: one validation of a good plan replaces dozens of small questions later.

## Steps

1. **Read only the state** (≈ 5k tokens, not the 220 KB the old sessions read):
   `design/STATE.md`, `design/RULES.md`, the README decisions (`sed -n '/^## Decisions/,/^## Inventory/p' design/README.md`)
   and the inventory rows the goal touches (`grep -n "<keyword>" design/README.md design/INDEX.md`).
2. **Break the goal into items** using the existing vocabulary (F foundations, C components, G charts, B blocks,
   S screens). Reuse validated items first; a new item exists only when nothing validated covers it (D10/D13 show
   that whole sections can be composed by build sessions instead).
3. **Classify each item** — this is what saves tokens and his time:
   - **Decide** (visible across many screens, brand, motion feel, a new pattern) → question round + preview.
   - **Default** (composed from validated pieces, low visual risk) → build with the recommended defaults, show one
     preview, no question round (he answered "A, A, A" to almost every round in past sessions).
   - **Delegate** (pure composition, already specified) → leave to build sessions, one line in the plan.
4. **Group the references ask**: one request per section, before its first item (Home v1 was redrawn after a late
   reference image — RULES P8).
5. **Write the plan** to `design/PLAN.md` (English) and show Franco a French summary in chat:

```
Objectif : <one sentence>
Sections : <n> · éléments : <n> (à décider <n>, par défaut <n>, délégués <n>)
1. <Section> — références souhaitées : <what>
   - <ID> <name> — à décider / par défaut — réutilise <validated items>
…
Sessions prévues : <n> (≈ 6-8 éléments par session, nouvelle session ouverte automatiquement)
Je commence par <ID> dès ta validation.
```

6. **Stop and wait** for his validation. If he answers "je valide, mais…", update PLAN.md, then start.
   Once validated, hand over to `design-build-item` for the first item.

## Plan file format (design/PLAN.md)

| # | Item | Mode (decide/default/delegate) | Reuses | Status |
Keep it the single list of remaining work; `design-build-item` ticks the Status column, `design-handover` reads it.

## Sizing rule

Past sessions grew to 250-360k tokens of context and cost $7-14 each because every item ran in the same context.
Plan ≈ 6-8 items per session and let each item's build run in the `design-builder` subagent; the plan says where
sessions break so `design-handover` opens the next one at a natural boundary (end of a section).
