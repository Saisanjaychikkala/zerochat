import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Gamepad2, 
  Copy, 
  Check, 
  Radio, 
  Share2, 
  Menu,
  Volume2
} from 'lucide-react';
import CyberPongGame from './game/CyberPongGame';
import CyberGridGame from './game/CyberGridGame';
import CyberConnectFour from './game/CyberConnectFour';
import GameDrawer from './game/GameDrawer';
import GameLobbyChat from './game/GameLobbyChat';
import GameVoiceDock from './game/GameVoiceDock';
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
  onEndCall,
  onToggleAudio,
  onExit,
  showToast,
}) {
  const [activeGame, setActiveGame] = useState('pong'); // 'pong' | 'grid' | 'c4'
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isVoiceConnected = callState?.status === 'connected';

  // Listen for WebRTC in-game matchmaking and chat events
  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event) return;

      if (event.type === 'game_challenge') {
        setActiveChallenge(event.challenge);
        setActiveGame(event.challenge.gameId);
        setIsMatchActive(false);
        if (showToast) showToast(`${event.challenge.hostNickname} proposed a ${event.challenge.gameName} duel!`, 'info');
      } else if (event.type === 'game_join') {
        setActiveChallenge((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isGuestJoined: true,
            guestNickname: event.nickname,
            guestAvatarBg: event.avatarBg,
          };
        });
        if (showToast) showToast(`${event.nickname} joined the match!`, 'success');
      } else if (event.type === 'game_start') {
        setIsMatchActive(true);
      } else if (event.type === 'game_exit_match') {
        setIsMatchActive(false);
        if (showToast) showToast(`${remotePeerNickname || 'Opponent'} returned to Game Lobby`, 'info');
      } else if (event.type === 'game_chat_msg') {
        setChatMessages((prev) => [...prev, { text: event.text, sender: 'theirs', senderName: event.senderName, avatarBg: event.avatarBg }]);
      }
    });

    return () => unsub();
  }, [remotePeerNickname, showToast]);

  const handleCopyLink = () => {
    const inviteUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}#${gameRoomId}`
      : `#${gameRoomId}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        if (showToast) showToast('Match invite copied! Send to opponent.', 'success');
        setTimeout(() => setCopied(false), 2400);
      }).catch(() => {
        if (showToast) showToast(`Match Code: ${gameRoomId}`, 'info');
      });
    } else if (showToast) {
      showToast(`Match Code: ${gameRoomId}`, 'info');
    }
  };

  const handleSelectGame = (gameId) => {
    setActiveGame(gameId);
    const gameNames = { pong: 'Cyber Pong', grid: 'Cyber Grid (3x3)', c4: 'Connect 4' };
    const challenge = {
      gameId,
      gameName: gameNames[gameId] || gameId,
      hostNickname: myNickname || 'Host',
      hostAvatarBg: myAvatarBg,
      guestNickname: isConnected ? remotePeerNickname : null,
      guestAvatarBg: remoteAvatarBg,
      isGuestJoined: !isConnected, // if offline bot, auto-join
    };
    setActiveChallenge(challenge);
    setIsMatchActive(!isConnected); // if offline, start immediately

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_challenge',
        challenge,
      });
    }
  };

  const handleJoinChallenge = () => {
    if (!activeChallenge) return;
    setActiveChallenge((prev) => ({
      ...prev,
      isGuestJoined: true,
      guestNickname: myNickname,
      guestAvatarBg: myAvatarBg,
    }));

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'game_join',
        nickname: myNickname,
        avatarBg: myAvatarBg,
      });
    }
  };

  const handleStartMatch = () => {
    setIsMatchActive(true);
    if (isConnected) {
      peerService.sendGameEvent({ type: 'game_start' });
    }
  };

  const handleExitActiveMatch = () => {
    setIsMatchActive(false);
    if (isConnected) {
      peerService.sendGameEvent({ type: 'game_exit_match' });
    }
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
    if (callState && callState.isAudioMuted !== mute && onToggleAudio) {
      onToggleAudio();
    }
  };

  return (
    <div className="game-arena-container glass-panel">
      {/* Top Header Bar */}
      <div className="game-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onExit} className="btn btn-secondary text-xs" title="Leave Game Arena & Return Home">
            <ArrowLeft size={14} />
            <span>Home</span>
          </button>

          {gameRoomId && (
            <div className="game-room-pill" title="Unified Game Room Code">
              <Radio size={13} className={isConnected ? "text-emerald-400 animate-pulse" : isConnecting ? "text-cyan-400 animate-spin" : "text-amber-400"} />
              <span className="game-room-code font-mono">#{gameRoomId}</span>
              <span className={`status-dot ${status}`} />
              <button onClick={handleCopyLink} className="btn btn-icon btn-xs" title="Copy Invite Link">
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* Action Controls: Game Selector Drawer & Voice Deck */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GameVoiceDock 
            status={status}
            isVoiceConnected={isVoiceConnected}
            isAudioMuted={callState?.isAudioMuted || false}
            onConnectVoice={() => onStartCall && onStartCall(false)}
            onDisconnectVoice={onEndCall}
            onToggleMute={onToggleAudio}
            onSetMute={handleSetMute}
            remotePeerNickname={remotePeerNickname}
          />

          <button 
            onClick={() => setIsDrawerOpen(true)} 
            className="btn btn-primary btn-xs game-drawer-btn"
            title="Open P2P Game Library"
          >
            <Gamepad2 size={14} />
            <span>Games</span>
          </button>
        </div>
      </div>

      {/* Opponent Status Banner when waiting */}
      {!isConnected && (
        <div className="game-waiting-banner">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={14} color="var(--accent-purple, #a855f7)" />
            {isConnecting ? 'Traversing WebRTC NAT channels...' : 'Waiting for opponent. Share match link to duel live!'}
          </span>
          <button onClick={handleCopyLink} className="btn btn-primary text-xs" style={{ height: '26px', padding: '0 10px' }}>
            <Copy size={12} />
            <span>Copy Match Link</span>
          </button>
        </div>
      )}

      {/* Main Workspace: Active Match vs Game Lobby Chat */}
      <div className="game-stage-wrapper">
        {isMatchActive ? (
          activeGame === 'pong' ? (
            <CyberPongGame 
              status={status}
              isHost={isHost}
              myNickname={myNickname}
              remotePeerNickname={remotePeerNickname}
              onExitMatch={handleExitActiveMatch}
            />
          ) : activeGame === 'grid' ? (
            <CyberGridGame 
              status={status} 
              remotePeerNickname={remotePeerNickname} 
              showToast={showToast}
              onExitMatch={handleExitActiveMatch}
            />
          ) : (
            <CyberConnectFour
              status={status}
              remotePeerNickname={remotePeerNickname}
              onExitMatch={handleExitActiveMatch}
            />
          )
        ) : (
          <GameLobbyChat 
            status={status}
            myNickname={myNickname}
            myAvatarBg={myAvatarBg}
            remotePeerNickname={remotePeerNickname}
            remoteAvatarBg={remoteAvatarBg}
            activeChallenge={activeChallenge}
            onJoinChallenge={handleJoinChallenge}
            onStartMatch={handleStartMatch}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            isHost={isHost}
          />
        )}
      </div>

      {/* Mobile & Desktop Slide-out Game Drawer */}
      <GameDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectGame={handleSelectGame}
        activeGame={activeGame}
      />
    </div>
  );
}
