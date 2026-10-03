import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  CornerUpLeft, 
  Copy, 
  CopyCheck,
  Smile,
  Crown,
  Shield
} from 'lucide-react';
import AudioPlayerBubble from '../AudioPlayerBubble';
import ReplyQuoteBox from './ReplyQuoteBox';
import InChatGameCard from '../game/InChatGameCard';
import FilePreviewCard from './FilePreviewCard';
import { copyToClipboard } from '../../utils/clipboard';

const QUICK_EMOJIS = ['❤️', '🔥', '👍', '😂', '🎉', '👏'];

export default function MessageItem({
  msg,
  myNickname = 'You',
  myPeerId,
  remotePeerNickname = 'Peer',
  hostPeerId,
  coHostPeerId,
  onReply,
  onReact,
  onRequestDownload,
  onCancelTransfer,
  onScrollToMessage,
  onOpenLightbox,
  onImageLoaded,
  onJoinCard,
  onLaunchCard,
  onResumeCard,
  onExitCard,
  onRematch,
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showReactMenu, setShowReactMenu] = useState(false);

  // System notification row
  if (msg.type === 'system') {
    return (
      <div className="message-system-row">
        <span className="message-system-badge">{msg.text}</span>
      </div>
    );
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyCode = async (codeText) => {
    const success = await copyToClipboard(codeText);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyMessageText = async () => {
    const content = msg.text || '';
    if (!content) return;
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1800);
    }
  };

  const handleToggleReaction = (emoji) => {
    if (onReact) {
      onReact(msg.id, emoji);
    }
    setShowReactMenu(false);
  };

  const isLocal = msg.sender === 'local' || (myPeerId && msg.authorId === myPeerId);
  const authorName = isLocal 
    ? (myNickname || 'You') 
    : (msg.author || msg.senderNickname || remotePeerNickname || 'Peer');

  const isAuthorHost = hostPeerId && msg.authorId === hostPeerId;
  const isAuthorCoHost = coHostPeerId && msg.authorId === coHostPeerId;

  const renderContent = () => {
    // 0. Interactive Game Challenge Card
    if (msg.type === 'game_card') {
      return (
        <InChatGameCard 
          card={msg}
          myNickname={myNickname}
          onJoinCard={onJoinCard}
          onLaunchCard={onLaunchCard}
          onResumeCard={onResumeCard}
          onExitCard={onExitCard}
          onRematch={onRematch}
        />
      );
    }

    // 1. Voice Note Bubble (Supports both lazy on-demand & instant playback with 16-pt waveform)
    if (msg.isVoiceNote || msg.type === 'voice') {
      return (
        <AudioPlayerBubble 
          audioUrl={msg.audioUrl || msg.audio || (msg.status === 'ready' ? msg.downloadUrl : null)} 
          durationSec={msg.durationSec || msg.duration || 0} 
          fileName={msg.fileName}
          waveform={msg.waveform}
          fileId={msg.fileId}
          authorId={msg.authorId}
          status={msg.status || (msg.audioUrl || msg.audio ? 'ready' : 'idle')}
          progress={msg.progress || 0}
          errorReason={msg.errorReason}
          onRequestDownload={onRequestDownload}
        />
      );
    }

    // 2. WhatsApp-Style Lazy File & Media Preview Card
    if (msg.type === 'file_card' || msg.fileId || msg.type === 'file') {
      return (
        <FilePreviewCard
          fileInfo={msg}
          onRequestDownload={onRequestDownload}
          onCancel={onCancelTransfer}
          onOpenLightbox={onOpenLightbox}
        />
      );
    }

    // 2. Image Preview
    if (msg.imageUrl) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <img 
            src={msg.imageUrl} 
            alt="Preview" 
            className="chat-image-preview" 
            onClick={() => onOpenLightbox && onOpenLightbox(msg.imageUrl, msg.fileName)}
            onLoad={onImageLoaded}
          />
          {msg.text && <span>{msg.text}</span>}
        </div>
      );
    }

    // 3. Code Block ```
    const text = msg.text || '';
    if (text.startsWith('```') && text.endsWith('```')) {
      const codeContent = text.slice(3, -3).trim();
      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>Code Snippet</span>
            <button 
              type="button"
              onClick={() => handleCopyCode(codeContent)}
              className="copy-code-btn"
            >
              {copiedCode ? <CopyCheck size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="code-block-content">
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    // 4. Default Text
    return <span>{text}</span>;
  };

  return (
    <div 
      id={'msg_' + msg.id}
      className={`message-row ${isLocal ? 'sent' : 'received'}`}
    >
      <div className="message-sender-meta">
        <span className="message-sender-name">{authorName}</span>
        {isAuthorHost && (
          <span className="role-chip host" title="Squad Host">
            <Crown size={10} />
            <span>Host</span>
          </span>
        )}
        {!isAuthorHost && isAuthorCoHost && (
          <span className="role-chip cohost" title="Squad Co-Host">
            <Shield size={10} />
            <span>Co-Host</span>
          </span>
        )}
      </div>

      <div className="message-bubble-wrapper">
        <div className={`message-bubble ${msg.type === 'game_card' ? 'game-card-bubble' : ''}`}>
          {msg.replyTo && (
            <ReplyQuoteBox 
              replyTo={msg.replyTo} 
              onScrollToMessage={onScrollToMessage} 
            />
          )}
          {renderContent()}
        </div>

        {/* Floating Cyber Action Bar (Hover / Tap) */}
        <div className="message-action-dock">
          {/* Reaction Trigger */}
          <div className="reaction-trigger-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowReactMenu(!showReactMenu)}
              className="message-action-btn"
              title="Add Reaction"
            >
              <Smile size={13} />
            </button>

            {showReactMenu && (
              <div className="reaction-picker-flyout">
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleToggleReaction(e)}
                    className="reaction-emoji-btn"
                    title={`React with ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Action */}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(msg)}
              className="message-action-btn"
              title="Reply to message"
            >
              <CornerUpLeft size={13} />
            </button>
          )}

          {/* Copy Action (for text messages) */}
          {msg.text && (
            <button
              type="button"
              onClick={handleCopyMessageText}
              className="message-action-btn"
              title="Copy Text"
            >
              {copiedText ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Reaction Badges Dock */}
      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <div className="message-reactions-row">
          {Object.entries(msg.reactions).map(([emoji, users]) => {
            const hasUserReacted = users.includes(myPeerId) || users.includes('local') || users.includes(myNickname);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact && onReact(msg.id, emoji)}
                className={`reaction-pill ${hasUserReacted ? 'active' : ''}`}
                title={`Reacted by ${users.length} peer${users.length > 1 ? 's' : ''}`}
              >
                <span className="reaction-pill-emoji">{emoji}</span>
                <span className="reaction-pill-count">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="message-meta">
        <span>{formatTime(msg.timestamp)}</span>
        {isLocal && (
          <span title={msg.pending ? 'Queued (sending on reconnect)' : msg.delivered ? 'Delivered' : 'Sent'}>
            {msg.pending ? (
              <Clock size={12} color="#f59e0b" className="animate-pulse" />
            ) : msg.delivered ? (
              <CheckCheck size={14} color="var(--accent-cyan)" />
            ) : (
              <Check size={14} />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
