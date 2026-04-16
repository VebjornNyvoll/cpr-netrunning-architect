import { getNetArchTablePack } from "../utils/cpr-bridge.mjs";
import { FLOOR_CONTENT_KEYS } from "../constants.mjs";

/**
 * Generates random NET architectures using the CPR compendium roll tables.
 * Replicates the logic from the CPR system's _netarchGenerateFromTables().
 */
export class ArchitectureGenerator {
  /**
   * Generate a random architecture.
   * @param {string} difficulty - "basic" | "standard" | "uncommon" | "advanced"
   * @returns {Promise<Array>} Array of floor objects
   */
  static async generate(difficulty = "standard") {
    const packName = getNetArchTablePack();
    const pack = game.packs.get(packName);
    if (!pack) {
      ui.notifications.error("Could not find NET Architecture roll table compendium.");
      return [];
    }

    const documents = await pack.getDocuments();

    // Find the lobby table (first two floors)
    const lobbyTable = documents.find((d) => d.name.includes("First Two Floors"));
    // Find the appropriate difficulty table
    const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    const floorTable = documents.find((d) => d.name.includes(difficultyLabel) && d.name.includes("All Other Floors"));

    if (!lobbyTable || !floorTable) {
      // Fallback: try any floor table
      const fallbackTable = floorTable || documents.find((d) => d.name.includes("All Other Floors"));
      if (!lobbyTable && !fallbackTable) {
        ui.notifications.error("Could not find required NET Architecture roll tables.");
        return [];
      }
    }

    // Roll 3d6 for number of floors
    const floorCountRoll = await new Roll("3d6").evaluate();
    const numFloors = Math.max(3, floorCountRoll.total);

    // Roll for branches
    const branches = await this._rollBranches();

    // Generate floors
    const floors = [];

    // First two floors (lobby)
    for (let i = 0; i < 2 && i < numFloors; i++) {
      const floor = await this._rollFloor(lobbyTable, i);
      floors.push(floor);
    }

    // Remaining floors
    const table = floorTable || lobbyTable;
    for (let i = 2; i < numFloors; i++) {
      const floor = await this._rollFloor(table, i);
      floors.push(floor);
    }

    // Apply branches
    if (branches.length > 0) {
      this._applyBranches(floors, branches);
    }

    return floors;
  }

  /**
   * Roll for branch floors.
   * @returns {Promise<number[]>} Array of floor indices that are branches
   */
  static async _rollBranches() {
    const branches = [];
    const branchRoll = await new Roll("1d10").evaluate();

    if (branchRoll.total >= 7) {
      // Has branches - roll for how many
      let moreBranches = true;
      let branchCount = 1;

      while (moreBranches && branchCount <= 7) {
        const moreRoll = await new Roll("1d10").evaluate();
        if (moreRoll.total >= 7 && branchCount < 7) {
          branchCount++;
        } else {
          moreBranches = false;
        }
      }

      // Assign branch positions (random floors, avoiding floor 0)
      for (let i = 0; i < branchCount; i++) {
        const posRoll = await new Roll("1d6+1").evaluate();
        if (!branches.includes(posRoll.total)) {
          branches.push(posRoll.total);
        }
      }
    }

    return branches;
  }

  /**
   * Roll on a table and parse the result into a floor object.
   * @param {RollTable} table
   * @param {number} index
   * @returns {Promise<object>}
   */
  static async _rollFloor(table, index) {
    const draw = await table.draw({ displayChat: false });
    const result = draw.results[0]?.text ?? "";

    return this._parseFloorResult(result, index);
  }

  /**
   * Parse a roll table result string into a floor object.
   * Format expected: "DV X: Content" or similar patterns.
   * @param {string} text
   * @param {number} index
   * @returns {object}
   */
  static _parseFloorResult(text, index) {
    const floor = {
      index,
      floor: String(index + 1),
      dv: "6",
      content: "",
      blackice: "--",
      branch: "",
      description: text,
    };

    // Extract DV from text (e.g., "DV 6", "DV6", "DV: 8")
    const dvMatch = text.match(/DV\s*:?\s*(\d+)/i);
    if (dvMatch) {
      floor.dv = dvMatch[1];
    }

    // Determine content type from text
    const lowerText = text.toLowerCase();

    if (lowerText.includes("password")) {
      floor.content = FLOOR_CONTENT_KEYS.PASSWORD;
    } else if (lowerText.includes("file")) {
      floor.content = FLOOR_CONTENT_KEYS.FILE;
    } else if (lowerText.includes("control")) {
      floor.content = FLOOR_CONTENT_KEYS.CONTROL_NODE;
    } else if (this._matchesBlackIce(lowerText)) {
      floor.content = FLOOR_CONTENT_KEYS.BLACK_ICE;
      floor.blackice = this._identifyBlackIce(lowerText);
    }

    return floor;
  }

  /**
   * Check if text describes Black ICE.
   */
  static _matchesBlackIce(text) {
    const iceNames = [
      "asp", "giant", "hellhound", "kraken", "liche", "raven",
      "scorpion", "skunk", "wisp", "dragon", "killer", "sabertooth",
    ];
    return iceNames.some((name) => text.includes(name));
  }

  /**
   * Identify which Black ICE is described in the text.
   * Returns the CPR localization key.
   */
  static _identifyBlackIce(text) {
    const mapping = {
      asp: "CPR.netArchitecture.floor.options.blackIce.asp",
      giant: "CPR.netArchitecture.floor.options.blackIce.giant",
      hellhound: "CPR.netArchitecture.floor.options.blackIce.hellhound",
      kraken: "CPR.netArchitecture.floor.options.blackIce.kraken",
      liche: "CPR.netArchitecture.floor.options.blackIce.liche",
      raven: "CPR.netArchitecture.floor.options.blackIce.raven",
      scorpion: "CPR.netArchitecture.floor.options.blackIce.scorpion",
      skunk: "CPR.netArchitecture.floor.options.blackIce.skunk",
      wisp: "CPR.netArchitecture.floor.options.blackIce.wisp",
      dragon: "CPR.netArchitecture.floor.options.blackIce.dragon",
      killer: "CPR.netArchitecture.floor.options.blackIce.killer",
      sabertooth: "CPR.netArchitecture.floor.options.blackIce.sabertooth",
    };

    for (const [name, key] of Object.entries(mapping)) {
      if (text.includes(name)) return key;
    }
    return "--";
  }

  /**
   * Apply branches to generated floors.
   * Assigns branch letters "a" through "h".
   */
  static _applyBranches(floors, branchIndices) {
    const branchLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    branchIndices.forEach((idx, i) => {
      if (idx < floors.length) {
        floors[idx].branch = branchLetters[i] ?? "a";
      }
    });
  }
}
