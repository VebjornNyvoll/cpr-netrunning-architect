import { MODULE_ID, FLAGS, SOCKET_ACTIONS, createEmptyState } from "./constants.mjs";

const SOCKET_NAME = `module.${MODULE_ID}`;

// Registry of open app instances that should re-render on state changes
const _listeners = new Set();

/**
 * Register a Foundry Application instance to receive socket update notifications.
 * The app must implement a `onSocketUpdate(data)` method or will simply be re-rendered.
 */
export function addSocketListener(app) {
  _listeners.add(app);
}

export function removeSocketListener(app) {
  _listeners.delete(app);
}

function _notifyListeners(data) {
  for (const app of _listeners) {
    if (typeof app.onSocketUpdate === "function") {
      app.onSocketUpdate(data);
    } else if (app.rendered) {
      app.render(false);
    }
  }
}

/**
 * Register the socket handler. Call during init hook.
 */
export function registerSocket() {
  game.socket.on(SOCKET_NAME, _handleSocket);
}

/**
 * Emit a socket message to all connected clients.
 */
export function emitSocket(action, payload = {}) {
  const data = { action, payload, userId: game.user.id };
  game.socket.emit(SOCKET_NAME, data);
  // Also handle locally for the sender
  _handleSocket(data);
}

/**
 * Central socket message handler.
 */
async function _handleSocket(data) {
  const { action, payload, userId } = data;

  switch (action) {
    case SOCKET_ACTIONS.MOVE_RUNNER:
      await _handleMoveRunner(payload, userId);
      break;
    case SOCKET_ACTIONS.UPDATE_ARCHITECTURE:
      _notifyListeners({ action, ...payload });
      break;
    case SOCKET_ACTIONS.TRIGGER_ICE:
      _notifyListeners({ action, ...payload });
      break;
    case SOCKET_ACTIONS.SYNC_STATE:
      await _handleSyncState(payload, userId);
      break;
    case SOCKET_ACTIONS.REVEAL_FLOOR:
      _notifyListeners({ action, ...payload });
      break;
    case SOCKET_ACTIONS.COMBAT_ACTION:
      _notifyListeners({ action, ...payload });
      break;
  }
}

/**
 * GM handles a move request from a player.
 */
async function _handleMoveRunner(payload, userId) {
  if (!game.user.isGM) {
    // Non-GM clients just update their UI
    _notifyListeners({ action: SOCKET_ACTIONS.MOVE_RUNNER, ...payload });
    return;
  }

  const { architectureId, actorId, targetFloor } = payload;
  const netarch = game.items.get(architectureId);
  if (!netarch) return;

  const state = netarch.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
  const runner = state.runners.find((r) => r.actorId === actorId);
  if (!runner) return;

  runner.currentFloor = targetFloor;
  if (!runner.exploredFloors.includes(targetFloor)) {
    runner.exploredFloors.push(targetFloor);
  }

  await netarch.setFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE, state);
  _notifyListeners({ action: SOCKET_ACTIONS.MOVE_RUNNER, architectureId, actorId, targetFloor });
}

/**
 * GM responds to a sync request by broadcasting current state.
 */
async function _handleSyncState(payload, userId) {
  if (!game.user.isGM) return;

  const { architectureId } = payload;
  const netarch = game.items.get(architectureId);
  if (!netarch) return;

  const state = netarch.getFlag(MODULE_ID, FLAGS.ARCHITECTURE_STATE) ?? createEmptyState();
  emitSocket(SOCKET_ACTIONS.UPDATE_ARCHITECTURE, { architectureId, state });
}
