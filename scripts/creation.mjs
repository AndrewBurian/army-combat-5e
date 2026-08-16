import { ACTOR_TYPES, DISTANCE_SCALE, MODULE_ID, STAND_SIZES } from "./config.mjs";

/**
 * Movement keys carrying a distance in feet. `units` and `hover` are not distances.
 * @type {string[]}
 */
const MOVEMENT_KEYS = ["burrow", "climb", "fly", "swim", "walk"];

/**
 * Item range keys carrying a distance in feet.
 * @type {string[]}
 */
const RANGE_KEYS = ["value", "long", "reach"];

/* -------------------------------------------- */

/**
 * Scale a distance from character scale to battle scale, leaving null and zero alone.
 * @param {number|null} value
 * @returns {number|null}
 */
function scaleDistance(value) {
  if ( !Number.isFinite(value) || (value === 0) ) return value;
  return value * DISTANCE_SCALE;
}

/* -------------------------------------------- */

/**
 * Rewrite every distance in a stand's source data to battle scale.
 *
 * A square is 20 ft and distances convert at feet / 5, so battlefield feet are
 * character-scale feet * 4. Doing this once at import means a scene with a 20 ft grid
 * measures movement, ranges and vision correctly using Foundry's own maths.
 *
 * @param {object} source  Actor source data, mutated in place.
 */
export function applyBattleScale(source) {
  const movement = source.system?.attributes?.movement;
  if ( movement ) for ( const key of MOVEMENT_KEYS ) {
    if ( key in movement ) movement[key] = scaleDistance(movement[key]);
  }

  const senses = source.system?.attributes?.senses;
  if ( senses ) for ( const key of ["blindsight", "darkvision", "tremorsense", "truesight"] ) {
    if ( key in senses ) senses[key] = scaleDistance(senses[key]);
  }

  for ( const item of source.items ?? [] ) {
    const range = item.system?.range;
    if ( !range ) continue;
    for ( const key of RANGE_KEYS ) {
      if ( key in range ) range[key] = scaleDistance(range[key]);
    }
  }

  // Token vision must match the scaled senses or the token sees the wrong distance.
  const sight = source.prototypeToken?.sight;
  if ( sight && ("range" in sight) ) sight.range = scaleDistance(sight.range);
}

/* -------------------------------------------- */

/**
 * Create a stand from an NPC.
 *
 * The stand is a full copy rather than a reference: it owns the creature's items, so
 * attacks, damage, conditions and spellcasting all work through the system's normal
 * pipeline with nothing proxied. The tradeoff is that the stand does not track its
 * source — editing the original creature later will not change stands already made
 * from it.
 *
 * @param {Actor5e} npc                    The creature to base the stand on. May live in
 *                                         a compendium.
 * @param {object} [options={}]
 * @param {string} [options.name]          Override the generated name.
 * @param {number} [options.hpScaling]     Hit point multiplier. Defaults to RAW (1).
 * @param {number} [options.damageScaling] Damage multiplier. Defaults to RAW (1).
 * @param {object} [options.folder]        Folder to create the stand in.
 * @returns {Promise<Actor5e>}             The created stand.
 */
export async function createStandFromNPC(npc, options = {}) {
  if ( !npc ) throw new Error("An NPC is required to create a stand.");

  if ( !STAND_SIZES.includes(npc.system?.traits?.size) ) {
    throw new Error(game.i18n.format("ARMY5E.Stand.Warning.InvalidSize", { name: npc.name }));
  }

  const source = npc.toObject();
  delete source._id;
  delete source.folder;

  source.type = ACTOR_TYPES.stand;
  source.name = options.name ?? game.i18n.format("ARMY5E.Stand.DefaultName", { name: npc.name });

  applyBattleScale(source);

  foundry.utils.mergeObject(source, {
    "system.stand.origin": npc.uuid,
    "system.stand.scaling.hp": options.hpScaling ?? 1,
    "system.stand.scaling.damage": options.damageScaling ?? 1,
    "prototypeToken.actorLink": false,
    [`flags.${MODULE_ID}.importedFrom`]: npc.uuid
  });

  if ( options.folder ) source.folder = options.folder.id ?? options.folder;

  return Actor.implementation.create(source);
}
