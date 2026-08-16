# UA: When Armies Clash (March 2015)

The 5e "Battlesystem" playtest, by Mike Mearls.
Official PDF: <https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf>

**This is the ruleset this module implements.** These notes are a paraphrase written
against the real document, organised for implementation rather than for play. Where a
rule matters for the data model or has an awkward interaction with Foundry, that is
called out in a `→` note. The PDF is not vendored — see [README](./README.md).

---

## Premise

Build on the standard combat rules to model conflict at army scale, while still letting
individual adventurers matter — leading a charge, rallying broken troops, or hunting
down enemy leaders. Typically the DM generals one side and one or more players general
the other, with everyone also potentially running an individual champion.

## Combatants

Armies are made of **stands** (ten creatures of the same kind) and **solos** (powerful
individuals acting alone or attached to a stand). Both are organised into **units**,
which move and act as a single entity.

## Scale

- A round is **1 minute**.
- A square is **20 feet** on a side.
- **Diagonals are not adjacent.** Two squares touching only at a corner are 1 square
  apart, and stands and solos cannot move diagonally. Distance is counted orthogonally.

→ Diagonal adjacency is the one piece with no native Foundry equivalent. Foundry offers
diagonal *movement* rules (5-5-5, 5-10-5, Euclidean) but not "diagonals aren't adjacent
at all", so melee reach and unit-integrity checks need custom logic.

## Stands

Ten identical creatures moving and fighting as one. Only Huge or smaller creatures can
form stands; Gargantuan creatures always fight as solos.

**Space** — a stand occupies the same footprint on a 20 ft grid that one of its creatures
would occupy on a 5 ft grid:

| Creature size | Footprint |
|---|---|
| Medium or smaller | 1 square |
| Large | 2 × 2 |
| Huge | 3 × 3 |

**Statistics** — the stand uses the statistics and special abilities of the creatures
composing it: AC, hit points, attacks, damage, saves, and so on. **Not multiplied.**

→ This is the system's most criticised feature. A stand of ten hobgoblins has one
hobgoblin's hp and damage, so a single hero is competitive with ten ogres. The module
defaults to RAW but exposes multipliers.

**Speed** — measured in squares, equal to the creature's speed ÷ 5. A hobgoblin at 30 ft
has a speed of 6 squares.

→ Note the scale mismatch: 6 squares at 20 ft/square is 120 ft, four times the creature's
printed speed. This is deliberate. Distances convert at feet ÷ 5 throughout, so the
module multiplies stored distances by 4 at import (feet ÷ 5 × 20) and lets a 20 ft scene
measure natively.

## Units

A group of stands acting as one. May mix creature kinds, and may contain any number of
stands. Type is chosen before the battle and cannot change once fighting starts.

### Skirmishers

Loosely organised; good at moving fast, hit-and-run attacks and scouting.

- All stands have advantage on Dexterity saving throws.
- Uses the **highest** Dex modifier among its stands for initiative.
- May take the Hide action.
- Allied stands and solos may move *through* a skirmisher stand's space, but may not end
  their turn there — unless a solo uses its action to Join.
- May use part of its movement, act, then finish moving.
- Integrity: each stand must end its turn within **1 square** of another stand in the unit.

### Regiments

Tight ranks; slower, but hit harder and hold ground.

- Uses the **lowest** Dex modifier among its stands for initiative.
- May take the Configure action.
- Allied stands may **not** move into or through a regiment stand's space. An allied solo
  may enter only by using its action to Join.
- Integrity: each stand must end its turn **adjacent** to another stand in the unit.

**Configurations** — chosen at the start of battle, changed with the Configure action:

| Configuration | Effect |
|---|---|
| **Aid** | Stands may forgo their own melee attack to grant an adjacent unit-mate advantage on melee attacks — even with no legal target of their own. Half speed. |
| **Defend** | +2 AC to all stands. Cannot take the Attack action. Half speed. |
| **March** | Full speed. |

## Solos

A significant creature — usually a PC or a powerful NPC.

- May be **unattached** (moving and acting independently) or **joined** to a stand.
- Occupies the footprint a stand of its size would. A Gargantuan solo is 4 × 4.
- May move through an allied skirmisher stand's space, but can only end its turn there by
  Joining. May enter a regiment stand's space only by Joining.
- A joined solo may be, and usually is, its unit's commander.
- Integrity: an unattached solo must end its turn within 1 square of **any** allied stand,
  regardless of that stand's unit.

