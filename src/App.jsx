import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import ChatWorkspace from './components/chat/ChatWorkspace';
import MobileNav from './components/MobileNav';
import HomeScreen from './components/HomeScreen';
import AppModals from './components/AppModals';

const P2PGameArena = lazy(() => import('./components/P2PGameArena'));

import { peerService } from './services/peerService';
import { generateGameRoomId, parseRoomHash } from './services/webrtc/constants';
import { usePreferences } from './hooks/usePreferences';
import { usePeerSession } from './hooks/usePeerSession';
import { useCallSession } from './hooks/useCallSession';
import { useChatTransfers } from './hooks/useChatTransfers';

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.length > 3) {
      const parsed = parseRoomHash(window.location.hash);
      if (parsed.isGame) return 'game';
      if (parsed.roomId) return 'room';
    }
    return 'home';
  });

  const [gameMode, setGameMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const parsed = parseRoomHash(window.location.hash);
      if (parsed.isGame) return parsed.gameType || 'pong';
    }
    return 'pong';
  });

  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const [mobileTab, setMobileTab] = useState('chat');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isConfirmGameOpen, setIsConfirmGameOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const preferences = usePreferences(showToast);
  const chatTransfers = useChatTransfers({
    soundEnabled: preferences.soundEnabled,
    mobileTab,
    showToast,
  });

  const peerSession = usePeerSession({
    soundEnabled: preferences.soundEnabled,
    showToast,
    onNewPeerConnection: chatTransfers.resetHistory,
  });

  const callSession = useCallSession({
    status: peerSession.status,
    remoteNickname: peerSession.remoteNickname,
    soundEnabled: preferences.soundEnabled,
    showToast,
  });

  const { myRoomId, status, latency, remoteNickname, handleJoinRoom, handleCreateNewRoom, handleDisconnect } = peerSession;
  const { handleEndCall, stopActiveRingtones } = callSession;

  useEffect(() => {
    const unsubBurned = peerService.on('session_burned', () => {
      handleEndCall();
      stopActiveRingtones();
      setIsRoomModalOpen(false);
      setLightboxImage(null);
      setIsConfirmGameOpen(false);
      setViewMode('home');
    });
    const unsubPeerConnected = peerService.on('peer_connected', () => {
      setViewMode((prev) => (prev === 'home' ? 'room' : prev));
    });

    const onHashNav = () => {
      const parsed = parseRoomHash(window.location.hash);
      if (parsed.isGame) {
        setGameMode(parsed.gameType || 'pong');
        setViewMode('game');
      } else if (parsed.roomId) {
        setViewMode('room');
      } else {
        setViewMode('home');
      }
    };
    window.addEventListener('hashchange', onHashNav);
    window.addEventListener('popstate', onHashNav);

    return () => {
      unsubBurned();
      unsubPeerConnected();
      window.removeEventListener('hashchange', onHashNav);
      window.removeEventListener('popstate', onHashNav);
    };
  }, [handleEndCall, stopActiveRingtones]);

  const handleLaunchRoomFromHome = () => {
    if (!myRoomId) handleCreateNewRoom();
    setViewMode('room');
  };

  const handleJoinRoomFromHome = (code) => {
    const parsed = parseRoomHash(code);
    if (parsed.isGame) {
      setGameMode(parsed.gameType || 'pong');
      handleJoinRoom(parsed.roomId);
      setViewMode('game');
    } else {
      handleJoinRoom(code);
      setViewMode('room');
    }
  };

  const startIsolatedGame = (targetMode = 'pong') => {
    handleEndCall();
    stopActiveRingtones();
    chatTransfers.handleBurnSession(() => stopActiveRingtones());
    const newGameCode = generateGameRoomId(targetMode);
    setGameMode(targetMode);
    handleJoinRoom(newGameCode);
    setViewMode('game');
  };

  const handleRequestLaunchGame = (targetMode = 'pong') => {
    if (viewMode === 'room' && (status === 'connected' || chatTransfers.messages.length > 0)) {
      setIsConfirmGameOpen(true);
    } else {
      startIsolatedGame(targetMode);
    }
  };

  const handleGameTypeChange = (newMode) => {
    setGameMode(newMode);
    if (myRoomId && myRoomId.startsWith('game-')) {
      const parts = myRoomId.split('-');
      if (parts.length >= 3) {
        const newId = `game-${newMode}-${parts.slice(2).join('-')}`;
        window.history.replaceState(null, '', '#' + newId);
      }
    }
  };

  const onBurnSession = () => {
    handleEndCall();
    chatTransfers.handleBurnSession(() => stopActiveRingtones());
    setViewMode('home');
  };

  const onDisconnect = () => {
    handleEndCall();
    handleDisconnect();
    setViewMode('home');
  };

  return (
    <Suspense fallback={null}>
      <div className="app-container">
        {toast && (
          <div className={`toast-notification toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}

        {viewMode !== 'home' && (
          <Header 
            status={status}
            myRoomId={myRoomId}
            myNickname={preferences.myNickname}
            myAvatarBg={preferences.myAvatarBg}
            latency={latency}
            soundEnabled={preferences.soundEnabled}
            onToggleSound={() => preferences.setSoundEnabled(!preferences.soundEnabled)}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onOpenNicknameModal={() => setIsNicknameModalOpen(true)}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onBurnSession={onBurnSession}
            onDisconnect={onDisconnect}
            onGoHome={onDisconnect}
            theme={preferences.theme}
            onToggleTheme={preferences.toggleTheme}
            onLaunchGame={() => handleRequestLaunchGame(gameMode)}
          />
        )}

        {viewMode === 'room' && (
          <MobileNav 
            activeTab={mobileTab} 
            setActiveTab={(tab) => {
              setMobileTab(tab);
              if (tab === 'chat') chatTransfers.setUnreadChatCount(0);
            }}
            onTabChange={(tab) => {
              setMobileTab(tab);
              if (tab === 'chat') chatTransfers.setUnreadChatCount(0);
            }}
            transfersCount={chatTransfers.transfers.length}
            unreadChatCount={chatTransfers.unreadChatCount}
          />
        )}

        {viewMode === 'home' ? (
          <HomeScreen 
            myRoomId={myRoomId}
            status={status}
            latency={latency}
            theme={preferences.theme}
            onToggleTheme={preferences.toggleTheme}
            onLaunchRoom={handleLaunchRoomFromHome}
            onJoinRoom={handleJoinRoomFromHome}
            onLaunchGame={() => startIsolatedGame('pong')}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onBurnSession={onBurnSession}
            activePeerNickname={remoteNickname}
          />
        ) : viewMode === 'game' ? (
          <P2PGameArena 
            status={status}
            remotePeerNickname={remoteNickname}
            gameRoomId={myRoomId}
            initialGameType={gameMode}
            onGameTypeChange={handleGameTypeChange}
            localStream={callSession.callState.localStream}
            remoteStream={callSession.callState.remoteStream}
            isAudioMuted={callSession.callState.isAudioMuted}
            isVideoMuted={callSession.callState.isVideoMuted}
            onToggleAudio={callSession.handleToggleAudio}
            onToggleVideo={callSession.handleToggleVideo}
            onExit={onDisconnect}
            showToast={showToast}
          />
        ) : (
          <ChatWorkspace 
            mobileTab={mobileTab}
            chatTransfers={chatTransfers}
            peerSession={peerSession}
            callSession={callSession}
            myNickname={preferences.myNickname}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
            showToast={showToast}
          />
        )}

        <AppModals 
          callState={callSession.callState}
          callHandlers={callSession}
          isRoomModalOpen={isRoomModalOpen}
          setIsRoomModalOpen={setIsRoomModalOpen}
          isNicknameModalOpen={isNicknameModalOpen}
          setIsNicknameModalOpen={setIsNicknameModalOpen}
          isInfoModalOpen={isInfoModalOpen}
          setIsInfoModalOpen={setIsInfoModalOpen}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          isConfirmGameOpen={isConfirmGameOpen}
          setIsConfirmGameOpen={setIsConfirmGameOpen}
          onConfirmEnterGame={() => {
            setIsConfirmGameOpen(false);
            startIsolatedGame(gameMode);
          }}
          myRoomId={myRoomId}
          status={status}
          myNickname={preferences.myNickname}
          myAvatarBg={preferences.myAvatarBg}
          handleJoinRoom={handleJoinRoom}
          handleSaveNickname={preferences.handleSaveNickname}
        />
      </div>
    </Suspense>
  );
}
