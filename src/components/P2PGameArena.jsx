import React, { useState, useEffect, useRef } from 'react';
import { Share2, Copy, QrCode } from 'lucide-react';
import GameDrawer from './game/GameDrawer';
import GameLobbyChat from './game/GameLobbyChat';
import GameQrModal from './game/GameQrModal';
import GameArenaHeader from './game/GameArenaHeader';
import ActiveMatchStage from './game/ActiveMatchStage';
import { peerService } from '../services/peerService';

export default function P2PGameArena({
  status,
  isHost,
  myNickname,
  myAvatarBg,
  remotePeerNickname,
  remoteAvatarBg,
  gameRoomId,
  callState,
  onStartCall,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleAudio,
  onExit,
  showToast,
  onOpenSettings,
}) {
  const [activeGame, setActiveGame] = useState('grid');
  const [activeCardId, setActiveCardId] = useState(null);
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  const gameAudioRef = useRef(null);
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isVoiceConnected = callState?.status === 'connected';

  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const activeCardIdRef = useRef(activeCardId);
  activeCardIdRef.current = activeCardId;

  // Autoplay incoming remote voice stream without blocking gameplay
  useEffect(() => {
    if (gameAudioRef.current && callState?.remoteStream) {
      gameAudioRef.current.srcObject = callState.remoteStream;
      gameAudioRef.current.play().catch((err) => {
        console.warn('[ZeroChat] Background voice autoplay blocked/waiting:', err);
      });
    }
  }, [callState?.remoteStream]);

  // Listen for WebRTC in-game matchmaking and chat events
  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event) return;

      if (event.type === 'game_card_post') {
        setChatMessages((prev) => [...prev, event.card]);
        if (showToast) showToast(`${event.card.hostNickname} added a ${event.card.gameName} challenge to chat!`, 'info');
      } else if (event.type === 'game_card_join') {
        setChatMessages((prev) => prev.map((msg) => {
          if (msg.cardId === event.cardId) {
            return {
              ...msg,
              isGuestJoined: true,
              guestNickname: event.nickname,
              guestAvatarBg: event.avatarBg,
            };
          }
          return msg;
        }));
        if (showToast) showToast(`${event.nickname} joined the match!`, 'success');
      } else if (event.type === 'game_card_start') {
        setChatMessages((prev) => {
          const target = prev.find((m) => m.cardId === event.cardId);
          if (target) {
            setActiveGame(target.gameId);
            setActiveCardId(target.cardId);
            setIsMatchActive(true);
          }
          return prev.map((m) => (m.cardId === event.cardId ? { ...m, isPlaying: true } : m));
        });
      } else if (event.type === 'game_card_conclude') {
        setChatMessages((prev) => prev.map((m) => (m.cardId === event.cardId ? { ...m, isConcluded: true, isPlaying: false } : m)));
        setIsMatchActive(false);
        setActiveCardId(null);
        if (showToast) showToast('Match concluded. Card closed in chat.', 'info');
      } else if (event.type === 'game_chat_msg') {
        setChatMessages((prev) => [...prev, { text: event.text, sender: 'theirs', senderName: event.senderName, avatarBg: event.avatarBg }]);
      }
    });

    return () => unsub();
  }, [showToast]);

  const handleCopyLink = () => {
    const inviteUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}#${gameRoomId}`
      : `#${gameRoomId}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        if (showToast) showToast('Match invite copied!', 'success');
        setTimeout(() => setCopied(false), 2400);
      }).catch(() => {
        if (showToast) showToast(`Match Code: ${gameRoomId}`, 'info');
      });
    }
  };

  // Add interactive game card into chat
  const handleAddGameToChat = (gameId) => {
    const gameNames = { pong: 'Cyber Pong', grid: 'Cyber Grid (3x3)', c4: 'Connect 4' };
    const cardId = 'gc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const newCard = {
      type: 'game_card',
      cardId,
      gameId,
      gameName: gameNames[gameId] || gameId,
      hostNickname: myNickname || 'Player 1',
      hostAvatarBg: myAvatarBg,
      guestNickname: isConnected ? null : 'AI Bot',
      guestAvatarBg: null,
      isGuestJoined: !isConnected, // offline auto-readies bot
      isConcluded: false,
      isPlaying: false,
    };

    setChatMessages((prev) => [...prev, newCard]);
    setIsDrawerOpen(false);

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_post',
        card: newCard,
      });
    }

    if (showToast) showToast(`Added ${newCard.gameName} challenge to chat!`, 'success');
  };

  // Player 2 joins game card and starts the game
  const handleJoinCard = (cardId) => {
    setChatMessages((prev) => prev.map((msg) => {
      if (msg.cardId === cardId) {
        return {
          ...msg,
          isGuestJoined: true,
          guestNickname: myNickname || 'Player 2',
          guestAvatarBg: myAvatarBg,
        };
      }
      return msg;
    }));

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_join',
        cardId,
        nickname: myNickname || 'Player 2',
        avatarBg: myAvatarBg,
      });
    }

    // Auto-launch match for both players when 2/2 joined
    setTimeout(() => {
      handleLaunchCard(cardId);
    }, 600);
  };

  // Launch game when ready
  const handleLaunchCard = (cardId) => {
    const card = chatMessagesRef.current.find((m) => m.cardId === cardId);
    if (!card) return;

    setActiveGame(card.gameId);
    setActiveCardId(cardId);
    setIsMatchActive(true);

    setChatMessages((prev) => prev.map((m) => (m.cardId === cardId ? { ...m, isPlaying: true } : m)));

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_card_start',
        cardId,
      });
    }
  };

  // Conclude match, free resources, and gray out card in chat
  const handleExitMatch = () => {
    setIsMatchActive(false);
    const cId = activeCardIdRef.current;
    if (cId) {
      setActiveCardId(null);
      setChatMessages((prev) => prev.map((m) => (m.cardId === cId ? { ...m, isConcluded: true, isPlaying: false } : m)));

      if (isConnected) {
        peerService.sendGameEvent({
          type: 'game_card_conclude',
          cardId: cId,
        });
      }
    }
    if (showToast) showToast('Match finished. Resources cleared.', 'info');
  };

  const handleSendChatMessage = (text) => {
    setChatMessages((prev) => [...prev, { text, sender: 'me', senderName: myNickname, avatarBg: myAvatarBg }]);
    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_chat_msg',
        text,
        senderName: myNickname,
        avatarBg: myAvatarBg,
      });
    }
  };

  const handleSetMute = (mute) => {
    peerService.setAudioMute(mute);
  };

  return (
    <div className="game-arena-container glass-panel">
      <audio ref={gameAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Top Header Bar */}
      <GameArenaHeader 
        onExit={onExit}
        gameRoomId={gameRoomId}
        status={status}
        isConnected={isConnected}
        isConnecting={isConnecting}
        copied={copied}
        onCopyLink={handleCopyLink}
        onOpenQr={() => setIsQrModalOpen(true)}
        callState={callState}
        isVoiceConnected={isVoiceConnected}
        onStartCall={onStartCall}
        onAnswerCall={onAnswerCall}
        onRejectCall={onRejectCall}
        onEndCall={onEndCall}
        onToggleAudio={onToggleAudio}
        onSetMute={handleSetMute}
        remotePeerNickname={remotePeerNickname}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSettings={onOpenSettings}
      />

      {/* Opponent Status Banner when waiting */}
      {!isConnected && (
        <div className="game-waiting-banner">
          <span className="game-waiting-text">
            <Share2 size={13} color="var(--accent-purple, #c084fc)" />
            {isConnecting ? 'Setting up secure P2P game arena...' : 'Share room link or play solo vs AI below'}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleCopyLink} className="btn btn-primary text-xs" style={{ height: '26px', padding: '0 8px', gap: '4px' }}>
              <Copy size={11} />
              <span>Copy Link</span>
            </button>
            <button onClick={() => setIsQrModalOpen(true)} className="btn btn-secondary text-xs" style={{ height: '26px', padding: '0 8px', gap: '4px' }}>
              <QrCode size={11} />
              <span>QR Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Stage: Active Playing Match vs Unified Chat Feed */}
      <div className="game-stage-wrapper">
        {isMatchActive ? (
          <ActiveMatchStage 
            activeGame={activeGame}
            status={status}
            isHost={isHost}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            showToast={showToast}
            onExitMatch={handleExitMatch}
          />
        ) : (
          <GameLobbyChat 
            status={status}
            myNickname={myNickname}
            myAvatarBg={myAvatarBg}
            remotePeerNickname={remotePeerNickname}
            remoteAvatarBg={remoteAvatarBg}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onJoinCard={handleJoinCard}
            onLaunchCard={handleLaunchCard}
            isHost={isHost}
          />
        )}
      </div>

      {/* Game Drawer with "Add to Chat" button */}
      <GameDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectGame={handleAddGameToChat}
        activeGame={activeGame}
      />

      {/* Match QR Code Modal */}
      <GameQrModal 
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        gameRoomId={gameRoomId}
        showToast={showToast}
      />
    </div>
  );
}
