import { useState, useEffect, useRef, useCallback } from 'react';
import { peerService } from '../services/peerService';

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
        setMessages((prev) =>
          prev.map((m) => (m.cardId === event.cardId ? { ...m, isConcluded: true, isPlaying: false } : m))
        );
        setActiveMatch(null);
        if (showToast) showToast('Match concluded. Resources cleared.', 'info');
      }
    });

    const unsubBurn = peerService.on('session_burned', () => {
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
      guestNickname: isConnected ? null : 'AI Bot',
      guestAvatarBg: null,
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
    if (setMessages) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.cardId === cardId) {
            return {
              ...msg,
              isGuestJoined: true,
              guestNickname: myNickname || 'Player 2',
              guestAvatarBg: myAvatarBg,
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
  const handleResumeMatch = useCallback(() => {
    setActiveMatch((prev) => (prev ? { ...prev, isVisible: true } : null));
  }, []);

  // Conclude match and clean up
  const handleExitMatch = useCallback(() => {
    const current = activeMatchRef.current;
    if (current?.cardId) {
      if (setMessages) {
        setMessages((prev) =>
          prev.map((m) => (m.cardId === current.cardId ? { ...m, isConcluded: true, isPlaying: false } : m))
        );
      }

      if (isConnected) {
        peerService.sendGameEvent({
          type: 'game_card_conclude',
          cardId: current.cardId,
        });
      }
    }
    setActiveMatch(null);
    if (showToast) showToast('Match finished. Resources cleared.', 'info');
  }, [isConnected, setMessages, showToast]);

  return {
    activeMatch,
    isDrawerOpen,
    setIsDrawerOpen,
    handleAddGameToChat,
    handleJoinCard,
    handleLaunchCard,
    handleReturnToChat,
    handleResumeMatch,
    handleExitMatch,
  };
}
