/**
 * Maps CPR floor content localization keys to tile image filenames.
 * Supports two naming conventions:
 *   - CPR system default: "Asp.webp", "PasswordDV6.webp"
 *   - Custom animated: "ASP-TILE (4).webm", "PASSWORD-DV6-TILE (5).webm"
 */

// --- CPR System Default Naming ---

const FLOOR_TILE_MAP = {
  "CPR.netArchitecture.floor.options.password": "Password",
  "CPR.netArchitecture.floor.options.file": "File",
  "CPR.netArchitecture.floor.options.controlnode": "ControlNode",
  "CPR.global.programClass.blackice": "BlackIce",
  "CPR.netArchitecture.floor.options.blackIce.asp": "Asp",
  "CPR.netArchitecture.floor.options.blackIce.giant": "Giant",
  "CPR.netArchitecture.floor.options.blackIce.hellhound": "Hellhound",
  "CPR.netArchitecture.floor.options.blackIce.kraken": "Kraken",
  "CPR.netArchitecture.floor.options.blackIce.liche": "Liche",
  "CPR.netArchitecture.floor.options.blackIce.raven": "Raven",
  "CPR.netArchitecture.floor.options.blackIce.scorpion": "Scorpion",
  "CPR.netArchitecture.floor.options.blackIce.skunk": "Skunk",
  "CPR.netArchitecture.floor.options.blackIce.wisp": "Wisp",
  "CPR.netArchitecture.floor.options.blackIce.dragon": "Dragon",
  "CPR.netArchitecture.floor.options.blackIce.killer": "Killer",
  "CPR.netArchitecture.floor.options.blackIce.sabertooth": "Sabertooth",
  "CPR.netArchitecture.floor.options.demon.demon": "Demon",
  "CPR.netArchitecture.floor.options.demon.balron": "Balron",
  "CPR.netArchitecture.floor.options.demon.efreet": "Efreet",
  "CPR.netArchitecture.floor.options.demon.imp": "Imp",
  "CPR.netArchitecture.floor.options.root": "Root",
};

// --- Custom Animated Tile Naming ---
// Format: "UPPERCASE-TILE (N).webm"
// The (N) varies per tile — we use a lookup of known numbers.

const CUSTOM_TILE_MAP = {
  "CPR.netArchitecture.floor.options.password": "PASSWORD-TILE (8)",
  "CPR.netArchitecture.floor.options.file": "FILE-TILE (7)",
  "CPR.netArchitecture.floor.options.controlnode": "CONTROLNODE-TILE (9)",
  "CPR.global.programClass.blackice": "BLACKICE-TILE (11)",
  "CPR.netArchitecture.floor.options.blackIce.asp": "ASP-TILE (4)",
  "CPR.netArchitecture.floor.options.blackIce.giant": "GIANT-TILE (1)",
  "CPR.netArchitecture.floor.options.blackIce.hellhound": "HELLHOUND-TILE (9)",
  "CPR.netArchitecture.floor.options.blackIce.kraken": "KRAKEN-TILE (3)",
  "CPR.netArchitecture.floor.options.blackIce.liche": "LICHE-TILE (7)",
  "CPR.netArchitecture.floor.options.blackIce.raven": "RAVEN-TILE (1)",
  "CPR.netArchitecture.floor.options.blackIce.scorpion": "SCORPION-TILE (10)",
  "CPR.netArchitecture.floor.options.blackIce.skunk": "SKUNK-TILE (6)",
  "CPR.netArchitecture.floor.options.blackIce.wisp": "WISP-TILE (2)",
  "CPR.netArchitecture.floor.options.blackIce.dragon": "DRAGON-TILE (6)",
  "CPR.netArchitecture.floor.options.blackIce.killer": "KILLER-TILE (5)",
  "CPR.netArchitecture.floor.options.blackIce.sabertooth": "SABERTOOTH-TILE (6)",
  "CPR.netArchitecture.floor.options.demon.demon": "DEMON-TILE (4)",
  "CPR.netArchitecture.floor.options.demon.balron": "BALRON-TILE (7)",
  "CPR.netArchitecture.floor.options.demon.efreet": "EFREET-TILE (8)",
  "CPR.netArchitecture.floor.options.demon.imp": "IMP-TILE (7)",
  "CPR.netArchitecture.floor.options.root": "ROOT-TILE (7)",
};

