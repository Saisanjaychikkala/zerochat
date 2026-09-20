import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Lock, 
  Share2, 
  Radio, 
  RotateCcw,
  AlertCircle,
  PhoneOff,
  Sparkles
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
  onStartNewRoom,
  sessionEnded,
  sessionEndReason,
  roomId
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping, sessionEnded]);

  const handleTextChange = (e) => {
    setInputText(e.target.value);

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1400);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim());
    setInputText('');
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConnected = status === 'connected' && !sessionEnded;

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
                {remotePeerNickname || (remotePeerId ? `Peer: ${remotePeerId.substring(0, 10)}...` : 'Waiting for Peer')}
              </span>
              <span className="e2ee-tag">
                <Lock size={10} />
                <span>AES-GCM + DTLS</span>
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {isConnected 
                ? 'Encrypted peer memory channel active' 
                : sessionEnded 
                ? 'Session terminated' 
                : 'Share room link or QR code to connect'}
            </p>
          </div>
        </div>

        {!isConnected && !sessionEnded && (
          <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
            <Share2 size={13} />
            <span>Invite Peer</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Feed */}
      <div className="messages-list">
        {/* Waiting State if not connected and no messages */}
        {status !== 'connected' && !sessionEnded && messages.length === 0 && (
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
                Room Ready for Connection
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Share your invite link with your contact. Once they open it, you are instantly connected memory-to-memory.
              </p>
            </div>

            <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ padding: '10px 22px' }}>
              <Share2 size={16} />
              <span>Share Invite Link & QR</span>
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

        {/* Session Ended Banner */}
        {sessionEnded && (
          <div className="session-ended-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700 }}>
              <AlertCircle size={18} />
              <span>Chat has ended</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
              {sessionEndReason || 'The remote peer disconnected or ended the session.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={onStartNewRoom} className="btn btn-primary text-xs" style={{ padding: '8px 16px' }}>
                <RotateCcw size={14} />
                <span>Start New Chat</span>
              </button>
              <button onClick={onOpenRoomModal} className="btn btn-secondary text-xs" style={{ padding: '8px 16px' }}>
                <Share2 size={14} />
                <span>Re-Invite to Room</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && isConnected && (
        <div className="quick-emoji-bar">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '6px' }}>Quick Reaction:</span>
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
              ? "Type an encrypted message..." 
              : sessionEnded 
              ? "Chat has ended. Start a new chat to continue." 
              : "Waiting for peer to connect..."
          } 
          value={inputText}
          onChange={handleTextChange}
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
