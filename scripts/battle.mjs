import { ACTOR_TYPES, MODULE_ID, UNIT_TYPES } from "./config.mjs";

/**
 * Battle procedure: tying tokens to units, unit initiative, casualties and morale.
 *
 * A unit records composition, not tokens, so each stand token carries its unit's actor id
 * in `flags.army-combat-5e.unit`. Everything here that asks "which stands are in this unit"
 * reads that flag on the scene's tokens.
 */

/** Morale and rally save DC. */
const MORALE_DC = 10;

/**
 * The unit whose members are being placed, so preCreateToken can tag them. Set only for the
 * duration of UnitData#placeMembers.
 * @type {string|null}
 */
let placingUnit = null;

/* -------------------------------------------- */
/*  Tokens                                      */
/* -------------------------------------------- */

/**
 * Run a placement with every stand token it creates tagged to the given unit.
 * @param {Actor5e} unit
 * @param {Function} place  Async function doing the placement.
 */
export async function withUnitPlacement(unit, place) {
  placingUnit = unit.id;
  try {
    return await place();
  } finally {
    placingUnit = null;
  }
}

/**
 * Tag tokens created during a unit placement.
 * @param {TokenDocument} token
 */
function onPreCreateToken(token) {
  if ( !placingUnit || (token.actor?.type !== ACTOR_TYPES.stand) ) return;
  token.updateSource({ [`flags.${MODULE_ID}.unit`]: placingUnit });
}

/* -------------------------------------------- */

/**
 * The stand tokens belonging to a unit on a scene.
 * @param {Actor5e} unit
 * @param {Scene} [scene]
 * @returns {TokenDocument[]}
 */
export function getUnitTokens(unit, scene = canvas?.scene) {
  if ( !scene ) return [];
  return scene.tokens.filter(t => t.getFlag(MODULE_ID, "unit") === unit.id);
}

/**
 * The unit a token belongs to, if any.
 * @param {TokenDocument} token
 * @returns {Actor5e|null}
 */
export function getTokenUnit(token) {
  const id = token.getFlag(MODULE_ID, "unit");
  return id ? (game.actors.get(id) ?? null) : null;
}

/**
 * Whether a stand token is at 0 hp or marked a casualty.
 * @param {TokenDocument} token
 * @returns {boolean}
 */
export function isCasualty(token) {
  const actor = token.actor;
  if ( !actor ) return false;
  return actor.statuses.has("casualty") || ((actor.system.attributes?.hp?.value ?? 1) <= 0);
}

/* -------------------------------------------- */

/**
 * Tag the given tokens to a unit, then bring their formation statuses in line with it.
 * Non-stand tokens are skipped.
 * @param {Actor5e} unit
 * @param {TokenDocument[]} tokens
 * @returns {Promise<number>}  How many tokens were tagged.
 */
export async function assignTokens(unit, tokens) {
  const stands = tokens.filter(t => t.actor?.type === ACTOR_TYPES.stand);
  const byScene = Map.groupBy(stands, t => t.parent);
  for ( const [scene, list] of byScene ) {
    await scene.updateEmbeddedDocuments("Token", list.map(t => ({
      _id: t.id, [`flags.${MODULE_ID}.unit`]: unit.id
    })));
  }
  await syncFormation(unit, stands);
  return stands.length;
}

/* -------------------------------------------- */
/*  Statuses                                    */
/* -------------------------------------------- */

/**
 * Set a status on every stand in a unit. Writes go to each token's own actor, since stands
 * share one Stand actor across units.
 * @param {Actor5e} unit
 * @param {string} statusId
 * @param {boolean} active
 * @param {TokenDocument[]} [tokens]
 */
export async function setUnitStatus(unit, statusId, active, tokens = getUnitTokens(unit)) {
  for ( const token of tokens ) {
    const actor = token.actor;
    if ( !actor || (actor.statuses.has(statusId) === active) ) continue;
    await actor.toggleStatusEffect(statusId, { active });
  }
}

/**
 * Make each stand's configuration and skirmisher statuses match its unit.
 * @param {Actor5e} unit
 * @param {TokenDocument[]} [tokens]
 */
