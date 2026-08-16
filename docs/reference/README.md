# Design reference

## The ruleset this module implements

**[UA: When Armies Clash](./ua-when-armies-clash.md)** (March 2015, Mike Mearls) — the 5e
"Battlesystem" playtest. Those notes are written against the real PDF and are the working
reference for implementation.

### A note on the name

There is no Unearthed Arcana titled *When Armies Collide*. That name is a conflation of
two separate WotC mass combat playtests, helped along by a 2015 YouTube video that used it
as a title. The two are genuinely different systems:

| | [When Armies Clash](./ua-when-armies-clash.md) | [Mass Combat](./ua-mass-combat.md) |
|---|---|---|
| Released | March 2015 | February 2017 |
| Approach | Tactical — miniatures on a grid | Abstract — a few die rolls |
| Core unit | **Stand** (10 creatures) → **Unit** | **Unit** (up to ~400 creatures) |
| Core stat | Normal 5e stats, unscaled | **Battle Rating** derived from CR |
| Resolution | Played out round by round | Opposed **battle roll**, casualties by margin |
| PC role | Fight as solo figures on the map | Objectives that shift the roll |

We implement the 2015 tactical version. The 2017 notes are kept only as context for why.

## Why the PDFs aren't in this repo

The UA PDFs are free downloads but remain copyrighted WotC material, and committing them —
or their verbatim text — into a public repo is redistribution. Game *mechanics* aren't
copyrightable, so the reference notes here are paraphrase plus a link to the official
download.

Official downloads:

- When Armies Clash — <https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf>
- Mass Combat — <https://media.wizards.com/2017/dnd/downloads/2017_UAMassCombat_MCUA_v1.pdf>

`docs/reference/*.pdf` is gitignored, so you can keep a local copy alongside these notes
without it entering version control.
