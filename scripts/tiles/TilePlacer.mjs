import { MODULE_ID } from "../constants.mjs";
import { getTilePath, getArrowTilePath } from "./tile-mapping.mjs";

/**
 * Places NET Architecture tiles on the current scene.
 * Supports horizontal/vertical orientation and maze mode.
 *
 * Maze mode builds a branching tree from the flat floor list:
 * - Main path goes straight (down or across)
 * - At random floors, side branches split off left/right
 * - Each branch gets its own floors and can branch further
 * - Some branches are dead ends, others continue deeper
 */
export class TilePlacer {

  /**
   * Place architecture tiles on the current scene.
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

    const filePath = options.filePath ?? game.settings.get(MODULE_ID, "tilePath");
    const ext = options.tileExtension ?? game.settings.get(MODULE_ID, "tileExtension");
    const gridSize = options.tileGridSize ?? game.settings.get(MODULE_ID, "tileGridSize");
    const orientation = options.orientation ?? game.settings.get(MODULE_ID, "tileOrientation");
    const isVertical = orientation === "vertical";
    const mazeMode = options.mazeMode ?? false;
    const mazeChance = options.mazeChance ?? 0.3;
    const maxDepth = options.maxDepth ?? null;

    const LW = 2; // level tile width in grid units
    const LH = 2; // level tile height in grid units
    const CW = 1; // connector width
    const CH = 1; // connector height
    const step = LW + CW; // main-axis distance per depth level

    const tileData = [];

    if (mazeMode && floors.length > 2) {
      // Build a tree from the floor list and render it
      const tree = this._buildMazeTree(floors, mazeChance, maxDepth);
      this._renderTree(tree, tileData, originX, originY, 0, gridSize,
        LW, LH, CW, CH, step, isVertical, filePath, ext);
    } else {
      // Simple linear layout (no maze)
      this._renderLinear(floors, tileData, originX, originY, gridSize,
        LW, LH, CW, CH, step, isVertical, filePath, ext);
    }

    const created = await scene.createEmbeddedDocuments("Tile", tileData);
    const tileIds = created.map((t) => t.id);

    await netarchItem.setFlag(MODULE_ID, "placedTileIds", tileIds);
    await netarchItem.setFlag(MODULE_ID, "placedSceneId", scene.id);

    ui.notifications.info(`Placed ${tileIds.length} tiles on the scene.`);
  }

  /* ======================================== */
  /*  Linear Layout (no maze)                 */
  /* ======================================== */