export async function syncFormation(unit, tokens = getUnitTokens(unit)) {
  const { isRegiment, isSkirmisher, unit: { configuration } } = unit.system;
  await setUnitStatus(unit, "skirmisher", isSkirmisher, tokens);
  await setUnitStatus(unit, "aid", isRegiment && (configuration === "aid"), tokens);
  await setUnitStatus(unit, "defend", isRegiment && (configuration === "defend"), tokens);
}

/* -------------------------------------------- */
/*  Initiative                                  */
/* -------------------------------------------- */

/**
 * The Dex modifier a unit rolls initiative with: highest for skirmishers, lowest for
 * regiments, among the stands on the field.
 * @param {Actor5e} unit
 * @param {TokenDocument[]} tokens
 * @returns {number}
 */
function unitInitiativeModifier(unit, tokens) {
  const mods = tokens.map(t => t.actor?.system.abilities?.dex?.mod).filter(Number.isFinite);
  if ( !mods.length ) return 0;
  return UNIT_TYPES[unit.system.unit.type]?.initiative === "highest" ? Math.max(...mods) : Math.min(...mods);
}

/**
 * Put a unit's stands into the scene's combat as one combatant group and roll its
 * initiative. Creates the combat if the scene has none, and records the unit's starting
 * strength if that has not been done yet.
 * @param {Actor5e} unit
 * @param {object} [options]
 * @param {boolean} [options.roll=true]  Roll initiative after grouping.
 * @returns {Promise<Combat|null>}
 */
export async function addUnitToCombat(unit, { roll = true } = {}) {
  const scene = canvas?.scene;
  const tokens = getUnitTokens(unit, scene);
  if ( !tokens.length ) {
    ui.notifications.warn(game.i18n.format("ARMY5E.Unit.Warning.NoTokens", { name: unit.name }));
    return null;
  }

  let combat = game.combats.find(c => c.scene?.id === scene.id) ?? null;
  combat ??= await Combat.implementation.create({ scene: scene.id, active: true });

  let group = combat.groups.find(g => g.getFlag(MODULE_ID, "unit") === unit.id);
  if ( !group ) {
    [group] = await combat.createEmbeddedDocuments("CombatantGroup", [{
      name: unit.name, img: unit.img, [`flags.${MODULE_ID}.unit`]: unit.id
    }]);
  }

  const existing = new Map(combat.combatants.map(c => [c.tokenId, c]));
  const toUpdate = [];
  const toCreate = [];
  for ( const token of tokens ) {
    const combatant = existing.get(token.id);
    if ( combatant ) {
      if ( combatant.group?.id !== group.id ) toUpdate.push({ _id: combatant.id, group: group.id });
    }
    else toCreate.push({ tokenId: token.id, sceneId: scene.id, actorId: token.actorId, hidden: token.hidden, group: group.id });
  }
  if ( toUpdate.length ) await combat.updateEmbeddedDocuments("Combatant", toUpdate);
  if ( toCreate.length ) await combat.createEmbeddedDocuments("Combatant", toCreate);

  if ( !unit.system.unit.startingStands ) await unit.system.recordStartingStrength();
  if ( roll ) await rollUnitInitiative(unit, combat, group);
  return combat;
}

/**
 * Roll a unit's initiative and set it on its group and every member.
 * @param {Actor5e} unit
 * @param {Combat} combat
 * @param {CombatantGroup} group
 */
export async function rollUnitInitiative(unit, combat, group) {
  const members = combat.combatants.filter(c => c.group?.id === group.id);
  const tokens = members.map(c => c.token).filter(Boolean);
  const mod = unitInitiativeModifier(unit, tokens);
  const roll = await new Roll(`1d20 + ${mod}`).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: unit }),
    flavor: game.i18n.format("ARMY5E.Unit.InitiativeFlavor", {
      name: unit.name, type: game.i18n.localize(UNIT_TYPES[unit.system.unit.type].label)
    })
  });
  await group.update({ initiative: roll.total });
  await combat.updateEmbeddedDocuments("Combatant", members.map(c => ({ _id: c.id, initiative: roll.total })));
}

