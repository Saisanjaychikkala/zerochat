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
 * Builds a game_card message payload for posting to the squad feed.
 */
export function buildGameCardMsg(gameId, myNickname) {
  const cardId = 'gc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  const gameName = GAME_NAMES[gameId] || gameId;
  return {
    type: 'game_card',
    id: cardId,
    cardId,
    gameId,
    gameName,
    hostNickname: myNickname || 'Player',
    guestNickname: null,
    isGuestJoined: false,
    isConcluded: false,
    isPlaying: false
  };
}
