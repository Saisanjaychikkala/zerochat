import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Gamepad2, Users, Cloud, Lock, Sparkles, ArrowRight, Palette, Info, QrCode, Flame, Radio, Share2, Settings, User } from 'lucide-react';
import { normalizeRoomId } from '../services/webrtc/constants';

export default function HomeScreen({
  myRoomId,
  status,
  theme,
  onToggleTheme,
  onLaunchRoom,
  onJoinRoom,
  onLaunchGame,
  onOpenInfoModal,
  onOpenRoomModal,
  onOpenSquadModal,
  onBurnSession,
  activePeerNickname,
  latency,
  myNickname,
  myAvatarBg,
  onOpenNicknameModal,
  onOpenSettings,
}) {
  const [inputCode, setInputCode] = useState('');
  const [connectingSeconds, setConnectingSeconds] = useState(0);
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Live timer for connection progress feedback
  useEffect(() => {
    let timer;
    if (isConnecting) {
      setConnectingSeconds(1);
      timer = setInterval(() => {
        setConnectingSeconds(s => s + 1);
      }, 1000);
    } else {
      setConnectingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isConnecting]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const clean = normalizeRoomId(inputCode);
    if (clean && onJoinRoom) {
      onJoinRoom(clean);
    }
  };

  const handleNativeShare = async (roomId) => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#${roomId}`
      : `#${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my private ZeroChat room',
          text: '100% private chat — nothing saved on servers. Join directly in your browser!',
          url: shareUrl,
        });
      } catch (_) { /* user cancelled */ }
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="home-hub-container">
      {/* Top Hub Nav */}
      <header className="home-header glass-panel">
        <div className="home-logo-group">
          <div className="logo-badge">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="home-brand-title">ZeroChat Hub</h1>
            <p className="home-brand-sub">Serverless P2P Ephemeral Communications</p>
          </div>
        </div>

        <div className="home-header-actions">
          {/* User Profile Button / Pill */}
          {onOpenNicknameModal && (
            <button 
              type="button"
              onClick={onOpenNicknameModal}
              className="user-profile-pill"
              title="Profile & Nickname Settings"
            >
              <span 
                className="user-avatar-circle"
                style={{ background: myAvatarBg || 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
              >
                {myNickname ? myNickname.charAt(0).toUpperCase() : 'U'}
              </span>
              <span className="user-profile-name">{myNickname || 'Set Name'}</span>
            </button>
          )}

          {/* Settings Modal Button */}
          {onOpenSettings && (
            <button 
              type="button"
              onClick={onOpenSettings} 
              className="btn btn-icon settings-btn" 
              title="Settings (Themes, Surface, Sounds)"
            >
              <Settings size={16} />
            </button>
          )}

          {/* Guide / Info */}
          <button 
            type="button"
            onClick={onOpenInfoModal} 
            className="btn btn-icon" 
            title="Zero-Knowledge Privacy Guide"
          >
            <Info size={16} />
          </button>

          {/* QR Code */}
          <button 
            type="button"
            onClick={onOpenRoomModal} 
            className="btn btn-icon" 
            title="Scan QR Code to Connect"
          >
            <QrCode size={16} />
          </button>

          {/* Clear Chat */}
          <button 
            type="button"
            onClick={onBurnSession} 
            className="btn btn-danger text-xs font-semibold"
            title="Wipe & Leave: clear conversation and leave room"
          >
            <Flame size={14} />
            <span className="burn-text">Clear</span>
          </button>
        </div>

        {/* Active Room Indicator (Desktop inline / Mobile full-width row) */}
        {myRoomId && (
          <div className="home-room-status-bar">
            <button 
              onClick={onLaunchRoom} 
              className="active-room-pill"
              title="Return to your active chat session"
            >
              <Radio size={14} className={isConnected ? "text-emerald-400 animate-pulse" : isConnecting ? "text-cyan-400 animate-spin" : "text-cyan-400"} />
              <span>#{myRoomId}</span>
              <span style={{ fontSize: '0.72rem', color: isConnected ? 'var(--accent-emerald)' : isConnecting ? 'var(--accent-cyan)' : 'var(--text-muted)', marginLeft: '4px' }}>
                {isConnected ? `Online (${latency !== null ? `${latency}ms` : '<10ms'})` : isConnecting ? `Connecting (${connectingSeconds}s)...` : 'Room Ready'}
              </span>
              <span className={`status-dot ${status}`} />
            </button>
          </div>
        )}
      </header>

      {/* Cyber Connecting Live Banner */}
      {isConnecting && (
        <div className="home-connecting-banner glass-panel">
          <div className="home-connecting-banner-top">
            <div className="connecting-radar-wrap">
              <div className="connecting-radar-core">
                <Radio size={16} color="var(--accent-cyan)" className="animate-pulse" />
              </div>
              <div className="connecting-radar-ring" />
              <div className="connecting-radar-ring ring-2" />
            </div>

            <div className="connecting-banner-info">
              <div className="connecting-banner-header">
                <span className="connecting-banner-title">Connecting directly to your friend...</span>
                <span className="connecting-timer-badge">{connectingSeconds}s</span>
              </div>
              <p className="connecting-banner-sub">
                Setting up a private, encrypted channel. No servers in between.
              </p>
              <div className="connecting-banner-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={12} />
                <span>Securing direct device link...</span>
              </div>
            </div>
          </div>

          <div className="connecting-banner-actions">
            <button onClick={onLaunchRoom} className="btn btn-primary text-xs">
              <span>Open Chat</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Welcome */}
      <div className="home-hero-section">
        <h2>100% Private · Nothing Saved on Servers</h2>
        <p>Chat, call, share files, and play games — directly with your friend. Everything disappears when you close the tab.</p>
      </div>

      {/* Feature Cards Grid */}
      <div className="home-cards-grid">
        {/* Card 1: Direct Encrypted Chat */}
        <div className="feature-hub-card glass-panel highlight-cyan">
          <div className="card-top-badge">
            <ShieldCheck size={14} />
            <span>End-to-End Encrypted • In-Memory P2P</span>
          </div>
          <div className="card-icon-title">
            <div className="card-icon-box cyan">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3>Direct Private Chat</h3>
              <span className="card-sub-tag">WebRTC Direct Channel</span>
            </div>
          </div>
          <p className="card-desc">
            1-on-1 private chat, voice calls, and direct file sharing — over an encrypted connection. Nothing is ever saved on a server. Your conversation vanishes completely when you close the tab.
          </p>
          <div className="card-action-bar">
            <button 
              onClick={onLaunchRoom} 
              className="btn btn-primary w-full"
            >
              <span>{isConnected ? 'Return to Chat' : isConnecting ? 'View Connecting...' : 'Start Private Chat'}</span>
              <ArrowRight size={15} />
            </button>
            {myRoomId && !isConnected && (
              <button
                type="button"
                onClick={() => handleNativeShare(myRoomId)}
                className="btn btn-secondary w-full"
                style={{ marginTop: '6px', gap: '6px' }}
              >
                <Share2 size={14} />
                <span>Invite Friend via WhatsApp / SMS</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: P2P Game Arena */}
        <div className="feature-hub-card glass-panel highlight-purple">
          <div className="card-top-badge purple">
            <Gamepad2 size={14} />
            <span>Live WebRTC Gaming • Face-Off</span>
          </div>
          <div className="card-icon-title">
            <div className="card-icon-box purple">
              <Gamepad2 size={24} />
            </div>
            <div>
              <h3>P2P Game Arena</h3>
              <span className="card-sub-tag">Pong • Grid 3x3 • Connect 4</span>
            </div>
          </div>
          <p className="card-desc">
            Challenge your friend to Cyber Pong, Tic-Tac-Toe, or Connect 4 — right inside your private chat room. Games run directly over your encrypted connection with zero lag.
          </p>
          <div className="card-action-bar">
            <button 
              onClick={onLaunchGame} 
              className="btn btn-primary purple-bg w-full"
            >
              <span>Enter Game Arena</span>
              <Gamepad2 size={15} />
            </button>
          </div>
        </div>

        {/* Card 3: Squad Group Chat (Baton Pass) */}
        <div className="feature-hub-card glass-panel highlight-cyan">
          <div className="card-top-badge">
            <Zap size={14} />
            <span>Baton Pass Relay • Star Hub</span>
          </div>
          <div className="card-icon-title">
            <div className="card-icon-box cyan">
              <Users size={24} />
            </div>
            <div>
              <h3>Squad Group Chat</h3>
              <span className="card-sub-tag">Up to 8 Peers • $0 Cost</span>
            </div>
          </div>
          <p className="card-desc">
            Multi-user ephemeral group chat with Baton Pass Relay. Designate Co-Hosts, pass relay authority seamlessly, and zero servers or databases needed.
          </p>
          <div className="card-action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              onClick={() => onOpenSquadModal && onOpenSquadModal('create')} 
              className="btn btn-primary w-full"
            >
              <span>Launch Squad (Host)</span>
              <ArrowRight size={15} />
            </button>
            <button 
              onClick={() => onOpenSquadModal && onOpenSquadModal('join')} 
              className="btn btn-secondary w-full"
            >
              <span>Join Squad with Code (Guest)</span>
            </button>
          </div>
        </div>

        {/* Card 4: Cloud Vault Chat (Locked) */}
        <div className="feature-hub-card glass-panel locked-card">
          <div className="card-top-badge lock-badge">
            <Lock size={12} />
            <span>Discussion Phase • $0 Database</span>
          </div>
          <div className="card-icon-title">
            <div className="card-icon-box dim">
              <Cloud size={24} />
            </div>
            <div>
              <h3>Cloud Vault & Login</h3>
              <span className="card-sub-tag">Local IndexedDB + Auth</span>
            </div>
          </div>
          <p className="card-desc">
            Optional multi-device persistent accounts using client-side encrypted local device storage (IndexedDB) + free Firebase Auth with $0 infrastructure costs.
          </p>
          <div className="card-action-bar">
            <button disabled className="btn btn-secondary w-full opacity-50 cursor-not-allowed">
              <Lock size={14} />
              <span>Feature Locked</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct Room Join Bar */}
      <div className="home-quick-join glass-panel">
        <form onSubmit={handleJoinSubmit} className="quick-join-form">
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Got a room code from a friend?
          </span>
          <div className="quick-join-input-group">
            <input 
              type="text" 
              placeholder="e.g. cosmic-radar-780 or squad-nexus-421" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="chat-input text-sm font-mono"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
            />
            <button type="submit" className="btn btn-primary text-xs font-semibold" disabled={!inputCode.trim()}>
              <span>Join</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
