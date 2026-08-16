import { CONFIGURATIONS, MODULE_ID, UNIT_TYPES } from "../config.mjs";

/**
 * Sheet for unit actors.
 *
 * Extends the system's encounter sheet, which already renders a roster of referenced
 * actors with editable quantities and handles drop-to-add. We add the unit tab carrying
 * formation, configuration and morale state.
 */
export default class UnitActorSheet extends dnd5e.applications.actor.EncounterActorSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["army-combat-5e", "unit"],
    actions: {
      recordStrength: UnitActorSheet.#onRecordStrength
    },
    position: {
      width: 560
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    unit: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: `modules/${MODULE_ID}/templates/unit/unit-tab.hbs`,
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static TABS = [
    { tab: "unit", label: "ARMY5E.Unit.Tab", icon: "fas fa-flag" },
    ...super.TABS
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  tabGroups = { primary: "unit" };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( partId === "unit" ) return this.#prepareUnitContext(context);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Context for the unit tab.
   * @param {object} context
   * @returns {object}
   */
  #prepareUnitContext(context) {
    const system = this.actor.system;
    const started = system.unit.startingStands;

    context.unit = {
      broken: system.unit.broken,
      commander: system.commander,
      configuration: system.unit.configuration,
      isRegiment: system.isRegiment,
      standCount: system.standCount,
      startingStands: started,
      // Only meaningful once a battle has begun and a baseline has been recorded.
      losses: Number.isFinite(started) ? Math.max(0, started - system.standCount) : null,
      type: system.unit.type,
      typeChoices: Object.fromEntries(
        Object.entries(UNIT_TYPES).map(([key, { label }]) => [key, game.i18n.localize(label)])
      ),
      configurationChoices: Object.fromEntries(
        Object.entries(CONFIGURATIONS).map(([key, { label }]) => [key, game.i18n.localize(label)])
      )
    };

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Record the unit's current strength as its starting strength, giving morale a baseline.
   * @this {UnitActorSheet}
   */
  static async #onRecordStrength() {
    if ( !this.isEditable ) return;
    await this.actor.system.recordStartingStrength();
    ui.notifications.info(game.i18n.format("ARMY5E.Unit.Notify.StrengthRecorded", {
      name: this.actor.name,
      count: this.actor.system.standCount
    }));
  }
}
