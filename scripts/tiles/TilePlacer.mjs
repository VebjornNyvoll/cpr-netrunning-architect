import { MODULE_ID } from "../constants.mjs";
import { getTilePath, getArrowTilePath } from "./tile-mapping.mjs";

/**
 * Places NET Architecture tiles on the current scene.
 * Supports left-to-right and top-to-bottom orientations,
 * plus an optional maze mode that adds random side-branches.
 */
export class TilePlacer {
  /**
   * Place architecture tiles on the current scene.
   * @param {Item} netarchItem - The netarch item with floor data
   * @param {number} originX - Top-left X position in pixels
   * @param {number} originY - Top-left Y position in pixels
   * @param {object} [options] - Placement options
   * @param {string} [options.orientation="horizontal"] - "horizontal" (left→right) or "vertical" (top→bottom)
   * @param {boolean} [options.mazeMode=false] - Add random side-branches
   * @param {number} [options.mazeChance=0.3] - Probability of a side-branch per floor (0-1)
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
    const levelWidth = 2;
    const levelHeight = 2;
    const connectorWidth = 1;
    const connectorHeight = 1;
    const orientation = options.orientation ?? "horizontal";
    const isVertical = orientation === "vertical";
    const mazeMode = options.mazeMode ?? false;
    const mazeChance = options.mazeChance ?? 0.3;

    const tileData = [];
    const branchTracker = {};

    // In maze mode, randomly decide which floors get a side-branch offset
    // Side-branches shift perpendicular to the main axis
    const mazeOffsets = {};
    if (mazeMode) {
      for (const floor of floors) {
        const level = parseInt(floor.floor, 10) || 1;
        if (level > 1 && Math.random() < mazeChance) {
          // Random offset: -1 or +1 (shift left/right or up/down)
          mazeOffsets[level] = Math.random() < 0.5 ? -1 : 1;
        }
      }
    }

    // Track the cumulative perpendicular offset for the main path
    let currentOffset = 0;

    for (const floor of floors) {
      const level = parseInt(floor.floor, 10) || 1;
      const branch = floor.branch || null;

      // Apply maze offset for this level
      const mazeShift = mazeOffsets[level] ?? 0;
      const prevOffset = currentOffset;
      currentOffset += mazeShift;

      // --- Level tile position ---
      const textureSrc = getTilePath(floor.content, floor.blackice, floor.dv, filePath, ext);

      let levelX, levelY;

      if (isVertical) {
        // Top→bottom: main axis is Y, branches extend on X
        const branchOffset = branch ? (branch.charCodeAt(0) - 97 + 1) : 0;
        levelX = originX + gridSize * (levelHeight + connectorHeight) * (branchOffset + currentOffset);
        levelY = originY + gridSize * (levelWidth + connectorWidth) * (level - 1);
      } else {
        // Left→right: main axis is X, branches extend on Y
        const branchOffset = branch ? (branch.charCodeAt(0) - 97 + 1) : 0;
        levelX = originX + gridSize * (levelWidth + connectorWidth) * (level - 1);
        levelY = originY + gridSize * (levelHeight + connectorHeight) * (branchOffset + currentOffset);
      }

      tileData.push({
        texture: { src: textureSrc },
        width: gridSize * levelWidth,
        height: gridSize * levelHeight,
        x: levelX,
        y: levelY,
      });

      // --- Connector arrow to previous floor ---
      if (level > 1) {
        const arrowSrc = getArrowTilePath(filePath, ext);

        if (mazeShift !== 0) {
          // Maze shift: add a perpendicular connector from prev position, then a straight connector
          this._addMazeConnectors(tileData, arrowSrc, gridSize, originX, originY,
            level, prevOffset, currentOffset, levelWidth, levelHeight,
            connectorWidth, connectorHeight, isVertical);
        } else {
          // Straight connector
          let arrowX, arrowY, rotation;

          if (isVertical) {
            arrowX = originX + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * currentOffset);
            arrowY = originY + gridSize * ((levelWidth + connectorWidth) * (level - 1) - connectorWidth);
            rotation = 90;
          } else {
            arrowX = originX + gridSize * ((levelWidth + connectorWidth) * (level - 1) - connectorWidth);
            arrowY = originY + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * currentOffset);
            rotation = 0;
          }

          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * connectorWidth,
            height: gridSize * connectorHeight,
            x: arrowX,
            y: arrowY,
            rotation,
          });
        }
      }

      // --- Track branches for vertical/horizontal connectors ---
      if (branch && !branchTracker[level]) {
        branchTracker[level] = { branch, offset: currentOffset };
      }
    }

    // --- Branch connectors ---
    for (const [levelStr, info] of Object.entries(branchTracker)) {
      const level = parseInt(levelStr, 10);
      const branchOffset = info.branch.charCodeAt(0) - 97 + 1;
      const arrowSrc = getArrowTilePath(filePath, ext);

      if (isVertical) {
        // Horizontal connector from main to branch
        const baseX = originX + gridSize * (levelHeight + connectorHeight) * info.offset;
        const targetX = originX + gridSize * (levelHeight + connectorHeight) * (branchOffset + info.offset);
        const connY = originY + gridSize * ((levelWidth + connectorWidth) * (level - 1) + (levelWidth - connectorWidth) / 2);
        let cx = baseX + gridSize * levelHeight;
        while (cx < targetX) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * connectorWidth,
            height: gridSize * connectorHeight,
            x: cx,
            y: connY,
            rotation: 0,
          });
          cx += gridSize * connectorWidth;
        }
      } else {
        // Vertical connector from main to branch
        const connX = originX + gridSize * ((levelWidth + connectorWidth) * (level - 1) + (levelWidth - connectorWidth) / 2);
        const baseY = originY + gridSize * (levelHeight + connectorHeight) * info.offset;
        const targetY = originY + gridSize * (levelHeight + connectorHeight) * (branchOffset + info.offset);
        let cy = baseY + gridSize * levelHeight;
        while (cy < targetY) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * connectorWidth,
            height: gridSize * connectorHeight,
            x: connX,
            y: cy,
            rotation: 90,
          });
          cy += gridSize * connectorHeight;
        }
      }
    }

    // Create all tiles on the scene
    const created = await scene.createEmbeddedDocuments("Tile", tileData);
    const tileIds = created.map((t) => t.id);

    await netarchItem.setFlag(MODULE_ID, "placedTileIds", tileIds);
    await netarchItem.setFlag(MODULE_ID, "placedSceneId", scene.id);

    ui.notifications.info(`Placed ${tileIds.length} tiles on the scene.`);
  }

  /**
   * Add connectors for a maze shift (perpendicular jog between floors).
   */
  static _addMazeConnectors(tileData, arrowSrc, gridSize, originX, originY,
    level, prevOffset, currentOffset, levelWidth, levelHeight,
    connectorWidth, connectorHeight, isVertical) {

    // First: straight connector from previous floor to the turn point
    // Then: perpendicular connector(s) for the shift
    // Then: straight connector into the current floor

    if (isVertical) {
      // Main axis Y: shift is on X
      const turnY = originY + gridSize * ((levelWidth + connectorWidth) * (level - 1) - connectorWidth);
      const prevX = originX + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * prevOffset);
      const curX = originX + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * currentOffset);

