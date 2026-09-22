import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Mic, X, Paperclip } from 'lucide-react';
import { voiceRecorder } from '../../utils/voiceRecorder';

const QUICK_EMOJIS = ['👍', '🔥', '🚀', '❤️', '⚡', '🎉', '👀'];

export default function ChatInputBar({
  isConnected,
  status,
  roomFullError,
  inputText,
  onTextChange,
  onSend,
  onSendFile
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef(null);
  const attachInputRef = useRef(null);

  const handleAttachChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        if (onSendFile) onSendFile(file);
      });
      e.target.value = '';
    }
  };

  // Hardware Security: Always cancel mic recording on component unmount
  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      voiceRecorder.cancel();
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file && onSendFile) {
        e.preventDefault();
        onSendFile(file);
      }
    }
  };

  const handleAddEmoji = (emoji) => {
    onTextChange({ target: { value: inputText + emoji } });
    setShowEmojiPicker(false);
  };

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
      const { file, durationSec } = await voiceRecorder.stop();
      if (onSendFile) {
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

  return (
    <>
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
        <form onSubmit={onSend} className="chat-input-bar">
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            disabled={!isConnected}
            className="btn btn-icon"
            title="Insert Emoji"
          >
            <Smile size={18} />
          </button>

          {/* Attachment Paperclip Button */}
          <button 
            type="button"
            className="btn btn-icon attachment-btn"
            title="Attach Photo, Video, or File"
            onClick={() => attachInputRef.current?.click()}
            style={{ 
              cursor: 'pointer', 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0
            }}
          >
            <Paperclip size={18} />
          </button>
          <input 
            type="file" 
            ref={attachInputRef}
            onChange={handleAttachChange} 
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              border: 0,
              opacity: 0,
              pointerEvents: 'none'
            }}
            multiple
          />

          <input 
            type="text" 
            placeholder={
              roomFullError && !isConnected
                ? 'Room is full (2/2 peers connected).'
                : isConnected 
                ? 'Type message, paste image, or audio...' 
                : status === 'connecting'
                ? 'Connecting to peer...'
                : status === 'reconnecting'
                ? 'Reconnecting...'
                : 'Connect peer to chat...'
            } 
            value={inputText}
            onChange={onTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={status === 'disconnected' || (roomFullError && !isConnected)}
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
            disabled={status === 'disconnected' || !inputText.trim() || (roomFullError && !isConnected)} 
            className="btn btn-primary send-btn"
            title={!isConnected && (status === 'connecting' || status === 'reconnecting') ? 'Queue message to send once connected' : 'Send message'}
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </>
  );
}
