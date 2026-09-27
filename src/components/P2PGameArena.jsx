import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Gamepad2,
  CircleDot,
  Disc,
  Copy,
  Check,
  Radio,
  Share2
} from 'lucide-react';
import CyberPongGame from './game/CyberPongGame';
import CyberGridGame from './game/CyberGridGame';
import CyberConnectFour from './game/CyberConnectFour';

export default function P2PGameArena({
  status,
  remotePeerNickname,
  gameRoomId,
  initialGameType = 'pong',
  onGameTypeChange,
  localStream,
  remoteStream,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  onExit,
  showToast,
}) {
  const [selectedGame, setSelectedGame] = useState(initialGameType || 'pong');
  const [copied, setCopied] = useState(false);
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  useEffect(() => {
    if (initialGameType && initialGameType !== selectedGame) {
      setSelectedGame(initialGameType);
    }
  }, [initialGameType]);

  const handleSelectGame = (mode) => {
    setSelectedGame(mode);
    if (onGameTypeChange) {
      onGameTypeChange(mode);
    }
  };

  const handleCopyLink = () => {
    const inviteUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${window.location.pathname}#${gameRoomId}`
      : `#${gameRoomId}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        if (showToast) showToast('Match invite copied! Send to your opponent.', 'success');
        setTimeout(() => setCopied(false), 2400);
      }).catch(() => {
        if (showToast) showToast(`Match Code: ${gameRoomId}`, 'info');
      });
    } else if (showToast) {
      showToast(`Match Code: ${gameRoomId}`, 'info');
    }
  };

  return (
    <div className="game-arena-container glass-panel">
      {/* Top Header Bar */}
      <div className="game-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onExit} className="btn btn-secondary text-xs" title="Leave Game Arena & Return Home">
            <ArrowLeft size={14} />
            <span>Exit Arena</span>
          </button>

          {/* Game Room Badge & Copy Link */}
          {gameRoomId && (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.78rem'
              }}
            >
              <Radio size={13} className={isConnected ? "text-emerald-400 animate-pulse" : isConnecting ? "text-cyan-400 animate-spin" : "text-amber-400"} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                #{gameRoomId}
              </span>
              <span className={`status-dot ${status}`} />
              <button 
                onClick={handleCopyLink} 
                className="btn btn-icon btn-xs" 
                title="Copy Match Invite Link"
                style={{ padding: '2px 6px', height: '22px', marginLeft: '2px' }}
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* Game Mode Selector Pill */}
        <div className="game-mode-toggle">
          <button
            onClick={() => handleSelectGame('pong')}
            className={`game-tab-btn ${selectedGame === 'pong' ? 'active' : ''}`}
          >
            <Gamepad2 size={14} />
            <span>Cyber Pong</span>
          </button>
          <button
            onClick={() => handleSelectGame('grid')}
            className={`game-tab-btn ${selectedGame === 'grid' ? 'active' : ''}`}
          >
            <CircleDot size={14} />
            <span>Grid (3x3)</span>
          </button>
          <button
            onClick={() => handleSelectGame('c4')}
            className={`game-tab-btn ${selectedGame === 'c4' ? 'active' : ''}`}
          >
            <Disc size={14} />
            <span>Connect 4</span>
          </button>
        </div>
      </div>

      {/* Opponent Status Banner when waiting */}
      {!isConnected && (
        <div 
          style={{ 
            padding: '8px 16px', 
            background: 'rgba(168, 85, 247, 0.1)', 
            borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: 'var(--text-main)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={14} color="var(--accent-purple, #a855f7)" />
            {isConnecting 
              ? 'Connecting to opponent over direct WebRTC channel...'
              : 'Waiting for opponent to join. Share your match invite link to start playing!'}
          </span>
          <button onClick={handleCopyLink} className="btn btn-primary text-xs" style={{ padding: '4px 10px', height: '26px' }}>
            <Copy size={12} />
            <span>Copy Match Link</span>
          </button>
        </div>
      )}

      {/* Main Arena Workspace with Video / Audio Face-Off PIP overlay */}
      <div className="game-stage-wrapper">
        {selectedGame === 'pong' ? (
          <CyberPongGame 
            status={status} 
            remotePeerNickname={remotePeerNickname} 
          />
        ) : selectedGame === 'grid' ? (
          <CyberGridGame 
            status={status} 
            remotePeerNickname={remotePeerNickname} 
            showToast={showToast}
          />
        ) : (
          <CyberConnectFour
            status={status}
            remotePeerNickname={remotePeerNickname}
          />
        )}

        {/* Video / Audio Face-Off PIP Dock */}
        <div className="faceoff-pip-dock" title="Live Face-Off Camera & Mic">
          {remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={(v) => {
                if (v && v.srcObject !== remoteStream) v.srcObject = remoteStream;
              }}
              className="faceoff-video remote"
            />
          ) : (
            <div className="faceoff-placeholder">
              <span>{remotePeerNickname ? remotePeerNickname.charAt(0) : 'P'}</span>
            </div>
          )}

          <div className="faceoff-controls">
            {onToggleAudio && (
              <button onClick={onToggleAudio} className="btn btn-icon btn-xs" title="Mute/Unmute Mic">
                {isAudioMuted ? <MicOff size={13} color="#f43f5e" /> : <Mic size={13} color="var(--accent-cyan)" />}
              </button>
            )}
            {onToggleVideo && (
              <button onClick={onToggleVideo} className="btn btn-icon btn-xs" title="Toggle Webcam">
                {isVideoMuted ? <VideoOff size={13} color="#f43f5e" /> : <Video size={13} color="var(--accent-emerald)" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
