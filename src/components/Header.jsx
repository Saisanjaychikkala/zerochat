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
  PhoneOff, 
  Activity
} from 'lucide-react';

import { copyToClipboard } from '../utils/clipboard';

export default function Header({ 
  status, 
  roomId, 
  remotePeerNickname, 
  myNickname,
  myAvatarBg,
  latency, 
  soundEnabled, 
  setSoundEnabled, 
  onDisconnect,
  onBurnSession,
  onShowRoomModal,
  onShowNicknameModal,
  onShowInfoModal
}) {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="header-bar glass-panel">
      {/* Brand & User Profile */}
      <div className="logo-group">
        <div className="logo-badge">
          <Sparkles size={19} />
        </div>
        <div className="logo-text">
          <h1>ZeroChat</h1>
          <p>Direct P2P DataChannel</p>
        </div>

        {/* User Nickname Button */}
        <button 
          onClick={onShowNicknameModal}
          className="user-nickname-btn"
          title="Change display nickname"
        >
          <div 
            style={{ 
              width: '22px', 
              height: '22px', 
              borderRadius: '50%', 
              background: myAvatarBg || 'linear-gradient(135deg, #00f2fe, #4facfe)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.7rem',
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

      {/* Header Actions */}
      <div className="header-actions">
        {/* Room Invite Button */}
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
              title="Open QR Code & Mobile Invite"
            >
              <QrCode size={16} />
            </button>
          </div>
        )}

        {/* Live Latency / Ping Monitor */}
        <div className="ping-monitor-badge" title="Live WebRTC round-trip latency">
          <Activity size={14} color={status === 'connected' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
          <span className="ping-val">
            {status === 'connected' 
              ? (latency !== null ? `${latency}ms` : '<10ms') 
              : status === 'connecting' 
              ? 'Connecting' 
              : status === 'reconnecting'
              ? 'Reconnecting'
              : 'Standby'}
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

        {/* Info Modal */}
        <button 
          onClick={onShowInfoModal}
          className="btn btn-icon info-btn"
          title="Security & Architecture"
        >
          <Info size={16} />
        </button>

        {/* Disconnect Action */}
        {status === 'connected' && (
          <button 
            onClick={onDisconnect}
            className="btn btn-secondary text-xs text-rose-400 border-rose-500/30"
            title="Disconnect from current peer"
          >
            <PhoneOff size={14} />
            <span className="end-chat-text">Disconnect</span>
          </button>
        )}

        {/* Panic / Burn Button */}
        <button 
          onClick={onBurnSession} 
          className="btn btn-danger text-xs font-semibold"
          title="Immediately wipe all messages, files, and disconnect"
        >
          <Flame size={14} />
          <span className="burn-text">Burn</span>
        </button>
      </div>
    </header>
  );
}
