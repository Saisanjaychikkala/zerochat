import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  QrCode, 
  Volume2, 
  VolumeX, 
  Flame, 
  Info, 
  User, 
  PhoneOff, 
  Users,
  Activity
} from 'lucide-react';

export default function Header({ 
  status, 
  roomId, 
  remotePeerNickname, 
  myNickname,
  myAvatarBg,
  latency, 
  soundEnabled, 
  setSoundEnabled, 
  onEndSession,
  onBurnSession,
  onShowRoomModal,
  onShowNicknameModal,
  onShowSessionsModal,
  onShowInfoModal,
  sessionsCount = 1
}) {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="header-bar glass-panel">
      {/* Brand & Identity */}
      <div className="logo-group">
        <div className="logo-badge">
          <Sparkles size={20} />
        </div>
        <div className="logo-text">
          <h1>ZeroChat</h1>
          <p>E2EE Direct P2P</p>
        </div>

        {/* Current User Nickname Pill */}
        <button 
          onClick={onShowNicknameModal}
          className="user-nickname-btn"
          title="Change your display nickname"
        >
          <div 
            style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: myAvatarBg || 'linear-gradient(135deg, #00f2fe, #4facfe)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {myNickname ? myNickname.substring(0, 1).toUpperCase() : 'U'}
          </div>
          <span className="nickname-label">{myNickname || 'Set Name'}</span>
        </button>
      </div>

      {/* Header Actions & Telemetry */}
      <div className="header-actions">
        {/* Room Code & Invite Quick Copy */}
        {roomId && (
          <div className="room-link-group">
            <button 
              onClick={copyRoomLink} 
              className="btn btn-secondary text-xs"
              title="Click to copy invite link"
            >
              <span className="font-mono text-cyan-400">#{roomId}</span>
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>

            <button 
              onClick={onShowRoomModal}
              className="btn btn-icon" 
              title="Show QR Code & Invite Options"
            >
              <QrCode size={16} />
            </button>
          </div>
        )}

        {/* Multi-Chat Sessions Indicator */}
        <button 
          onClick={onShowSessionsModal}
          className="btn btn-secondary text-xs sessions-indicator-btn"
          title="View active peer conversations"
        >
          <Users size={14} color="var(--accent-purple)" />
          <span className="sessions-text">{sessionsCount} {sessionsCount === 1 ? 'Chat' : 'Chats'}</span>
        </button>

        {/* Prominent Ping Latency Badge (Fixed for laptops & desktops) */}
        <div className="ping-monitor-badge" title="Live WebRTC round-trip latency">
          <Activity size={14} color={status === 'connected' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
          <span className="ping-val">
            {status === 'connected' 
              ? (latency !== null ? `${latency}ms` : '<10ms') 
              : status === 'connecting' ? 'Pinging...' : 'Offline'}
          </span>
          <span className={`status-dot ${status}`} />
        </div>

        {/* Sound Toggle */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className="btn btn-icon"
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-rose-400" />}
        </button>

        {/* Info */}
        <button 
          onClick={onShowInfoModal}
          className="btn btn-icon info-btn"
          title="Architecture & Zero-Knowledge details"
        >
          <Info size={16} />
        </button>

        {/* End Session button (if connected) */}
        {status === 'connected' && (
          <button 
            onClick={onEndSession}
            className="btn btn-secondary text-xs text-rose-400 border-rose-500/30"
            title="Disconnect current peer gracefully"
          >
            <PhoneOff size={14} />
            <span className="end-chat-text">End Chat</span>
          </button>
        )}

        {/* Burn All Panic Button */}
        <button 
          onClick={onBurnSession} 
          className="btn btn-danger text-xs font-semibold"
          title="Immediately sever all connections and wipe all memory"
        >
          <Flame size={14} />
          <span className="burn-text">Burn</span>
        </button>
      </div>
    </header>
  );
}
