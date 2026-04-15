import { MODULE_ID, FLAGS, SOCKET_ACTIONS, createEmptyState } from "../constants.mjs";
import { getFloorTypeInfo, getBlackIceDefaults } from "../data/floor-types.mjs";
import { getAllNetActions } from "../data/net-actions.mjs";
import { getEquippedCyberdeck, getRezzedPrograms, getInstalledPrograms } from "../utils/cpr-bridge.mjs";
import { rollInterfaceCheck } from "../utils/dice.mjs";
import { postInterfaceCheckCard, postFloorRevealCard, postChatNotification } from "../utils/chat.mjs";
import { emitSocket, addSocketListener, removeSocketListener } from "../socket.mjs";

export class NetrunnerTracker extends Application {
  constructor(netarchItem, actor, options = {}) {
    super(options);
    this.netarchItem = netarchItem;
    this.actor = actor;
    this._state = null;
    this._initState();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "nra-tracker",
      classes: ["nra", "nra-tracker"],
      template: `modules/${MODULE_ID}/templates/tracker/netrunner-tracker.hbs`,
      width: 500,
      height: 680,
      resizable: true,
      tabs: [{ navSelector: ".nra-tracker-tabs", contentSelector: ".nra-tracker-content", initial: "architecture" }],
    });
  }

  get title() {
    return `${game.i18n.localize(`${MODULE_ID}.tracker.title`)} — ${this.actor.name}`;
  }

  /* -------------------------------- */
  /*  State Management                */
  /* -------------------------------- */

  async _initState() {
    this._state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();

    // Register this runner if not already in the state
    const existing = this._state.runners.find((r) => r.actorId === this.actor.id);
    if (!existing) {
      this._state.runners.push({
        actorId: this.actor.id,
        actorName: this.actor.name,
        actorImg: this.actor.img,
        currentFloor: 0,
        exploredFloors: [0],
        isActive: true,
      });
      await this._saveState();

      // Post jack-in notification
      await postChatNotification(
        `<p><strong>${this.actor.name}</strong> ${game.i18n.localize(`${MODULE_ID}.tracker.jackedIn`)} <em>${this.netarchItem.name}</em></p>`
      );
    }
  }

  _getRunner() {
    return this._state?.runners?.find((r) => r.actorId === this.actor.id) ?? null;
  }

  async _saveState() {
    await this.netarchItem.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, this._state);
  }

  /* -------------------------------- */
  /*  Data Preparation                */
  /* -------------------------------- */

  async getData(options) {
    // Reload state from flags in case it was updated externally
    this._state = this.netarchItem.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? this._state ?? createEmptyState();

    const runner = this._getRunner();
    const currentFloor = runner?.currentFloor ?? 0;
    const exploredFloors = runner?.exploredFloors ?? [0];
    const systemFloors = this.netarchItem.system.floors ?? [];
    const fogOfWarEnabled = game.settings.get(MODULE_ID, "fogOfWar");
    const showDVs = game.user.isGM || game.settings.get(MODULE_ID, "showFloorDVsToPlayers");

    const floors = systemFloors.map((floor, i) => {
      const typeInfo = getFloorTypeInfo(floor.content);
      const isExplored = exploredFloors.includes(i);
      const isCurrentFloor = i === currentFloor;
      const isCleared = this._state.clearedFloors?.includes(i) ?? false;
      const iceEncounter = this._state.iceEncounters?.[i];
      const hasActiveIce = floor.content === "CPR.global.programClass.blackice" && !isCleared && !iceEncounter?.defeated;

      const iceLabel = floor.blackice?.[0]
        ? (getBlackIceDefaults(floor.blackice[0])?.name ?? game.i18n.localize(floor.blackice[0]))
        : null;

      // Runners on this floor
      const runnersHere = this._state.runners
        .filter((r) => r.currentFloor === i && r.isActive)
        .map((r) => ({ actorId: r.actorId, actorName: r.actorName, actorImg: r.actorImg }));

      return {
        ...floor,
        index: i,
        floorLabel: i + 1,
        contentIcon: typeInfo.icon,
        contentLabel: typeInfo.label,
        color: typeInfo.color,
        iceLabel,
        isExplored,
        isCurrentFloor,
        isCleared,
        hasActiveIce,
        fogOfWar: fogOfWarEnabled && !isExplored && !game.user.isGM,
        showDV: showDVs,
        runners: runnersHere,
      };
    });

    // Cyberdeck and programs
    const cyberdeck = getEquippedCyberdeck(this.actor);
    const rezzedPrograms = cyberdeck ? getRezzedPrograms(cyberdeck).map((p) => ({
      ...p,
      isRezzed: p.system?.isRezzed ?? true,
      rezPercent: p.system?.rez ? Math.round((p.system.rez.value / p.system.rez.max) * 100) : 100,
    })) : [];
    const installedPrograms = cyberdeck ? getInstalledPrograms(cyberdeck) : [];
    const totalSlots = cyberdeck?.system?.slots ?? 0;
    const usedSlots = installedPrograms.length;

    const otherRunners = this._state.runners.filter((r) => r.actorId !== this.actor.id && r.isActive);

    return {
      moduleId: MODULE_ID,
      architecture: this.netarchItem,
      floors,
      runner: runner ?? { actorName: this.actor.name, actorImg: this.actor.img, currentFloor: 0 },
      currentFloorLabel: currentFloor + 1,
      atLobby: currentFloor === 0,
      atBottom: currentFloor >= systemFloors.length - 1,
      netActions: getAllNetActions(),
      cyberdeck,
      rezzedPrograms,
      totalSlots,
      usedSlots,
      otherRunners,
    };
  }

  /* -------------------------------- */
  /*  Event Listeners                 */
  /* -------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);
    const el = html instanceof jQuery ? html[0] : html;

    el.querySelector(".nra-move-up")?.addEventListener("click", () => this._onMoveFloor(-1));
    el.querySelector(".nra-move-down")?.addEventListener("click", () => this._onMoveFloor(1));
    el.querySelector(".nra-jack-out")?.addEventListener("click", () => this._onJackOut());
    el.querySelector(".nra-open-programs")?.addEventListener("click", () => this._onOpenPrograms());

    el.querySelectorAll(".nra-net-action").forEach((btn) => {
      btn.addEventListener("click", (ev) => this._onNetAction(ev));
    });

    // GM: click floor tiles to toggle cleared
    if (game.user.isGM) {
      el.querySelectorAll(".nra-floor-tile:not(.nra-fog)").forEach((tile) => {
        tile.addEventListener("dblclick", (ev) => this._onToggleCleared(ev));
      });
    }

    // Register for socket updates
    addSocketListener(this);
  }

  close(options) {
    removeSocketListener(this);
    return super.close(options);
  }

  onSocketUpdate(data) {
    // Re-read state and re-render on any relevant socket update
    if (data.architectureId && data.architectureId !== this.netarchItem.id) return;
    this.render(false);
  }

  /* -------------------------------- */
  /*  Movement                        */
  /* -------------------------------- */

  async _onMoveFloor(direction) {
    const runner = this._getRunner();
    if (!runner) return;

    const targetFloor = runner.currentFloor + direction;
    const systemFloors = this.netarchItem.system.floors ?? [];

    if (targetFloor < 0) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.tracker.atLobby`));
      return;
    }
    if (targetFloor >= systemFloors.length) {
      ui.notifications.warn(game.i18n.localize(`${MODULE_ID}.tracker.atBottom`));
      return;
    }

    const floor = systemFloors[targetFloor];
    const floorDV = parseInt(floor?.dv, 10) || 6;

    // Auto Interface Check
    if (game.settings.get(MODULE_ID, "autoInterfaceChecks")) {
      const result = await rollInterfaceCheck(this.actor, floorDV, "move");
      await postInterfaceCheckCard(result);

      if (!result.success) {
        // Failed — do not move
        return;
      }
    }

    // Move the runner
    runner.currentFloor = targetFloor;
    const isNewFloor = !runner.exploredFloors.includes(targetFloor);
    if (isNewFloor) {
      runner.exploredFloors.push(targetFloor);
    }

    await this._saveState();

    // Reveal floor notification
    if (isNewFloor) {
      const typeInfo = getFloorTypeInfo(floor.content);
      const iceLabel = floor.blackice?.[0]
        ? (getBlackIceDefaults(floor.blackice[0])?.name ?? "")
        : null;
      await postFloorRevealCard(
        { num: targetFloor + 1, contentLabel: typeInfo.label, iceLabel },
        this.actor.name
      );

      // Auto-trigger ICE
      if (
        game.settings.get(MODULE_ID, "autoTriggerIce") &&
        floor.content === "CPR.global.programClass.blackice" &&
        !this._state.iceEncounters?.[targetFloor]?.defeated
      ) {
        await this._triggerIceEncounter(targetFloor);
      }
    }

    // Sync with other clients
    emitSocket(SOCKET_ACTIONS.MOVE_RUNNER, {
      architectureId: this.netarchItem.id,
      actorId: this.actor.id,
      targetFloor,
    });

    this.render(false);
  }

  /* -------------------------------- */
  /*  ICE Encounter                   */
  /* -------------------------------- */

  async _triggerIceEncounter(floorIndex) {
    const floor = this.netarchItem.system.floors?.[floorIndex];
    if (!floor) return;

    const iceKey = floor.blackice?.[0];
    const iceDefaults = iceKey ? getBlackIceDefaults(iceKey) : null;

    if (!this._state.iceEncounters) this._state.iceEncounters = {};
    this._state.iceEncounters[floorIndex] = {
      active: true,
      defeated: false,
      iceKey,
      iceRez: iceDefaults ? { value: iceDefaults.rez, max: iceDefaults.rez } : { value: 15, max: 15 },
      iceStats: iceDefaults ?? { per: 2, spd: 4, atk: 2, def: 2 },
    };

    await this._saveState();

    await postChatNotification(
      `<p><i class="fas fa-skull-crossbones"></i> <strong>${game.i18n.localize(`${MODULE_ID}.tracker.iceEncounter`)}</strong></p>
       <p>${iceDefaults?.name ?? "Unknown ICE"} on Floor ${floorIndex + 1}!</p>`
    );

    emitSocket(SOCKET_ACTIONS.TRIGGER_ICE, {
      architectureId: this.netarchItem.id,
      floorIndex,
      iceData: this._state.iceEncounters[floorIndex],
    });

    // Open combat panel
    const { NetCombatPanel } = await import("./NetCombatPanel.mjs");
    new NetCombatPanel(this.netarchItem, floorIndex, this.actor).render(true);
  }

  /* -------------------------------- */
  /*  NET Actions                     */
  /* -------------------------------- */

  async _onNetAction(event) {
    const actionKey = event.currentTarget.dataset.action;
    const runner = this._getRunner();
    if (!runner) return;

    const floor = this.netarchItem.system.floors?.[runner.currentFloor];
    const floorDV = parseInt(floor?.dv, 10) || 6;

    // Most actions use an Interface check
    const result = await rollInterfaceCheck(this.actor, floorDV, actionKey);
    await postInterfaceCheckCard(result);
  }

  /* -------------------------------- */
  /*  Jack Out                        */
  /* -------------------------------- */

  async _onJackOut() {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ID}.tracker.jackOut`),
      content: `<p>${game.i18n.localize(`${MODULE_ID}.tracker.confirmJackOut`)}</p>`,
    });
    if (!confirmed) return;

    // Remove runner from state
    const runnerIdx = this._state.runners.findIndex((r) => r.actorId === this.actor.id);
    if (runnerIdx >= 0) {
      this._state.runners.splice(runnerIdx, 1);
    }

    await this._saveState();

    await postChatNotification(
      `<p><strong>${this.actor.name}</strong> ${game.i18n.localize(`${MODULE_ID}.tracker.jackedOut`)}</p>`
    );

    emitSocket(SOCKET_ACTIONS.UPDATE_ARCHITECTURE, {
      architectureId: this.netarchItem.id,
      state: this._state,
    });

    this.close();
  }

  /* -------------------------------- */
  /*  Floor Management                */
  /* -------------------------------- */

  async _onToggleCleared(event) {
    const idx = Number(event.currentTarget.dataset.floorIndex);
    if (isNaN(idx)) return;

    if (!this._state.clearedFloors) this._state.clearedFloors = [];

    const clearIdx = this._state.clearedFloors.indexOf(idx);
    if (clearIdx >= 0) {
      this._state.clearedFloors.splice(clearIdx, 1);
    } else {
      this._state.clearedFloors.push(idx);
    }

    await this._saveState();
    this.render(false);
  }

  /* -------------------------------- */
  /*  Programs Panel                  */
  /* -------------------------------- */

  async _onOpenPrograms() {
    const { ProgramSlotManager } = await import("./ProgramSlotManager.mjs");
    new ProgramSlotManager(this.actor).render(true);
  }
}