// DV-specific custom tile names
const CUSTOM_DV_MAP = {
  "PasswordDV6": "PASSWORD-DV6-TILE (5)",
  "PasswordDV8": "PASSWORD-DV8-TILE (7)",
  "PasswordDV10": "PASSWORD-DV10-TILE (1)",
  "PasswordDV12": "PASSWORD-DV12-TILE (3)",
  "FileDV6": "FILE-DV6-TILE (6)",
  "FileDV8": "FILE-DV8-TILE (8)",
  "FileDV10": "FILE-DV10-TILE (5)",
  "FileDV12": "FILE-DV12-TILE (7)",
  "ControlNodeDV6": "CONTROLNODE-DV6-TILE (13)",
  "ControlNodeDV8": "CONTROLNODE-DV8-TILE (7)",
  "ControlNodeDV10": "CONTROLNODE-DV10-TILE (5)",
  "ControlNodeDV12": "CONTROLNODE-DV12-TILE (7)",
};

// Content types that support DV-specific tile variants
const DV_SUFFIX_TYPES = ["Password", "File", "ControlNode"];
const DV_SUFFIX_VALUES = ["6", "8", "10", "12"];

/**
 * Check if a tile path points to the CPR system's default tiles.
 */
function isSystemTilePath(filePath) {
  return filePath.includes("cyberpunk-red-core/tiles/netarch");
}

/**
 * Resolve the tile image path for a given floor.
 *
 * For system default tiles: "Password.webp", "Asp.webp", "PasswordDV6.webp"
 * For custom tiles: "PASSWORD-TILE (8).webm", "ASP-TILE (4).webm", "PASSWORD-DV6-TILE (5).webm"
 *
 * @param {string} content - The floor's content key
 * @param {string} blackice - The floor's blackice key (or "--")
 * @param {string} dv - The floor's DV value
 * @param {string} filePath - Base directory for tile images
 * @param {string} extension - File extension (webp, webm, png)
 * @returns {string} Full path to the tile image
 */
export function getTilePath(content, blackice, dv, filePath, extension) {
  const useSystemNaming = isSystemTilePath(filePath);

  if (useSystemNaming) {
    return _getSystemTilePath(content, blackice, dv, filePath, extension);
  }
  return _getCustomTilePath(content, blackice, dv, filePath, extension);
}

function _getSystemTilePath(content, blackice, dv, filePath, extension) {
  let tileName = "Root";

  if (content === "CPR.global.programClass.blackice" && blackice && blackice !== "--") {
    tileName = FLOOR_TILE_MAP[blackice] ?? "BlackIce";
  } else if (content && FLOOR_TILE_MAP[content]) {
    tileName = FLOOR_TILE_MAP[content];
  }

  if (DV_SUFFIX_TYPES.includes(tileName) && DV_SUFFIX_VALUES.includes(String(dv))) {
    tileName = `${tileName}DV${dv}`;
  }

  return `${filePath}/${tileName}.${extension}`;
}

function _getCustomTilePath(content, blackice, dv, filePath, extension) {
  // Check for DV-specific variant first
  if (blackice === "--" || !blackice) {
    const baseName = FLOOR_TILE_MAP[content];
    if (baseName && DV_SUFFIX_TYPES.includes(baseName) && DV_SUFFIX_VALUES.includes(String(dv))) {
      const dvKey = `${baseName}DV${dv}`;
      if (CUSTOM_DV_MAP[dvKey]) {
        return `${filePath}/${CUSTOM_DV_MAP[dvKey]}.${extension}`;
      }
    }
  }

  // Use the content-specific or ICE-specific custom tile
  let customName;
  if (content === "CPR.global.programClass.blackice" && blackice && blackice !== "--") {
    customName = CUSTOM_TILE_MAP[blackice] ?? CUSTOM_TILE_MAP["CPR.global.programClass.blackice"];
  } else if (content && CUSTOM_TILE_MAP[content]) {
    customName = CUSTOM_TILE_MAP[content];
  } else {
    customName = CUSTOM_TILE_MAP["CPR.netArchitecture.floor.options.root"];
  }

  return `${filePath}/${customName}.${extension}`;
}

/**
 * Get the arrow/connector tile path.
 * Note: Custom tile sets may not have an arrow tile.
 * Falls back to the system arrow if custom path doesn't include one.
 */
export function getArrowTilePath(filePath, extension) {
  if (isSystemTilePath(filePath)) {
    return `${filePath}/Arrow.${extension}`;
  }
  // Custom sets: use system arrow as fallback
  return `systems/cyberpunk-red-core/tiles/netarch/WebP/Arrow.webp`;
}
