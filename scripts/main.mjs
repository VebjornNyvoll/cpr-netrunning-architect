const MODULE_ID = "cpr-netrunning-architect";

/**
 * Initialize module - register settings, hooks, and configuration.
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  // Register module settings
  game.settings.register(MODULE_ID, "enabled", {
    name: game.i18n.localize(`${MODULE_ID}.settings.enabled`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.enabledHint`),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

/**
 * Module ready - world data is loaded, safe to access actors/items.
 */
Hooks.once("ready", () => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  console.log(`${MODULE_ID} | Ready`);
});
