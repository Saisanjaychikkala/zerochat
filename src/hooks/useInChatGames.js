import { useState, useEffect, useRef, useCallback } from 'react';
import { peerService } from '../services/peerService';
import { getClientId } from '../services/identity';

const GAME_NAMES = {
  pong: 'Cyber Pong',
  grid: 'Cyber Grid (3x3)',
  c4: 'Connect 4',
};

export function useInChatGames({
  messages,
  setMessages,
  myNickname,
  myAvatarBg,
  remoteNickname,
  isConnected,
  isHost,
  showToast,
}) {
  const [activeMatch, setActiveMatch] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const cachedStatesRef = useRef({});

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const activeMatchRef = useRef(activeMatch);
  activeMatchRef.current = activeMatch;

  // Listen for WebRTC in-chat game synchronization
  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event) return;

      if (event.type === 'game_card_post') {
        if (!setMessages) return;
        setMessages((prev) => {
          if (prev.some((m) => m.cardId === event.card.cardId)) return prev;
          return [...prev, { ...event.card, sender: 'remote' }];
        });
        if (showToast) {
          showToast(`${event.card.hostNickname || 'Peer'} added a ${event.card.gameName} challenge to chat!`, 'info');
        }
      } else if (event.type === 'game_card_join') {
        if (!setMessages) return;
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.cardId === event.cardId) {
              return {
                ...msg,
                isGuestJoined: true,
                guestNickname: event.nickname,
                guestAvatarBg: event.avatarBg,
              };
            }
            return msg;
          })
        );
        if (showToast) showToast(`${event.nickname} joined the match!`, 'success');
      } else if (event.type === 'game_card_start') {
        if (!setMessages) return;
        setMessages((prev) => {
          const target = prev.find((m) => m.cardId === event.cardId);
          if (target) {
            setActiveMatch({
              cardId: target.cardId,
              gameId: target.gameId,
              gameName: target.gameName,
              isPlaying: true,
              isVisible: true,
            });
          }
          return prev.map((m) => (m.cardId === event.cardId ? { ...m, isPlaying: true } : m));
        });
      } else if (event.type === 'game_card_conclude') {
        if (!setMessages) return;
        if (event.cardId) delete cachedStatesRef.current[event.cardId];
        setMessages((prev) =>
          prev.map((m) =>
            m.cardId === event.cardId
              ? {
                  ...m,
                  isConcluded: true,
                  isPlaying: false,
                  winner: event.winner || m.winner || null,
                  finalScore: event.finalScore || m.finalScore || null,
                }
              : m
          )
        );
        if (activeMatchRef.current?.cardId === event.cardId) {
          setActiveMatch(null);
        }
        if (showToast) {
          const outcome = event.winner ? ` Winner: ${event.winner}!` : '';
          showToast(`Match concluded.${outcome} Resources cleared.`, 'info');
        }
      }
    });

    const unsubBurn = peerService.on('session_burned', () => {
      cachedStatesRef.current = {};
      setActiveMatch(null);
      setIsDrawerOpen(false);
    });

    return () => {
      unsub();
      unsubBurn();
    };
  }, [showToast, setMessages]);

  // Add game challenge card into chat
  const handleAddGameToChat = useCallback((gameId) => {
    const cardId = 'gc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const newCard = {
      type: 'game_card',
      id: cardId,
      cardId,
      gameId,
      gameName: GAME_NAMES[gameId] || gameId,
      hostNickname: myNickname || 'Player 1',
      hostAvatarBg: myAvatarBg,
      hostPeerId: peerService.myPeerId || null,
      hostClientId: getClientId(),
      guestNickname: isConnected ? null : 'AI Bot',
      guestAvatarBg: null,
      guestPeerId: null,
      guestClientId: null,
      isGuestJoined: !isConnected, // offline readies bot for instant test
      isConcluded: false,
      isPlaying: false,
      sender: 'local',
      timestamp: Date.now(),
    };

    if (setMessages) {
      setMessages((prev) => [...prev, newCard]);
    }
    setIsDrawerOpen(false);

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_post',
        card: newCard,
      });
    }

    if (showToast) showToast(`Added ${newCard.gameName} challenge to chat!`, 'success');
  }, [isConnected, myNickname, myAvatarBg, setMessages, showToast]);

  // Join existing game card
  const handleJoinCard = useCallback((cardId) => {
    const myId = getClientId();
    if (setMessages) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.cardId === cardId) {
            return {
              ...msg,
              isGuestJoined: true,
              guestNickname: myNickname || 'Player 2',
              guestAvatarBg: myAvatarBg,
              guestPeerId: peerService.myPeerId || null,
              guestClientId: myId,
            };
          }
          return msg;
        })
      );
    }

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_join',
        cardId,
        nickname: myNickname || 'Player 2',
        avatarBg: myAvatarBg,
        peerId: peerService.myPeerId || null,
        clientId: myId,
      });
    }

    setTimeout(() => {
      handleLaunchCard(cardId);
    }, 400);
  }, [isConnected, myNickname, myAvatarBg, setMessages]);

  // Launch game stage
  const handleLaunchCard = useCallback((cardId) => {
    const card = messagesRef.current.find((m) => m.cardId === cardId);
    if (!card) return;

    setActiveMatch({
      cardId,
      gameId: card.gameId,
      gameName: card.gameName,
      isPlaying: true,
      isVisible: true,
    });

    if (setMessages) {
      setMessages((prev) => prev.map((m) => (m.cardId === cardId ? { ...m, isPlaying: true } : m)));
    }

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_start',
        cardId,
      });
    }
  }, [isConnected, setMessages]);

  // Return to chat window while keeping match active in background
  const handleReturnToChat = useCallback(() => {
    setActiveMatch((prev) => (prev ? { ...prev, isVisible: false } : null));
    if (showToast) showToast('Returned to chat. Tap "Resume Game" to re-enter anytime.', 'info');
  }, [showToast]);

  // Resume running match
  const handleResumeMatch = useCallback((targetCardId = null) => {
    setActiveMatch((prev) => {
      if (targetCardId && (!prev || prev.cardId !== targetCardId)) {
        const card = messagesRef.current?.find((m) => m.cardId === targetCardId);
        if (card) {
          return {
            cardId: card.cardId,
            gameId: card.gameId,
            gameName: card.gameName,
            isPlaying: true,
            isVisible: true,
          };
        }
      }
      return prev ? { ...prev, isVisible: true } : null;
    });
  }, []);

  // Update in-memory cached state per card
  const handleUpdateCardState = useCallback((cardId, patch) => {
    if (!cardId) return;
    cachedStatesRef.current[cardId] = {
      ...(cachedStatesRef.current[cardId] || {}),
      ...patch,
    };
  }, []);

  // Record round outcome on card
  const handleEndRound = useCallback((winner, finalScore) => {
    const current = activeMatchRef.current;
    if (current?.cardId && setMessages) {
      setMessages((prev) =>
        prev.map((m) =>
          m.cardId === current.cardId
            ? { ...m, winner, finalScore }
            : m
        )
      );
    }
  }, [setMessages]);

  // Conclude match and clean up
  const handleExitMatch = useCallback((summary = null, specificCardId = null) => {
    const targetCardId = (typeof summary === 'string' ? summary : specificCardId) || activeMatchRef.current?.cardId;
    if (targetCardId) {
      delete cachedStatesRef.current[targetCardId];
      const existingCard = messagesRef.current?.find((m) => m.cardId === targetCardId);
      const winner = (typeof summary === 'object' ? summary?.winner : null) || existingCard?.winner || null;
      const finalScore = (typeof summary === 'object' ? summary?.finalScore : null) || existingCard?.finalScore || null;

      if (setMessages) {
        setMessages((prev) =>
          prev.map((m) =>
            m.cardId === targetCardId
              ? {
                  ...m,
                  isConcluded: true,
                  isPlaying: false,
                  ...(winner ? { winner } : {}),
                  ...(finalScore ? { finalScore } : {}),
                }
              : m
          )
        );
      }

      if (isConnected) {
        peerService.sendGameEvent({
          type: 'game_card_conclude',
          cardId: targetCardId,
          winner,
          finalScore,
        });
      }
    }
    if (activeMatchRef.current?.cardId === targetCardId) {
      setActiveMatch(null);
    }
    if (showToast) showToast('Match finished. Resources cleared.', 'info');
  }, [isConnected, setMessages, showToast]);

  // Immediate rematch: posts new challenge for same game
  const handleRematch = useCallback((gameId) => {
    handleAddGameToChat(gameId);
  }, [handleAddGameToChat]);

  return {
    activeMatch,
    cachedGameStates: cachedStatesRef.current,
    isDrawerOpen,
    setIsDrawerOpen,
    handleAddGameToChat,
    handleJoinCard,
    handleLaunchCard,
    handleReturnToChat,
    handleResumeMatch,
    handleUpdateCardState,
    handleEndRound,
    handleExitMatch,
    handleRematch,
  };
}
