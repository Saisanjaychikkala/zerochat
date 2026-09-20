import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  Flame, 
  Copy, 
  Check, 
  QrCode,
  Sparkles,
  Info
} from 'lucide-react';

export default function Header({ 
  status, 
  roomId, 
  remotePeerId, 
  latency, 
  soundEnabled, 
  setSoundEnabled, 
  onBurnSession,
  onShowRoomModal,
  onShowInfoModal
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
      {/* Brand & Logo */}
      <div className="logo-group">
        <div className="logo-badge">
          <Sparkles size={20} className="animate-spin-slow" />
        </div>
        <div className="logo-text">
          <h1>ZeroChat</h1>
          <p>Direct P2P DataChannel</p>
        </div>
      </div>

      {/* Room and Status Badges */}
      <div className="header-actions">
        {roomId && (
          <div className="flex items-center gap-2">
            <button 
              onClick={copyRoomLink} 
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              title="Click to copy invite link"
            >
              <span className="font-mono text-cyan-400">#{roomId}</span>
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
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

        {/* Connection Status Pill */}
        <div className="status-pill">
          <span className={`status-dot ${status}`} />
          <span className="capitalize">
            {status === 'connected' ? 'P2P Active' : status === 'connecting' ? 'Connecting...' : 'Standby'}
          </span>
          {status === 'connected' && latency !== null && (
            <span className="text-cyan-400 font-mono text-xs pl-1 border-l border-white/10">
              {latency}ms
            </span>
          )}
        </div>

        {/* Sound Toggle */}
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className="btn btn-icon"
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} className="text-rose-400" />}
        </button>

        {/* Privacy / Architecture Info */}
        <button 
          onClick={onShowInfoModal}
          className="btn btn-icon"
          title="How it works (Zero Knowledge Info)"
        >
          <Info size={17} />
        </button>

        {/* Burn Session */}
        <button 
          onClick={onBurnSession} 
          className="btn btn-danger text-xs font-semibold"
          title="Disconnect & wipe all ephemeral data"
        >
          <Flame size={15} />
          <span>Burn</span>
        </button>
      </div>
    </header>
  );
}
