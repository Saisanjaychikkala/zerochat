import React from 'react';
import { ArrowLeft } from 'lucide-react';
import CyberPongGame from './CyberPongGame';
import CyberGridGame from './CyberGridGame';
import CyberConnectFour from './CyberConnectFour';

export default function ActiveMatchStage({
  activeGame,
  status,
  isHost,
  myNickname,
  remotePeerNickname,
  showToast,
  onExitMatch,
}) {
  return (
    <div className="active-match-stage" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Active Match Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button 
          onClick={onExitMatch}
          className="btn btn-secondary btn-xs"
          style={{ gap: '5px', height: '26px', padding: '0 10px', fontSize: '0.72rem' }}
          title="Conclude match and return to chat"
        >
          <ArrowLeft size={13} />
          <span>Exit Match to Chat</span>
        </button>

        <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
          Live Match Active
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {activeGame === 'pong' ? (
          <CyberPongGame 
            status={status}
            isHost={isHost}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            onExitMatch={onExitMatch}
          />
        ) : activeGame === 'grid' ? (
          <CyberGridGame 
            status={status} 
            remotePeerNickname={remotePeerNickname} 
            showToast={showToast}
            onExitMatch={onExitMatch}
          />
        ) : (
          <CyberConnectFour
            status={status}
            remotePeerNickname={remotePeerNickname}
            onExitMatch={onExitMatch}
          />
        )}
      </div>
    </div>
  );
}
