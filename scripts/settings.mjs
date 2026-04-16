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

  // Tile image path
  game.settings.register(MODULE_ID, "tilePath", {
    name: game.i18n.localize(`${MODULE_ID}.settings.tilePath`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.tilePathHint`),
    scope: "world",
    config: true,
    type: String,
    default: `systems/cyberpunk-red-core/tiles/netarch/WebP`,
    filePicker: "folder",
  });

  // Tile file extension
  game.settings.register(MODULE_ID, "tileExtension", {
    name: game.i18n.localize(`${MODULE_ID}.settings.tileExtension`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.tileExtensionHint`),
    scope: "world",
    config: true,
    type: String,
    default: "webp",
    choices: {
      webp: "WebP (static)",
      webm: "WebM (animated)",
      png: "PNG",
    },
  });

  // Tile grid size
  game.settings.register(MODULE_ID, "tileGridSize", {
    name: game.i18n.localize(`${MODULE_ID}.settings.tileGridSize`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.tileGridSizeHint`),
    scope: "world",
    config: true,
    type: Number,
    default: 110,
  });

  // Tile orientation
  game.settings.register(MODULE_ID, "tileOrientation", {
    name: game.i18n.localize(`${MODULE_ID}.settings.tileOrientation`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.tileOrientationHint`),
    scope: "world",
    config: true,
    type: String,
    default: "horizontal",
    choices: {
      horizontal: `${MODULE_ID}.tiles.orientHorizontal`,
      vertical: `${MODULE_ID}.tiles.orientVertical`,
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
