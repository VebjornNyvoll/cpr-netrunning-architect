import { MODULE_ID } from "./constants.mjs";

export function registerSettings() {
  // Master toggle
  game.settings.register(MODULE_ID, "enabled", {
    name: game.i18n.localize(`${MODULE_ID}.settings.enabled`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.enabledHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Auto-prompt Interface rolls when moving floors
  game.settings.register(MODULE_ID, "autoInterfaceChecks", {
    name: game.i18n.localize(`${MODULE_ID}.settings.autoInterfaceChecks`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.autoInterfaceChecksHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Fog of war in tracker
  game.settings.register(MODULE_ID, "fogOfWar", {
    name: game.i18n.localize(`${MODULE_ID}.settings.fogOfWar`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.fogOfWarHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Show floor DVs to players before exploring
  game.settings.register(MODULE_ID, "showFloorDVsToPlayers", {
    name: game.i18n.localize(`${MODULE_ID}.settings.showFloorDVsToPlayers`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.showFloorDVsToPlayersHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Auto-trigger ICE encounters
  game.settings.register(MODULE_ID, "autoTriggerIce", {
    name: game.i18n.localize(`${MODULE_ID}.settings.autoTriggerIce`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.autoTriggerIceHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Auto-roll initiative for ICE in net combat
  game.settings.register(MODULE_ID, "netCombatAutoRoll", {
    name: game.i18n.localize(`${MODULE_ID}.settings.netCombatAutoRoll`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.netCombatAutoRollHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // Default random generation difficulty
  game.settings.register(MODULE_ID, "defaultDifficulty", {
    name: game.i18n.localize(`${MODULE_ID}.settings.defaultDifficulty`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.defaultDifficultyHint`),
    scope: "world",
    config: true,
    type: String,
    default: "standard",
    choices: {
      basic: `${MODULE_ID}.settings.difficultyBasic`,
      standard: `${MODULE_ID}.settings.difficultyStandard`,
      uncommon: `${MODULE_ID}.settings.difficultyUncommon`,
      advanced: `${MODULE_ID}.settings.difficultyAdvanced`,
    },
  });

  // Animation speed (client)
  game.settings.register(MODULE_ID, "animationSpeed", {
    name: game.i18n.localize(`${MODULE_ID}.settings.animationSpeed`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.animationSpeedHint`),
    scope: "client",
    config: true,
    type: Number,
    default: 400,
    range: { min: 100, max: 1000, step: 100 },
  });

  // Compact mode (client)
  game.settings.register(MODULE_ID, "compactMode", {
    name: game.i18n.localize(`${MODULE_ID}.settings.compactMode`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.compactModeHint`),
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
}
