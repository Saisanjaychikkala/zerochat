import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Gamepad2,
  CircleDot,
  Disc
} from 'lucide-react';
import CyberPongGame from './game/CyberPongGame';
import CyberGridGame from './game/CyberGridGame';
import CyberConnectFour from './game/CyberConnectFour';

export default function P2PGameArena({
  status,
  remotePeerNickname,
  localStream,
  remoteStream,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  onExit,
  showToast,
}) {
  const [selectedGame, setSelectedGame] = useState('pong'); // 'pong' | 'grid' | 'c4'
  const isConnected = status === 'connected';

  return (
    <div className="game-arena-container glass-panel">
      {/* Top Header Bar */}
      <div className="game-header">
        <button onClick={onExit} className="btn btn-secondary text-xs">
          <ArrowLeft size={14} />
          <span>Back to Chat</span>
        </button>

        {/* Game Mode Selector Pill */}
        <div className="game-mode-toggle">
          <button
            onClick={() => setSelectedGame('pong')}
            className={`game-tab-btn ${selectedGame === 'pong' ? 'active' : ''}`}
          >
            <Gamepad2 size={14} />
            <span>Cyber Pong</span>
          </button>
          <button
            onClick={() => setSelectedGame('grid')}
            className={`game-tab-btn ${selectedGame === 'grid' ? 'active' : ''}`}
          >
            <CircleDot size={14} />
            <span>Grid (3x3)</span>
          </button>
          <button
            onClick={() => setSelectedGame('c4')}
            className={`game-tab-btn ${selectedGame === 'c4' ? 'active' : ''}`}
          >
            <Disc size={14} />
            <span>Connect 4</span>
          </button>
        </div>
      </div>

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
