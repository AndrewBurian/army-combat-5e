# UA: Mass Combat (February 2017)

Official PDF: <https://media.wizards.com/2017/dnd/downloads/2017_UAMassCombat_MCUA_v1.pdf>

> **Not the ruleset this module implements.** We implement the 2015 tactical
> [When Armies Clash](./ua-when-armies-clash.md); this file is kept only as context for
> that choice. Nothing here has been verified against the source PDF — it is reconstructed
> from secondary sources with per-section confidence markers, and should not be used as an
> implementation reference without checking it first.

## Premise

Let the DM resolve a battle involving hundreds of combatants with **a few die rolls**,
while still being able to zoom in far enough that player characters can affect the
outcome. Much more abstract than the 2015 Battlesystem.

## Units — confidence: medium

A **unit** is the atom of the system. A unit can hold up to roughly **400 creatures**.
Creature size determines how much room each one takes: Tiny, Small, and Medium
creatures each count as one space; larger creatures count as more.

Each unit has a **commander**, whose Charisma modifier feeds into morale rolls.

## Battle rating — confidence: high

Every creature has a **battle rating (BR)** derived from its **challenge rating**. A
unit's BR is the sum of the BRs of its creatures. This is the single most important
number in the system.

> ⚠️ The CR → BR conversion is a table in the PDF and was **not** recovered here.
> This is the main blocking unknown for implementing this variant.

## Battle roll — confidence: high

Combat resolves as an opposed roll: each unit rolls **1d20 + its battle rating**. The
winner inflicts casualties on the loser, scaled by the **margin** of success.

## Morale rating — confidence: medium

Separate from BR, each unit carries a **morale rating** from **−10 to +10**. It's set
by DM fiat, guided by a list of positive and negative modifying factors (leadership,
recent losses, terrain, cause, and so on), and the commander's Cha modifier applies.

## PC involvement — confidence: low

PCs affect the battle by accomplishing objectives that shift a side's rating or the
battle roll, rather than by fighting on a tactical grid. Details not recovered.

## Implications for a Foundry Group actor

- Much lighter data model: a Group is a **roster + two derived numbers** (BR, morale)
  and a resolution action. No canvas presence required.
- BR is a pure derived value — sum over members of `brFromCR(member.cr)`. Once the
  conversion table is recovered this is nearly trivial.
- Casualties are the interesting implementation problem: applying a margin-scaled loss
  back onto a heterogeneous roster needs a policy (proportional? weakest-first?
  GM-chosen?) and should be configurable.
- The whole battle is one chat-card interaction, which is very achievable as a v1 and
  could later be the "abstract mode" toggle alongside a Battlesystem-style tactical
  mode.

## Sources

- <https://media.wizards.com/2017/dnd/downloads/2017_UAMassCombat_MCUA_v1.pdf> (primary, unfetched)
- <https://www.tribality.com/2017/02/21/unearthed-arcana-mass-combat-breakdown/>
- <https://thekindgm.com/2017/02/25/unearthed-arcana-mass-combat-analysis/>
- <https://www.enworld.org/threads/question-on-mass-combat-comparison.703517/>
- <https://cannibalhalflinggaming.com/2017/11/08/unearthing-mass-combat/>
