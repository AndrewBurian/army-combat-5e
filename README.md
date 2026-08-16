# army-combat-5e

A Foundry VTT module adding army-scale combat to D&D 5e, implementing the 2015 Unearthed
Arcana *When Armies Clash* ("Battlesystem") playtest.

Assemble creatures into **stands** of ten, group stands into **units**, and fight battles
where individual PCs can still lead a charge, rally broken troops, or hunt down enemy
commanders.

**Requires:** Foundry **v14**, dnd5e system **5.3+**.

## Status

Early — data models and sheets. Not yet playable.

## How it works

- A **stand** is a Foundry actor (`army-combat-5e.stand`) created by importing a copy of an
  NPC. It keeps that creature's full statblock, items and abilities, so the normal 5e
  combat pipeline works on it unchanged. Stands use unlinked tokens, so one Stand actor can
  back every hobgoblin stand in an army while each token tracks its own damage.
- A **unit** (`army-combat-5e.unit`) is a roster of stands. It carries everything the rules
  put above the stand: skirmisher/regiment type, formation, shared initiative, and morale.

> **Note:** because these are module-defined actor types, disabling the module leaves any
> stands and units in your world as unusable "Unknown type" documents. Re-enabling recovers
> them.

## Design reference

[`docs/reference/`](docs/reference/) holds implementation notes on the ruleset, and explains
why the source PDF is linked rather than committed.
