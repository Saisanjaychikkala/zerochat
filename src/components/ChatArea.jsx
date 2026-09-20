import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Lock, 
  Share2, 
  Radio, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '🔥', '🚀', '❤️', '⚡', '🎉', '👀'];

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  status, 
  remotePeerId, 
  remotePeerNickname,
  myNickname,
  isPeerTyping, 
  peerTypingNickname,
  onTyping,
  onOpenRoomModal,
  roomId
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping, status]);

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

    onSendMessage(inputText.trim());
    setInputText('');
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConnected = status === 'connected';

  return (
    <section className="chat-container glass-panel">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="peer-info">
          <div className="peer-avatar">
            {(remotePeerNickname || remotePeerId || '??').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {remotePeerNickname || (remotePeerId ? `Peer (${remotePeerId.substring(0, 8)})` : 'Waiting for Peer')}
              </span>
              <span className="e2ee-tag">
                <Lock size={10} />
                <span>WebRTC E2EE</span>
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {isConnected 
                ? 'Encrypted peer data channel active' 
                : status === 'connecting'
                ? 'Negotiating peer handshake...'
                : status === 'reconnecting'
                ? 'Re-establishing connection...'
                : 'Share room invite to connect'}
            </p>
          </div>
        </div>

        {!isConnected && (
          <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
            <Share2 size={13} />
            <span>Invite Peer</span>
          </button>
        )}
      </div>

      {/* Reconnecting Alert Bar */}
      {status === 'reconnecting' && (
        <div style={{ 
          padding: '8px 16px', 
          background: 'rgba(245, 158, 11, 0.12)', 
          borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: '#fde68a'
        }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Connection temporarily interrupted. Re-connecting in background... Messages are preserved.</span>
        </div>
      )}

      {/* Messages Scroll Feed */}
      <div className="messages-list">
        {/* Empty State when no messages and not connected */}
        {messages.length === 0 && !isConnected && (
          <div className="waiting-hero-card">
            <div className="radar-pulse">
              <div className="radar-circle" />
              <div className="radar-circle" />
              <div className="radar-circle" />
              <div className="radar-center-icon">
                <Radio size={28} color="#000" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
                {status === 'connecting' ? 'Connecting to Room...' : 'Your Secure Room is Ready'}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {status === 'connecting'
                  ? 'Establishing end-to-end encrypted WebRTC channel...'
                  : 'Scan the QR code or send your room link to your laptop or phone to start chatting and sending files.'}
              </p>
            </div>

            <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ padding: '10px 22px' }}>
              <Share2 size={16} />
              <span>Invite Laptop or Phone</span>
            </button>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender === 'local' ? 'sent' : 'received'}`}>
            <span className="message-sender-name">
              {msg.sender === 'local' ? (myNickname || 'You') : (msg.senderNickname || remotePeerNickname || 'Peer')}
            </span>
            <div className="message-bubble">
              {msg.text}
            </div>
            <div className="message-meta">
              <span>{formatTime(msg.timestamp)}</span>
              {msg.sender === 'local' && (
                <span>
                  {msg.delivered ? (
                    <CheckCheck size={14} color="var(--accent-cyan)" />
                  ) : (
                    <Check size={14} />
                  )}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Peer Typing Indicator */}
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

      {/* Quick Emoji Bar */}
      {showEmojiPicker && isConnected && (
        <div className="quick-emoji-bar">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '6px' }}>Reaction:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button 
              key={emoji} 
              type="button"
              onClick={() => handleAddEmoji(emoji)} 
              className="emoji-btn"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
          disabled={!isConnected}
          className="btn btn-icon"
          title="Insert Emoji"
        >
          <Smile size={18} />
        </button>

        <input 
          type="text" 
          placeholder={
            isConnected 
              ? "Type an encrypted message (Press Enter to send)..." 
              : status === 'connecting'
              ? "Connecting to peer..."
              : status === 'reconnecting'
              ? "Reconnecting to peer..."
              : "Waiting for peer to connect..."
          } 
          value={inputText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
          className="chat-input"
        />

        <button 
          type="submit" 
          disabled={!isConnected || !inputText.trim()} 
          className="btn btn-primary send-btn"
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
