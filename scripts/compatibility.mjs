import { MODULE_ID } from "./config.mjs";

/**
 * Internals of Actor5e that StandData relies on.
 *
 * Actor5e#prepareData skips its own preparation for actor types whose data model was
 * registered by a module rather than by dnd5e itself (actor.mjs:303). Rather than
 * monkeypatching or spoofing `modelProvider`, StandData replicates the handful of
 * statements that are skipped — but they are `_`-prefixed internals, so a dnd5e release
 * could move or rename them and the failure would otherwise be silent and subtle
 * (attacks quietly rolling without their proficiency bonus, say).
 *
 * @type {{ actor: string[], item: string[] }}
 */
const REQUIRED_INTERNALS = {
  actor: ["_clearCachedValues", "_prepareSpellcasting"],
  item: ["prepareFinalAttributes"]
};

/* -------------------------------------------- */

/**
 * Verify the internals StandData depends on still exist, and complain loudly if not.
 *
 * @returns {boolean}  Whether everything needed is present.
 */
export function checkSystemCompatibility() {
  const missing = [];

  const actorProto = CONFIG.Actor.documentClass?.prototype;
  for ( const method of REQUIRED_INTERNALS.actor ) {
    if ( typeof actorProto?.[method] !== "function" ) missing.push(`Actor5e#${method}`);
  }

  const itemProto = CONFIG.Item.documentClass?.prototype;
  for ( const method of REQUIRED_INTERNALS.item ) {
    if ( typeof itemProto?.[method] !== "function" ) missing.push(`Item5e#${method}`);
  }

  if ( !missing.length ) return true;

  const version = game.system.version;
  console.error(`${MODULE_ID} | Missing expected dnd5e internals in ${version}: ${missing.join(", ")}`);
  ui.notifications?.error(game.i18n.format("ARMY5E.Warning.IncompatibleSystem", {
    version,
    methods: missing.join(", ")
  }), { permanent: true });

  return false;
}
