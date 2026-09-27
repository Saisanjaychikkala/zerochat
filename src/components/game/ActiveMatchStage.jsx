import React from 'react';
import { ArrowLeft, X, Gamepad2 } from 'lucide-react';
import CyberPongGame from './CyberPongGame';
import CyberGridGame from './CyberGridGame';
import CyberConnectFour from './CyberConnectFour';

const GAME_TITLES = {
  pong: 'Cyber Pong • Duel',
  grid: 'Cyber Grid (3x3)',
  c4: 'Connect 4 Matrix',
};

export default function ActiveMatchStage({
  activeGame,
  status,
  isHost,
  myNickname,
  remotePeerNickname,
  showToast,
  onExitMatch,
  onReturnToChat,
}) {
  const isConnected = status === 'connected';
  const opponentLabel = isConnected ? remotePeerNickname || 'Peer' : 'AI Bot';

  return (
    <div className="active-match-stage glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* Top Universal Match Navigation Bar */}
      <div className="active-match-top-nav">
        <button 
          type="button"
          onClick={onReturnToChat || onExitMatch} 
          className="btn btn-secondary text-xs return-to-chat-btn" 
          title="Return to Chat Window (Keep Game Running in Background)"
        >
          <ArrowLeft size={15} />
          <span>Return to Chat</span>
        </button>

        <div className="active-match-title-pill">
          <Gamepad2 size={13} color="var(--accent-cyan, #00f2fe)" />
          <span className="match-title-text">{GAME_TITLES[activeGame] || 'P2P Duel'}</span>
          <span className="match-vs-text">
            {myNickname || 'You'} vs {opponentLabel}
          </span>
          <span className={`status-dot ${status}`} />
        </div>

        {onExitMatch && (
          <button 
            type="button"
            onClick={onExitMatch} 
            className="btn btn-secondary text-xs exit-match-btn" 
            title="End Match & Close Card"
          >
            <X size={13} />
            <span className="exit-btn-label">End Match</span>
          </button>
        )}
      </div>

      {/* Active Game Canvas / Matrix */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        {activeGame === 'pong' ? (
          <CyberPongGame 
            status={status}
            isHost={isHost}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            onExitMatch={onReturnToChat || onExitMatch}
          />
        ) : activeGame === 'grid' ? (
          <CyberGridGame 
            status={status} 
            remotePeerNickname={remotePeerNickname} 
            showToast={showToast}
            onExitMatch={onReturnToChat || onExitMatch}
          />
        ) : (
          <CyberConnectFour
            status={status}
            remotePeerNickname={remotePeerNickname}
            onExitMatch={onReturnToChat || onExitMatch}
          />
        )}
      </div>
    </div>
  );
}
