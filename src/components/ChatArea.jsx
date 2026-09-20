import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Lock, 
  UserCheck, 
  Radio, 
  Share2, 
  Sparkles,
  MessageSquare
} from 'lucide-react';

const QUICK_EMOJIS = ['👍', '🔥', '🚀', '❤️', '⚡', '🎉', '👀'];

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  status, 
  remotePeerId, 
  isPeerTyping, 
  onTyping,
  onOpenRoomModal,
  roomId
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping]);

  const handleTextChange = (e) => {
    setInputText(e.target.value);

    // Typing indicator throttle
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
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

  return (
    <section className="chat-container glass-panel">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="peer-info">
          <div className="peer-avatar">
            {remotePeerId ? remotePeerId.substring(0, 2).toUpperCase() : '??'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {remotePeerId ? `Peer: ${remotePeerId}` : 'Waiting for Peer'}
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--accent-emerald)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Lock size={10} />
                <span>WebRTC E2EE</span>
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {status === 'connected' ? 'Secure direct DataChannel active' : 'Direct link ready. Share with peer to connect.'}
            </p>
          </div>
        </div>

        {status !== 'connected' && (
          <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            <Share2 size={14} />
            <span>Invite Peer</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Feed */}
      <div className="messages-list">
        {status !== 'connected' && messages.length === 0 ? (
          /* Empty Waiting State */
          <div style={{ 
            margin: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center',
            maxWidth: '380px',
            gap: '16px',
            padding: '20px'
          }}>
            <div className="radar-pulse">
              <div className="radar-circle" />
              <div className="radar-circle" />
              <div className="radar-circle" />
              <div style={{ 
                position: 'absolute', 
                inset: '25px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px var(--accent-cyan-glow)'
              }}>
                <Radio size={28} color="#000" />
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
                Your Serverless Room is Live
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Share your invite link or let your peer scan the QR code. Once connected, enjoy unlimited end-to-end encrypted messaging and direct file drops.
              </p>
            </div>

            <button onClick={onOpenRoomModal} className="btn btn-primary" style={{ padding: '10px 20px' }}>
              <Share2 size={16} />
              <span>Share Room Invite</span>
            </button>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender === 'local' ? 'sent' : 'received'}`}>
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
          ))
        )}

        {/* Remote Peer Typing Indicator */}
        {isPeerTyping && (
          <div className="message-row received">
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 14px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Peer typing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div style={{ 
          padding: '8px 18px', 
          display: 'flex', 
          gap: '8px', 
          background: 'rgba(16, 22, 36, 0.95)',
          borderTop: '1px solid var(--border-subtle)',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: '6px' }}>Quick Reaction:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button 
              key={emoji} 
              type="button"
              onClick={() => handleAddEmoji(emoji)} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontSize: '1.2rem', 
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '6px',
                transition: 'transform 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
          className="btn btn-icon"
          title="Insert Emoji"
        >
          <Smile size={18} />
        </button>

        <input 
          type="text" 
          placeholder={status === 'connected' ? "Type an encrypted message..." : "Waiting for peer to connect..."} 
          value={inputText}
          onChange={handleTextChange}
          disabled={status !== 'connected'}
          className="chat-input"
        />

        <button 
          type="submit" 
          disabled={status !== 'connected' || !inputText.trim()} 
          className="btn btn-primary"
          style={{ padding: '10px 18px', borderRadius: 'var(--radius-full)' }}
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
