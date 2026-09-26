import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import FileTransferArea from './components/FileTransferArea';
import MobileNav from './components/MobileNav';
import HomeScreen from './components/HomeScreen';

// Dynamic code-splitting for non-critical views & heavy modals
const P2PGameArena = lazy(() => import('./components/P2PGameArena'));
const CallModal = lazy(() => import('./components/CallModal'));
const RoomModal = lazy(() => import('./components/RoomModal'));
const NicknameModal = lazy(() => import('./components/NicknameModal'));
const InfoModal = lazy(() => import('./components/InfoModal'));
const ImageLightboxModal = lazy(() => import('./components/ImageLightboxModal'));

import { peerService } from './services/peerService';
import { usePreferences } from './hooks/usePreferences';
import { usePeerSession } from './hooks/usePeerSession';
import { useCallSession } from './hooks/useCallSession';
import { useChatTransfers } from './hooks/useChatTransfers';

export default function App() {
  // Navigation View: 'home' | 'room' | 'game'
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.length > 3) {
      return 'room';
    }
    return 'home';
  });

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Visual layout state (desktop vs mobile tab switcher)
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'files'

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Hook 1: LocalStorage User Preferences, Theme & Sound
  const {
    myNickname,
    myAvatarBg,
    soundEnabled,
    setSoundEnabled,
    theme,
    toggleTheme,
    handleSaveNickname,
  } = usePreferences(showToast);

  // Hook 2: Ephemeral Chat & 16KB File Transfers
  const {
    messages,
    transfers,
    unreadChatCount,
    setUnreadChatCount,
    handleSendMessage,
    handleSendFile,
    handleCancelTransfer,
    resetHistory,
    handleBurnSession,
  } = useChatTransfers({
    soundEnabled,
    mobileTab,
    showToast,
  });

  // Hook 3: PeerJS Session & Direct 1-on-1 Room Guard
  const {
    myRoomId,
    remotePeerId,
    remoteNickname,
    status,
    latency,
    roomFullError,
    isPeerTyping,
    peerTypingNickname,
    handleJoinRoom,
    handleDisconnect,
    handleCreateNewRoom,
    handleTyping,
  } = usePeerSession({
    soundEnabled,
    showToast,
    onNewPeerConnection: resetHistory,
  });

  // Hook 4: WebRTC Voice & Video Media Calling
  const {
    callState,
    handleStartCall,
    handleAnswerCall,
    handleRejectCall,
    handleEndCall,
    handleToggleAudio,
    handleToggleVideo,
    handleToggleScreenShare,
    handleSwitchCamera,
    handleSendNudge,
    stopActiveRingtones,
  } = useCallSession({
    status,
    remoteNickname,
    soundEnabled,
    showToast,
  });

  // Listen for session burn and automatic entry when peer connects
  useEffect(() => {
    const unsubBurned = peerService.on('session_burned', () => {
      handleEndCall();
      stopActiveRingtones();
      setIsRoomModalOpen(false);
      setLightboxImage(null);
      setViewMode('home');
    });
    const unsubPeerConnected = peerService.on('peer_connected', () => {
      // Auto-enter room when remote peer connects
      setViewMode('room');
    });
    return () => {
      unsubBurned();
      unsubPeerConnected();
    };
  }, [handleEndCall, stopActiveRingtones]);

  const handleLaunchRoomFromHome = () => {
    setViewMode('room');
  };

  const handleJoinRoomFromHome = (code) => {
    handleJoinRoom(code);
    setViewMode('room');
  };

  const onBurnSession = () => {
    handleEndCall();
    handleBurnSession(() => {
      stopActiveRingtones();
    });
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
        {/* Dynamic Toast Feedback */}
        {toast && (
          <div className={`toast-notification toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}

      {/* WebRTC Video/Voice Call Modal Overlay */}
      <CallModal
        callState={callState}
        myNickname={myNickname}
        onAnswer={handleAnswerCall}
        onReject={handleRejectCall}
        onEndCall={handleEndCall}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onSwitchCamera={handleSwitchCamera}
      />

      {/* Image Lightbox Preview Modal */}
      {lightboxImage && (
        <ImageLightboxModal 
          isOpen={true}
          imageUrl={lightboxImage.url} 
          fileName={lightboxImage.name}
          onClose={() => setLightboxImage(null)} 
        />
      )}

      {/* App Header (shown on room and game views) */}
      {viewMode !== 'home' && (
        <Header 
          status={status}
          myRoomId={myRoomId}
          myNickname={myNickname}
          myAvatarBg={myAvatarBg}
          latency={latency}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onOpenNicknameModal={() => setIsNicknameModalOpen(true)}
          onOpenInfoModal={() => setIsInfoModalOpen(true)}
          onBurnSession={onBurnSession}
          onDisconnect={onDisconnect}
          onGoHome={() => setViewMode('home')}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLaunchGame={() => setViewMode('game')}
        />
      )}

      {/* Mobile Top Segmented Tab Pill (room view only) */}
      {viewMode === 'room' && (
        <MobileNav 
          activeTab={mobileTab} 
          setActiveTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'chat') setUnreadChatCount(0);
          }}
          onTabChange={(tab) => {
            setMobileTab(tab);
            if (tab === 'chat') setUnreadChatCount(0);
          }}
          transfersCount={transfers.length}
          unreadChatCount={unreadChatCount}
        />
      )}

      {/* Main View Router */}
      {viewMode === 'home' ? (
        <HomeScreen 
          myRoomId={myRoomId}
          status={status}
          latency={latency}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLaunchRoom={handleLaunchRoomFromHome}
          onJoinRoom={handleJoinRoomFromHome}
          onLaunchGame={() => setViewMode('game')}
          onOpenInfoModal={() => setIsInfoModalOpen(true)}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onBurnSession={onBurnSession}
          activePeerNickname={remoteNickname}
        />
      ) : viewMode === 'game' ? (
        <P2PGameArena 
          status={status}
          remotePeerNickname={remoteNickname}
          localStream={callState.localStream}
          remoteStream={callState.remoteStream}
          isAudioMuted={callState.isAudioMuted}
          isVideoMuted={callState.isVideoMuted}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onExit={() => setViewMode('room')}
          showToast={showToast}
        />
      ) : (
        <main className={`main-workspace tab-${mobileTab}`}>
          <ChatArea 
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendFile={handleSendFile}
            status={status}
            remotePeerId={remotePeerId}
            remotePeerNickname={remoteNickname}
            myNickname={myNickname}
            isPeerTyping={isPeerTyping}
            peerTypingNickname={peerTypingNickname}
            onTyping={handleTyping}
            onOpenRoomModal={() => setIsRoomModalOpen(true)}
            onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
            roomId={myRoomId}
            roomFullError={roomFullError}
            onCreateNewRoom={handleCreateNewRoom}
            onOpenInfoModal={() => setIsInfoModalOpen(true)}
            onStartCall={handleStartCall}
            callStatus={callState.status}
            onSendNudge={handleSendNudge}
          />

          <FileTransferArea 
            transfers={transfers}
            onSendFile={handleSendFile}
            onCancelTransfer={handleCancelTransfer}
            onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
            status={status}
            remotePeerNickname={remoteNickname}
            showToast={showToast}
          />
        </main>
      )}

      {/* Room Share & Join Dialog */}
      <RoomModal 
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomId={myRoomId}
        status={status}
        onJoinRoom={handleJoinRoom}
        onOpenGuide={() => setIsInfoModalOpen(true)}
      />

      {/* Nickname & Avatar Dialog */}
      <NicknameModal 
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentNickname={myNickname}
        currentAvatarBg={myAvatarBg}
        onSave={handleSaveNickname}
      />

      {/* Security & 30s Quick Guide Dialog */}
      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        myRoomId={myRoomId}
      />
      </div>
    </Suspense>
  );
}
