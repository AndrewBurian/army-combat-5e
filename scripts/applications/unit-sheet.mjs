import * as battle from "../battle.mjs";
import { CONFIGURATIONS, MODULE_ID, UNIT_TYPES } from "../config.mjs";

/**
 * Statuses the unit sheet can apply to all of a unit's stands at once. The configuration
 * and skirmisher statuses are left out because they follow the unit's own fields.
 * @type {string[]}
 */
const UNIT_STATUSES = ["isolated", "prepared", "incited", "broken", "casualty"];

/**
 * Sheet for unit actors.
 *
 * Extends the system's encounter sheet, which already renders a roster of referenced
 * actors with editable quantities and handles drop-to-add. We add the unit tab carrying
 * formation, configuration, battle controls and morale state.
 */
export default class UnitActorSheet extends dnd5e.applications.actor.EncounterActorSheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["army-combat-5e", "unit"],
    actions: {
      addToCombat: UnitActorSheet.#onAddToCombat,
      assignSelected: UnitActorSheet.#onAssignSelected,
      checkMorale: UnitActorSheet.#onCheckMorale,
      clearCommander: UnitActorSheet.#onClearCommander,
      eliminateCasualties: UnitActorSheet.#onEliminateCasualties,
      rally: UnitActorSheet.#onRally,
      recordStrength: UnitActorSheet.#onRecordStrength,
      setStatus: UnitActorSheet.#onSetStatus
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
    const tokens = battle.getUnitTokens(this.actor);
    const casualties = tokens.filter(battle.isCasualty).length;

    context.unit = {
      broken: system.unit.broken,
      // Battle controls work in play mode. `editable` is only true in dnd5e's edit mode.
      canControl: this.actor.isOwner,
      commander: system.commander,
      configuration: system.unit.configuration,
      isGM: game.user.isGM,
      isRegiment: system.isRegiment,
      standCount: system.standCount,
      onField: tokens.length,
      casualties,
      startingStands: started,
      type: system.unit.type,
      typeChoices: Object.fromEntries(
        Object.entries(UNIT_TYPES).map(([key, { label }]) => [key, game.i18n.localize(label)])
      ),
      configurationChoices: Object.fromEntries(
        Object.entries(CONFIGURATIONS).map(([key, { label }]) => [key, game.i18n.localize(label)])
      ),
      statusChoices: Object.fromEntries(UNIT_STATUSES.map(id => {
        const status = CONFIG.statusEffects.find(s => s.id === id);
        return [id, game.i18n.localize(status?.name ?? id)];
      }))
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /**
   * An actor dropped on the command section becomes the unit's commander. Anywhere else it
   * joins the roster as usual.
   * @inheritDoc
   */
  async _onDropActor(event, actor) {
    if ( !event.target.closest(".army-command") ) return super._onDropActor(event, actor);
    if ( !this.actor.isOwner ) return;
    await this.actor.update({ "system.unit.commander.actor": actor.uuid });
    return actor;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Tag the currently controlled tokens as this unit's stands.
   * @this {UnitActorSheet}
   */
  static async #onAssignSelected() {
    const tokens = (canvas?.tokens?.controlled ?? []).map(t => t.document);
    const count = await battle.assignTokens(this.actor, tokens);
    ui.notifications.info(game.i18n.format("ARMY5E.Unit.Notify.Assigned", { name: this.actor.name, count }));
    this.render();
  }

  /**
   * @this {UnitActorSheet}
   */
  static async #onAddToCombat() {
    await battle.addUnitToCombat(this.actor);
    this.render();
  }

  /**
   * Apply or remove the selected status on every stand.
   * @this {UnitActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onSetStatus(event, target) {
    // The select has no name, so the sheet's submit-on-change does not try to save it.
    const statusId = this.element.querySelector("select.army-status-select")?.value;
    if ( !statusId ) return;
    const active = target.dataset.active === "true";
    if ( statusId === "broken" ) await battle.setBroken(this.actor, active);
    else await battle.setUnitStatus(this.actor, statusId, active);
    this.render();
  }

  /**
   * @this {UnitActorSheet}
   */
  static async #onEliminateCasualties() {
    const count = await battle.eliminateCasualties(this.actor);
    ui.notifications.info(game.i18n.format("ARMY5E.Unit.Notify.Eliminated", { name: this.actor.name, count }));
    this.render();
  }

  /**
   * Morale from the sheet always rolls, even if losses do not yet call for it.
   * @this {UnitActorSheet}
   */
  static async #onCheckMorale() {
    await battle.checkMorale(this.actor, { force: true });
  }

  /**
   * @this {UnitActorSheet}
   */
  static async #onRally() {
    await battle.rally(this.actor);
  }

  /**
   * @this {UnitActorSheet}
   */
  static async #onClearCommander() {
    if ( !this.actor.isOwner ) return;
    await this.actor.update({ "system.unit.commander.actor": null });
  }

  /**
   * Record the unit's current strength as its starting strength, giving morale a baseline.
   * @this {UnitActorSheet}
   */
  static async #onRecordStrength() {
    if ( !this.actor.isOwner ) return;
    await this.actor.system.recordStartingStrength();
    ui.notifications.info(game.i18n.format("ARMY5E.Unit.Notify.StrengthRecorded", {
      name: this.actor.name,
      count: this.actor.system.unit.startingStands
    }));
  }
}
