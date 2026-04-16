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
