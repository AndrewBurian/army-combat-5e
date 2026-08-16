/**
 * Module-wide constants and configuration.
 */

/** Module id. Also the namespace prefix for our Actor subtypes. */
export const MODULE_ID = "army-combat-5e";

/** Fully-qualified Actor subtype keys, as Foundry namespaces them. */
export const ACTOR_TYPES = {
  stand: `${MODULE_ID}.stand`,
  unit: `${MODULE_ID}.unit`
};

/**
 * How many creatures make up a stand. The rules fix this at ten; it is named here rather
 * than inlined because a few derived values read it.
 * @type {number}
 */
export const CREATURES_PER_STAND = 10;

/**
 * Battle-scale distance multiplier.
 *
 * A square is 20 ft, but the rules convert distances at feet / 5 — so a 30 ft speed is
 * 6 squares, which is 120 ft of battlefield. That is (feet / 5) * 20, i.e. feet * 4.
 * Baking this into stored distances at import means a scene with a 20 ft grid measures
 * correctly with no runtime conversion layer.
 *
 * @type {number}
 */
export const DISTANCE_SCALE = 4;

/** Grid size, in feet, that battle scenes are expected to use. */
export const BATTLE_GRID_FEET = 20;

/** Unit types. A unit's type is fixed before the battle and cannot change mid-fight. */
export const UNIT_TYPES = {
  skirmisher: {
    label: "ARMY5E.UnitType.Skirmisher",
    /** Skirmishers roll initiative off the best Dex among their stands. */
    initiative: "highest"
  },
  regiment: {
    label: "ARMY5E.UnitType.Regiment",
    initiative: "lowest"
  }
};

/** Regiment configurations. Skirmishers do not configure. */
export const CONFIGURATIONS = {
  aid: { label: "ARMY5E.Configuration.Aid", halfSpeed: true, canAttack: true },
  defend: { label: "ARMY5E.Configuration.Defend", halfSpeed: true, canAttack: false, acBonus: 2 },
  march: { label: "ARMY5E.Configuration.March", halfSpeed: false, canAttack: true }
};

/**
 * Sizes that can be formed into a stand. Gargantuan creatures always fight as solos.
 * @type {string[]}
 */
export const STAND_SIZES = ["tiny", "sm", "med", "lg", "huge"];

/**
 * Register our conditions with the system.
 *
 * Must run during `init`: dnd5e flattens `conditionTypes` into `CONFIG.statusEffects` at
 * `i18nInit` (dnd5e.mjs:421), so anything added afterwards is ignored.
 */
export function registerConditions() {
  Object.assign(CONFIG.DND5E.conditionTypes, {
    isolated: {
      name: "ARMY5E.Condition.Isolated",
      img: "icons/svg/terror.svg",
      pseudo: true
    },
    broken: {
      name: "ARMY5E.Condition.Broken",
      img: "icons/svg/degen.svg",
      pseudo: true
    }
  });

  // Isolation imposes disadvantage on the isolated combatant's own attacks. dnd5e has no
  // `attributes.attack.roll.mode` field — attack advantage is not modelled as data, and
  // `conditionEffects.attackDisadvantage` is defined but read nowhere in the system — so
  // this bucket is ours to consume. See registerHooks().
  CONFIG.DND5E.conditionEffects.attackDisadvantage?.add("isolated");
}
