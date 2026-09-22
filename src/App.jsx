import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import FileTransferArea from './components/FileTransferArea';
import RoomModal from './components/RoomModal';
import NicknameModal from './components/NicknameModal';
import InfoModal from './components/InfoModal';
import MobileNav from './components/MobileNav';
import ImageLightboxModal from './components/ImageLightboxModal';
import CallModal from './components/CallModal';

import { usePreferences } from './hooks/usePreferences';
import { usePeerSession } from './hooks/usePeerSession';
import { useCallSession } from './hooks/useCallSession';
import { useChatTransfers } from './hooks/useChatTransfers';

export default function App() {
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

  // Hook 1: LocalStorage User Preferences & Sound
  const {
    myNickname,
    myAvatarBg,
    soundEnabled,
    setSoundEnabled,
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
    stopActiveRingtones,
  } = useCallSession({
    status,
    remoteNickname,
    soundEnabled,
    showToast,
  });

  const onBurnSession = () => {
    handleEndCall();
    handleBurnSession(() => {
      stopActiveRingtones();
    });
  };

  const onDisconnect = () => {
    handleEndCall();
    handleDisconnect();
  };

  return (
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
        onAccept={handleAnswerCall}
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
          imageUrl={lightboxImage.url} 
          fileName={lightboxImage.name} 
          onClose={() => setLightboxImage(null)} 
        />
      )}

      {/* App Header */}
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
      />

      {/* Mobile Top Segmented Tab Pill */}
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
        activeTransfersCount={transfers.length}
        unreadChatCount={unreadChatCount}
        unreadCount={unreadChatCount}
      />

      {/* Main Grid Workspace */}
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
  );
}
