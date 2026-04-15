/**
 * Safe accessors for CPR system internals.
 * Avoids direct imports from the system's internal modules.
 */

/**
 * Get the actor's equipped cyberdeck item.
 */
export function getEquippedCyberdeck(actor) {
  if (typeof actor.getEquippedCyberdeck === "function") {
    return actor.getEquippedCyberdeck();
  }
  // Fallback: search items for an equipped cyberdeck
  return actor.items.find(
    (i) => i.type === "cyberdeck" && i.system.equipped === "equipped"
  ) ?? null;
}

/**
 * Get the actor's active Netrunner role item.
 */
export function getNetRole(actor) {
  const roleId = actor.system?.roleInfo?.activeNetRole;
  if (!roleId) return null;
  return actor.items.get(roleId) ?? null;
}

/**
 * Get the Interface role rank value from the role item.
 */
export function getInterfaceRank(actor) {
  const role = getNetRole(actor);
  if (!role) return 0;
  return parseInt(role.system?.rank, 10) || 0;
}

/**
 * Look up a Black ICE actor by name in world actors.
 */
export function getBlackIceByName(name) {
  return game.actors.find(
    (a) => a.type === "blackIce" && a.name === name
  ) ?? null;
}

/**
 * Get available interface abilities from CONFIG.
 */
export function getInterfaceAbilities() {
  return CONFIG.CPR?.interfaceAbilities ?? {};
}

/**
 * Get program class list from CONFIG.
 */
export function getProgramClassList() {
  return CONFIG.CPR?.programClassList ?? {};
}

/**
 * Get Black ICE type list from CONFIG.
 */
export function getBlackIceTypes() {
  return CONFIG.CPR?.blackIceType ?? [];
}

/**
 * Get net architecture difficulty options from CONFIG.
 */
export function getNetArchDifficulty() {
  return CONFIG.CPR?.netArchDifficulty ?? {};
}

/**
 * Get the installed programs on a cyberdeck.
 */
export function getInstalledPrograms(cyberdeck) {
  if (!cyberdeck) return [];
  if (typeof cyberdeck.system?.installedPrograms !== "undefined") {
    return cyberdeck.system.installedPrograms;
  }
  return [];
}

/**
 * Get the rezzed (active) programs on a cyberdeck.
 */
export function getRezzedPrograms(cyberdeck) {
  if (!cyberdeck) return [];
  if (typeof cyberdeck.system?.rezzedPrograms !== "undefined") {
    return cyberdeck.system.rezzedPrograms;
  }
  return [];
}

/**
 * Get the NET architecture roll table compendium pack name.
 */
export function getNetArchTablePack() {
  try {
    return game.settings.get(game.system.id, "netArchRollTableCompendium")
      || "cyberpunk-red-core.internal_net-rolltables";
  } catch {
    return "cyberpunk-red-core.internal_net-rolltables";
  }
}

/**
 * Check if an actor is currently in Netspace mode.
 */
export function isInNetspace(actor) {
  return actor.system?.roleInfo?.activeNetRole != null;
}
