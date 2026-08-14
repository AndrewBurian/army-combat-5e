# UA: When Armies Clash (March 2015)

Also known as the 5e "Battlesystem". By Mike Mearls.
Official PDF: <https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf>

> **Reconstructed notes.** The source PDF could not be downloaded in this environment
> (see [README](./README.md)). Everything below comes from secondary sources.
> Confidence is marked per section. Verify against the PDF before implementing
> anything numeric.

## Premise

Build on the standard 5e combat rules to model conflict at army scale, so players and
the DM can control whole armies — while individual adventurers can still lead a charge
against an enemy regiment, rally dispirited soldiers back into the fray, or hunt down
enemy monsters and leaders.

## Stands — confidence: high

The basic battlefield figure is a **stand**, representing roughly **10 creatures**.
A stand uses the statistics and special abilities of the creatures composing it — AC,
hp, attack bonus, damage, saves — rather than a separate derived statline.

Larger creatures pack fewer bodies onto a stand; a sufficiently large monster is a
single figure on its own.

> ⚠️ **Known balance criticism.** Contemporary reviews (notably Delta's D&D Hotspot)
> pointed out that a stand of ten creatures appears to keep roughly the *same* hp,
> attack count, and damage dice as one creature, which makes a single hero
> competitive with ten ogres. If we implement this system, the stand → statblock
> derivation is the part that most needs house-ruling, and is the most valuable thing
> to make configurable in the module.

## Units — confidence: medium

Stands combine into **units**. There are two unit types:

- **Skirmish units** — loose formation, members need not be adjacent, can Hide, and
  use the *best* initiative bonus among their components.
- **Formed units / regiments** — tight formation, the line-of-battle option.

Melee attacks reach targets in adjacent squares. Movement and spell areas are scaled
up to suit a battlefield-sized map.

> ⚠️ The exact map scale (feet per square at battle scale) is not confirmed in the
> secondary sources consulted. Needs checking against the PDF.

## Solo creatures and heroes — confidence: medium

PCs and significant monsters operate as individual figures rather than as stands, and
interact with units directly. Heroes get options to command forces and issue orders —
leading a charge, rallying a broken unit.

## Morale — confidence: high

The most distinctive addition to the scaled 5e rules is the **morale check**.

When a unit has lost **more than half** the stands it started with, it must
immediately check morale. On a failure the survivors lose their nerve and rout rather
than hold the line. Rallying a routed unit is one of the levers heroes have.

## Victory points — confidence: medium

Battles are scored with **victory points**. An army earns VP for achieving its
objectives; an army wins the battle at **10 or more VP**. Terrain and mission
objectives are handled lightly, mainly as a way to score how decisive a victory was.

## Implications for a Foundry Group actor

- A Group holds **stands**, not raw creatures — so the data model wants a
  stand-composition layer between the Group and its member actors.
- Stands need a derived statblock from their member actor, plus an override hook
  (see the balance criticism above).
- Unit type (skirmish vs. formed) is a Group-level flag affecting initiative and
  positioning rules.
- Morale is Group-level state with a trigger condition on stand count — a natural fit
  for a derived value plus a hook on stand removal.
- VP is a scene/combat-level concept, not a Group concept.

## Sources

- <https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf> (primary, unfetched)
- <https://skylandgames.wordpress.com/2016/01/03/unearthed-arcanas-5th-edition-battle-system-review/>
- <http://deltasdnd.blogspot.com/2015/03/review-of-5e-battlesystem-draft.html>
- <http://greyhawkery.blogspot.com/2015/03/new-from-wizards-when-armies-clash.html>
- <https://cannibalhalflinggaming.com/2017/11/08/unearthing-mass-combat/>
