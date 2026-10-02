import React from 'react';
import ChatArea from '../ChatArea';
import FileTransferArea from '../FileTransferArea';

export default function ChatWorkspace({
  mobileTab,
  chatTransfers,
  peerSession,
  callSession,
  myNickname,
  myAvatarBg,
  onOpenRoomModal,
  onOpenInfoModal,
  onOpenLightbox,
  showToast,
}) {
  const {
    messages,
    setMessages,
    transfers,
    handleSendMessage,
    handleSendFile,
    handleCancelTransfer,
  } = chatTransfers;

  const {
    myRoomId,
    isHost,
    remotePeerId,
    remoteNickname,
    status,
    latency,
    roomFullError,
    connectionFailed,
    connectionErrorReason,
    isPeerTyping,
    peerTypingNickname,
    handleRetryConnection,
    handleCreateNewRoom,
    handleTyping,
  } = peerSession;

  const {
    callState,
    handleStartCall,
    handleSendNudge,
  } = callSession;

  return (
    <main className={`main-workspace tab-${mobileTab}`}>
      <ChatArea 
        messages={messages}
        setMessages={setMessages}
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
        status={status}
        remotePeerId={remotePeerId}
        remotePeerNickname={remoteNickname}
        myNickname={myNickname}
        myAvatarBg={myAvatarBg}
        isPeerTyping={isPeerTyping}
        peerTypingNickname={peerTypingNickname}
        onTyping={handleTyping}
        onOpenRoomModal={onOpenRoomModal}
        onOpenLightbox={onOpenLightbox}
        roomId={myRoomId}
        isHost={isHost}
        onRetryConnection={handleRetryConnection}
        roomFullError={roomFullError}
        connectionFailed={connectionFailed}
        connectionErrorReason={connectionErrorReason}
        onCreateNewRoom={handleCreateNewRoom}
        onOpenInfoModal={onOpenInfoModal}
        onStartCall={handleStartCall}
        callStatus={callState.status}
        onSendNudge={handleSendNudge}
        latency={latency}
        showToast={showToast}
      />

      <FileTransferArea 
        transfers={transfers}
        onSendFile={handleSendFile}
        onCancelTransfer={handleCancelTransfer}
        onOpenLightbox={onOpenLightbox}
        status={status}
        remotePeerNickname={remoteNickname}
        showToast={showToast}
      />
    </main>
  );
}
