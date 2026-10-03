/**
 * ZeroChat Group Game Helpers
 * Extracted from GroupChatWorkspace to keep that file under the 350-line limit.
 */

export const GAME_NAMES = {
  pong: 'Cyber Pong',
  grid: 'Cyber Grid (3x3)',
  c4: 'Connect 4'
};

/**
 * Builds a game_card message payload with open slots for first-come-first-serve joining.
 */
export function buildGameCardMsg(gameId, myNickname, myPeerId = null, myClientId = null) {
  const cardId = 'gc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  const gameName = GAME_NAMES[gameId] || gameId;
  return {
    type: 'game_card',
    id: cardId,
    cardId,
    gameId,
    gameName,
    createdBy: myNickname || 'Squad Member',
    creatorPeerId: myPeerId || null,
    creatorClientId: myClientId || null,
    hostNickname: null,
    hostAvatarBg: null,
    hostPeerId: null,
    hostClientId: null,
    guestNickname: null,
    guestAvatarBg: null,
    guestPeerId: null,
    guestClientId: null,
    isGuestJoined: false,
    isConcluded: false,
    isPlaying: false
  };
}