  static _renderLinear(floors, tileData, originX, originY, gridSize,
    LW, LH, CW, CH, step, isVertical, filePath, ext) {

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      const textureSrc = getTilePath(floor.content, floor.blackice, floor.dv, filePath, ext);
      const arrowSrc = getArrowTilePath(filePath, ext);

      let tileX, tileY;
      if (isVertical) {
        tileX = originX;
        tileY = originY + gridSize * step * i;
      } else {
        tileX = originX + gridSize * step * i;
        tileY = originY;
      }

      tileData.push({
        texture: { src: textureSrc },
        width: gridSize * LW,
        height: gridSize * LH,
        x: tileX,
        y: tileY,
      });

      // Connector to previous tile
      if (i > 0) {
        if (isVertical) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX + gridSize * ((LW - CW) / 2),
            y: tileY - gridSize * CH,
            rotation: 90,
          });
        } else {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX - gridSize * CW,
            y: tileY + gridSize * ((LH - CH) / 2),
            rotation: 0,
          });
        }
      }
    }
  }

  /* ======================================== */
  /*  Maze Tree Builder                       */
  /* ======================================== */

  /**
   * Build a branching tree structure from the flat floor list.
   *
   * Each node: { floor, depth, col, children: [], left: node|null, right: node|null }
   * - "children" = floors continuing straight from this node
   * - "left"/"right" = side branches that split off at this node
   *
   * Floors are consumed from the list and distributed across branches.
   */
  static _buildMazeTree(floors, mazeChance, maxDepth = null) {
    const queue = [...floors]; // copy so we can consume
    const treeMaxDepth = maxDepth ?? Infinity;

    function buildBranch(available, branchMaxDepth = Infinity) {
      const effectiveMax = Math.min(branchMaxDepth, treeMaxDepth);
      const nodes = [];
      let depth = 0;

      while (available.length > 0 && depth < effectiveMax) {
        const floor = available.shift();
        const node = { floor, left: null, right: null };
        nodes.push(node);

        // Chance to branch (skip first floor, need floors remaining for branches)
        if (depth > 0 && available.length >= 2 && Math.random() < mazeChance) {
          // Decide: branch left, right, or both
          const roll = Math.random();
          if (roll < 0.3 && available.length >= 3) {
            // Both sides branch
            const leftCount = Math.max(1, Math.floor(Math.random() * 3) + 1);
            const rightCount = Math.max(1, Math.floor(Math.random() * 3) + 1);
            const leftFloors = available.splice(0, Math.min(leftCount, available.length));
            const rightFloors = available.splice(0, Math.min(rightCount, available.length));
            node.left = buildBranch(leftFloors, leftFloors.length);
            node.right = buildBranch(rightFloors, rightFloors.length);
          } else if (roll < 0.65) {
            // Left branch only
            const branchCount = Math.max(1, Math.floor(Math.random() * 3) + 1);
            const branchFloors = available.splice(0, Math.min(branchCount, available.length));
            node.left = buildBranch(branchFloors, branchFloors.length);
          } else {
            // Right branch only
            const branchCount = Math.max(1, Math.floor(Math.random() * 3) + 1);
            const branchFloors = available.splice(0, Math.min(branchCount, available.length));
            node.right = buildBranch(branchFloors, branchFloors.length);
          }
        }

        depth++;
      }

      return nodes;
    }

    return buildBranch(queue);
  }

  /* ======================================== */
  /*  Maze Tree Renderer                      */
  /* ======================================== */

  /**
   * Recursively render a maze tree to tile data.
   * @param {Array} branch - Array of nodes in this branch
   * @param {Array} tileData - Accumulator for tile objects
   * @param {number} startX - Starting X for this branch
   * @param {number} startY - Starting Y for this branch
   * @param {number} startDepth - Depth offset for this branch
   * @param {number} col - Column offset (perpendicular to main axis, in grid units)
   */
  static _renderTree(branch, tileData, startX, startY, col, gridSize,
    LW, LH, CW, CH, step, isVertical, filePath, ext) {

    for (let i = 0; i < branch.length; i++) {
      const node = branch[i];
      const depth = i;
      const textureSrc = getTilePath(node.floor.content, node.floor.blackice, node.floor.dv, filePath, ext);
      const arrowSrc = getArrowTilePath(filePath, ext);

      // Position along main axis
      let tileX, tileY;
      if (isVertical) {
        tileX = startX + gridSize * (LW + CW) * col;
        tileY = startY + gridSize * step * depth;
      } else {
        tileX = startX + gridSize * step * depth;
        tileY = startY + gridSize * (LH + CH) * col;
      }

      // Place floor tile
      tileData.push({
        texture: { src: textureSrc },
        width: gridSize * LW,
        height: gridSize * LH,
        x: tileX,
        y: tileY,
      });

      // Connector to previous tile in this branch
      if (i > 0) {
        if (isVertical) {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX + gridSize * ((LW - CW) / 2),
            y: tileY - gridSize * CH,
            rotation: 90,
          });
        } else {
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX - gridSize * CW,
            y: tileY + gridSize * ((LH - CH) / 2),
            rotation: 0,
          });
        }
      }

      // Render side branches
      if (node.left) {
        // Left branch: perpendicular, negative direction
        const branchStartDepth = depth; // starts at same depth as parent
        if (isVertical) {
          // Branch goes left (negative X)
          const branchX = tileX - gridSize * (LW + CW);
          const branchY = tileY;
          // Connector arrow from this tile to branch
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX - gridSize * CW,
            y: tileY + gridSize * ((LH - CH) / 2),
            rotation: 0,
          });
          this._renderTree(node.left, tileData, branchX, branchY, 0, gridSize,
            LW, LH, CW, CH, step, isVertical, filePath, ext);
        } else {
          // Branch goes up (negative Y)
          const branchX = tileX;
          const branchY = tileY - gridSize * (LH + CH);
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX + gridSize * ((LW - CW) / 2),
            y: tileY - gridSize * CH,
            rotation: 90,
          });
          this._renderTree(node.left, tileData, branchX, branchY, 0, gridSize,
            LW, LH, CW, CH, step, isVertical, filePath, ext);
        }
      }

      if (node.right) {
        // Right branch: perpendicular, positive direction
        if (isVertical) {
          // Branch goes right (positive X)
          const branchX = tileX + gridSize * (LW + CW);
          const branchY = tileY;
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX + gridSize * LW,
            y: tileY + gridSize * ((LH - CH) / 2),
            rotation: 0,
          });
          this._renderTree(node.right, tileData, branchX, branchY, 0, gridSize,
            LW, LH, CW, CH, step, isVertical, filePath, ext);
        } else {
          // Branch goes down (positive Y)
          const branchX = tileX;
          const branchY = tileY + gridSize * (LH + CH);
          tileData.push({
            texture: { src: arrowSrc },
            width: gridSize * CW, height: gridSize * CH,
            x: tileX + gridSize * ((LW - CW) / 2),
            y: tileY + gridSize * LH,
            rotation: 90,
          });
          this._renderTree(node.right, tileData, branchX, branchY, 0, gridSize,
            LW, LH, CW, CH, step, isVertical, filePath, ext);
        }
      }
    }
  }

  /* ======================================== */
  /*  Tile Cleanup                            */
  /* ======================================== */

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

  /* ======================================== */
  /*  Canvas Targeting                        */
  /* ======================================== */

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
