import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Gamepad2, 
  Users, 
  Cloud, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Palette, 
  Info,
  QrCode,
  Flame,
  Radio
} from 'lucide-react';

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
  onBurnSession,
  activePeerNickname,
  latency
}) {
  const [inputCode, setInputCode] = useState('');
  const isConnected = status === 'connected';

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (inputCode.trim() && onJoinRoom) {
      onJoinRoom(inputCode.trim());
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
          {/* Active Room Indicator */}
          {myRoomId && (
            <button 
              onClick={onLaunchRoom} 
              className="active-room-pill"
              title="Return to your active chat session"
            >
              <Radio size={14} className={isConnected ? "text-emerald-400 animate-pulse" : "text-cyan-400"} />
              <span>#{myRoomId}</span>
              <span style={{ fontSize: '0.72rem', color: isConnected ? 'var(--accent-emerald)' : 'var(--text-muted)', marginLeft: '4px' }}>
                {isConnected ? `Online (${latency !== null ? `${latency}ms` : '<10ms'})` : status === 'connecting' ? 'Connecting' : 'Ready'}
              </span>
              <span className={`status-dot ${status}`} />
            </button>
          )}

          {/* Theme Switcher Button */}
          <button 
            onClick={onToggleTheme} 
            className="btn btn-icon theme-toggle-btn" 
            title={`Active Theme: ${theme}. Click to switch theme.`}
          >
            <Palette size={16} />
          </button>

          {/* Guide / Info */}
          <button 
            onClick={onOpenInfoModal} 
            className="btn btn-icon" 
            title="Zero-Knowledge Privacy Guide"
          >
            <Info size={16} />
          </button>

          {/* QR Code */}
          <button 
            onClick={onOpenRoomModal} 
            className="btn btn-icon" 
            title="Scan QR Code to Connect"
          >
            <QrCode size={16} />
          </button>

          {/* Burn Session */}
          <button 
            onClick={onBurnSession} 
            className="btn btn-danger text-xs font-semibold"
            title="Wipe volatile RAM memory completely"
          >
            <Flame size={14} />
            <span>Burn</span>
          </button>
        </div>
      </header>

      {/* Hero Welcome */}
      <div className="home-hero-section">
        <h2>Direct Peer-to-Peer Ephemeral Channel</h2>
        <p>Zero databases. Zero cloud storage. Everything exists strictly in browser RAM.</p>
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
            Direct, serverless 1-on-1 communications over WebRTC. Zero databases, zero cloud storage, zero message logs. High-speed encrypted messaging, voice notes, and 16KB AirDrop transfers strictly in volatile RAM.
          </p>
          <div className="card-action-bar">
            <button 
              onClick={onLaunchRoom} 
              className="btn btn-primary w-full"
            >
              <span>{isConnected ? 'Enter Active Room' : 'Launch Chat Room'}</span>
              <ArrowRight size={15} />
            </button>
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
            Play real-time 2-player Cyber Pong, Cyber Grid, and Connect 4 over direct WebRTC DataChannels (&lt;30ms latency) with an integrated live Face-Off PIP window while you duel!
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

        {/* Card 4: Private Group Chat (Locked) */}
        <div className="feature-hub-card glass-panel locked-card">
          <div className="card-top-badge lock-badge">
            <Lock size={12} />
            <span>Roadmap • Under Development</span>
          </div>
          <div className="card-icon-title">
            <div className="card-icon-box dim">
              <Users size={24} />
            </div>
            <div>
              <h3>Private Group Mesh</h3>
              <span className="card-sub-tag">4-Peer Ephemeral Rooms</span>
            </div>
          </div>
          <p className="card-desc">
            Small-circle ephemeral group voice, video, and mesh transfers without servers. Full-mesh WebRTC architecture currently under active development.
          </p>
          <div className="card-action-bar">
            <button disabled className="btn btn-secondary w-full opacity-50 cursor-not-allowed">
              <Lock size={14} />
              <span>Feature Locked</span>
            </button>
          </div>
        </div>

        {/* Card 5: Cloud Vault Chat (Locked) */}
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
            Have a 3-word room code?
          </span>
          <div className="quick-join-input-group">
            <input 
              type="text" 
              placeholder="e.g. cosmic-radar-780" 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="chat-input text-sm font-mono"
            />
            <button type="submit" className="btn btn-primary text-xs font-semibold" disabled={!inputCode.trim()}>
              <span>Join Peer</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
