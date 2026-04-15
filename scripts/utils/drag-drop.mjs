/**
 * Drag-and-drop utility for the NET Architecture builder.
 * Parses drop events and validates document types.
 */

/**
 * Parse the dataTransfer JSON from a drop event.
 * @param {DragEvent} event
 * @returns {Promise<{type: string, document: Document}|null>}
 */
export async function parseDragData(event) {
  let data;
  try {
    data = JSON.parse(event.dataTransfer.getData("text/plain"));
  } catch {
    return null;
  }

  if (!data?.type || !data?.uuid) return null;

  let document;
  try {
    document = await fromUuid(data.uuid);
  } catch {
    return null;
  }

  if (!document) return null;
  return { type: data.type, document };
}

/**
 * Validate whether a dropped document is appropriate for a floor drop zone.
 * Accepts: Black ICE actors, or program items with class "blackice".
 * @param {object} dragData - Result from parseDragData
 * @returns {{ valid: boolean, iceData: object|null }}
 */
export function validateFloorDrop(dragData) {
  if (!dragData) return { valid: false, iceData: null };

  const { type, document: doc } = dragData;

  // Black ICE actor
  if (type === "Actor" && doc.type === "blackIce") {
    return {
      valid: true,
      iceData: {
        name: doc.name,
        actorId: doc.id,
        class: doc.system.class,
        per: doc.system.per,
        spd: doc.system.spd,
        atk: doc.system.atk,
        def: doc.system.def,
        rez: { value: doc.system.rez?.max ?? doc.system.rez?.value ?? 15, max: doc.system.rez?.max ?? 15 },
      },
    };
  }

  // Program item with class "blackice"
  if (type === "Item" && doc.type === "program" && doc.system.class === "blackice") {
    return {
      valid: true,
      iceData: {
        name: doc.name,
        itemId: doc.id,
        class: "antiprogram",
        per: doc.system.per ?? 2,
        spd: doc.system.spd ?? 4,
        atk: doc.system.atk ?? 2,
        def: doc.system.def ?? 2,
        rez: { value: doc.system.rez?.max ?? 15, max: doc.system.rez?.max ?? 15 },
      },
    };
  }

  return { valid: false, iceData: null };
}

/**
 * Check if a dropped item is a netarch (for importing floors).
 * @param {object} dragData
 * @returns {boolean}
 */
export function isNetarchDrop(dragData) {
  return dragData?.type === "Item" && dragData.document?.type === "netarch";
}