/* -------------------------------------------- */
/*  Casualties and Morale                       */
/* -------------------------------------------- */

/**
 * Remove a unit's casualties from the board, and from combat.
 * @param {Actor5e} unit
 * @returns {Promise<number>}  How many stands were eliminated.
 */
export async function eliminateCasualties(unit) {
  const scene = canvas?.scene;
  const casualties = getUnitTokens(unit, scene).filter(isCasualty);
  if ( !casualties.length ) return 0;
  const ids = new Set(casualties.map(t => t.id));
  for ( const combat of game.combats.filter(c => c.scene?.id === scene.id) ) {
    const combatants = combat.combatants.filter(c => ids.has(c.tokenId)).map(c => c.id);
    if ( combatants.length ) await combat.deleteEmbeddedDocuments("Combatant", combatants);
  }
  await scene.deleteEmbeddedDocuments("Token", [...ids]);
  return casualties.length;
}

/* -------------------------------------------- */

/**
 * Roll a d20 save for a unit and post it.
 * @param {Actor5e} unit
 * @param {number} mod
 * @param {string} flavor
 * @returns {Promise<boolean>}  Whether it succeeded.
 */
async function rollUnitSave(unit, mod, flavor) {
  const roll = await new Roll(`1d20 + ${mod}`).evaluate();
  const success = roll.total >= MORALE_DC;
  const result = game.i18n.localize(success ? "ARMY5E.Morale.Success" : "ARMY5E.Morale.Failure");
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: unit }),
    flavor: `${flavor} (DC ${MORALE_DC}) - <strong>${result}</strong>`
  });
  return success;
}

/**
 * The highest Wisdom save bonus among a unit's surviving stands.
 * @param {TokenDocument[]} tokens
 * @returns {number}
 */
function moraleModifier(tokens) {
  const mods = tokens.map(t => {
    const wis = t.actor?.system.abilities?.wis;
    return wis?.save?.value ?? wis?.mod;
  }).filter(Number.isFinite);
  return mods.length ? Math.max(...mods) : 0;
}

/**
 * Check a unit's morale if its losses call for it. A failed check breaks the unit.
 * @param {Actor5e} unit
 * @param {object} [options]
 * @param {boolean} [options.force=false]  Roll even if losses do not require it.
 * @returns {Promise<boolean|null>}  Whether it held, or null if no check was needed.
 */
export async function checkMorale(unit, { force = false } = {}) {
  const survivors = getUnitTokens(unit).filter(t => !isCasualty(t));
  if ( unit.system.unit.broken ) return null;
  if ( !force && !unit.system.requiresMoraleCheck(survivors.length) ) return null;
  const held = await rollUnitSave(unit, moraleModifier(survivors),
    game.i18n.format("ARMY5E.Morale.CheckFlavor", { name: unit.name }));
  if ( !held ) await setBroken(unit, true);
  return held;
}

/**
 * A broken unit with a commander retries its morale save, adding the commander's Cha.
 * @param {Actor5e} unit
 * @returns {Promise<boolean|null>}  Whether it rallied, or null if it could not try.
 */
export async function rally(unit) {
  if ( !unit.system.unit.broken ) return null;
  const commander = unit.system.commander;
  if ( !commander ) {
    ui.notifications.warn(game.i18n.format("ARMY5E.Morale.NoCommander", { name: unit.name }));
    return null;
  }
  const survivors = getUnitTokens(unit).filter(t => !isCasualty(t));
  const mod = moraleModifier(survivors) + (commander.system.abilities?.cha?.mod ?? 0);
  const rallied = await rollUnitSave(unit, mod,
    game.i18n.format("ARMY5E.Morale.RallyFlavor", { name: unit.name, commander: commander.name }));
  if ( rallied ) await setBroken(unit, false);
  return rallied;
}

/**
 * Mark a unit broken or not, on the unit and on each of its stands.
 * @param {Actor5e} unit
 * @param {boolean} broken
 */
