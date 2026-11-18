# army-combat-5e

A Foundry VTT module adding army-scale combat to D&D 5e, implementing the 2015 Unearthed
Arcana *When Armies Clash* ("Battlesystem") playtest.

Assemble creatures into **stands** of ten, group stands into **units**, and fight battles
where individual PCs can still lead a charge, rally broken troops, or hunt down enemy
commanders.

**Requires:** Foundry **v14**, dnd5e system **5.3+**.

## Status

Playable with GM adjudication. Adjacency, isolation, damage carry-over and joined solos
are tracked by hand.

## Running a battle

- **Scene:** set the grid to 20 ft per square.
- **Stands:** right-click an NPC in the actor directory or a compendium and choose
  *Create Stand*, or drop NPCs straight onto a unit sheet. Distances are converted to
  battle scale on creation.
- **Solos:** toggle *Battle Scale* on PCs and solo NPCs from the token HUD. It multiplies
  speed, senses and token sight by 4. Weapon and spell ranges are not changed; read them
  as feet / 5 = squares.
- **Deploy:** place a unit's members from its sheet, which tags each token with the unit.
  For tokens placed another way, select them and use *Assign Selected* on the unit tab.
- **Initiative:** *Add to Combat and Roll* on each unit puts its stands in one combat group
  and rolls once, using the highest (skirmisher) or lowest (regiment) Dex modifier. It also
  records the unit's starting strength.
- **Statuses:** unit type and configuration are applied to the stands automatically.
  Isolated, Prepared, Incited, Broken and Casualty can be set per token from the HUD, or on
  every stand of a unit from the unit tab.
- **End of round:** advancing the round marks 0 hp stands as casualties and whispers the GM
  a summary with a button that eliminates them and checks morale where losses require it.
- **Command:** drop an actor on the unit tab's Command section to make it the commander.
  *Rally* rerolls morale for a broken unit, adding the commander's Cha modifier.

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
