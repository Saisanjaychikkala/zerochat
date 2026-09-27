import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, HardDriveUpload, Play } from 'lucide-react';
import ChatHeader from './chat/ChatHeader';
import RoomHeroCard from './chat/RoomHeroCard';
import MessageItem from './chat/MessageItem';
import ReplyPreviewDock from './chat/ReplyPreviewDock';
import ChatInputBar from './chat/ChatInputBar';
import GameDrawer from './game/GameDrawer';
import ActiveMatchStage from './game/ActiveMatchStage';
import { useInChatGames } from '../hooks/useInChatGames';
import { extractSnippet, handleScrollToMessage, shareRoomInvite } from './chat/chatHelpers';
import { copyToClipboard } from '../utils/clipboard';

export default function ChatArea({ 
  messages, 
  setMessages,
  onSendMessage, 
  onSendFile,
  status, 
  remotePeerId, 
  remotePeerNickname,
  myNickname,
  myAvatarBg,
  isPeerTyping, 
  peerTypingNickname,
  onTyping,
  onOpenRoomModal,
  onOpenLightbox,
  roomId,
  isHost,
  onRetryConnection,
  roomFullError,
  onCreateNewRoom,
  onOpenInfoModal,
  onStartCall,
  callStatus,
  onSendNudge,
  latency,
  showToast,
}) {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDragOverChat, setIsDragOverChat] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isConnected = status === 'connected';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#${roomId}` : '';

  // In-Chat Game Engine hook
  const inChatGames = useInChatGames({
    messages,
    setMessages,
    myNickname,
    myAvatarBg,
    remoteNickname: remotePeerNickname,
    isConnected,
    isHost,
    showToast,
  });

  useEffect(() => {
    if (messages.length > 0 || isPeerTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPeerTyping]);

  // Mobile Visual Viewport Auto-Scroll when soft keyboard opens/resizes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportResize = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport.removeEventListener('resize', handleViewportResize);
  }, []);

  // Tap-to-dismiss mobile keyboard when tapping outside inputs or buttons
  const handleDismissKeyboard = (e) => {
    if (e.target.closest('button, a, input, textarea, [data-interactive]')) return;
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  };

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1200);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    let replyPayload = null;
    if (replyingTo) {
      replyPayload = {
        id: replyingTo.id,
        senderNickname: replyingTo.sender === 'local' 
          ? (myNickname || 'You') 
          : (replyingTo.senderNickname || remotePeerNickname || 'Peer'),
        snippet: extractSnippet(replyingTo),
        type: replyingTo.isVoiceNote ? 'voice' : replyingTo.imageUrl ? 'image' : replyingTo.downloadUrl ? 'file' : replyingTo.type === 'game_card' ? 'game' : 'text',
      };
    }

    onSendMessage(inputText.trim(), replyPayload);
    setInputText('');
    setReplyingTo(null);
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleCopyLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!roomId) return;
    const success = await copyToClipboard(roomId);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShare = () => shareRoomInvite(roomId, handleCopyLink);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (status === 'connected') {
      setIsDragOverChat(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOverChat(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOverChat(false);
    if (status === 'connected' && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        onSendFile(file);
      });
    }
  };

  return (
    <section 
      className={`chat-container glass-panel ${isDragOverChat ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {/* Drag overlay feedback */}
      {isDragOverChat && (
        <div className="chat-drop-overlay">
          <HardDriveUpload size={48} color="var(--accent-cyan)" className="animate-bounce" />
          <p>Drop file here to send to {remotePeerNickname || 'Peer'}</p>
        </div>
      )}

      {/* Header Bar */}
      <ChatHeader 
        isConnected={isConnected}
        status={status}
        remotePeerId={remotePeerId}
        remotePeerNickname={remotePeerNickname}
        roomFullError={roomFullError}
        onStartCall={onStartCall}
        callStatus={callStatus}
        onOpenRoomModal={onOpenRoomModal}
        onSendNudge={onSendNudge}
        latency={latency}
      />

      {/* Floating Active Match Pill when game is playing in background */}
      {inChatGames.activeMatch && inChatGames.activeMatch.isPlaying && !inChatGames.activeMatch.isVisible && (
        <div className="active-match-floating-dock glass-panel">
          <div className="dock-info">
            <span className="live-pulse-dot" />
            <span className="dock-title">
              <strong>{inChatGames.activeMatch.gameName}</strong> match in background
            </span>
          </div>
          <button 
            type="button"
            onClick={inChatGames.handleResumeMatch} 
            className="btn btn-primary btn-xs resume-dock-btn"
          >
            <Play size={12} />
            <span>Resume Game</span>
          </button>
        </div>
      )}

      {/* Reconnecting Alert Bar */}
      {status === 'reconnecting' && (
        <div className="reconnecting-bar">
          <RefreshCw size={14} className="animate-spin" />
          <span>Connection temporarily interrupted. Re-syncing in background... Messages are preserved.</span>
        </div>
      )}

      {/* Messages Scroll Feed */}
      <div className="messages-list" onClick={handleDismissKeyboard}>
        {/* Waiting Room Hero Card */}
        {((roomFullError && !isConnected) || (messages.length === 0 && !isConnected)) && (
          <RoomHeroCard 
            roomId={roomId}
            isHost={isHost}
            onRetryConnection={onRetryConnection}
            inviteUrl={inviteUrl}
            status={status}
            isConnected={isConnected}
            roomFullError={roomFullError}
            copied={copied}
            copiedCode={copiedCode}
            onCopyLink={handleCopyLink}
            onCopyCode={handleCopyCode}
            onShare={handleShare}
            onCreateNewRoom={onCreateNewRoom}
            onOpenRoomModal={onOpenRoomModal}
            onOpenInfoModal={onOpenInfoModal}
          />
        )}

        {/* Message Bubbles & Interactive Game Cards */}
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id}
            msg={msg}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            onReply={setReplyingTo}
            onScrollToMessage={handleScrollToMessage}
            onOpenLightbox={onOpenLightbox}
            onImageLoaded={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            onJoinCard={inChatGames.handleJoinCard}
            onLaunchCard={inChatGames.handleLaunchCard}
            onResumeCard={inChatGames.handleResumeMatch}
            onRematch={inChatGames.handleRematch}
          />
        ))}

        {/* Remote Typing Indicator */}
        {isPeerTyping && isConnected && (
          <div className="message-row received">
            <div className="message-bubble typing-bubble">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '6px' }}>
                {peerTypingNickname || remotePeerNickname || 'Peer'} is typing
              </span>
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
              <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Dock */}
      {replyingTo && (
        <ReplyPreviewDock 
          replyingTo={replyingTo}
          myNickname={myNickname}
          remotePeerNickname={remotePeerNickname}
          snippet={extractSnippet(replyingTo)}
          onCancelReply={() => setReplyingTo(null)}
        />
      )}

      {/* Chat Input & Recording Controls Bar */}
      <ChatInputBar 
        isConnected={isConnected}
        status={status}
        roomFullError={roomFullError}
        inputText={inputText}
        onTextChange={handleTextChange}
        onSend={handleSend}
        onSendFile={onSendFile}
        onOpenGameDrawer={() => inChatGames.setIsDrawerOpen(true)}
      />

      {/* Slide-Up Bottom Drawer for Selecting Games */}
      <GameDrawer 
        isOpen={inChatGames.isDrawerOpen}
        onClose={() => inChatGames.setIsDrawerOpen(false)}
        onSelectGame={inChatGames.handleAddGameToChat}
      />

      {/* Active Game Match Stage (Overlaid on Chat with prominent Return to Chat header) */}
      {inChatGames.activeMatch && inChatGames.activeMatch.isVisible && (
        <div className="in-chat-active-match-overlay">
          <ActiveMatchStage 
            activeGame={inChatGames.activeMatch.gameId}
            status={status}
            isHost={isHost}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            showToast={showToast}
            onExitMatch={inChatGames.handleExitMatch}
            onReturnToChat={inChatGames.handleReturnToChat}
            onEndRound={inChatGames.handleEndRound}
          />
        </div>
      )}
    </section>
  );
}
