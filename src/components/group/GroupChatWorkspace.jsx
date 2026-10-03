import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Radio, ShieldAlert, X, Check } from 'lucide-react';
import { GroupHeaderBar } from './GroupHeaderBar';
import { MemberDrawer } from './MemberDrawer';
import { SquadQrModal } from './SquadQrModal';
import { SquadStatusOverlays } from './SquadStatusOverlays';
import MessageItem from '../chat/MessageItem';
import ChatInputBar from '../chat/ChatInputBar';
import ReplyPreviewDock from '../chat/ReplyPreviewDock';
import GameDrawer from '../game/GameDrawer';
import ActiveMatchStage from '../game/ActiveMatchStage';
import { extractSnippet, handleScrollToMessage } from '../chat/chatHelpers';
import { GROUP_PACKET_TYPES } from '../../services/webrtc/constants';
import { groupRelayEngine } from '../../services/webrtc/groupRelayEngine';
import { buildGameCardMsg } from './groupGameHelpers';
import { getClientId } from '../../services/identity';

export function GroupChatWorkspace({
  squadRoomId,
  isHost,
  currentHostId,
  designatedSuccessorId,
  status,
  declineReason,
  members,
  pendingKnocks,
  messages,
  latency,
  isLocked,
  isDrawerOpen,
  myPeerId,
  myNickname,
  myAvatarBg,
  onToggleDrawer,
  onCloseDrawer,
  onSendMessage,
  onSendVoice,
  onSendReaction,
  onOfferFile,
  onRequestDownload,
  onCancelTransfer,
  onAdmitKnocker,
  onDeclineKnocker,
  onPassBaton,
  onSetSuccessor,
  onToggleLock,
  onLeaveSquad,
  onOpenSettings,
  onKickPeer,
  onResumeSquad,
  showToast
}) {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isGameDrawerOpen, setIsGameDrawerOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeLightbox, setActiveLightbox] = useState(null);
  const [passcodeInput, setPasscodeInput] = useState('');

  const messagesEndRef = useRef(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Transform messages to feed standard MessageItem component
  const formattedMessages = useMemo(() => {
    return messages.map((msg) => {
      const isMe = (myPeerId && msg.authorId === myPeerId) || msg.sender === 'local';
      const isVoice = msg.type === GROUP_PACKET_TYPES.VOICE || msg.type === 'voice' || msg.isVoiceNote || !!(msg.audio || msg.audioUrl);
      return {
        ...msg,
        id: msg.id || `msg-${msg.timestamp || Date.now()}`,
        sender: isMe ? 'local' : 'remote',
        senderNickname: msg.author || msg.senderNickname || (isMe ? (myNickname || 'You') : 'Peer'),
        isVoiceNote: isVoice,
        audioUrl: msg.audio || msg.audioUrl || (msg.status === 'ready' ? msg.downloadUrl : null),
        durationSec: msg.duration || msg.durationSec || 0,
        waveform: msg.waveform,
        fileId: msg.fileId,
        previewData: msg.previewData,
        status: msg.status || (msg.audio || msg.audioUrl || msg.downloadUrl ? 'ready' : 'idle'),
        progress: msg.progress !== undefined ? msg.progress : (msg.status === 'ready' || msg.audioUrl || msg.downloadUrl ? 100 : 0),
        errorReason: msg.errorReason,
        delivered: true,
        timestamp: msg.timestamp || Date.now()
      };
    });
  }, [messages, myPeerId, myNickname]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const replyPayload = replyingTo ? {
      id: replyingTo.id,
      senderNickname: replyingTo.sender === 'local' ? (myNickname || 'You') : (replyingTo.senderNickname || 'Peer'),
      snippet: extractSnippet(replyingTo),
      type: replyingTo.isVoiceNote ? 'voice' : replyingTo.imageUrl ? 'image' : replyingTo.type === 'game_card' ? 'game' : 'text'
    } : null;
    onSendMessage(inputText.trim(), replyPayload);
    setInputText('');
    setReplyingTo(null);
  };

  const handleSendFile = (file) => {
    if (onOfferFile) {
      onOfferFile(file);
      return;
    }
    const reader = new FileReader();
    if (file.isVoiceNote) {
      reader.onload = () => onSendVoice(reader.result, file.durationSec || 0);
    } else if (file.type?.startsWith('image/')) {
      reader.onload = () => onSendMessage('', null, { imageUrl: reader.result, fileName: file.name, type: 'image' });
    }
    reader.readAsDataURL(file);
  };

  const handleSelectGame = (gameId) => {
    setIsGameDrawerOpen(false);
    const gameCardMsg = buildGameCardMsg(gameId, myNickname, myPeerId, getClientId());
    onSendMessage(`Challenged squad to ${gameCardMsg.gameName}!`, null, gameCardMsg);
  };

  const handleLaunchCard = (cardId, opts = {}) => {
    const card = formattedMessages.find(m => m.cardId === cardId);
    if (!card) return;
    if (onCloseDrawer) onCloseDrawer();
    setActiveMatch({
      cardId: card.cardId,
      gameId: card.gameId,
      gameName: card.gameName,
      isPlaying: true,
      isVisible: true,
      isSpectator: !!opts.isSpectator,
      player1: card.hostNickname,
      player2: card.guestNickname
    });
  };

  const handleJoinCard = (cardId) => {
    groupRelayEngine.sendGameAction({
      action: 'join',
      cardId,
      playerNickname: myNickname,
      avatarBg: myAvatarBg,
      playerPeerId: myPeerId,
      playerClientId: getClientId()
    });
  };

  const handlePasscodeSubmit = () => {
    const code = passcodeInput.trim();
    if (!code) return;
    groupRelayEngine.reconnectWithPasscode(code);
    setPasscodeInput('');
  };

  return (
    <div className="squad-layout-container">
      <div className="squad-main-feed">
        <GroupHeaderBar
          squadRoomId={squadRoomId}
          memberCount={members.length}
          isHost={isHost}
          isLocked={isLocked}
          latency={latency}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          onToggleDrawer={onToggleDrawer}
          onLeaveSquad={onLeaveSquad}
          onOpenSettings={onOpenSettings}
        />

        {/* Floating Knock Alert Dock for Host */}
        {isHost && pendingKnocks?.length > 0 && (
          <div className="squad-knock-alert-dock">
            <div className="squad-knock-alert-info">
              <span className="knock-pulse-dot" />
              <div className="squad-knock-text">
                <span className="squad-knock-title">
                  <strong>{pendingKnocks[0].nickname}</strong> wants to join
                </span>
                {pendingKnocks.length > 1 && (
                  <span className="squad-knock-count">+{pendingKnocks.length - 1} more in queue</span>
                )}
              </div>
            </div>
            <div className="squad-knock-alert-actions">
              <button type="button" onClick={() => onDeclineKnocker(pendingKnocks[0].peerId)} className="btn btn-secondary btn-knock-decline" title="Decline admission">
                <X size={14} /> <span>Decline</span>
              </button>
              <button type="button" onClick={() => onAdmitKnocker(pendingKnocks[0].peerId)} className="btn btn-primary btn-knock-admit" title="Admit into squad">
                <Check size={14} /> <span>Admit</span>
              </button>
            </div>
          </div>
        )}

        {/* Status and Passcode Overlays */}
        {status !== 'connected' ? (
          <SquadStatusOverlays
            status={status}
            isHost={isHost}
            declineReason={declineReason}
            squadRoomId={squadRoomId}
            passcodeInput={passcodeInput}
            setPasscodeInput={setPasscodeInput}
            handlePasscodeSubmit={handlePasscodeSubmit}
            onLeaveSquad={onLeaveSquad}
            onResumeSquad={onResumeSquad}
          />
        ) : (
          <>
            {/* Unified Messages Feed using common MessageItem */}
            <div className="messages-list squad-stream-scroll">
              {formattedMessages.length === 0 && (
                <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '360px', padding: '24px 0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <Radio size={22} color="var(--accent-cyan)" />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Welcome to the Squad!</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Zero servers, zero database. Messages and voice notes are relayed peer-to-peer using the Baton Pass Star Topology.
                  </p>
                </div>
              )}

              {formattedMessages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  myNickname={myNickname}
                  myPeerId={myPeerId}
                  myClientId={getClientId()}
                  remotePeerNickname="Squad Member"
                  hostPeerId={currentHostId}
                  coHostPeerId={designatedSuccessorId}
                  onReply={setReplyingTo}
                  onReact={onSendReaction}
                  onRequestDownload={onRequestDownload}
                  onCancelTransfer={onCancelTransfer}
                  onScrollToMessage={handleScrollToMessage}
                  onOpenLightbox={(url, name) => setActiveLightbox({ url, name })}
                  onImageLoaded={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  onJoinCard={handleJoinCard}
                  onLaunchCard={handleLaunchCard}
                  onResumeCard={handleLaunchCard}
                  onExitCard={() => setActiveMatch(null)}
                  onRematch={(gameId) => handleSelectGame(gameId)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview Dock */}
            {replyingTo && (
              <ReplyPreviewDock
                replyingTo={replyingTo}
                myNickname={myNickname}
                remotePeerNickname="Squad Member"
                snippet={extractSnippet(replyingTo)}
                onCancelReply={() => setReplyingTo(null)}
              />
            )}

            {/* Common ChatInputBar */}
            <ChatInputBar
              isConnected={isConnected}
              status={status}
              roomFullError={null}
              inputText={inputText}
              onTextChange={(e) => setInputText(e.target.value)}
              onSend={handleSend}
              onSendFile={handleSendFile}
              onOpenGameDrawer={() => setIsGameDrawerOpen(true)}
            />
          </>
        )}
      </div>

      {/* Member Drawer */}
      <MemberDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        isHost={isHost}
        myPeerId={myPeerId}
        currentHostId={currentHostId}
        designatedSuccessorId={designatedSuccessorId}
        members={members}
        pendingKnocks={pendingKnocks}
        isLocked={isLocked}
        squadRoomId={squadRoomId}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onAdmitKnocker={onAdmitKnocker}
        onDeclineKnocker={onDeclineKnocker}
        onPassBaton={onPassBaton}
        onSetSuccessor={onSetSuccessor}
        onToggleLock={onToggleLock}
        onKickPeer={onKickPeer}
      />

      {/* Shareable QR Modal */}
      <SquadQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        squadRoomId={squadRoomId}
      />

      {/* Game Drawer */}
      <GameDrawer
        isOpen={isGameDrawerOpen}
        onClose={() => setIsGameDrawerOpen(false)}
        onSelectGame={handleSelectGame}
      />

      {/* Active Game Match Stage Overlay */}
      {activeMatch && (
        <div className="in-chat-active-match-overlay" style={{ display: activeMatch.isVisible ? 'flex' : 'none' }}>
          <ActiveMatchStage
            key={activeMatch.cardId}
            cardId={activeMatch.cardId}
            activeGame={activeMatch.gameId}
            initialState={null}
            status={status}
            isHost={activeMatch.isSpectator ? false : (activeMatch.player1 === myNickname)}
            isSpectator={activeMatch.isSpectator}
            player1={activeMatch.player1}
            player2={activeMatch.player2}
            myNickname={myNickname}
            remotePeerNickname={activeMatch.player1 === myNickname ? (activeMatch.player2 || 'Player 2') : (activeMatch.player1 || 'Player 1')}
            showToast={showToast || (() => {})}
            onExitMatch={() => setActiveMatch(null)}
            onReturnToChat={() => setActiveMatch(null)}
            onEndRound={() => {}}
            onUpdateCardState={() => {}}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div className="lightbox-overlay" onClick={() => setActiveLightbox(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={activeLightbox.url} alt={activeLightbox.name || 'Enlarged preview'} />
            <button type="button" className="btn btn-icon lightbox-close" onClick={() => setActiveLightbox(null)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
