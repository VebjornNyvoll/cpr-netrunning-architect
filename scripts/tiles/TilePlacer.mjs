import { MODULE_ID } from "../constants.mjs";
import { getTilePath, getArrowTilePath } from "./tile-mapping.mjs";

/**
 * Places NET Architecture tiles on the current scene.
 * Replicates the CPR system's tile positioning algorithm from cpr-netarch.js
 * but targets the current scene at a GM-chosen position instead of creating a new scene.
 */
export class TilePlacer {
  /**
   * Place architecture tiles on the current scene.
   * @param {Item} netarchItem - The netarch item with floor data
   * @param {number} originX - Top-left X position in pixels
   * @param {number} originY - Top-left Y position in pixels
   * @param {object} [options] - Override options
   */
  static async placeArchitecture(netarchItem, originX, originY, options = {}) {
    const scene = canvas.scene;
    if (!scene) {
      ui.notifications.error("No active scene.");
      return;
    }

    const floors = netarchItem.system.floors ?? [];
    if (floors.length === 0) {
      ui.notifications.warn("Architecture has no floors.");
      return;
    }

    // Configuration
    const filePath = options.filePath ?? game.settings.get(MODULE_ID, "tilePath");
    const ext = options.tileExtension ?? game.settings.get(MODULE_ID, "tileExtension");
    const gridSize = options.tileGridSize ?? game.settings.get(MODULE_ID, "tileGridSize");
    const levelWidth = 3;
    const levelHeight = 3;
    const connectorWidth = 1;
    const connectorHeight = 1;

    const tileData = [];
    const branchTracker = {};

    for (const floor of floors) {
      const level = parseInt(floor.floor, 10) || 1;
      const branch = floor.branch || null;

      // --- Level tile ---
      const textureSrc = getTilePath(floor.content, floor.blackice, floor.dv, filePath, ext);

      const levelX = originX + gridSize * (levelWidth + connectorWidth) * (level - 1);
      let levelY;
      if (!branch) {
        levelY = originY;
      } else {
        const branchOffset = branch.charCodeAt(0) - 97; // 'a'=0, 'b'=1, etc.
        levelY = originY + gridSize * (levelHeight + connectorHeight) * branchOffset;
      }

      tileData.push({
        texture: { src: textureSrc },
        width: gridSize * levelWidth,
        height: gridSize * levelHeight,
        x: levelX,
        y: levelY,
      });

      // --- Horizontal connector arrow (skip before floor 1) ---
      if (level > 1) {
        const arrowSrc = getArrowTilePath(filePath, ext);
        const arrowX = originX + gridSize * ((levelWidth + connectorWidth) * (level - 1) - connectorWidth);
        let arrowY;
        if (!branch) {
          arrowY = originY + gridSize * ((levelHeight - connectorHeight) / 2);
        } else {
          const branchOffset = branch.charCodeAt(0) - 97;
          arrowY = originY + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * branchOffset);
        }

        tileData.push({
          texture: { src: arrowSrc },
          width: gridSize * connectorWidth,
          height: gridSize * connectorHeight,
          x: arrowX,
          y: arrowY,
        });
      }

      // --- Track branches for vertical connectors ---
      if (branch && !branchTracker[level]) {
        branchTracker[level] = branch;
      }
    }

    // --- Vertical branch connectors ---
    for (const [levelStr, branch] of Object.entries(branchTracker)) {
      const level = parseInt(levelStr, 10);
      const branchOffset = branch.charCodeAt(0) - 97;
      const arrowSrc = getArrowTilePath(filePath, ext);

      // Vertical connector from main branch down to the branch row
      // Placed at the X position of the level, between main and branch Y positions
      const connX = originX + gridSize * ((levelWidth + connectorWidth) * (level - 1) + (levelWidth - connectorWidth) / 2);

      // Fill vertical space between main branch (y=0) and branch row
      let currentY = originY + gridSize * levelHeight;
      const targetY = originY + gridSize * (levelHeight + connectorHeight) * branchOffset;

      while (currentY < targetY) {
        tileData.push({
          texture: { src: arrowSrc },
          width: gridSize * connectorWidth,
          height: gridSize * connectorHeight,
          x: connX,
          y: currentY,
          rotation: 90,
        });
        currentY += gridSize * connectorHeight;
      }
    }

    // Create all tiles on the scene
    const created = await scene.createEmbeddedDocuments("Tile", tileData);
    const tileIds = created.map((t) => t.id);

    // Store tile IDs on the netarch item for cleanup
    await netarchItem.setFlag(MODULE_ID, "placedTileIds", tileIds);
    await netarchItem.setFlag(MODULE_ID, "placedSceneId", scene.id);

    ui.notifications.info(`Placed ${tileIds.length} tiles on the scene.`);
  }

  /**
   * Remove previously placed tiles from the scene.
   * @param {Item} netarchItem
   */
  static async clearTiles(netarchItem) {
    const tileIds = netarchItem.getFlag(MODULE_ID, "placedTileIds");
    const sceneId = netarchItem.getFlag(MODULE_ID, "placedSceneId");

    if (!tileIds || tileIds.length === 0) {
      ui.notifications.warn("No placed tiles to clear.");
      return;
    }

    const scene = sceneId ? game.scenes.get(sceneId) : canvas.scene;
    if (!scene) {
      ui.notifications.error("Could not find the scene with placed tiles.");
      return;
    }

    // Filter to only IDs that still exist on the scene
    const existingIds = tileIds.filter((id) => scene.tiles.has(id));

    if (existingIds.length > 0) {
      await scene.deleteEmbeddedDocuments("Tile", existingIds);
    }

    await netarchItem.unsetFlag(MODULE_ID, "placedTileIds");
    await netarchItem.unsetFlag(MODULE_ID, "placedSceneId");

    ui.notifications.info(`Cleared ${existingIds.length} tiles.`);
  }

  /**
   * Activate targeting mode — GM clicks a spot on the canvas.
   * Returns a Promise that resolves with the clicked {x, y} position.
   * @returns {Promise<{x: number, y: number}>}
   */
  static activateTargeting() {
    return new Promise((resolve, reject) => {
      if (!canvas?.ready) {
        ui.notifications.error("Canvas is not ready.");
        reject(new Error("Canvas not ready"));
        return;
      }

      ui.notifications.info(
        game.i18n.localize(`${MODULE_ID}.tiles.clickToPlace`)
      );

      // Add crosshair class to canvas
      document.body.classList.add("nra-targeting");

      const handler = (event) => {
        const transform = canvas.stage.worldTransform;
        const x = (event.data.global.x - transform.tx) / canvas.stage.scale.x;
        const y = (event.data.global.y - transform.ty) / canvas.stage.scale.y;

        // Snap to grid
        let snapped;
        try {
          snapped = canvas.grid.getSnappedPoint({ x, y }, { mode: CONST.GRID_SNAPPING_MODES.TOP_LEFT_VERTEX });
        } catch {
          snapped = { x: Math.round(x), y: Math.round(y) };
        }

        // Cleanup
        canvas.stage.off("pointerdown", handler);
        document.body.classList.remove("nra-targeting");

        resolve(snapped);
      };

      canvas.stage.on("pointerdown", handler);

      // Allow ESC to cancel
      const escHandler = (ev) => {
        if (ev.key === "Escape") {
          canvas.stage.off("pointerdown", handler);
          document.body.classList.remove("nra-targeting");
          document.removeEventListener("keydown", escHandler);
          reject(new Error("Cancelled"));
        }
      };
      document.addEventListener("keydown", escHandler);
    });
  }
}
