import { MODULE_ID, FLAGS, createEmptyState } from "./constants.mjs";

/**
 * Register the public API on the module. Call during init hook.
 * Exposes methods at game.modules.get(MODULE_ID).api
 */
export function registerAPI() {
  const moduleData = game.modules.get(MODULE_ID);
  if (!moduleData) return;

  moduleData.api = {
    /**
     * Open the architecture builder for a netarch item.
     * @param {Item} netarchItem - A netarch-type Item document
     */
    async openBuilder(netarchItem) {
      const { NetArchBuilder } = await import("./apps/NetArchBuilder.mjs");
      new NetArchBuilder(netarchItem).render(true);
    },

    /**
     * Open the netrunner tracker for an active run.
     * @param {Item} netarchItem - The target architecture
     * @param {Actor} actor - The netrunner character
     */
    async openTracker(netarchItem, actor) {
      const { NetrunnerTracker } = await import("./apps/NetrunnerTracker.mjs");
      new NetrunnerTracker(netarchItem, actor).render(true);
    },

    /**
     * Get the current run state for an architecture.
     * @param {Item} netarchItem
     * @returns {object} The architecture state
     */
    getArchitectureState(netarchItem) {
      return netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    },

    /**
     * Reset all run state on an architecture (clears runners, explored floors, etc.)
     * @param {Item} netarchItem
     */
    async resetArchitecture(netarchItem) {
      await netarchItem.unsetFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE);
    },
  };

  Hooks.callAll(`${MODULE_ID}.ready`, moduleData.api);
}
