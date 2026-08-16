import { CREATURES_PER_STAND, MODULE_ID } from "../config.mjs";

/**
 * Sheet for stand actors.
 *
 * Extends the system's NPC sheet rather than building from BaseActorSheet: a stand is a
 * full NPC copy, so everything the NPC sheet does — features, inventory, spells, effects —
 * applies unchanged. We add one tab for the stand-specific state.
 */
export default class StandActorSheet extends dnd5e.applications.actor.NPCActorSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["army-combat-5e", "stand"],
    actions: {
      removeSolo: StandActorSheet.#onRemoveSolo
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    stand: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: `modules/${MODULE_ID}/templates/stand/stand-tab.hbs`,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static TABS = [
    { tab: "stand", label: "ARMY5E.Stand.Tab", icon: "fas fa-flag" },
    ...super.TABS
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  tabGroups = { primary: "stand" };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( partId === "stand" ) return this.#prepareStandContext(context);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Context for the stand tab.
   * @param {object} context
   * @returns {object}
   */
  #prepareStandContext(context) {
    const system = this.actor.system;

    context.stand = {
      creaturesPerStand: CREATURES_PER_STAND,
      figuresStanding: system.figuresStanding,
      hasValidSize: system.hasValidSize,
      isCasualty: system.stand.casualty,
      origin: system.stand.origin ? fromUuidSync(system.stand.origin) : null,
      scaling: system.stand.scaling,
      // A stand deviating from rules-as-written is worth surfacing, since the default is
      // deliberately the unmodified UA behaviour.
      isModified: (system.stand.scaling.hp !== 1) || (system.stand.scaling.damage !== 1),
      solos: system.solos.map(actor => ({
        actor,
        uuid: actor.uuid,
        img: actor.img,
        name: actor.name
      }))
    };

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Detach a solo from this stand.
   * @this {StandActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRemoveSolo(event, target) {
    if ( !this.isEditable ) return;
    const uuid = target.closest("[data-uuid]")?.dataset.uuid;
    if ( !uuid ) return;
    const solos = this.actor.system.toObject().stand.solos.filter(s => s.actor !== uuid);
    return this.actor.update({ "system.stand.solos": solos });
  }
}
