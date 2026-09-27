import React from 'react';
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
