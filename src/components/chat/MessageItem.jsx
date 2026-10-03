import React, { useState, useRef } from 'react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  CornerUpLeft, 
  Copy, 
  CopyCheck,
  Smile,
  Crown,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import AudioPlayerBubble from '../AudioPlayerBubble';
import ReplyQuoteBox from './ReplyQuoteBox';
import InChatGameCard from '../game/InChatGameCard';
import FilePreviewCard from './FilePreviewCard';
import { copyToClipboard } from '../../utils/clipboard';
import { getClientId } from '../../services/identity';

const QUICK_EMOJIS = ['❤️', '🔥', '👍', '😂', '🎉', '👏'];

export default function MessageItem({
  msg,
  myNickname = 'You',
  myPeerId,
  myClientId,
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
  const [showMobileActions, setShowMobileActions] = useState(false);
  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  // System notification row
  if (msg.type === 'system') {
    return (
      <div className="message-system-row">
        <span className="message-system-badge">{msg.text}</span>
      </div>
    );
  }

  // Discard empty or unrenderable phantom messages
  const hasText = !!(msg.text && typeof msg.text === 'string' && msg.text.trim());
  const isGameCard = msg.type === 'game_card' || !!msg.cardId;
  const isMediaCard = msg.type === 'file_card' || !!msg.fileId || !!msg.imageUrl || !!msg.downloadUrl || !!msg.isVoiceNote || msg.type === 'voice' || !!msg.audioUrl;

  if (!hasText && !isGameCard && !isMediaCard) {
    return null;
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
    setShowMobileActions(false);
  };

  const handleReplyClick = () => {
    if (onReply) {
      onReply(msg);
      setShowMobileActions(false);
    }
  };

  const handleBubbleClick = (e) => {
    if (e.target.closest('button, a, input, select, textarea, .wa-media-card, .telegram-doc-card, .in-chat-game-card, .copy-code-btn, .audio-bubble-container')) {
      return;
    }
    setShowMobileActions(prev => !prev);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button, a, input, select, textarea, .wa-media-card, .telegram-doc-card, .in-chat-game-card, .copy-code-btn, .audio-bubble-container')) {
      return;
    }
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchTimerRef.current = setTimeout(() => {
      setShowMobileActions(true);
      setShowReactMenu(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(25); } catch (_) {}
      }
    }, 380);
  };

  const handleTouchMove = (e) => {
    if (!touchTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
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
          myPeerId={myPeerId}
          myClientId={myClientId || getClientId()}
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
      className={`message-row ${isGameCard ? 'game-row' : (isLocal ? 'sent' : 'received')} ${isMediaCard ? 'media-row' : ''}`}
    >
      {!isGameCard && (
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
      )}

      <div className={`message-bubble-wrapper ${showMobileActions ? 'mobile-active' : ''}`}>
        <div 
          className={`message-bubble ${isGameCard ? 'game-card-bubble' : isMediaCard ? 'media-card-bubble' : ''}`}
          onClick={handleBubbleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {msg.replyTo && (
            <ReplyQuoteBox 
              replyTo={msg.replyTo} 
              onScrollToMessage={onScrollToMessage} 
            />
          )}
          {renderContent()}
        </div>

        {/* Subtle touch trigger button for mobile phones */}
        <button
          type="button"
          className="mobile-bubble-action-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setShowMobileActions((prev) => !prev);
          }}
          title="Message options"
          aria-label="Message options"
        >
          <MoreHorizontal size={13} />
        </button>

        {/* Invisible Backdrop to dismiss mobile actions on touch outside */}
        {showMobileActions && (
          <div
            className="mobile-actions-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileActions(false);
              setShowReactMenu(false);
            }}
          />
        )}

        {/* Floating Cyber Action Bar (Hover on Desktop / Tap on Phone) */}
        <div 
          className="message-action-dock"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Reaction Trigger */}
          <div className="reaction-trigger-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowReactMenu(prev => !prev);
              }}
              className="message-action-btn"
              title="Add Reaction"
            >
              <Smile size={13} />
            </button>

            {showReactMenu && (
              <div 
                className="reaction-picker-flyout"
                onClick={(e) => e.stopPropagation()}
              >
                {QUICK_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={(evt) => {
                      evt.stopPropagation();
                      handleToggleReaction(e);
                    }}
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
              onClick={(e) => {
                e.stopPropagation();
                handleReplyClick();
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                handleCopyMessageText();
              }}
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
