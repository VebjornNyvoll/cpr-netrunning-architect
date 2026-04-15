import { MODULE_ID } from "../constants.mjs";

/**
 * Post an Interface check result to chat.
 * @param {object} rollResult - Result from rollInterfaceCheck()
 */
export async function postInterfaceCheckCard(rollResult) {
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/chat/interface-check-card.hbs`,
    { moduleId: MODULE_ID, ...rollResult }
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor: game.actors.get(rollResult.actorId) }),
    rolls: [rollResult.roll, rollResult.critRoll].filter(Boolean),
  });
}

/**
 * Post a NET combat action result to chat.
 * @param {object} data - Combat result data
 */
export async function postCombatCard(data) {
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/chat/net-combat-card.hbs`,
    { moduleId: MODULE_ID, ...data }
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker(),
    rolls: [data.roll, data.critRoll].filter(Boolean),
  });
}

/**
 * Post a floor reveal notification to chat.
 * @param {object} floorData - The revealed floor data
 * @param {string} actorName - Name of the netrunner
 */
export async function postFloorRevealCard(floorData, actorName) {
  const content = await renderTemplate(
    `modules/${MODULE_ID}/templates/chat/floor-reveal-card.hbs`,
    { moduleId: MODULE_ID, floor: floorData, actorName }
  );

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker(),
  });
}

/**
 * Post a simple notification message to chat.
 * @param {string} message - The message HTML content
 * @param {object} [options] - Optional ChatMessage options
 */
export async function postChatNotification(message, options = {}) {
  await ChatMessage.create({
    content: `<div class="nra-chat-card">${message}</div>`,
    speaker: ChatMessage.getSpeaker(),
    ...options,
  });
}