## Commanders

A solo joined to a stand. **One per unit** — the incumbent must vacate before another can
take over. Assuming or vacating the post costs a bonus action, and the post is lost
automatically if the commander can't take actions.

As a bonus action, a commander applies one of the following to every stand in its unit:

| Order | Effect |
|---|---|
| **Prepare** | DC 15 Cha (Intimidation or Persuasion). On success, the unit has advantage on all saving throws until the end of the commander's next turn. |
| **Incite** | DC 15 Cha (Intimidation or Persuasion). On success, the unit has advantage on all attack rolls on its next turn. |
| **Rally** | Reverses a failed morale check — see Morale. |

## Isolation

A stand or solo that violates its integrity rule is **isolated**:

- Disadvantage on its own attack rolls.
- Attackers have advantage against it, and **deal double damage on a hit**.

Isolation conditions restated: a regiment stand is isolated if not adjacent to a unit-mate;
a skirmisher stand if more than 1 square from a unit-mate; an unattached solo if more than
1 square from any allied stand.

## Terrain

Each square may carry a terrain trait, and may additionally be difficult terrain.

| Terrain | Effect |
|---|---|
| **Clear** | Nothing. Difficult if filled with rubble or broken ground. |
| **Road** | If a stand's last square of movement is a road square, it may move 1 more square regardless of remaining speed. Never difficult unless destroyed. |
| **Forest** | Half cover against all attacks. Always difficult. |
| **Water** | Shallow is difficult. Deep may only be entered by creatures with a swim speed. |
| **High ground** | Numbered in multiples of 20 ft above adjacent lower squares. Advantage on melee attacks against lower targets. Entering costs 1 extra square of movement per 20 ft of elevation gained, doubled if the destination is also difficult. |

## Combat procedure

Activity within a round is **simultaneous** rather than sequential.

**Setup** — organise stands into units and designate each skirmisher or regiment; choose
each regiment's starting configuration; place each solo as unattached or joined (a solo
that starts joined counts as having already taken the Join action, so it can act on its
first turn); designate commanders. Track which stands belong to which unit, for isolation
and morale.

**Initiative** — rolled per unit, using the highest (skirmisher) or lowest (regiment) Dex
modifier among its stands, including solos attached at the start of the turn.

**Movement** — each stand moves according to its speed and unit type. There are **no
opportunity attacks**; instead, a stand that becomes adjacent to an enemy stand cannot
move any further unless its unit takes the Retreat action. This restricts only the stands
actually adjacent to enemies, not the whole unit. A stand that moves off the grid, willing
or not, has fled and is eliminated.

**Actions** — **one action is chosen for the whole unit**. Each stand either takes that
action or takes nothing; stands in a unit cannot take different actions, except that
non-casters in a mixed unit may act while the casters cast.

→ This is a significant UI problem: resolving N stand attacks within one unit's turn.

### Attack

Each stand attacks individually, choosing its own target stand, and attacks exactly as its
component creatures do — including Multiattack. Different stands in a unit may use
different attack forms (one orc stand with greataxes, another with javelins).

- **Melee** requires an adjacent target.
- **Reach of 10 ft or more** grants a **bonus attack** as part of the Attack action,
  representing more of the stand's members reaching the enemy.
- **Ranged** uses normal range, remembering squares are 20 ft. If a range extends at least
  10 ft into a square, it covers the whole square; an attack may always target an adjacent
  square even if its range is under 20 ft.
- Distances in monster abilities convert at feet ÷ 5 — a minotaur's 10 ft charge push
  becomes 2 squares.

### Cast a Spell

- Range works as for ranged attacks.
- **Targeted spells** — a caster stand may target another stand; a spell targeting multiple
  creatures affects one stand or unattached solo per creature it could target. Against an
  isolated solo, the stand has advantage and deals double damage, or the solo has
  disadvantage on the save and takes double damage on a failure. A solo casting a targeted
  spell affects a stand only if the spell would normally target five or more creatures.
- **Areas of effect** affect all stands in the area; a stand only partly covered takes half
  damage, or is unaffected if the spell deals none. When a *stand* casts an area spell, all
  its casters use the same area and targets take **double damage**. Solos cast area spells
  normally.
