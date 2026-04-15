import { MODULE_ID } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerSocket } from "./socket.mjs";
import { registerAPI } from "./api.mjs";

/* ---------------------------------------- */
/*  Initialization                          */
/* ---------------------------------------- */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Netrunning Architect`);
  registerSettings();
  registerSocket();
  registerAPI();

  // Pre-load Handlebars templates
  loadTemplates([
    `modules/${MODULE_ID}/templates/builder/floor-row.hbs`,
    `modules/${MODULE_ID}/templates/builder/floor-edit-dialog.hbs`,
    `modules/${MODULE_ID}/templates/builder/generate-dialog.hbs`,
    `modules/${MODULE_ID}/templates/tracker/floor-tile.hbs`,
    `modules/${MODULE_ID}/templates/tracker/netrunner-indicator.hbs`,
    `modules/${MODULE_ID}/templates/programs/program-card.hbs`,
    `modules/${MODULE_ID}/templates/combat/ice-stat-block.hbs`,
  ]);
});

Hooks.once("ready", () => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  console.log(`${MODULE_ID} | Ready`);
});

/* ---------------------------------------- */
/*  Inject Builder Button into netarch      */
/*  item sheets                             */
/* ---------------------------------------- */

Hooks.on("renderCPRItemSheet", (app, html, data) => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  if (app.item.type !== "netarch") return;
  _injectBuilderButton(app, html);
});

async function _injectBuilderButton(app, html) {
  const header = html.find ? html.find(".sheet-header") : html.querySelector?.(".sheet-header");
  if (!header || (header.length !== undefined && header.length === 0)) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("nra-open-builder");
  btn.innerHTML = `<i class="fas fa-drafting-compass"></i> ${game.i18n.localize(`${MODULE_ID}.builder.openButton`)}`;
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const { NetArchBuilder } = await import("./apps/NetArchBuilder.mjs");
    new NetArchBuilder(app.item).render(true);
  });

  const target = header instanceof HTMLElement ? header : header[0];
  if (target) target.appendChild(btn);
}

/* ---------------------------------------- */
/*  Inject Tracker Button into character    */
/*  sheets                                  */
/* ---------------------------------------- */

Hooks.on("renderCPRCharacterActorSheet", (app, html, data) => {
  if (!game.settings.get(MODULE_ID, "enabled")) return;
  _injectTrackerButton(app, html);
});

async function _injectTrackerButton(app, html) {
  // Find the fight tab content area
  const fightTab = html.find ? html.find('.tab[data-tab="fight"]') : html.querySelector?.('.tab[data-tab="fight"]');
  if (!fightTab || (fightTab.length !== undefined && fightTab.length === 0)) return;

  const target = fightTab instanceof HTMLElement ? fightTab : fightTab[0];
  if (!target) return;

  // Check if button already exists
  if (target.querySelector(".nra-open-tracker")) return;

  const wrapper = document.createElement("div");
  wrapper.classList.add("nra-tracker-launch");
  wrapper.innerHTML = `
    <button type="button" class="nra-open-tracker">
      <i class="fas fa-network-wired"></i> ${game.i18n.localize(`${MODULE_ID}.tracker.openButton`)}
    </button>
  `;

  wrapper.querySelector(".nra-open-tracker").addEventListener("click", async (ev) => {
    ev.preventDefault();
    await _openArchitectureSelector(app.actor);
  });

  target.prepend(wrapper);
}

/**
 * Opens a dialog for the player to select which architecture to enter.
 */
async function _openArchitectureSelector(actor) {
  // Gather all netarch items in the world
  const netarchs = game.items.filter((i) => i.type === "netarch");

  if (netarchs.length === 0) {
    ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.tracker.noArchitectures`));
    return;
  }

  const options = netarchs.map((n) => `<option value="${n.id}">${n.name}</option>`).join("");
  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize(`${MODULE_ID}.tracker.selectArchitecture`)}</label>
        <select name="architectureId">${options}</select>
      </div>
    </form>
  `;

  new Dialog({
    title: game.i18n.localize(`${MODULE_ID}.tracker.selectTitle`),
    content,
    buttons: {
      enter: {
        icon: '<i class="fas fa-plug"></i>',
        label: game.i18n.localize(`${MODULE_ID}.tracker.jackIn`),
        callback: async (html) => {
          const select = html.find ? html.find('[name="architectureId"]') : html.querySelector('[name="architectureId"]');
          const id = select instanceof HTMLElement ? select.value : select.val();
          const netarch = game.items.get(id);
          if (!netarch) return;
          const { NetrunnerTracker } = await import("./apps/NetrunnerTracker.mjs");
          new NetrunnerTracker(netarch, actor).render(true);
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("Cancel"),
      },
    },
    default: "enter",
  }).render(true);
}

/* ---------------------------------------- */
/*  Context Menu on Item Sidebar            */
/* ---------------------------------------- */

Hooks.on("getItemDirectoryEntryContext", (html, entryOptions) => {
  entryOptions.push({
    name: game.i18n.localize(`${MODULE_ID}.contextMenu.openBuilder`),
    icon: '<i class="fas fa-network-wired"></i>',
    condition: (li) => {
      const itemId = li.data?.("documentId") ?? li.dataset?.documentId;
      const item = game.items.get(itemId);
      return item?.type === "netarch" && game.user.isGM;
    },
    callback: async (li) => {
      const itemId = li.data?.("documentId") ?? li.dataset?.documentId;
      const item = game.items.get(itemId);
      if (!item) return;
      const { NetArchBuilder } = await import("./apps/NetArchBuilder.mjs");
      new NetArchBuilder(item).render(true);
    },
  });
});