export async function setBroken(unit, broken) {
  await unit.update({ "system.unit.broken": broken });
  await setUnitStatus(unit, "broken", broken);
}

/* -------------------------------------------- */
/*  End of Round                                */
/* -------------------------------------------- */

/**
 * Units with stand tokens on a scene.
 * @param {Scene} scene
 * @returns {Actor5e[]}
 */
function unitsOnScene(scene) {
  const ids = new Set(scene.tokens.map(t => t.getFlag(MODULE_ID, "unit")).filter(Boolean));
  return [...ids].map(id => game.actors.get(id)).filter(Boolean);
}

/**
 * Mark 0 hp stands as casualties and post a GM summary with a button to resolve the end of
 * the round: eliminate casualties, then check morale.
 * @param {Combat} combat
 */
async function onCombatRound(combat, updateData, { direction } = {}) {
  if ( !game.user.isGM || (direction !== 1) || !combat.scene ) return;
  if ( combat.scene.id !== canvas?.scene?.id ) return;
  // Hooks.callAll does not await this, so combat.round may already be the new round by
  // the time the card is written. The round ending is the one before updateData's.
  const round = updateData.round - 1;
  const rows = [];
  for ( const unit of unitsOnScene(combat.scene) ) {
    const tokens = getUnitTokens(unit, combat.scene);
    const casualties = tokens.filter(isCasualty);
    for ( const token of casualties ) {
      if ( !token.actor.statuses.has("casualty") ) await token.actor.toggleStatusEffect("casualty", { active: true });
    }
    const remaining = tokens.length - casualties.length;
    const needsMorale = !unit.system.unit.broken && unit.system.requiresMoraleCheck(remaining);
    if ( !casualties.length && !needsMorale ) continue;
    rows.push(game.i18n.format("ARMY5E.Round.UnitRow", {
      name: unit.name, casualties: casualties.length, remaining,
      started: unit.system.unit.startingStands ?? "?"
    }) + (needsMorale ? ` <strong>${game.i18n.localize("ARMY5E.Round.MoraleDue")}</strong>` : ""));
  }
  if ( !rows.length ) return;
  await ChatMessage.implementation.create({
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    speaker: { alias: game.i18n.localize("ARMY5E.Round.Speaker") },
    content: `<p>${game.i18n.format("ARMY5E.Round.Header", { round })}</p>
      <ul>${rows.map(r => `<li>${r}</li>`).join("")}</ul>
      <button type="button" data-army5e-action="resolveRound">${game.i18n.localize("ARMY5E.Round.Resolve")}</button>`
  });
}

/**
 * Eliminate every unit's casualties, then check morale where losses call for it.
 */
export async function resolveEndOfRound() {
  const scene = canvas?.scene;
  if ( !game.user.isGM || !scene ) return;
  const units = unitsOnScene(scene);
  for ( const unit of units ) await eliminateCasualties(unit);
  for ( const unit of units ) await checkMorale(unit);
}

/**
 * Wire chat card buttons.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRenderChatMessage(message, html) {
  html.querySelectorAll("[data-army5e-action='resolveRound']").forEach(button => {
    if ( !game.user.isGM ) return button.remove();
    button.addEventListener("click", async () => {
      button.disabled = true;
      await resolveEndOfRound();
    });
  });
}

/* -------------------------------------------- */

/**
 * Keep stand statuses in line when a unit's type or configuration changes.
 * @param {Actor5e} actor
 * @param {object} changes
 * @param {object} options
 * @param {string} userId
 */
function onUpdateActor(actor, changes, options, userId) {
  if ( (userId !== game.user.id) || (actor.type !== ACTOR_TYPES.unit) ) return;
  const unit = changes.system?.unit;
  if ( unit && (("type" in unit) || ("configuration" in unit)) ) syncFormation(actor);
}

/* -------------------------------------------- */

/** Register the hooks this module needs. */
export function registerBattleHooks() {
  Hooks.on("preCreateToken", onPreCreateToken);
  Hooks.on("combatRound", onCombatRound);
  Hooks.on("renderChatMessageHTML", onRenderChatMessage);
  Hooks.on("updateActor", onUpdateActor);
}