- **Geometry** — 1 square per 20 ft for cones, cubes, cylinders, spheres and lines. A cone
  widens by one square per square of length, added evenly to both sides. For a Self-range
  area the origin is the midpoint of one side of the caster's space.

→ These shapes do not match Foundry's template geometry and will need custom implementation.

### Other actions

| Action | Notes |
|---|---|
| **Configure** | Regiments only. Switch configuration. |
| **Dash** | Adds the unit's speed again. A regiment in Aid or Defend that Dashes moves at full rather than half speed. |
| **Hide** | Skirmishers and solos only. A Stealth check per stand; conditions may let some stands hide and not others. A stand that can't or won't hide takes no action that turn. |
| **Join** | Solos only. See below. |
| **Retreat** | Lets stands move even when starting or becoming adjacent to an enemy stand. |

### Join

A solo moves into an allied stand's space — movement ends there — then spends its action to
Join. It cannot join a stand more than one size category smaller than itself, but any number
of solos may occupy one stand.

The solo is **removed from the battlefield** and the stand marked to show it. Thereafter:

- For spell targeting it counts as part of the stand, but uses its **own AC and saves**.
- It moves automatically with the stand, and forgoes its own movement — but **still takes
  its action normally**.
- In place of movement it may leave into an empty adjacent space, or hop to another adjacent
  stand in its unit.
- If the stand is eliminated, joined solos remain in play, and may immediately join an
  adjacent unit-mate or stay unattached in the vacated space.

→ A joined solo still acts on its own turn, so it must remain in the initiative order even
with no token on the board.

## Damage

Damage applies to a stand's hp as though it were a single creature. **Excess damage carries
over to an adjacent identical stand in the same unit**, if there is one.

Because the round is simultaneous, a stand reduced to 0 hp is **not destroyed immediately**.
It becomes a **casualty** but stays in play until the end of the round, moving and acting
normally if it hasn't yet acted, treated as having 1 hp.

→ Carry-over needs grid adjacency *and* creature-identity matching at damage time; the module
leaves it to the table. Casualty deferral is free in Foundry, since dnd5e applies no
automatic death or defeat at 0 hp.

## End of round

Two ordered steps, after everyone has acted.

**1 — Eliminate casualties.** All casualties are removed. When a stand is eliminated its
controller may immediately slide an adjacent allied stand into the vacated space (holding the
line, but opening a gap elsewhere). A dying solo makes up to ten death saves, one at a time,
to settle its fate.

**2 — Check morale.**

## Morale

Any surviving unit that has lost **more than half** the stands it started with must
immediately check morale: a **DC 10 Wisdom saving throw** using the highest Wis modifier among
its stands, including solos joined to surviving stands.

On a failure the unit is **broken**: for the rest of the battle it may take only the Retreat
action, and the DM moves it along a safe path away from enemies. Solos are never broken and
may leave a broken unit at the start of any of their turns.

**Rally** — a broken unit with a commander retries the DC 10 Wis save at the start of its turn,
adding the commander's Cha modifier. On a success it is no longer broken and acts normally.

## Objectives and victory points

Battles end on objectives, not annihilation. An army wins at **10 or more VP**.

| Objective | Scoring |
|---|---|
| **Attrition** | VP per enemy unit eliminated, amount set by the DM based on battle size. |
| **Destruction** | The DM designates squares worth 10–100 hp and 1–5 VP each. They are automatically hit by melee attacks and automatically fail all saves. They take damage from area spells that fully cover them, and from targeted spells cast by stands but not by solos. VP scored on reduction to 0 hp. |
| **Protection** | Always paired with Destruction. At the end of each round, 1 VP if the army has two or more stands adjacent to a surviving objective and no enemy stand or solo is within 2 squares of it. |
| **Custom** | Any specific condition, generally worth 1–5 VP. |

**Balance guidance** — give both sides roughly equal scoring opportunity. For a single
objective per side, 10 VP each. For fluid battles, at least five scoring opportunities per
side totalling 12–15 VP, so commanders have options.

**Resolution** — the battle ends when a side reaches 10 VP at the end of a round.

| Margin | Result |
|---|---|
| 3+ VP | **Total victory.** Roll d20 per surviving enemy unit; on 10+ it is eliminated as its survivors desert. |
| 1–2 VP | **Tactical victory.** The loser withdraws intact. |
| Tie | DM declares a draw, or the armies fight one more round. |

Because objectives drive the action, a losing army can still achieve its strategic goals.
