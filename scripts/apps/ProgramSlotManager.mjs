import { MODULE_ID } from "../constants.mjs";
import { getEquippedCyberdeck, getInstalledPrograms, getRezzedPrograms } from "../utils/cpr-bridge.mjs";

export class ProgramSlotManager extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "nra-programs",
      classes: ["nra", "nra-programs"],
      template: `modules/${MODULE_ID}/templates/programs/program-slot-manager.hbs`,
      width: 400,
      height: 520,
      resizable: true,
    });
  }

  get title() {
    return `${game.i18n.localize(`${MODULE_ID}.programs.title`)} — ${this.actor.name}`;
  }

  async getData(options) {
    const cyberdeck = getEquippedCyberdeck(this.actor);
    if (!cyberdeck) {
      return { moduleId: MODULE_ID, cyberdeck: null };
    }

    const installed = getInstalledPrograms(cyberdeck);
    const rezzed = getRezzedPrograms(cyberdeck);
    const totalSlots = cyberdeck.system?.slots ?? 7;
    const usedSlots = installed.length;

    const enrichProgram = (p, isRezzed = false) => ({
      ...p,
      id: p.id ?? p._id,
      name: p.name,
      img: p.img,
      system: p.system,
      isRezzed,
      isEmpty: false,
      classLabel: p.system?.class ?? "",
      rezPercent: p.system?.rez ? Math.round((p.system.rez.value / p.system.rez.max) * 100) : 100,
    });

    const rezzedPrograms = rezzed.map((p) => enrichProgram(p, true));
    const installedPrograms = installed
      .filter((p) => !rezzed.some((r) => r.id === p.id))
      .map((p) => enrichProgram(p, false));

    // Empty slot placeholders
    const emptyCount = Math.max(0, totalSlots - usedSlots);
    const emptySlots = Array.from({ length: emptyCount }, () => ({ isEmpty: true }));

    return {
      moduleId: MODULE_ID,
      cyberdeck,
      rezzedPrograms,
      installedPrograms,
      totalSlots,
      usedSlots,
      emptySlots,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html instanceof jQuery ? html[0] : html;

    el.querySelectorAll(".nra-rez-program").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onRezProgram(ev));
    });
    el.querySelectorAll(".nra-derez-program").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onDerezProgram(ev));
    });
    el.querySelectorAll(".nra-view-program").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onViewProgram(ev));
    });
  }

  async _onRezProgram(event) {
    const programId = event.currentTarget.dataset.programId;
    const cyberdeck = getEquippedCyberdeck(this.actor);
    if (!cyberdeck || !programId) return;

    const program = this.actor.items.get(programId);
    if (!program) return;

    // Use the CPR system's rez method if available
    if (typeof cyberdeck.rezProgram === "function") {
      await cyberdeck.rezProgram(program);
    } else {
      // Fallback: toggle isRezzed directly
      await program.update({ "system.isRezzed": true });
    }

    this.render(false);
  }

  async _onDerezProgram(event) {
    const programId = event.currentTarget.dataset.programId;
    const cyberdeck = getEquippedCyberdeck(this.actor);
    if (!cyberdeck || !programId) return;

    const program = this.actor.items.get(programId);
    if (!program) return;

    if (typeof cyberdeck.derezProgram === "function") {
      await cyberdeck.derezProgram(program);
    } else {
      await program.update({ "system.isRezzed": false });
    }

    this.render(false);
  }

  _onViewProgram(event) {
    const programId = event.currentTarget.dataset.programId;
    const program = this.actor.items.get(programId);
    if (program) program.sheet.render(true);
  }
}
