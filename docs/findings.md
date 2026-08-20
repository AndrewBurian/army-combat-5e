# Findings

Working notes from exercising the module against a live world. Each finding has a short id
so it can be referenced without renumbering. Delete a finding when it is fixed.

Tested against Foundry 14.366, dnd5e 5.3.3, world `army-combat-test`, on a 20 ft scene with
a Hobgoblin Stand imported from `Compendium.dnd5e.monsters`.

## Confirmed working

Not re-testing these unless something nearby changes.

- Stand import: statblock, items, AC and unlinked tokens all survive the copy.
- Battle scale at import: speed 30 -> 120, darkvision 60 -> 240, longbow 150/600 ->
  600/2400, prototype token sight 240. A 20 ft grid measures 20 ft between adjacent stands.
- `stand.scaling.hp` applies to max hp, clamping current hp down.
- Unit roster: `addMember` accepts stands and rejects anything else.
- Both sheets render, with all tabs present.
- `isolated` and `broken` reach `CONFIG.statusEffects`, and the `dnd5e.preRollAttack` hook
  sets disadvantage for an isolated stand.

## Findings

### unit-stamping

**Deployed tokens carry no reference to the unit that placed them.** This blocks the whole
rules layer: isolation, morale, per-unit initiative and unit-wide actions all need to know
which stands on the field belong to which unit.

`EncounterData#placeMembers` (`dnd5e.mjs:72320`) builds token data from
`actor.getTokenDocument(placement)` and writes it through one
`createEmbeddedDocuments("Token", tokensData)`. Nothing on that path records the unit, so
placed tokens have `flags: {}`.

The only link a token has is `token.baseActor.uuid`, which resolves to the *Stand* actor.
That is deliberately one-to-many — one Stand actor backs every identical stand across the
army, as the README describes — so it cannot identify a unit.

Two tempting interception points do not work:

- `prototypeToken.flags` is on the shared Stand actor, so a flag written there leaks to
  every unit fielding that stand.
- A plain `preCreateToken` hook sees the token but not which unit's placement caused it.

`UnitData` therefore has to override `placeMembers` itself, where the unit is still in
scope, and stamp each entry in `tokensData`.

### unit-doc-comment

The class comment on `UnitData` (`scripts/data/unit.mjs:15`) states "Tokens are stamped with
their unit at placement so the end-of-round pass can count survivors." No such stamping
exists. Resolved by fixing `unit-stamping`, not by editing the comment.

### damage-scaling

`stand.scaling.damage` is editable on the stand sheet
(`templates/stand/stand-tab.hbs:49`) and stored at import
(`scripts/creation.mjs:126`), but no roll reads it. It is the only live control on that tab
that does nothing.

`stand.scaling.hp` is applied in `StandData#applyHitPointScaling`; damage has no equivalent.

### configuration-effects

`CONFIGURATIONS` (`scripts/config.mjs:50`) declares `acBonus` and `halfSpeed` for the aid and
defend configurations. Neither is ever applied to a stand. `canAttack` is read only by
`UnitData#canAttack`, which nothing calls.

### unit-initiative

`UNIT_TYPES[].initiative` (`scripts/config.mjs:41`) records that skirmishers roll off the
highest Dex among their stands and regiments off the lowest. Nothing reads it. Initiative is
per unit in the rules; there is currently no combat integration at all.

### unset-state-fields

Schema fields that exist and are never written:

- `stand.casualty` — displayed on the stand sheet, set by nothing. Needs the end-of-round
  pass that marks stands at 0 hp.
- `stand.hiding` — not read or written anywhere, and not on the sheet.
- `unit.broken` — displayed, and cleared by `recordStartingStrength`, but never set.
  `UnitData#requiresMoraleCheck` is never called.

### melee-reach-label

A stand's melee reach stays 5 ft at battle scale, where it should read 20 ft.

`applyBattleScale` can only rewrite stored distances, and a melee weapon stores
`range.reach: null`. dnd5e fills the 5 in at derived-data time in
`WeaponData#prepareDerivedData` (`dnd5e.mjs:76984`), as a hard-coded literal — 10 if the
weapon has the `rch` property. There is no CONFIG knob for it.

**Cosmetic only.** Foundry does not enforce attack range; an attack at 20 ft separation with
5 ft reach fires with no warning. Fix by writing the scaled default into `range.reach` at
import when the stored value is null.

### no-battle-scene

Nothing helps set up a battle-scale scene. `BATTLE_GRID_FEET` is exported on the module API
and otherwise unused, and a scene at the wrong grid distance silently makes every scaled
distance wrong. Worth a scene preset, or at least a warning when stands are placed on a
scene whose grid is not 20 ft.

### no-stand-creation-ui

`createStandFromNPC` is reachable only through the module API. Making a stand currently
means running code, which makes the module untestable by anyone who is not editing it.
