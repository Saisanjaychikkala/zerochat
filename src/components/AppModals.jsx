import React from 'react';
import CallModal from './CallModal';
import RoomModal from './RoomModal';
import NicknameModal from './NicknameModal';
import InfoModal from './InfoModal';
import ImageLightboxModal from './ImageLightboxModal';
import ConfirmGameModal from './ConfirmGameModal';

export default function AppModals({
  callState,
  callHandlers,
  isRoomModalOpen,
  setIsRoomModalOpen,
  isNicknameModalOpen,
  setIsNicknameModalOpen,
  isInfoModalOpen,
  setIsInfoModalOpen,
  lightboxImage,
  setLightboxImage,
  isConfirmGameOpen,
  setIsConfirmGameOpen,
  onConfirmEnterGame,
  myRoomId,
  status,
  myNickname,
  myAvatarBg,
  handleJoinRoom,
  handleSaveNickname,
}) {
  return (
    <>
      <CallModal
        callState={callState}
        myNickname={myNickname}
        onAnswer={callHandlers.handleAnswerCall}
        onReject={callHandlers.handleRejectCall}
        onEndCall={callHandlers.handleEndCall}
        onToggleAudio={callHandlers.handleToggleAudio}
        onToggleVideo={callHandlers.handleToggleVideo}
        onToggleScreenShare={callHandlers.handleToggleScreenShare}
        onSwitchCamera={callHandlers.handleSwitchCamera}
      />

      {lightboxImage && (
        <ImageLightboxModal 
          isOpen={true}
          imageUrl={lightboxImage.url} 
          fileName={lightboxImage.name}
          onClose={() => setLightboxImage(null)} 
        />
      )}

      <RoomModal 
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomId={myRoomId}
        status={status}
        onJoinRoom={handleJoinRoom}
        onOpenGuide={() => setIsInfoModalOpen(true)}
      />

      <NicknameModal 
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentNickname={myNickname}
        currentAvatarBg={myAvatarBg}
        onSave={handleSaveNickname}
      />

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        myRoomId={myRoomId}
      />

      <ConfirmGameModal 
        isOpen={isConfirmGameOpen}
        onClose={() => setIsConfirmGameOpen(false)}
        onConfirm={onConfirmEnterGame}
        activeRoomId={myRoomId}
      />
    </>
  );
}
