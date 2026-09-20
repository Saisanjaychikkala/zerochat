import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Lock, 
  Copy,
  Radio, 
  RefreshCw,
  Sparkles,
  ArrowRight
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
  const [copied, setCopied] = useState(false);
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

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConnected = status === 'connected';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#${roomId}` : '';

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
                {isConnected 
                  ? remotePeerNickname || `Peer (${remotePeerId?.substring(0, 8)})` 
                  : status === 'connecting'
                  ? 'Connecting...'
                  : 'Ready for Connection'}
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
                ? 'Reconnecting in background...'
                : 'Share room link or scan QR code to connect'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isConnected && (
            <button onClick={onOpenRoomModal} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              <span>Join Other Room</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Reconnecting Alert Bar */}
      {status === 'reconnecting' && (
        <div className="reconnecting-bar">
          <RefreshCw size={14} className="animate-spin" />
          <span>Connection paused. Reconnecting in background... Messages are preserved.</span>
        </div>
      )}

      {/* Messages Scroll Feed */}
      <div className="messages-list">
        {/* Waiting State Hero (Shown when no messages and not connected) */}
        {messages.length === 0 && !isConnected && (
          <div className="waiting-hero-card">
            <div style={{ 
              background: '#ffffff', 
              padding: '12px', 
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              margin: '0 auto'
            }}>
              {roomId && (
                <QRCodeSVG 
                  value={inviteUrl} 
                  size={150} 
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
                {status === 'connecting' ? 'Connecting to Peer...' : 'Scan with Phone to Connect'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Open camera on your phone or share this link to start a private, zero-server chat session.
              </p>
            </div>

            {/* Room Link Quick Copy */}
            <div style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--bg-input)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              gap: '6px'
            }}>
              <input 
                type="text" 
                readOnly 
                value={inviteUrl} 
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }} 
              />
              <button 
                onClick={handleCopyLink} 
                className="btn btn-primary" 
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Message Bubbles */}
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
              : "Scan QR or invite peer to start chatting..."
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
