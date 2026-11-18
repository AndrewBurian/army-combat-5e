import { ACTOR_TYPES, CONFIGURATIONS, UNIT_TYPES } from "../config.mjs";
import { findOrCreateStand } from "../creation.mjs";

const { BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for a unit: a roster of stands that moves, acts and breaks as one.
 *
 * Extends EncounterData, which already models "N copies of a referenced actor" with
 * UUID references and quantities, and inherits getMembers / getPlaceableMembers /
 * placeMembers from it. Deploying a unit therefore places one token per stand.
 *
 * Membership is *composition*, not identity: a unit records that it fields three stands
 * of hobgoblins, not which three tokens those are. Individual stand state lives on the
 * tokens, which is what lets many identical stands share one Stand actor. Tokens are
 * stamped with their unit at placement so the end-of-round pass can count survivors.
 */
export default class UnitData extends dnd5e.dataModels.actor.EncounterData {

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...(super.LOCALIZATION_PREFIXES ?? []), "ARMY5E.Unit"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      unit: new SchemaField({
        // Skirmisher or regiment. Chosen before the battle; the rules forbid changing it
        // once fighting has started. Nothing enforces that yet.
        type: new StringField({
          required: true,
          initial: "regiment",
          choices: () => Object.fromEntries(
            Object.entries(UNIT_TYPES).map(([k, v]) => [k, v.label])
          )
        }),

        // Regiments only. Skirmishers ignore this.
        configuration: new StringField({
          required: true,
          initial: "march",
          choices: () => Object.fromEntries(
            Object.entries(CONFIGURATIONS).map(([k, v]) => [k, v.label])
          )
        }),

        // Morale triggers when a unit has lost more than half the stands it *started*
        // with, so the starting count has to be recorded when the battle begins rather
        // than derived from the current roster.
        startingStands: new NumberField({ integer: true, min: 0, initial: null, nullable: true }),

        broken: new BooleanField(),

        // The commander is a solo joined to one of this unit's stands. One per unit.
        commander: new SchemaField({
          actor: new DocumentUUIDField({ type: "Actor" })
        })
      })
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Total stands fielded, counting quantities.
   * @type {number}
   */
  get standCount() {
    return this.members.reduce((total, { quantity }) => total + (quantity?.value ?? 0), 0);
  }

  /* -------------------------------------------- */

  /** @type {boolean} */
  get isSkirmisher() {
    return this.unit.type === "skirmisher";
  }

  /* -------------------------------------------- */

  /** @type {boolean} */
  get isRegiment() {
    return this.unit.type === "regiment";
  }

  /* -------------------------------------------- */

  /**
   * The active configuration's rules, or null for skirmishers, which do not configure.
   * @type {object|null}
   */
  get configuration() {
    if ( !this.isRegiment ) return null;
    return CONFIGURATIONS[this.unit.configuration] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Whether this unit may take the Attack action. A regiment in the defend configuration
   * may not.
   * @type {boolean}
   */
  get canAttack() {
    return this.configuration?.canAttack !== false;
  }

  /* -------------------------------------------- */

  /**
   * This unit's commander, if one is posted.
   * @type {Actor5e|null}
   */
  get commander() {
    const actor = this.unit.commander.actor ? fromUuidSync(this.unit.commander.actor) : null;
    return (actor instanceof foundry.documents.Actor) ? actor : null;
  }

  /* -------------------------------------------- */

  /**
   * Whether this unit's losses have reached the point where it must check morale: more
   * than half the stands it started the battle with.
   * @param {number} survivingStands  Stands still on the field.
   * @returns {boolean}
   */
  requiresMoraleCheck(survivingStands) {
    const started = this.unit.startingStands;
    if ( !started ) return false;
    return survivingStands < (started / 2);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Record the unit's strength at the start of a battle, so morale has a baseline.
   * @returns {Promise<Actor5e>}
   */
  async recordStartingStrength() {
    return this.parent.update({
      "system.unit.startingStands": this.standCount,
      "system.unit.broken": false
    });
  }

  /* -------------------------------------------- */

  /**
   * Add stands to the unit. A plain NPC is converted to a stand first, reusing the world's
   * existing stand for that creature if there is one, so dropping a monster from a
   * compendium onto the unit sheet just works.
   * @inheritDoc
   */
  async addMember(...actors) {
    const stands = [];
    for ( const actor of actors ) {
      if ( actor.type === ACTOR_TYPES.stand ) stands.push(actor);
      else if ( actor.type === "npc" ) stands.push(await findOrCreateStand(actor));
      else throw new Error(game.i18n.localize("ARMY5E.Unit.Warning.StandsOnly"));
    }
    // One at a time: EncounterData#addMember only increments rows that already have a
    // stored quantity, so the same actor twice in one call becomes two rows.
    let result = this.parent;
    for ( const stand of stands ) result = await super.addMember(stand);
    return result;
  }
}
