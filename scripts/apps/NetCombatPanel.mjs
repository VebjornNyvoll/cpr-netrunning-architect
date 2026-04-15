import { MODULE_ID, FLAGS, SOCKET_ACTIONS, createEmptyState } from "../constants.mjs";
import { getBlackIceDefaults } from "../data/floor-types.mjs";
import { getEquippedCyberdeck, getRezzedPrograms, getInterfaceRank } from "../utils/cpr-bridge.mjs";
import { rollInterfaceCheck, rollDamage, rollNetCombat } from "../utils/dice.mjs";
import { postCombatCard, postChatNotification } from "../utils/chat.mjs";
import { emitSocket, addSocketListener, removeSocketListener } from "../socket.mjs";

export class NetCombatPanel extends Application {
  constructor(netarchItem, floorIndex, actor, options = {}) {
    super(options);
    this.netarchItem = netarchItem;
    this.floorIndex = floorIndex;
    this.actor = actor;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "nra-combat",
      classes: ["nra", "nra-combat"],
      template: `modules/${MODULE_ID}/templates/combat/net-combat-panel.hbs`,
      width: 460,
      height: 560,
      resizable: true,
    });
  }

  get title() {
    return `${game.i18n.localize(`${MODULE_ID}.combat.title`)} — Floor ${this.floorIndex + 1}`;
  }

  _getIceEncounter() {
    const state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    return state.iceEncounters?.[this.floorIndex] ?? null;
  }

  async getData(options) {
    const floor = this.netarchItem.system.floors?.[this.floorIndex];
    const encounter = this._getIceEncounter();

    // Resolve ICE stats
    const iceKey = encounter?.iceKey ?? floor?.blackice?.[0];
    const iceDefaults = iceKey ? getBlackIceDefaults(iceKey) : null;
    const iceRez = encounter?.iceRez ?? { value: iceDefaults?.rez ?? 15, max: iceDefaults?.rez ?? 15 };
    const iceStats = encounter?.iceStats ?? iceDefaults ?? { per: 2, spd: 4, atk: 2, def: 2 };

    const ice = {
      name: iceDefaults?.name ?? "Unknown ICE",
      classLabel: iceDefaults?.class ?? "unknown",
      per: iceStats.per,
      spd: iceStats.spd,
      atk: iceStats.atk,
      def: iceStats.def,
      rez: iceRez,
      rezPercent: Math.round((iceRez.value / iceRez.max) * 100),
    };

    // Runner programs
    const cyberdeck = getEquippedCyberdeck(this.actor);
    const rezzedPrograms = cyberdeck ? getRezzedPrograms(cyberdeck).map((p) => ({
      id: p.id ?? p._id,
      name: p.name,
      system: p.system,
    })) : [];

    return {
      moduleId: MODULE_ID,
      floorLabel: this.floorIndex + 1,
      ice,
      runner: { name: this.actor.name, img: this.actor.img },
      rezzedPrograms,
      isGM: game.user.isGM,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html instanceof jQuery ? html[0] : html;

    el.querySelector(".nra-zap")?.addEventListener("click", () => this._onZap());
    el.querySelector(".nra-ice-attack")?.addEventListener("click", () => this._onIceAttack());
    el.querySelector(".nra-flee")?.addEventListener("click", () => this._onFlee());
    el.querySelector(".nra-end-combat")?.addEventListener("click", () => this._onEndCombat());
    el.querySelector(".nra-reduce-ice-rez")?.addEventListener("click", () => this._onReduceIceRez());
    el.querySelector(".nra-reset-ice-rez")?.addEventListener("click", () => this._onResetIceRez());

    el.querySelectorAll(".nra-program-attack").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onProgramAttack(ev));
    });
    el.querySelectorAll(".nra-program-defend").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onProgramDefend(ev));
    });

    addSocketListener(this);
  }

  close(options) {
    removeSocketListener(this);
    return super.close(options);
  }

  onSocketUpdate(data) {
    if (data.architectureId && data.architectureId !== this.netarchItem.id) return;
    this.render(false);
  }

  /* -------------------------------- */
  /*  Combat Actions                  */
  /* -------------------------------- */

  async _onZap() {
    const encounter = this._getIceEncounter();
    if (!encounter) return;

    const interfaceRank = getInterfaceRank(this.actor);
    const iceDef = encounter.iceStats?.def ?? 2;

    // Roll Interface check vs ICE DEF
    const attackResult = await rollNetCombat(0, interfaceRank);
    const iceDefRoll = await rollNetCombat(iceDef, 0);
    const hit = attackResult.total >= iceDefRoll.total;

    let damageTotal = 0;
    if (hit) {
      const damageResult = await rollDamage("1d6");
      damageTotal = damageResult.total;
      await this._applyIceDamage(damageTotal);
    }

    await postCombatCard({
      moduleId: MODULE_ID,
      actionLabel: `${this.actor.name} uses Zap!`,
      attackerName: this.actor.name,
      defenderName: encounter.iceStats?.name ?? "ICE",
      rollTotal: attackResult.total,
      vsValue: iceDefRoll.total,
      damageTotal: hit ? damageTotal : null,
      isSuccess: hit,
      resultMessage: hit
        ? game.i18n.localize(`${MODULE_ID}.combat.iceDamaged`)
        : game.i18n.localize(`${MODULE_ID}.chat.failure`),
      rezRemaining: encounter.iceRez.value,
      roll: attackResult.roll,
    });

    await this._checkIceDefeated();
    this.render(false);
  }

  async _onProgramAttack(event) {
    const programId = event.currentTarget.dataset.programId;
    const program = this.actor.items.get(programId);
    if (!program) return;

    const encounter = this._getIceEncounter();
    if (!encounter) return;

    const programAtk = program.system.atk ?? 0;
    const interfaceRank = getInterfaceRank(this.actor);
    const iceDef = encounter.iceStats?.def ?? 2;

    const attackResult = await rollNetCombat(programAtk, interfaceRank);
    const iceDefRoll = await rollNetCombat(iceDef, 0);
    const hit = attackResult.total >= iceDefRoll.total;

    let damageTotal = 0;
    if (hit) {
      const damageResult = await rollDamage("2d6");
      damageTotal = damageResult.total;
      await this._applyIceDamage(damageTotal);
    }

    await postCombatCard({
      moduleId: MODULE_ID,
      actionLabel: `${this.actor.name} attacks with ${program.name}!`,
      attackerName: this.actor.name,
      defenderName: encounter.iceStats?.name ?? "ICE",
      rollTotal: attackResult.total,
      vsValue: iceDefRoll.total,
      damageTotal: hit ? damageTotal : null,
      isSuccess: hit,
      resultMessage: hit
        ? game.i18n.localize(`${MODULE_ID}.combat.iceDamaged`)
        : game.i18n.localize(`${MODULE_ID}.chat.failure`),
      rezRemaining: encounter.iceRez.value,
      roll: attackResult.roll,
    });

    await this._checkIceDefeated();
    this.render(false);
  }

  async _onProgramDefend(event) {
    const programId = event.currentTarget.dataset.programId;
    const program = this.actor.items.get(programId);
    if (!program) return;

    const programDef = program.system.def ?? 0;
    const interfaceRank = getInterfaceRank(this.actor);

    const defResult = await rollNetCombat(programDef, interfaceRank);

    await postCombatCard({
      moduleId: MODULE_ID,
      actionLabel: `${this.actor.name} defends with ${program.name}`,
      attackerName: this.actor.name,
      rollTotal: defResult.total,
      isSuccess: true,
      resultMessage: `Defense: ${defResult.total}`,
      roll: defResult.roll,
    });
  }

  async _onIceAttack() {
    const encounter = this._getIceEncounter();
    if (!encounter) return;

    const iceAtk = encounter.iceStats?.atk ?? 2;
    const iceResult = await rollNetCombat(iceAtk, 0);

    await postCombatCard({
      moduleId: MODULE_ID,
      actionLabel: `${encounter.iceStats?.name ?? "ICE"} attacks!`,
      attackerName: encounter.iceStats?.name ?? "ICE",
      defenderName: this.actor.name,
      rollTotal: iceResult.total,
      isSuccess: true,
      resultMessage: game.i18n.localize(`${MODULE_ID}.combat.iceAttacks`),
      roll: iceResult.roll,
    });
  }

  async _onFlee() {
    const floor = this.netarchItem.system.floors?.[this.floorIndex];
    const dv = parseInt(floor?.dv, 10) || 6;
    const result = await rollInterfaceCheck(this.actor, dv, "slide");

    await postCombatCard({
      moduleId: MODULE_ID,
      actionLabel: `${this.actor.name} attempts to flee!`,
      attackerName: this.actor.name,
      rollTotal: result.total,
      vsValue: dv,
      isSuccess: result.success,
      resultMessage: result.success ? "Escaped!" : game.i18n.localize(`${MODULE_ID}.chat.failure`),
      roll: result.roll,
    });

    if (result.success) {
      await this._onEndCombat();
    }
  }

  /* -------------------------------- */
  /*  ICE REZ Management              */
  /* -------------------------------- */

  async _applyIceDamage(damage) {
    const state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    const encounter = state.iceEncounters?.[this.floorIndex];
    if (!encounter) return;

    encounter.iceRez.value = Math.max(0, encounter.iceRez.value - damage);
    await this.netarchItem.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, state);
  }

  async _checkIceDefeated() {
    const state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    const encounter = state.iceEncounters?.[this.floorIndex];
    if (!encounter || encounter.iceRez.value > 0) return;

    encounter.defeated = true;
    encounter.active = false;
    await this.netarchItem.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, state);

    await postChatNotification(
      `<p><i class="fas fa-skull-crossbones"></i> <strong>${game.i18n.localize(`${MODULE_ID}.combat.iceDefeated`)}</strong></p>`
    );

    emitSocket(SOCKET_ACTIONS.COMBAT_ACTION, {
      architectureId: this.netarchItem.id,
      action: "iceDefeated",
      floorIndex: this.floorIndex,
    });
  }

  async _onReduceIceRez() {
    await this._applyIceDamage(1);
    this.render(false);
  }

  async _onResetIceRez() {
    const state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    const encounter = state.iceEncounters?.[this.floorIndex];
    if (!encounter) return;

    encounter.iceRez.value = encounter.iceRez.max;
    encounter.defeated = false;
    encounter.active = true;
    await this.netarchItem.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, state);
    this.render(false);
  }

  async _onEndCombat() {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ID}.combat.endCombat`),
      content: `<p>${game.i18n.localize(`${MODULE_ID}.combat.confirmEndCombat`)}</p>`,
    });
    if (!confirmed) return;

    const state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
    const encounter = state.iceEncounters?.[this.floorIndex];
    if (encounter) {
      encounter.active = false;
    }
    await this.netarchItem.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, state);

    emitSocket(SOCKET_ACTIONS.COMBAT_ACTION, {
      architectureId: this.netarchItem.id,
      action: "endCombat",
      floorIndex: this.floorIndex,
    });

    this.close();
  }
}
