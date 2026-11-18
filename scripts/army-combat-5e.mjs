import StandActorSheet from "./applications/stand-sheet.mjs";
import UnitActorSheet from "./applications/unit-sheet.mjs";
import { checkSystemCompatibility } from "./compatibility.mjs";
import { ACTOR_TYPES, BATTLE_GRID_FEET, DISTANCE_SCALE, MODULE_ID, registerConditions } from "./config.mjs";
import { applyBattleScale, createStandFromNPC, findOrCreateStand } from "./creation.mjs";
import StandData from "./data/stand.mjs";
import UnitData from "./data/unit.mjs";

/**
 * Bind our data models onto CONFIG.
 *
 * dnd5e does `CONFIG.Actor.dataModels = dataModels.actor.config` during its own init
 * (dnd5e.mjs:140) — a plain assignment, not a merge, which discards anything a module
 * registered earlier. So this runs twice: once at init, and again at i18nInit, which
 * fires after every init callback but still before world documents are constructed.
 */
function registerDataModels() {
  CONFIG.Actor.dataModels[ACTOR_TYPES.stand] = StandData;
  CONFIG.Actor.dataModels[ACTOR_TYPES.unit] = UnitData;
}

/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initialising`);

  registerDataModels();
  registerConditions();

  CONFIG.DND5E.defaultArtwork.Actor[ACTOR_TYPES.stand] = "icons/environment/people/group.webp";
  CONFIG.DND5E.defaultArtwork.Actor[ACTOR_TYPES.unit] = "icons/sundries/flags/banner-flag-blue.webp";

  const { DocumentSheetConfig } = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(Actor, MODULE_ID, StandActorSheet, {
    types: [ACTOR_TYPES.stand],
    makeDefault: true,
    label: "ARMY5E.Sheet.Stand"
  });

  DocumentSheetConfig.registerSheet(Actor, MODULE_ID, UnitActorSheet, {
    types: [ACTOR_TYPES.unit],
    makeDefault: true,
    label: "ARMY5E.Sheet.Unit"
  });

  registerHooks();

  game.modules.get(MODULE_ID).api = {
    applyBattleScale,
    createStandFromNPC,
    findOrCreateStand,
    data: { StandData, UnitData },
    DISTANCE_SCALE,
    BATTLE_GRID_FEET
  };
});

/* -------------------------------------------- */

// Re-assert after the system has clobbered CONFIG.Actor.dataModels. See registerDataModels.
Hooks.once("i18nInit", registerDataModels);

/* -------------------------------------------- */

Hooks.once("setup", () => {
  // dnd5e overwrites CONFIG.Actor.trackableAttributes wholesale during its own setup, so
  // ours has to be added afterwards. Stands track like NPCs; units have no bars.
  const npc = CONFIG.Actor.trackableAttributes?.npc;
  if ( npc ) CONFIG.Actor.trackableAttributes[ACTOR_TYPES.stand] = foundry.utils.deepClone(npc);
});

/* -------------------------------------------- */

Hooks.once("ready", () => {
  checkSystemCompatibility();
});

/* -------------------------------------------- */

/**
 * Register runtime hooks.
 */
function registerHooks() {
  /**
   * "Create Stand" on NPCs, in both the actor directory and actor compendia. Both are
   * DocumentDirectory subclasses, so both fire this hook with `collection` set to either
   * the world actors or the pack.
   */
  Hooks.on("getActorContextOptions", (app, options) => {
    const entry = li => app.collection.index?.get(li.dataset.entryId) ?? app.collection.get(li.dataset.entryId);
    options.push({
      label: "ARMY5E.Stand.Create",
      icon: "fa-solid fa-people-group",
      visible: li => game.user.can("ACTOR_CREATE") && (entry(li)?.type === "npc"),
      onClick: async (event, li) => {
        const { entryId } = li.dataset;
        const npc = app.collection instanceof foundry.documents.collections.CompendiumCollection
          ? await app.collection.getDocument(entryId)
          : app.collection.get(entryId);
        try {
          const stand = await findOrCreateStand(npc);
          ui.notifications.info(game.i18n.format("ARMY5E.Stand.Notify.Created", { name: stand.name }));
          stand.sheet.render({ force: true });
        } catch ( err ) {
          ui.notifications.error(err.message);
        }
      }
    });
  });

  /**
   * An isolated stand or solo attacks at disadvantage.
   *
   * This has to be a hook rather than an ActiveEffect change: dnd5e models advantage as
   * data for saves, checks and skills via AdvantageModeField, but there is no equivalent
   * `attributes.attack.roll.mode` field — attack advantage is not data-driven at all.
   */
  Hooks.on("dnd5e.preRollAttack", config => {
    const actor = config.subject?.actor;
    if ( actor?.statuses?.has("isolated") ) config.disadvantage = true;
  });
}
