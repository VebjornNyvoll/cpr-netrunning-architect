import { MODULE_ID } from "../constants.mjs";
import { getInterfaceRank, getNetRole } from "./cpr-bridge.mjs";

/**
 * Roll an Interface check for a netrunner.
 * Uses 1d10 + Interface rank + modifiers, with CPR critical handling.
 * @param {Actor} actor - The netrunner
 * @param {number} dv - The target Difficulty Value
 * @param {string} actionKey - Which NET action is being performed
 * @returns {Promise<object>} Roll result
 */
export async function rollInterfaceCheck(actor, dv, actionKey = "interface") {
  const interfaceRank = getInterfaceRank(actor);
  const role = getNetRole(actor);
  const roleName = role?.name ?? "Interface";

  // Base roll
  const roll = await new Roll("1d10").evaluate();
  let total = roll.total + interfaceRank;
  let isCritSuccess = false;
  let isCritFail = false;
  let critRoll = null;

  // CPR Critical Handling
  if (roll.total === 10) {
    isCritSuccess = true;
    critRoll = await new Roll("1d10").evaluate();
    total += critRoll.total;
    await _showDice(critRoll);
  } else if (roll.total === 1) {
    isCritFail = true;
    critRoll = await new Roll("1d10").evaluate();
    total -= critRoll.total;
    await _showDice(critRoll);
  }

  // Show the base roll with Dice So Nice
  await _showDice(roll);

  const success = total >= dv;

  return {
    total,
    roll,
    critRoll,
    interfaceRank,
    roleName,
    dv,
    isCritSuccess,
    isCritFail,
    success,
    actionKey,
    actorName: actor.name,
    actorImg: actor.img,
  };
}

/**
 * Roll damage (e.g., for Zap: 1d6 direct REZ damage).
 * @param {string} formula - The damage dice formula
 * @returns {Promise<object>}
 */
export async function rollDamage(formula = "1d6") {
  const roll = await new Roll(formula).evaluate();
  await _showDice(roll);

  // Check for critical (2+ sixes on d6)
  const sixes = roll.dice
    .filter((d) => d.faces === 6)
    .reduce((sum, d) => sum + d.results.filter((r) => r.result === 6).length, 0);
  const isCrit = sixes >= 2;

  return {
    total: roll.total,
    roll,
    formula,
    isCrit,
  };
}

/**
 * Roll for NET combat actions (program ATK/DEF vs ICE).
 * @param {number} statValue - The program's ATK or DEF stat
 * @param {number} interfaceRank - The netrunner's Interface rank
 * @returns {Promise<object>}
 */
export async function rollNetCombat(statValue, interfaceRank = 0) {
  const roll = await new Roll("1d10").evaluate();
  let total = roll.total + statValue + interfaceRank;
  let isCritSuccess = false;
  let isCritFail = false;
  let critRoll = null;

  if (roll.total === 10) {
    isCritSuccess = true;
    critRoll = await new Roll("1d10").evaluate();
    total += critRoll.total;
    await _showDice(critRoll);
  } else if (roll.total === 1) {
    isCritFail = true;
    critRoll = await new Roll("1d10").evaluate();
    total -= critRoll.total;
    await _showDice(critRoll);
  }

  await _showDice(roll);

  return {
    total,
    roll,
    critRoll,
    statValue,
    interfaceRank,
    isCritSuccess,
    isCritFail,
  };
}

/**
 * Show a roll with Dice So Nice if available.
 * Respects the core roll mode for whisper/blind handling.
 */
async function _showDice(roll) {
  if (!game.modules.get("dice-so-nice")?.active) return;

  const rollMode = game.settings.get("core", "rollMode");
  let whisper = null;
  let blind = false;

  if (rollMode === "gmroll" || rollMode === "blindroll") {
    whisper = game.users.filter((u) => u.isGM).map((u) => u.id);
    blind = rollMode === "blindroll";
  } else if (rollMode === "selfroll") {
    whisper = [game.user.id];
  }

  try {
    await game.dice3d.showForRoll(roll, game.user, true, whisper, blind);
  } catch {
    // Silently fail if DSN errors
  }
}
