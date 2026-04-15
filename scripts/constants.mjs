export const MODULE_ID = "cpr-netrunning-architect";

// Flag keys stored on documents
export const FLAGS = {
  // On netarch Items — run state
  ARCHITECTURE_STATE: "architectureState",
  FLOOR_NOTES: "floorNotes",

  // On character Actors
  ACTIVE_ARCHITECTURE: "activeArchitecture",
  CURRENT_FLOOR: "currentFloor",
  EXPLORED_FLOORS: "exploredFloors",
};

// Socket message action types
export const SOCKET_ACTIONS = {
  MOVE_RUNNER: "moveRunner",
  UPDATE_ARCHITECTURE: "updateArchitecture",
  TRIGGER_ICE: "triggerIce",
  SYNC_STATE: "syncState",
  REVEAL_FLOOR: "revealFloor",
  COMBAT_ACTION: "combatAction",
};

// CPR system localization keys for floor content types
export const FLOOR_CONTENT_KEYS = {
  PASSWORD: "CPR.netArchitecture.floor.options.password",
  FILE: "CPR.netArchitecture.floor.options.file",
  CONTROL_NODE: "CPR.netArchitecture.floor.options.controlnode",
  BLACK_ICE: "CPR.global.programClass.blackice",
};

// Visual color assignments per floor content type
export const FLOOR_COLORS = {
  lobby: "#2d9f36",
  password: "#4a90d9",
  file: "#4a90d9",
  controlNode: "#8b5cf6",
  blackIce: "#dc2626",
  empty: "#6b7280",
  branch: "#f59e0b",
};

// NET interface action keys
export const NET_ACTIONS = {
  INTERFACE: ["scanner", "backdoor", "cloak", "control", "eyedee", "pathfinder", "slide", "virus", "zap"],
  COMBAT: ["zap"],
  MOVEMENT: ["pathfinder", "slide"],
};

// Default empty architecture state
export function createEmptyState() {
  return {
    runners: [],
    clearedFloors: [],
    iceEncounters: {},
    inCombat: false,
    combatFloor: null,
  };
}

// Default empty floor
export function createEmptyFloor(index = 0) {
  return {
    index,
    dv: "6",
    content: "",
    blackice: [],
    branch: false,
    description: "",
  };
}
