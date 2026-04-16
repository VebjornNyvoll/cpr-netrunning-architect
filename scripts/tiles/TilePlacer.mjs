import { MODULE_ID } from "../constants.mjs";
import { getTilePath, getArrowTilePath } from "./tile-mapping.mjs";

/**
 * Places NET Architecture tiles on the current scene.
 * Supports left-to-right and top-to-bottom orientations,
 * plus an optional maze mode that creates left/right forks.
 */
export class TilePlacer {
  /**
   * Place architecture tiles on the current scene.
   * @param {Item} netarchItem - The netarch item with floor data
   * @param {number} originX - Top-left X position in pixels
   * @param {number} originY - Top-left Y position in pixels
   * @param {object} [options] - Placement options
   * @param {string} [options.orientation] - "horizontal" or "vertical" (reads from settings if omitted)
   * @param {boolean} [options.mazeMode=false] - Create left/right forks at random floors
   * @param {number} [options.mazeChance=0.3] - Probability of a fork per floor (0-1)
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
    const lw = 2; // level width in grid units
    const lh = 2; // level height in grid units
    const cw = 1; // connector width in grid units
    const ch = 1; // connector height in grid units
    const orientation = options.orientation ?? game.settings.get(MODULE_ID, "tileOrientation");
    const isVertical = orientation === "vertical";
    const mazeMode = options.mazeMode ?? false;
    const mazeChance = options.mazeChance ?? 0.3;

    const tileData = [];
    const branchTracker = {};

    // Determine which floors get a maze fork (both left AND right)
    const mazeForks = new Set();
    if (mazeMode) {
      for (const floor of floors) {
        const level = parseInt(floor.floor, 10) || 1;
        // Skip first floor and floors that are already branches
        if (level > 1 && !floor.branch && Math.random() < mazeChance) {
          mazeForks.add(level);
        }
      }
    }

    for (const floor of floors) {
      const level = parseInt(floor.floor, 10) || 1;
      const branch = floor.branch || null;
      const isFork = mazeForks.has(level) && !branch;

      const textureSrc = getTilePath(floor.content, floor.blackice, floor.dv, filePath, ext);
      const arrowSrc = getArrowTilePath(filePath, ext);

      // --- Main axis position (along the path direction) ---
      // mainPos = distance along the primary axis for this level
      const mainPos = (lw + cw) * (level - 1);

      // --- Cross axis position (perpendicular to path) ---
      // branchOffset shifts for architecture branches (a, b, c...)
      const branchOffset = branch ? (branch.charCodeAt(0) - 97 + 1) : 0;

      if (isFork) {
        // MAZE FORK: place the same floor tile in TWO positions (left and right)
        // and connector arrows from the previous floor to both

        const leftOffset = -1;  // one tile-width to the left/up
        const rightOffset = 1;  // one tile-width to the right/down

        for (const forkOffset of [leftOffset, rightOffset]) {
          const crossPos = (lh + ch) * forkOffset;

          let tileX, tileY;
          if (isVertical) {
            tileX = originX + gridSize * crossPos;
            tileY = originY + gridSize * mainPos;
          } else {
            tileX = originX + gridSize * mainPos;
            tileY = originY + gridSize * crossPos;
          }

          // Floor tile
          tileData.push({
            texture: { src: textureSrc },
            width: gridSize * lw,
            height: gridSize * lh,
            x: tileX,
            y: tileY,
          });

          // Connector arrow from previous floor (on the main axis) to this fork tile
          // The arrow goes perpendicular from the center of the previous floor's edge
          if (isVertical) {
            // Arrow pointing left or right from the main path
            const arrowX = forkOffset < 0
              ? originX + gridSize * (crossPos + lh) // left of fork tile, right edge
              : originX - gridSize * ch;              // right of main path
            const arrowY = originY + gridSize * (mainPos + (lw - cw) / 2);

            // Perpendicular connector
            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: forkOffset < 0 ? originX - gridSize * cw : originX + gridSize * lh,
              y: arrowY,
              rotation: 0,
            });
          } else {
            // Arrow pointing up or down from the main path
            const arrowX = originX + gridSize * (mainPos + (lw - cw) / 2);

            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: arrowX,
              y: forkOffset < 0 ? originY - gridSize * ch : originY + gridSize * lh,
              rotation: 90,
            });
          }
        }

        // Also place the main straight connector into this level (from prev floor)
        if (level > 1) {
          if (isVertical) {
            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: originX + gridSize * ((lh - ch) / 2),
              y: originY + gridSize * (mainPos - cw),
              rotation: 90,
            });
          } else {
            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: originX + gridSize * (mainPos - cw),
              y: originY + gridSize * ((lh - ch) / 2),
              rotation: 0,
            });
          }
        }
      } else {
        // --- Normal floor (no fork) ---
        let levelX, levelY;

        if (isVertical) {
          levelX = originX + gridSize * (lh + ch) * branchOffset;
          levelY = originY + gridSize * mainPos;
        } else {
          levelX = originX + gridSize * mainPos;
          levelY = originY + gridSize * (lh + ch) * branchOffset;
        }

        tileData.push({
          texture: { src: textureSrc },
          width: gridSize * lw,
          height: gridSize * lh,
          x: levelX,
          y: levelY,
        });

        // --- Straight connector arrow to previous floor ---
        if (level > 1) {
          if (isVertical) {
            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: originX + gridSize * ((lh - ch) / 2 + (lh + ch) * branchOffset),
              y: originY + gridSize * (mainPos - cw),
              rotation: 90,
            });
          } else {
            tileData.push({
              texture: { src: arrowSrc },
              width: gridSize * cw,
              height: gridSize * ch,
              x: originX + gridSize * (mainPos - cw),
              y: originY + gridSize * ((lh - ch) / 2 + (lh + ch) * branchOffset),
              rotation: 0,
            });
          }
        }
      }

      // --- Track architecture branches for branch connectors ---
      if (branch && !branchTracker[level]) {
        branchTracker[level] = branch;
      }
    }

    // --- Branch connectors (for architecture branches, not maze forks) ---
    for (const [levelStr, branch] of Object.entries(branchTracker)) {
      const level = parseInt(levelStr, 10);
      const branchOffset = branch.charCodeAt(0) - 97 + 1;
      const arrowSrc = getArrowTilePath(filePath, ext);
      const mainPos = (lw + cw) * (level - 1);

      if (isVertical) {
        const connY = originY + gridSize * (mainPos + (lw - cw) / 2);
        let cx = originX + gridSize * lh;
        const targetX = originX + gridSize * (lh + ch) * branchOffset;
        while (cx < targetX) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * cw,
            height: gridSize * ch,
            x: cx,
            y: connY,
            rotation: 0,
          });
          cx += gridSize * cw;
        }
      } else {
        const connX = originX + gridSize * (mainPos + (lw - cw) / 2);
        let cy = originY + gridSize * lh;
        const targetY = originY + gridSize * (lh + ch) * branchOffset;
        while (cy < targetY) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * cw,
            height: gridSize * ch,
            x: connX,
            y: cy,
            rotation: 90,
          });
          cy += gridSize * ch;
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
