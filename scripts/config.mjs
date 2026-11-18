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
  const allSaves = ["str", "dex", "con", "int", "wis", "cha"].map(ability => ({
    key: `system.abilities.${ability}.save.roll.mode`, type: "add", value: "1"
  }));

  // dnd5e copies every key of a condition type into CONFIG.statusEffects, and core turns
  // `system.changes` into real ActiveEffect changes when the status is toggled. So these
  // carry their mechanics with them whether set from the token HUD or the unit sheet.
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
    },
    casualty: {
      name: "ARMY5E.Condition.Casualty",
      img: "icons/svg/blood.svg",
      pseudo: true
    },
    aid: {
      name: "ARMY5E.Configuration.Aid",
      img: "icons/svg/regen.svg",
      pseudo: true,
      exclusiveGroup: "army5e-configuration"
    },
    defend: {
      name: "ARMY5E.Configuration.Defend",
      img: "icons/svg/shield.svg",
      pseudo: true,
      exclusiveGroup: "army5e-configuration",
      system: { changes: [{ key: "system.attributes.ac.bonus", type: "add", value: "2" }] }
    },
    skirmisher: {
      name: "ARMY5E.UnitType.Skirmisher",
      img: "icons/svg/wingfoot.svg",
      pseudo: true,
      system: { changes: [{ key: "system.abilities.dex.save.roll.mode", type: "add", value: "1" }] }
    },
    prepared: {
      name: "ARMY5E.Order.Prepare",
      img: "icons/svg/aura.svg",
      pseudo: true,
      system: { changes: allSaves }
    },
    incited: {
      name: "ARMY5E.Order.Incite",
      img: "icons/svg/fire.svg",
      pseudo: true
    },
    battleScale: {
      name: "ARMY5E.Condition.BattleScale",
      img: "icons/svg/direction.svg",
      pseudo: true,
      system: {
        changes: [
          ...["walk", "fly", "swim", "climb", "burrow"].map(m => ({
            key: `system.attributes.movement.${m}`, type: "multiply", value: String(DISTANCE_SCALE)
          })),
          ...["darkvision", "blindsight", "tremorsense", "truesight"].map(s => ({
            key: `system.attributes.senses.ranges.${s}`, type: "multiply", value: String(DISTANCE_SCALE)
          })),
          { key: "token.sight.range", type: "multiply", value: String(DISTANCE_SCALE) }
        ]
      }
    }
  });

  // Aid and Defend move at half speed. dnd5e halves every speed for any status in this set.
  CONFIG.DND5E.conditionEffects.halfMovement?.add("aid");
  CONFIG.DND5E.conditionEffects.halfMovement?.add("defend");

  // Isolation imposes disadvantage on the isolated combatant's own attacks. dnd5e has no
  // `attributes.attack.roll.mode` field — attack advantage is not modelled as data, and
  // `conditionEffects.attackDisadvantage` is defined but read nowhere in the system — so
  // this bucket is ours to consume. See registerHooks().
  CONFIG.DND5E.conditionEffects.attackDisadvantage?.add("isolated");
}
