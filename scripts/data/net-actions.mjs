import { MODULE_ID } from "../constants.mjs";

/**
 * NET Interface action definitions.
 * Each maps to a CPR Interface ability used during netrunning.
 */
export const NET_ACTION_DEFS = {
  scanner: {
    key: "scanner",
    icon: "fa-satellite-dish",
    rollType: "action",
    requiresFloorDV: false,
    description: `${MODULE_ID}.netActions.scannerDesc`,
  },
  backdoor: {
    key: "backdoor",
    icon: "fa-door-open",
    rollType: "action",
    requiresFloorDV: true,
    description: `${MODULE_ID}.netActions.backdoorDesc`,
  },
  cloak: {
    key: "cloak",
    icon: "fa-user-secret",
    rollType: "action",
    requiresFloorDV: false,
    description: `${MODULE_ID}.netActions.cloakDesc`,
  },
  control: {
    key: "control",
    icon: "fa-gamepad",
    rollType: "action",
    requiresFloorDV: true,
    description: `${MODULE_ID}.netActions.controlDesc`,
  },
  eyedee: {
    key: "eyedee",
    icon: "fa-search",
    rollType: "action",
    requiresFloorDV: false,
    description: `${MODULE_ID}.netActions.eyedeeDesc`,
  },
  pathfinder: {
    key: "pathfinder",
    icon: "fa-route",
    rollType: "action",
    requiresFloorDV: true,
    description: `${MODULE_ID}.netActions.pathfinderDesc`,
  },
  slide: {
    key: "slide",
    icon: "fa-running",
    rollType: "action",
    requiresFloorDV: false,
    description: `${MODULE_ID}.netActions.slideDesc`,
  },
  virus: {
    key: "virus",
    icon: "fa-biohazard",
    rollType: "action",
    requiresFloorDV: true,
    description: `${MODULE_ID}.netActions.virusDesc`,
  },
  zap: {
    key: "zap",
    icon: "fa-bolt",
    rollType: "attack",
    requiresFloorDV: false,
    description: `${MODULE_ID}.netActions.zapDesc`,
  },
};

/**
 * Get an array of all NET action definitions for UI rendering.
 */
export function getAllNetActions() {
  return Object.values(NET_ACTION_DEFS);
}

/**
 * Get a single action definition by key.
 */
export function getNetAction(key) {
  return NET_ACTION_DEFS[key] ?? null;
}
