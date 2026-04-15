import { MODULE_ID, FLOOR_CONTENT_KEYS, createEmptyFloor } from "../constants.mjs";
import { getFloorTypeInfo, getBlackIceChoices, getContentChoices, getBlackIceDefaults } from "../data/floor-types.mjs";
import { ArchitectureGenerator } from "../data/architecture-generator.mjs";
import { parseDragData, validateFloorDrop, isNetarchDrop } from "../utils/drag-drop.mjs";

export class NetArchBuilder extends FormApplication {
  constructor(netarchItem, options = {}) {
    super(netarchItem, options);
    this.netarchItem = netarchItem;
    // Deep clone floors for local editing
    this._pendingFloors = foundry.utils.deepClone(netarchItem.system.floors ?? []);
    // Ensure each floor has an index
    this._pendingFloors.forEach((f, i) => {
      if (f.index === undefined) f.index = i;
    });
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "nra-builder",
      classes: ["nra", "nra-builder"],
      template: `modules/${MODULE_ID}/templates/builder/arch-builder.hbs`,
      width: 620,
      height: 700,
      resizable: true,
      closeOnSubmit: false,
      title: game.i18n?.localize(`${MODULE_ID}.builder.title`) ?? "NET Architecture Builder",
      dragDrop: [{ dragSelector: null, dropSelector: ".nra-floor-drop-zone" }],
    });
  }

  get title() {
    return `${game.i18n.localize(`${MODULE_ID}.builder.title`)} — ${this.netarchItem.name}`;
  }

  async getData(options) {
    const floors = this._pendingFloors.map((floor, i) => {
      const typeInfo = getFloorTypeInfo(floor.content);
      const iceLabel = floor.blackice?.[0]
        ? (getBlackIceDefaults(floor.blackice[0])?.name ?? game.i18n.localize(floor.blackice[0]))
        : null;
      return {
        ...floor,
        floorLabel: i + 1,
        contentIcon: typeInfo.icon,
        contentLabel: typeInfo.label,
        color: typeInfo.color,
        iceLabel,
        isFirst: i === 0,
        isLast: i === this._pendingFloors.length - 1,
      };
    });

    return {
      moduleId: MODULE_ID,
      item: this.netarchItem,
      floors,
      isGM: game.user.isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html instanceof jQuery ? html[0] : html;

    el.querySelector(".nra-add-floor")?.addEventListener("click", () => this._onAddFloor());
    el.querySelector(".nra-generate-random")?.addEventListener("click", () => this._onGenerateRandom());
    el.querySelector(".nra-export-chat")?.addEventListener("click", () => this._onExportToChat());
    el.querySelector(".nra-clear-all")?.addEventListener("click", () => this._onClearAll());
    el.querySelector(".nra-save")?.addEventListener("click", () => this._onSave());

    el.querySelectorAll(".nra-edit-floor").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onEditFloor(ev));
    });
    el.querySelectorAll(".nra-delete-floor").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onDeleteFloor(ev));
    });
    el.querySelectorAll(".nra-move-floor-up").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onMoveFloor(ev, -1));
    });
    el.querySelectorAll(".nra-move-floor-down").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onMoveFloor(ev, 1));
    });
  }

  /* -------------------------------- */
  /*  Floor Management                */
  /* -------------------------------- */

  _onAddFloor() {
    const newFloor = createEmptyFloor(this._pendingFloors.length);
    this._pendingFloors.push(newFloor);
    this.render(false);
  }

  async _onDeleteFloor(event) {
    const idx = Number(event.currentTarget.dataset.floorIndex);
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ID}.builder.deleteFloor`),
      content: `<p>${game.i18n.localize(`${MODULE_ID}.builder.confirmDelete`)}</p>`,
    });
    if (!confirmed) return;

    this._pendingFloors.splice(idx, 1);
    this._reindex();
    this.render(false);
  }

  _onMoveFloor(event, direction) {
    const idx = Number(event.currentTarget.dataset.floorIndex);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= this._pendingFloors.length) return;

    const temp = this._pendingFloors[idx];
    this._pendingFloors[idx] = this._pendingFloors[targetIdx];
    this._pendingFloors[targetIdx] = temp;
    this._reindex();
    this.render(false);
  }

  async _onEditFloor(event) {
    const idx = Number(event.currentTarget.dataset.floorIndex);
    const floor = this._pendingFloors[idx];
    if (!floor) return;

    const contentChoices = getContentChoices();
    const iceChoices = getBlackIceChoices();
    const isBlackIce = floor.content === FLOOR_CONTENT_KEYS.BLACK_ICE;
    const selectedIce = floor.blackice?.[0] ?? "";

    const templateData = { moduleId: MODULE_ID, floor, contentChoices, iceChoices, isBlackIce, selectedIce };
    const content = await renderTemplate(
      `modules/${MODULE_ID}/templates/builder/floor-edit-dialog.hbs`,
      templateData
    );

    new Dialog({
      title: `${game.i18n.localize(`${MODULE_ID}.builder.editTitle`)} — Floor ${idx + 1}`,
      content,
      buttons: {
        save: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize("Save"),
          callback: (html) => {
            const el = html instanceof jQuery ? html[0] : html;
            floor.dv = el.querySelector('[name="dv"]').value;
            floor.content = el.querySelector('[name="content"]').value;
            floor.branch = el.querySelector('[name="branch"]').checked;
            floor.description = el.querySelector('[name="description"]').value;

            if (floor.content === FLOOR_CONTENT_KEYS.BLACK_ICE) {
              const iceVal = el.querySelector('[name="blackice"]').value;
              floor.blackice = iceVal ? [iceVal] : [];
            } else {
              floor.blackice = [];
            }

            this.render(false);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel"),
        },
      },
      default: "save",
      render: (html) => {
        const el = html instanceof jQuery ? html[0] : html;
        const contentSelect = el.querySelector('[name="content"]');
        const iceGroup = el.querySelector(".nra-ice-select");
        contentSelect?.addEventListener("change", () => {
          const show = contentSelect.value === FLOOR_CONTENT_KEYS.BLACK_ICE;
          if (iceGroup) iceGroup.style.display = show ? "" : "none";
        });
      },
    }).render(true);
  }

  /* -------------------------------- */
  /*  Random Generation               */
  /* -------------------------------- */

  async _onGenerateRandom() {
    const defaultDiff = game.settings.get(MODULE_ID, "defaultDifficulty");
    const content = await renderTemplate(
      `modules/${MODULE_ID}/templates/builder/generate-dialog.hbs`,
      { moduleId: MODULE_ID, defaultDifficulty: defaultDiff }
    );

    new Dialog({
      title: game.i18n.localize(`${MODULE_ID}.builder.generateTitle`),
      content,
      buttons: {
        generate: {
          icon: '<i class="fas fa-dice"></i>',
          label: game.i18n.localize(`${MODULE_ID}.builder.generateConfirm`),
          callback: async (html) => {
            if (this._pendingFloors.length > 0) {
              const confirmed = await Dialog.confirm({
                title: game.i18n.localize(`${MODULE_ID}.builder.generateTitle`),
                content: `<p>${game.i18n.localize(`${MODULE_ID}.builder.generateReplace`)}</p>`,
              });
              if (!confirmed) return;
            }

            const el = html instanceof jQuery ? html[0] : html;
            const difficulty = el.querySelector('[name="difficulty"]').value;
            const floors = await ArchitectureGenerator.generate(difficulty);
            this._pendingFloors = floors;
            this.render(false);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel"),
        },
      },
      default: "generate",
    }).render(true);
  }

  /* -------------------------------- */
  /*  Drag & Drop                     */
  /* -------------------------------- */

  async _onDrop(event) {
    event.preventDefault();
    const dragData = await parseDragData(event);
    if (!dragData) return;

    // Find which floor was dropped on
    const floorEl = event.target.closest(".nra-floor-drop-zone");
    const floorIdx = floorEl ? Number(floorEl.dataset.floorIndex) : null;

    // Handle netarch import
    if (isNetarchDrop(dragData)) {
      const importedFloors = foundry.utils.deepClone(dragData.document.system.floors ?? []);
      if (importedFloors.length === 0) return;

      const confirmed = await Dialog.confirm({
        title: "Import Architecture",
        content: `<p>Import ${importedFloors.length} floors from "${dragData.document.name}"? This will replace existing floors.</p>`,
      });
      if (!confirmed) return;

      this._pendingFloors = importedFloors;
      this._reindex();
      this.render(false);
      return;
    }

    // Handle Black ICE / program drops
    const { valid, iceData } = validateFloorDrop(dragData);
    if (!valid || floorIdx === null) return;

    const floor = this._pendingFloors[floorIdx];
    if (!floor) return;

    floor.content = FLOOR_CONTENT_KEYS.BLACK_ICE;
    floor.blackice = [];
    floor.description = iceData.name;

    // Try to match to a known ICE key
    const knownKey = this._findIceKey(iceData.name);
    if (knownKey) {
      floor.blackice = [knownKey];
    }

    this.render(false);
  }

  _findIceKey(name) {
    const choices = getBlackIceChoices();
    const lowerName = name.toLowerCase();
    for (const [key, label] of Object.entries(choices)) {
      if (label.toLowerCase() === lowerName) return key;
    }
    return null;
  }

  /* -------------------------------- */
  /*  Save / Export / Clear           */
  /* -------------------------------- */

  async _onSave() {
    await this.netarchItem.update({ "system.floors": this._pendingFloors });
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.builder.saved`));
  }

  async _onExportToChat() {
    const floors = this._pendingFloors.map((floor, i) => {
      const typeInfo = getFloorTypeInfo(floor.content);
      const iceLabel = floor.blackice?.[0]
        ? (getBlackIceDefaults(floor.blackice[0])?.name ?? "")
        : "";
      return {
        num: i + 1,
        dv: floor.dv,
        content: typeInfo.label,
        ice: iceLabel,
        branch: floor.branch,
        description: floor.description,
      };
    });

    let tableRows = floors.map((f) => {
      const branchTag = f.branch ? " [B]" : "";
      const iceTag = f.ice ? ` (${f.ice})` : "";
      return `<tr><td>${f.num}${branchTag}</td><td>${f.dv}</td><td>${f.content}${iceTag}</td><td>${f.description || "&mdash;"}</td></tr>`;
    }).join("");

    const content = `
      <div class="nra-chat-card">
        <h3><i class="fas fa-network-wired"></i> ${this.netarchItem.name}</h3>
        <p class="nra-chat-subtitle">${game.i18n.localize(`${MODULE_ID}.chat.architectureSummary`)}</p>
        <table class="nra-arch-table">
          <thead><tr><th>#</th><th>DV</th><th>Content</th><th>Desc</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;

    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker(),
      whisper: game.user.isGM ? ChatMessage.getWhisperRecipients("GM") : [],
    });
  }

  async _onClearAll() {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ID}.builder.clearAll`),
      content: `<p>${game.i18n.localize(`${MODULE_ID}.builder.confirmClear`)}</p>`,
    });
    if (!confirmed) return;

    this._pendingFloors = [];
    this.render(false);
    ui.notifications.info(game.i18n.localize(`${MODULE_ID}.builder.cleared`));
  }

  /* -------------------------------- */
  /*  FormApplication Overrides       */
  /* -------------------------------- */

  async _updateObject(event, formData) {
    await this._onSave();
  }

  _reindex() {
    this._pendingFloors.forEach((f, i) => (f.index = i));
  }
}
