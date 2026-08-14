# Design reference

## About "When Armies Collide"

There is no Unearthed Arcana titled *When Armies Collide*. That name appears to be a
conflation of two separate WotC mass combat playtests — plus a popular 2015 YouTube
video about the first one that used "When Armies Collide" as its title. Both UAs are
plausible bases for this module, and they take **very different approaches**:

| | [When Armies Clash](./ua-when-armies-clash.md) | [Mass Combat](./ua-mass-combat.md) |
|---|---|---|
| Released | March 2015 (Mike Mearls) | February 2017 |
| Nickname | "Battlesystem" | — |
| Approach | Tactical — miniatures on a grid | Abstract — a few die rolls |
| Core unit | **Stand** (~10 creatures) → **Unit** | **Unit** (up to ~400 creatures) |
| Core stat | Normal 5e stats, scaled up | **Battle Rating** derived from CR |
| Resolution | Play out attacks round by round | Opposed **battle roll**, casualties by margin |
| PC role | Fight as solo figures on the map | Side quests / objectives that shift the roll |

Rough guidance on which to target:

- **When Armies Clash** maps to a Group whose members are drawn on the canvas and
  fight using the existing 5e combat pipeline. More Foundry-native, more work.
- **Mass Combat** maps to a Group that is mostly a derived-stats sheet with a
  resolution button. Much less work, but far less of a "VTT" experience.

Nothing here commits us to either yet.

## Why the PDFs aren't in this repo

Two reasons:

1. **Couldn't fetch them.** These notes were written in an environment whose network
   egress policy blocks `media.wizards.com` (and everything else outside GitHub), so
   the source PDFs could not be downloaded. The notes below are reconstructed from
   secondary sources and are explicitly marked where confidence is low.
2. **Wouldn't vendor them anyway.** The UA PDFs are free downloads but remain
   copyrighted WotC material; committing them (or their verbatim text) into a public
   repo is redistribution. Game *mechanics* aren't copyrightable, so paraphrased
   design notes plus a link to the official download is the safer shape.

Official downloads:

- When Armies Clash — <https://media.wizards.com/2015/downloads/dnd/UA_Battlesystem.pdf>
- Mass Combat — <https://media.wizards.com/2017/dnd/downloads/2017_UAMassCombat_MCUA_v1.pdf>

If you want the real text in-tree for reference, drop the PDFs into this directory
locally — `docs/reference/*.pdf` is gitignored so they stay out of version control.
