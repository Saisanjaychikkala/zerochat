import React, { useState } from 'react';
import { Mic, MicOff, Volume2, PhoneOff, Radio, PhoneIncoming, PhoneForwarded } from 'lucide-react';

export default function GameVoiceDock({
  status,
  callState,
  isVoiceConnected,
  isAudioMuted,
  onConnectVoice,
  onAnswerVoice,
  onDisconnectVoice,
  onToggleMute,
  onSetMute,
  remotePeerNickname,
}) {
  const [isPttPressed, setIsPttPressed] = useState(false);
  const isPeerOnline = status === 'connected';
  const callStatus = callState?.status || (isVoiceConnected ? 'connected' : 'idle');

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
      {/* State 1: Incoming Voice Request from Opponent */}
      {callStatus === 'incoming' ? (
        <div className="voice-dock-incoming" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
            <PhoneIncoming size={14} className="animate-pulse" />
            <span className="voice-status-text" style={{ color: '#fbbf24', fontWeight: 600 }}>Voice Request</span>
          </div>
          <button
            onClick={onAnswerVoice}
            className="btn btn-primary btn-xs"
            title="Accept Voice Chat"
            style={{ height: '24px', padding: '0 8px', fontSize: '0.72rem', background: '#10b981', borderColor: '#10b981' }}
          >
            Accept
          </button>
          <button
            onClick={onDisconnectVoice}
            className="btn btn-secondary btn-xs"
            title="Decline Voice Chat"
            style={{ height: '24px', padding: '0 6px', fontSize: '0.72rem' }}
          >
            Decline
          </button>
        </div>
      ) : callStatus === 'calling' ? (
        /* State 2: Outgoing Voice Request to Opponent */
        <div className="voice-dock-calling" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PhoneForwarded size={13} className="animate-pulse text-cyan-400" />
          <span className="voice-status-text" style={{ color: 'var(--accent-cyan)' }}>Ringing...</span>
          <button
            onClick={onDisconnectVoice}
            className="btn btn-secondary btn-xs"
            title="Cancel Call"
            style={{ height: '24px', padding: '0 6px', fontSize: '0.72rem' }}
          >
            Cancel
          </button>
        </div>
      ) : !isVoiceConnected ? (
        /* State 3: Voice Channel Idle (Offline) */
        <div className="voice-dock-offline">
          <div className="voice-status-indicator">
            <Radio size={12} color="var(--text-dim)" />
            <span className="voice-status-text">Voice Off</span>
          </div>
          <button
            onClick={onConnectVoice}
            disabled={!isPeerOnline}
            className="btn btn-primary btn-xs voice-connect-btn"
            title={isPeerOnline ? "Start live encrypted voice chat with opponent" : "Wait for opponent to join"}
          >
            <Mic size={13} />
            <span className="voice-btn-label">Voice</span>
          </button>
        </div>
      ) : (
        /* State 4: Voice Connected Live */
        <div className="voice-dock-live">
          {/* Status Badge */}
          <div className="voice-live-badge">
            <Radio 
              size={12} 
              className={!isAudioMuted || isPttPressed ? "text-emerald-400 animate-pulse" : "text-amber-400"} 
            />
            <span className="voice-label">
              {!isAudioMuted || isPttPressed ? 'Live' : 'Muted'}
            </span>
          </div>

          {/* Toggle Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className={`btn btn-icon btn-xs ${isAudioMuted ? 'muted' : 'active-mic'}`}
            title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
            style={{
              background: isAudioMuted ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              borderColor: isAudioMuted ? '#f43f5e' : '#10b981',
              color: isAudioMuted ? '#f43f5e' : '#10b981',
              width: '26px',
              height: '26px'
            }}
          >
            {isAudioMuted ? <MicOff size={13} /> : <Mic size={13} />}
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
              fontSize: '0.7rem',
              height: '26px',
              padding: '0 8px',
              gap: '4px'
            }}
          >
            <Volume2 size={12} color={isPttPressed ? '#00f2fe' : 'var(--text-muted)'} />
            <span>{isPttPressed ? 'Talking' : 'PTT'}</span>
          </button>

          {/* Stop Audio Button */}
          <button
            onClick={onDisconnectVoice}
            className="btn btn-icon btn-xs stop-voice-btn"
            title="End voice chat and release microphone"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              width: '26px',
              height: '26px'
            }}
          >
            <PhoneOff size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
