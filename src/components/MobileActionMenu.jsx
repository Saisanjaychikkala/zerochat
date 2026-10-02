import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Volume2, 
  VolumeX, 
  Flame, 
  Info, 
  PhoneOff, 
  Activity, 
  Palette, 
  Gamepad2,
  Settings
} from 'lucide-react';

export default function MobileActionMenu({
  isOpen,
  onClose,
  activeRoomId,
  status,
  latency,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onLaunchGame,
  onOpenInfoModal,
  onOpenRoomModal,
  onOpenSettings,
  onDisconnect,
  onBurnSession,
  copyRoomLink,
  copied
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isConnected = status === 'connected';

  return createPortal(
    <div className="mobile-menu-backdrop" role="dialog" aria-modal="true" aria-label="Quick Actions">
      <div className="mobile-menu-sheet glass-panel" ref={menuRef}>
        {/* Header */}
        <div className="mobile-menu-header">
          <div className="mobile-menu-title">
            <span className="mobile-menu-dot" />
            <span>Quick Actions</span>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-icon close-menu-btn"
            title="Close Menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Room Info & Live Latency */}
        {activeRoomId && (
          <div className="mobile-menu-card">
            <div className="mobile-menu-row">
              <span className="text-xs text-muted">Room Code:</span>
              <button 
                type="button" 
                onClick={copyRoomLink} 
                className="btn btn-secondary text-xs mobile-copy-pill"
              >
                <span className="font-mono text-cyan-400">#{activeRoomId}</span>
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>

            <div className="mobile-menu-row">
              <span className="text-xs text-muted">WebRTC Status:</span>
              <div className="mobile-status-indicator">
                <Activity size={12} color={isConnected ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
                <span className="text-xs font-mono text-cyan-400">
                  {isConnected 
                    ? `Online • ${latency !== null ? `${latency}ms` : '<10ms'}`
                    : status === 'connecting' ? 'Connecting' : status === 'reconnecting' ? 'Reconnecting' : 'Offline'}
                </span>
                <span className={`status-dot ${status}`} />
              </div>
            </div>
          </div>
        )}

        {/* Action Grid (2x2 Buttons) */}
        <div className="mobile-menu-grid">
          {onToggleTheme && (
            <button 
              type="button" 
              onClick={() => { onToggleTheme(); }} 
              className="mobile-grid-btn"
            >
              <Palette size={18} color="var(--accent-cyan)" />
              <div className="grid-btn-text">
                <span className="grid-label">Theme</span>
                <span className="grid-sub text-capitalize">{theme || 'Cyber'}</span>
              </div>
            </button>
          )}

          {onOpenSettings && (
            <button 
              type="button" 
              onClick={() => { onClose(); onOpenSettings(); }} 
              className="mobile-grid-btn"
            >
              <Settings size={18} color="var(--accent-cyan)" />
              <div className="grid-btn-text">
                <span className="grid-label">Settings</span>
                <span className="grid-sub">Theme & Surface</span>
              </div>
            </button>
          )}

          <button 
            type="button" 
            onClick={() => { onToggleSound(); }} 
            className="mobile-grid-btn"
          >
            {soundEnabled ? <Volume2 size={18} color="var(--accent-cyan)" /> : <VolumeX size={18} color="var(--accent-rose)" />}
            <div className="grid-btn-text">
              <span className="grid-label">Sound FX</span>
              <span className="grid-sub">{soundEnabled ? 'Enabled' : 'Muted'}</span>
            </div>
          </button>

          {onLaunchGame && (
            <button 
              type="button" 
              onClick={() => { onClose(); onLaunchGame(); }} 
              className="mobile-grid-btn"
            >
              <Gamepad2 size={18} color="var(--accent-purple)" />
              <div className="grid-btn-text">
                <span className="grid-label">Game Arena</span>
                <span className="grid-sub">P2P Arcade</span>
              </div>
            </button>
          )}

          {onOpenRoomModal && (
            <button 
              type="button" 
              onClick={() => { onClose(); onOpenRoomModal(); }} 
              className="mobile-grid-btn"
            >
              <QrCode size={18} color="var(--accent-emerald)" />
              <div className="grid-btn-text">
                <span className="grid-label">Invite QR</span>
                <span className="grid-sub">Scan & Share</span>
              </div>
            </button>
          )}

          {onOpenInfoModal && (
            <button 
              type="button" 
              onClick={() => { onClose(); onOpenInfoModal(); }} 
              className="mobile-grid-btn full-width"
            >
              <Info size={18} color="var(--accent-blue)" />
              <div className="grid-btn-text">
                <span className="grid-label">Security & Architecture</span>
                <span className="grid-sub">Zero-Database WebRTC Blueprint</span>
              </div>
            </button>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mobile-menu-footer">
          {isConnected && onDisconnect && (
            <button 
              type="button" 
              onClick={() => { onClose(); onDisconnect(); }} 
              className="btn btn-secondary mobile-footer-btn text-rose-400 border-rose-500/30"
            >
              <PhoneOff size={15} />
              <span>Disconnect Peer</span>
            </button>
          )}

          {onBurnSession && (
            <button 
              type="button" 
              onClick={() => { onClose(); onBurnSession(); }} 
              className="btn btn-danger mobile-footer-btn"
            >
              <Flame size={15} />
              <span>Wipe &amp; Leave</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
