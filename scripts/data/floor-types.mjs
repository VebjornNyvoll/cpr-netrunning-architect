import { FLOOR_COLORS } from "../constants.mjs";

/**
 * Maps CPR system localization keys for floor content to display properties.
 */
export const FLOOR_TYPE_MAP = {
  "CPR.netArchitecture.floor.options.password": {
    key: "password",
    label: "Password",
    icon: "fa-key",
    color: FLOOR_COLORS.password,
  },
  "CPR.netArchitecture.floor.options.file": {
    key: "file",
    label: "File",
    icon: "fa-file-alt",
    color: FLOOR_COLORS.file,
  },
  "CPR.netArchitecture.floor.options.controlnode": {
    key: "controlNode",
    label: "Control Node",
    icon: "fa-sliders-h",
    color: FLOOR_COLORS.controlNode,
  },
  "CPR.global.programClass.blackice": {
    key: "blackIce",
    label: "Black ICE",
    icon: "fa-skull-crossbones",
    color: FLOOR_COLORS.blackIce,
  },
};

/**
 * Maps Black ICE CPR localization keys to default stat blocks.
 * Stats from the CPR core rules: PER / SPD / ATK / DEF / REZ
 */
export const BLACK_ICE_MAP = {
  "CPR.netArchitecture.floor.options.blackIce.asp": {
    name: "Asp",
    class: "antiprogram",
    per: 2, spd: 6, atk: 2, def: 2, rez: 15,
  },
  "CPR.netArchitecture.floor.options.blackIce.giant": {
    name: "Giant",
    class: "antipersonnel",
    per: 2, spd: 4, atk: 4, def: 2, rez: 25,
  },
  "CPR.netArchitecture.floor.options.blackIce.hellhound": {
    name: "Hellhound",
    class: "antipersonnel",
    per: 6, spd: 6, atk: 6, def: 4, rez: 20,
  },
  "CPR.netArchitecture.floor.options.blackIce.kraken": {
    name: "Kraken",
    class: "antiprogram",
    per: 8, spd: 6, atk: 6, def: 4, rez: 30,
  },
  "CPR.netArchitecture.floor.options.blackIce.liche": {
    name: "Liche",
    class: "antiprogram",
    per: 8, spd: 4, atk: 4, def: 8, rez: 25,
  },
  "CPR.netArchitecture.floor.options.blackIce.raven": {
    name: "Raven",
    class: "antiprogram",
    per: 4, spd: 4, atk: 2, def: 2, rez: 15,
  },
  "CPR.netArchitecture.floor.options.blackIce.scorpion": {
    name: "Scorpion",
    class: "antipersonnel",
    per: 2, spd: 6, atk: 2, def: 2, rez: 15,
  },
  "CPR.netArchitecture.floor.options.blackIce.skunk": {
    name: "Skunk",
    class: "antipersonnel",
    per: 2, spd: 4, atk: 4, def: 2, rez: 10,
  },
  "CPR.netArchitecture.floor.options.blackIce.wisp": {
    name: "Wisp",
    class: "antiprogram",
    per: 4, spd: 2, atk: 4, def: 2, rez: 15,
  },
  "CPR.netArchitecture.floor.options.blackIce.dragon": {
    name: "Dragon",
    class: "antiprogram",
    per: 8, spd: 6, atk: 8, def: 6, rez: 40,
  },
  "CPR.netArchitecture.floor.options.blackIce.killer": {
    name: "Killer",
    class: "antipersonnel",
    per: 6, spd: 6, atk: 6, def: 4, rez: 20,
  },
  "CPR.netArchitecture.floor.options.blackIce.sabertooth": {
    name: "Sabertooth",
    class: "antipersonnel",
    per: 6, spd: 6, atk: 8, def: 4, rez: 25,
  },
};

/**
 * Get display info for a floor's content type.
 */
export function getFloorTypeInfo(contentKey) {
  if (!contentKey) return { key: "empty", label: "Empty", icon: "fa-square", color: FLOOR_COLORS.empty };
  return FLOOR_TYPE_MAP[contentKey] ?? { key: "unknown", label: contentKey, icon: "fa-question", color: FLOOR_COLORS.empty };
}

/**
 * Get Black ICE stats by its CPR localization key.
 */
export function getBlackIceDefaults(iceKey) {
  return BLACK_ICE_MAP[iceKey] ?? null;
}

/**
 * Get all Black ICE options as a choices object for select dropdowns.
 */
export function getBlackIceChoices() {
  const choices = {};
  for (const [key, data] of Object.entries(BLACK_ICE_MAP)) {
    choices[key] = data.name;
  }
  return choices;
}

/**
 * Get all content type options as a choices object.
 */
export function getContentChoices() {
  const choices = { "": "-- Empty --" };
  for (const [key, data] of Object.entries(FLOOR_TYPE_MAP)) {
    choices[key] = data.label;
  }
  return choices;
}
