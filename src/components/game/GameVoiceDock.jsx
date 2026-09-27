import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Radio, Sparkles } from 'lucide-react';

export default function GameVoiceDock({
  status,
  isVoiceConnected,
  isAudioMuted,
  onConnectVoice,
  onDisconnectVoice,
  onToggleMute,
  onSetMute,
  remotePeerNickname,
}) {
  const [isPttPressed, setIsPttPressed] = useState(false);
  const isPeerOnline = status === 'connected';

  // Push to talk event handlers
  const handlePttDown = (e) => {
    e.preventDefault();
    if (!isVoiceConnected) {
      if (onConnectVoice) onConnectVoice();
      return;
    }
    setIsPttPressed(true);
    if (onSetMute) onSetMute(false);
  };

  const handlePttUp = (e) => {
    e.preventDefault();
    if (!isVoiceConnected) return;
    setIsPttPressed(false);
    if (onSetMute) onSetMute(true);
  };

  return (
    <div className="game-voice-dock glass-panel">
      {!isVoiceConnected ? (
        <div className="voice-dock-offline">
          <div className="voice-status-indicator">
            <Radio size={13} color="var(--text-dim)" />
            <span className="voice-status-text">Voice Channel Off</span>
          </div>
          <button
            onClick={onConnectVoice}
            disabled={!isPeerOnline}
            className="btn btn-primary btn-xs voice-connect-btn"
            title="Start live encrypted P2P voice chat with opponent"
          >
            <Mic size={13} />
            <span>Enable Voice</span>
          </button>
        </div>
      ) : (
        <div className="voice-dock-live">
          {/* Status Badge */}
          <div className="voice-live-badge">
            <Radio 
              size={13} 
              className={!isAudioMuted || isPttPressed ? "text-emerald-400 animate-pulse" : "text-amber-400"} 
            />
            <span className="voice-label">
              {!isAudioMuted || isPttPressed ? 'Transmitting' : 'Mic Muted'}
            </span>
          </div>

          {/* Toggle Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`btn btn-icon btn-xs ${isAudioMuted ? 'muted' : 'active-mic'}`}
            title={isAudioMuted ? "Unmute Microphone" : "Temporarily Mute Microphone"}
            style={{
              background: isAudioMuted ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              borderColor: isAudioMuted ? '#f43f5e' : '#10b981',
              color: isAudioMuted ? '#f43f5e' : '#10b981'
            }}
          >
            {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          {/* Push-to-Talk (Hold to Speak) Button */}
          <button
            onMouseDown={handlePttDown}
            onMouseUp={handlePttUp}
            onMouseLeave={handlePttUp}
            onTouchStart={handlePttDown}
            onTouchEnd={handlePttUp}
            className={`btn btn-secondary btn-xs ptt-btn ${isPttPressed ? 'ptt-active' : ''}`}
            title="Hold down to talk (Push-To-Talk)"
            style={{
              touchAction: 'none',
              userSelect: 'none',
              fontWeight: 600,
              fontSize: '0.72rem',
              gap: '4px'
            }}
          >
            <Volume2 size={12} color={isPttPressed ? '#00f2fe' : 'var(--text-muted)'} />
            <span>{isPttPressed ? 'Talking...' : 'Push to Talk'}</span>
          </button>

          {/* Completely Stop Audio Hardware Transfer */}
          <button
            onClick={onDisconnectVoice}
            className="btn btn-icon btn-xs stop-voice-btn"
            title="Completely stop audio and release microphone hardware"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444'
            }}
          >
            <PhoneOff size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
