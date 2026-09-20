import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Lock, 
  Copy, 
  RefreshCw, 
  ArrowRight,
  Mic,
  X,
  CopyCheck,
  HardDriveUpload
} from 'lucide-react';
import { voiceRecorder } from '../utils/voiceRecorder';
import AudioPlayerBubble from './AudioPlayerBubble';

const QUICK_EMOJIS = ['👍', '🔥', '🚀', '❤️', '⚡', '🎉', '👀'];

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  onSendFile,
  status, 
  remotePeerId, 
  remotePeerNickname,
  myNickname,
  isPeerTyping, 
  peerTypingNickname,
  onTyping,
  onOpenRoomModal,
  onOpenLightbox,
  roomId
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isDragOverChat, setIsDragOverChat] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordIntervalRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPeerTyping, status, isRecording]);

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

  // Clipboard Paste (Screenshots & Images directly from clipboard)
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file && onSendFile) {
        e.preventDefault();
        onSendFile(file);
      }
    }
  };

  // Drag-and-Drop over chat area
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

  // Voice Note Handlers
  const startRecording = async () => {
    try {
      await voiceRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('[ZeroChat] Mic permission error:', err);
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopAndSendRecording = async () => {
    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    try {
      const { file, durationSec, url } = await voiceRecorder.stop();
      if (onSendFile) {
        // Tag as voice note
        file.isVoiceNote = true;
        file.durationSec = durationSec;
        onSendFile(file);
      }
    } catch (err) {
      console.error('[ZeroChat] Recording error:', err);
    }
  };

  const cancelRecording = () => {
    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    voiceRecorder.cancel();
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

  const copyCodeToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConnected = status === 'connected';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#${roomId}` : '';

  // Render text with code blocks or formatted links
  const renderMessageContent = (msg) => {
    // If it's a voice note
    if (msg.isVoiceNote && msg.audioUrl) {
      return (
        <AudioPlayerBubble 
          audioUrl={msg.audioUrl} 
          durationSec={msg.durationSec} 
          fileName={msg.fileName} 
        />
      );
    }

    // If it has image URL
    if (msg.imageUrl) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <img 
            src={msg.imageUrl} 
            alt="Preview" 
            className="chat-image-preview" 
            onClick={() => onOpenLightbox(msg.imageUrl, msg.fileName)}
          />
          {msg.text && <span>{msg.text}</span>}
        </div>
      );
    }

    // Check for code blocks ```
    const text = msg.text || '';
    if (text.startsWith('```') && text.endsWith('```')) {
      const codeContent = text.slice(3, -3).trim();
      return (
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span>Code Snippet</span>
            <button 
              onClick={() => copyCodeToClipboard(codeContent, msg.id)}
              className="copy-code-btn"
            >
              {copiedCodeId === msg.id ? <CopyCheck size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copiedCodeId === msg.id ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="code-block-content">
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    return <span>{text}</span>;
  };

  return (
    <section 
      className={`chat-container glass-panel ${isDragOverChat ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay feedback */}
      {isDragOverChat && (
        <div className="chat-drop-overlay">
          <HardDriveUpload size={48} color="var(--accent-cyan)" className="animate-bounce" />
          <p>Drop file here to send to {remotePeerNickname || 'Peer'}</p>
        </div>
      )}

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
                ? 'Encrypted memory channel active' 
                : status === 'connecting'
                ? 'Negotiating peer handshake...'
                : status === 'reconnecting'
                ? 'Reconnecting in background...'
                : 'Scan QR or share link to connect'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isConnected && (
            <button onClick={onOpenRoomModal} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              <span>Join Room</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Reconnecting Alert Bar */}
      {status === 'reconnecting' && (
        <div className="reconnecting-bar">
          <RefreshCw size={14} className="animate-spin" />
          <span>Connection temporarily interrupted. Re-syncing in background... Messages are preserved.</span>
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
              {renderMessageContent(msg)}
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

      {/* Voice Recording Control Bar */}
      {isRecording ? (
        <div className="recording-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="record-dot animate-ping" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f43f5e' }}>
              Recording ({recordSeconds}s)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={cancelRecording} className="btn btn-secondary text-xs">
              <X size={14} />
              <span>Cancel</span>
            </button>
            <button onClick={stopAndSendRecording} className="btn btn-primary text-xs">
              <Send size={14} />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Chat Input Bar */
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
                ? "Type message, paste image (Ctrl+V), or record audio..." 
                : status === 'connecting'
                ? "Connecting to peer..."
                : status === 'reconnecting'
                ? "Reconnecting to peer..."
                : "Scan QR or invite peer to start chatting..."
            } 
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={!isConnected}
            className="chat-input"
          />

          {/* Voice Record Mic Button */}
          <button
            type="button"
            onClick={startRecording}
            disabled={!isConnected}
            className="btn btn-icon mic-btn"
            title="Record Voice Note"
          >
            <Mic size={18} />
          </button>

          <button 
            type="submit" 
            disabled={!isConnected || !inputText.trim()} 
            className="btn btn-primary send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </section>
  );
}
