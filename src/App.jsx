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
import { useGroupSession } from './hooks/useGroupSession';
import { GroupChatWorkspace } from './components/group/GroupChatWorkspace';
import { GroupCreateModal } from './components/group/GroupCreateModal';

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.length > 3) {
      const parsed = parseRoomHash(window.location.hash);
      if (parsed.isSquad) return 'squad';
      if (parsed.isGame) return 'game';
      if (parsed.roomId) return 'room';
    }
    return 'home';
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
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [squadModalTab, setSquadModalTab] = useState('create');
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

  const groupSession = useGroupSession({
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
      setViewMode((prev) => (prev === 'home' && !window.location.hash.includes('squad') ? 'room' : prev));
    });

    const onHashNav = () => {
      const parsed = parseRoomHash(window.location.hash);
      if (parsed.isSquad) {
        setViewMode('squad');
        if (parsed.roomId && parsed.roomId !== groupSession.squadRoomId) {
          groupSession.initSquad(parsed.roomId, false, { nickname: preferences.myNickname, avatarId: 1 });
        }
      } else if (parsed.isGame) {
        setViewMode('game');
        if (parsed.roomId && parsed.roomId !== myRoomId) {
          handleJoinRoom(parsed.roomId);
        }
      } else if (parsed.roomId) {
        setViewMode('room');
        if (parsed.roomId !== myRoomId) {
          handleJoinRoom(parsed.roomId);
        }
      } else {
        setViewMode('home');
      }
    };
    onHashNav();
    window.addEventListener('hashchange', onHashNav);
    window.addEventListener('popstate', onHashNav);

    return () => {
      unsubBurned();
      unsubPeerConnected();
      window.removeEventListener('hashchange', onHashNav);
      window.removeEventListener('popstate', onHashNav);
    };
  }, [handleEndCall, stopActiveRingtones, handleJoinRoom, myRoomId, groupSession.squadRoomId, preferences.myNickname]);

  const handleLaunchRoomFromHome = () => {
    if (!myRoomId) handleCreateNewRoom();
    setViewMode('room');
  };

  const handleJoinRoomFromHome = (code) => {
    const parsed = parseRoomHash(code);
    if (parsed.isSquad) {
      groupSession.initSquad(parsed.roomId, false, { nickname: preferences.myNickname, avatarId: 1 });
      setViewMode('squad');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '#' + parsed.roomId);
      }
    } else if (parsed.isGame) {
      handleJoinRoom(parsed.roomId);
      setViewMode('game');
    } else {
      handleJoinRoom(code);
      setViewMode('room');
    }
  };

  const startIsolatedGame = () => {
    handleEndCall();
    stopActiveRingtones();
    chatTransfers.resetHistory();
    const newGameCode = generateGameRoomId();
    handleJoinRoom(newGameCode, true);
    setViewMode('game');
  };

  const handleRequestLaunchGame = () => {
    if (viewMode === 'room' && (status === 'connected' || chatTransfers.messages.length > 0)) {
      setIsConfirmGameOpen(true);
    } else {
      startIsolatedGame();
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
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <Suspense fallback={null}>
      <div className="app-container">
        {toast && (
          <div className={`toast-notification toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}

        {viewMode === 'room' && (
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
            onLaunchGame={() => handleRequestLaunchGame()}
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

        {viewMode === 'squad' ? (
          <GroupChatWorkspace 
            squadRoomId={groupSession.squadRoomId}
            isHost={groupSession.isHost}
            currentHostId={groupSession.currentHostId}
            designatedSuccessorId={groupSession.designatedSuccessorId}
            status={groupSession.status}
            declineReason={groupSession.declineReason}
            members={groupSession.members}
            pendingKnocks={groupSession.pendingKnocks}
            messages={groupSession.messages}
            latency={groupSession.latency}
            isLocked={groupSession.isLocked}
            isDrawerOpen={groupSession.isDrawerOpen}
            myPeerId={groupSession.myPeerId || (groupSession.isHost ? groupSession.squadRoomId : undefined)}
            myNickname={preferences.displayName}
            onToggleDrawer={groupSession.toggleDrawer}
            onCloseDrawer={() => groupSession.setIsDrawerOpen(false)}
            onSendMessage={groupSession.sendGroupChat}
            onSendVoice={groupSession.sendGroupVoice}
            onSendReaction={groupSession.sendGroupReaction}
            onAdmitKnocker={groupSession.admitKnocker}
            onDeclineKnocker={groupSession.declineKnocker}
            onPassBaton={groupSession.passBaton}
            onSetSuccessor={groupSession.setDesignatedSuccessor}
            onToggleLock={groupSession.toggleLock}
            onLeaveSquad={() => {
              groupSession.leaveSquad();
              setViewMode('home');
            }}
          />
        ) : viewMode === 'home' ? (
          <HomeScreen 
            myRoomId={myRoomId}
            status={status}
            latency={latency}
            theme={preferences.theme}
            onToggleTheme={preferences.toggleTheme}
            onLaunchRoom={handleLaunchRoomFromHome}
            onJoinRoom={handleJoinRoomFromHome}
            onLaunchGame={() => startIsolatedGame()}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onOpenSquadModal={(tab = 'create') => {
              setSquadModalTab(tab);
              setIsSquadModalOpen(true);
            }}
            onBurnSession={onBurnSession}
            activePeerNickname={remoteNickname}
          />
        ) : viewMode === 'game' ? (
          <P2PGameArena 
            status={status}
            isHost={peerSession.isHost}
            myNickname={preferences.myNickname}
            myAvatarBg={preferences.myAvatarBg}
            remotePeerNickname={remoteNickname}
            gameRoomId={myRoomId}
            callState={callSession.callState}
            onStartCall={callSession.handleStartCall}
            onAnswerCall={callSession.handleAnswerCall}
            onRejectCall={callSession.handleRejectCall}
            onEndCall={callSession.handleEndCall}
            onToggleAudio={callSession.handleToggleAudio}
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
            myAvatarBg={preferences.myAvatarBg}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
            showToast={showToast}
          />
        )}

        <AppModals 
          viewMode={viewMode}
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
            startIsolatedGame();
          }}
          myRoomId={myRoomId}
          status={status}
          myNickname={preferences.myNickname}
          myAvatarBg={preferences.myAvatarBg}
          handleJoinRoom={handleJoinRoomFromHome}
          handleSaveNickname={preferences.handleSaveNickname}
        />

        <GroupCreateModal 
          isOpen={isSquadModalOpen}
          initialTab={squadModalTab}
          onClose={() => setIsSquadModalOpen(false)}
          onCreateSquad={(config) => {
            groupSession.initSquad(config.roomId, true, { nickname: preferences.myNickname, avatarId: 1 });
            setViewMode('squad');
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', '#' + config.roomId);
            }
          }}
          onJoinSquad={(code) => handleJoinRoomFromHome(code)}
        />
      </div>
    </Suspense>
  );
}
