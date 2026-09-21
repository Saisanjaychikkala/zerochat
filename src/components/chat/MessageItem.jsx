import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  CornerUpLeft, 
  Copy, 
  CopyCheck 
} from 'lucide-react';
import AudioPlayerBubble from '../AudioPlayerBubble';
import ReplyQuoteBox from './ReplyQuoteBox';
import { copyToClipboard } from '../../utils/clipboard';

export default function MessageItem({
  msg,
  myNickname,
  remotePeerNickname,
  onReply,
  onScrollToMessage,
  onOpenLightbox,
  onImageLoaded
}) {
  const [copiedCode, setCopiedCode] = useState(false);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyCode = async (codeText) => {
    const success = await copyToClipboard(codeText);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const renderContent = () => {
    // 1. Voice Note Bubble
    if (msg.isVoiceNote && msg.audioUrl) {
      return (
        <AudioPlayerBubble 
          audioUrl={msg.audioUrl} 
          durationSec={msg.durationSec} 
          fileName={msg.fileName} 
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
      className={`message-row ${msg.sender === 'local' ? 'sent' : 'received'}`}
    >
      <span className="message-sender-name">
        {msg.sender === 'local' ? (myNickname || 'You') : (msg.senderNickname || remotePeerNickname || 'Peer')}
      </span>

      <div className="message-bubble-wrapper">
        <div className="message-bubble">
          {msg.replyTo && (
            <ReplyQuoteBox 
              replyTo={msg.replyTo} 
              onScrollToMessage={onScrollToMessage} 
            />
          )}
          {renderContent()}
        </div>

        {/* Reply Action Button */}
        <button
          type="button"
          onClick={() => onReply(msg)}
          className="message-reply-action-btn"
          title="Reply to message"
        >
          <CornerUpLeft size={13} />
        </button>
      </div>

      <div className="message-meta">
        <span>{formatTime(msg.timestamp)}</span>
        {msg.sender === 'local' && (
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
