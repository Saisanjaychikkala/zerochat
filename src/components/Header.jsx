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
  Activity,
  Home,
  Palette,
  Gamepad2,
  MoreVertical
} from 'lucide-react';

import { copyToClipboard } from '../utils/clipboard';
import { normalizeRoomId } from '../services/webrtc/constants';
import MobileActionMenu from './MobileActionMenu';

export default function Header({ 
  status, 
  roomId, 
  myRoomId,
  remotePeerNickname, 
  myNickname,
  myAvatarBg,
  latency, 
  soundEnabled, 
  setSoundEnabled, 
  onToggleSound,
  onDisconnect,
  onBurnSession,
  onShowRoomModal,
  onOpenRoomModal,
  onShowNicknameModal,
  onOpenNicknameModal,
  onShowInfoModal,
  onOpenInfoModal,
  onGoHome,
  theme,
  onToggleTheme,
  onLaunchGame
}) {
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeRoomId = normalizeRoomId(roomId || myRoomId);
  const handleRoomModal = onShowRoomModal || onOpenRoomModal;
  const handleNicknameModal = onShowNicknameModal || onOpenNicknameModal;
  const handleInfoModal = onShowInfoModal || onOpenInfoModal;
  const handleSoundToggle = onToggleSound || (() => setSoundEnabled && setSoundEnabled(!soundEnabled));

  const copyRoomLink = async () => {
    if (!activeRoomId) return;
    const url = `${window.location.origin}${window.location.pathname}#${activeRoomId}`;
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
        {onGoHome && (
          <button 
            onClick={onGoHome} 
            className="btn btn-icon" 
            title="Return to Homescreen Hub"
          >
            <Home size={16} />
          </button>
        )}
        <div 
          className="logo-badge cursor-pointer" 
          onClick={onGoHome}
          title="Go to Homescreen Hub"
        >
          <Sparkles size={19} />
        </div>
        <div 
          className="logo-text cursor-pointer" 
          onClick={onGoHome}
          title="Go to Homescreen Hub"
        >
          <h1>ZeroChat</h1>
          <p>Direct P2P DataChannel</p>
        </div>

        {/* User Nickname Button */}
        <button 
          onClick={handleNicknameModal}
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
        {activeRoomId && (
          <div className="room-link-group">
            <button 
              onClick={copyRoomLink} 
              className="btn btn-secondary text-xs desktop-only"
              title="Click to copy invite link"
            >
              <span className="font-mono text-cyan-400">#{activeRoomId}</span>
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>

            <button 
              onClick={handleRoomModal}
              className="btn btn-icon" 
              title="Open QR Code & Mobile Invite"
            >
              <QrCode size={16} />
            </button>
          </div>
        )}

        {/* Live Latency / Ping Monitor (Desktop) */}
        <div className="ping-monitor-badge desktop-only" title="Live WebRTC round-trip latency">
          <Activity size={14} color={status === 'connected' ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
          <span className="ping-val">
            {status === 'connected' 
              ? (latency !== null ? `Online • ${latency}ms` : 'Online • <10ms') 
              : status === 'connecting' 
              ? 'Connecting' 
              : status === 'reconnecting'
              ? 'Reconnecting'
              : 'Offline'}
          </span>
          <span className={`status-dot ${status}`} />
        </div>

        {/* Live Latency / Ping Monitor (Mobile Compact) */}
        <div 
          className="ping-monitor-badge-mobile mobile-only" 
          title={`Status: ${status}${latency !== null ? ` • ${latency}ms` : ''}`}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span className={`status-dot ${status}`} />
          {status === 'connected' && (
            <span className="ping-val-compact">{latency !== null ? `${latency}ms` : '<10ms'}</span>
          )}
        </div>

        {/* P2P Game Arena Action (Desktop) */}
        {onLaunchGame && (
          <button 
            onClick={onLaunchGame} 
            className="btn btn-icon desktop-only"
            title="Open P2P Cyber Game Arena"
          >
            <Gamepad2 size={16} color="var(--accent-purple)" />
          </button>
        )}

        {/* Theme Switcher (Desktop) */}
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme} 
            className="btn btn-icon theme-toggle-btn desktop-only"
            title={`Active Theme: ${theme}. Click to switch theme.`}
          >
            <Palette size={16} />
          </button>
        )}

        {/* Sound Toggle (Desktop) */}
        <button 
          onClick={handleSoundToggle} 
          className="btn btn-icon desktop-only"
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-rose-400" />}
        </button>

        {/* Info Modal (Desktop) */}
        <button 
          onClick={handleInfoModal} 
          className="btn btn-icon info-btn desktop-only"
          title="Security & Architecture"
        >
          <Info size={16} />
        </button>

        {/* Disconnect Action (Desktop) */}
        {status === 'connected' && (
          <button 
            onClick={onDisconnect}
            className="btn btn-secondary text-xs text-rose-400 border-rose-500/30 desktop-only"
            title="Disconnect from current peer"
          >
            <PhoneOff size={14} />
            <span className="end-chat-text">Disconnect</span>
          </button>
        )}

        {/* Clear Chat / Wipe & Leave */}
        <button 
          onClick={onBurnSession} 
          className="btn btn-danger text-xs font-semibold"
          title="Clear conversation: wipe all messages, files, and disconnect"
        >
          <Flame size={14} />
          <span className="burn-text">Clear Chat</span>
        </button>

        {/* Mobile Quick Action Menu Trigger */}
        <button 
          type="button" 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="btn btn-icon mobile-only mobile-menu-trigger" 
          title="Open Quick Actions Menu"
          aria-label="Open Quick Actions Menu"
        >
          <MoreVertical size={17} />
        </button>
      </div>

      {/* Mobile Cyber-Glass Action Drawer */}
      <MobileActionMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeRoomId={activeRoomId}
        status={status}
        latency={latency}
        theme={theme}
        onToggleTheme={onToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleSoundToggle}
        onLaunchGame={onLaunchGame}
        onOpenInfoModal={handleInfoModal}
        onOpenRoomModal={handleRoomModal}
        onDisconnect={onDisconnect}
        onBurnSession={onBurnSession}
        copyRoomLink={copyRoomLink}
        copied={copied}
      />
    </header>
  );
}
