import { CREATURES_PER_STAND, STAND_SIZES } from "../config.mjs";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

/**
 * Data model for a stand: ten identical creatures fighting as one.
 *
 * A stand is an imported *copy* of an NPC rather than a reference to one, so it owns its
 * items and the whole 5e combat pipeline — attacks, damage, conditions, spellcasting —
 * works on it untouched. See docs/reference for why.
 *
 * Note this deliberately does not override `_systemType`: it stays `"npc"`, which is what
 * drives the natural-armour AC default and the NPC ability defaults in CommonTemplate.
 */
export default class StandData extends dnd5e.dataModels.actor.NPCData {

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, "ARMY5E.Stand"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      stand: new SchemaField({
        // Where this stand was imported from. Informational only — a stand does not track
        // its source statblock, and editing that creature will not change existing stands.
        origin: new DocumentUUIDField({ type: "Actor" }),

        // At 0 hp a stand is a casualty, not dead: it stays in play until the end of the
        // round, acting normally. Nothing in dnd5e marks an actor dead or defeated at 0 hp,
        // so this only needs setting by the end-of-round pass.
        casualty: new BooleanField(),

        hiding: new BooleanField(),

        // RAW, a stand has one creature's hp and damage. That is the rules-as-written
        // behaviour and the default, but it is the single most criticised part of the
        // system, so it is adjustable per stand.
        scaling: new SchemaField({
          hp: new NumberField({ initial: 1, min: 0, nullable: false }),
          damage: new NumberField({ initial: 1, min: 0, nullable: false })
        }),

        // Solos joined to this stand. Unlike the stand's own creature, a solo genuinely is
        // a specific existing actor — usually a PC — so these stay references.
        solos: new ArrayField(new SchemaField({
          actor: new DocumentUUIDField({ type: "Actor" })
        }))
      })
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Actor5e#prepareData bails out for actor types whose data model was registered by
   * anyone other than dnd5e itself (actor.mjs:303), which includes ours. The bail still
   * runs Foundry's own pipeline, so all that is actually lost is five statements. We
   * replicate them here and in prepareDerivedData.
   *
   * This reaches into `_`-prefixed internals and is therefore the most version-fragile
   * part of the module. `scripts/compatibility.mjs` checks they still exist and warns
   * loudly if a dnd5e release moves them.
   */
  prepareBaseData() {
    const actor = this.parent;
    actor._clearCachedValues?.();
    actor._preparationWarnings = [];
    actor.labels = {};
    super.prepareBaseData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // The remaining half of what Actor5e#prepareData skips. prepareFinalAttributes is the
    // load-bearing one: it finalises item attack bonuses and save DCs, without which
    // weapon attacks roll wrong.
    for ( const item of this.parent.items ) item.prepareFinalAttributes?.();
    this.parent._prepareSpellcasting?.();

    this.#applyHitPointScaling();
  }

  /* -------------------------------------------- */

  /**
   * Scale maximum hit points, if this stand deviates from RAW.
   */
  #applyHitPointScaling() {
    const multiplier = this.stand.scaling.hp;
    if ( (multiplier === 1) || !Number.isFinite(this.attributes.hp.max) ) return;
    this.attributes.hp.max = Math.floor(this.attributes.hp.max * multiplier);
    this.attributes.hp.value = Math.min(this.attributes.hp.value ?? 0, this.attributes.hp.max);
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Solos currently joined to this stand, resolved to actors. Unresolvable references are
   * dropped rather than surfaced.
   * @type {Actor5e[]}
   */
  get solos() {
    return this.stand.solos
      .map(({ actor }) => fromUuidSync(actor))
      .filter(a => a instanceof foundry.documents.Actor);
  }

  /* -------------------------------------------- */

  /**
   * How many of the stand's ten creatures are notionally still standing. Flavour for the
   * sheet — no rule reads this, and the stand is mechanically binary until it is a
   * casualty.
   * @type {number}
   */
  get figuresStanding() {
    const { value, max } = this.attributes.hp;
    if ( !max ) return CREATURES_PER_STAND;
    return Math.ceil(CREATURES_PER_STAND * Math.clamp((value ?? 0) / max, 0, 1));
  }

  /* -------------------------------------------- */

  /**
   * Whether this stand's creature size is legal. Gargantuan creatures always fight as
   * solos and can never form a stand.
   * @type {boolean}
   */
  get hasValidSize() {
    return STAND_SIZES.includes(this.traits.size);
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    // Stands use unlinked tokens so that many identical stands can share one actor while
    // each token tracks its own damage.
    this.parent.updateSource({ "prototypeToken.actorLink": false });

    // Footprint deliberately inherits the creature mapping from NPCData's _preCreate:
    // a stand occupies the space on a 20 ft grid that one of its creatures occupies on a
    // 5 ft grid, which is the same 1 / 2x2 / 3x3 progression. Only Gargantuan diverges,
    // and Gargantuan cannot form a stand at all.
  }
}