      // Straight connector at previous X
      tileData.push({
        texture: { src: arrowSrc },
        width: gridSize * connectorWidth,
        height: gridSize * connectorHeight,
        x: prevX,
        y: turnY,
        rotation: 90,
      });

      // Perpendicular shift connector(s)
      const startX = Math.min(prevX, curX) + gridSize * connectorWidth;
      const endX = Math.max(prevX, curX);
      for (let px = startX; px <= endX; px += gridSize * connectorWidth) {
        tileData.push({
          texture: { src: arrowSrc },
          width: gridSize * connectorWidth,
          height: gridSize * connectorHeight,
          x: px - gridSize * connectorWidth / 2,
          y: turnY,
          rotation: 0,
        });
      }
    } else {
      // Main axis X: shift is on Y
      const turnX = originX + gridSize * ((levelWidth + connectorWidth) * (level - 1) - connectorWidth);
      const prevY = originY + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * prevOffset);
      const curY = originY + gridSize * ((levelHeight - connectorHeight) / 2 + (levelHeight + connectorHeight) * currentOffset);

      // Straight connector at previous Y
      tileData.push({
        texture: { src: arrowSrc },
        width: gridSize * connectorWidth,
        height: gridSize * connectorHeight,
        x: turnX,
        y: prevY,
        rotation: 0,
      });

      // Perpendicular shift connector(s)
      const startY = Math.min(prevY, curY) + gridSize * connectorHeight;
      const endY = Math.max(prevY, curY);
      for (let py = startY; py <= endY; py += gridSize * connectorHeight) {
        tileData.push({
          texture: { src: arrowSrc },
          width: gridSize * connectorWidth,
          height: gridSize * connectorHeight,
          x: turnX,
          y: py - gridSize * connectorHeight / 2,
          rotation: 90,
        });
      }
    }
  }

  /**
   * Remove previously placed tiles from the scene.
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

      document.body.classList.add("nra-targeting");

      const handler = (event) => {
        const transform = canvas.stage.worldTransform;
        const x = (event.data.global.x - transform.tx) / canvas.stage.scale.x;
        const y = (event.data.global.y - transform.ty) / canvas.stage.scale.y;
        const snapped = { x: Math.round(x), y: Math.round(y) };

        canvas.stage.off("pointerdown", handler);
        document.body.classList.remove("nra-targeting");

        resolve(snapped);
      };

      canvas.stage.on("pointerdown", handler);

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
