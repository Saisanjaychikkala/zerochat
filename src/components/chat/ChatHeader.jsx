import React from 'react';
import { Lock, AlertCircle, Phone, Video, ArrowRight } from 'lucide-react';

export default function ChatHeader({
  isConnected,
  status,
  remotePeerId,
  remotePeerNickname,
  roomFullError,
  onStartCall,
  callStatus,
  onOpenRoomModal
}) {
  return (
    <div className="chat-header">
      <div className="peer-info">
        <div className="peer-avatar">
          {isConnected && remotePeerNickname
            ? remotePeerNickname.charAt(0).toUpperCase()
            : isConnected && remotePeerId
            ? remotePeerId.charAt(0).toUpperCase()
            : '?'}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {roomFullError && !isConnected
                ? 'Room is Full (2/2)'
                : isConnected 
                ? remotePeerNickname || `Peer (${remotePeerId?.substring(0, 8)})` 
                : status === 'connecting'
                ? 'Connecting...'
                : 'Ready for Connection'}
            </span>
            <span className="e2ee-tag" style={roomFullError && !isConnected ? { borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' } : {}}>
              {roomFullError && !isConnected ? <AlertCircle size={10} /> : <Lock size={10} />}
              <span>{roomFullError && !isConnected ? 'Occupied' : 'WebRTC E2EE'}</span>
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: roomFullError && !isConnected ? '#f87171' : 'var(--text-muted)' }}>
            {roomFullError && !isConnected
              ? 'Session is occupied by 2 peers. Direct 1-to-1 tunnel.'
              : isConnected 
              ? 'Encrypted memory channel active' 
              : status === 'connecting'
              ? 'Negotiating peer handshake...'
              : status === 'reconnecting'
              ? 'Reconnecting in background...'
              : 'Scan QR or share link to connect'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isConnected && onStartCall && (
          <>
            <button 
              onClick={() => onStartCall(false)} 
              className="btn btn-icon call-trigger-btn"
              title={callStatus && callStatus !== 'idle' ? 'Call in progress' : 'Start Encrypted Voice Call'}
              disabled={callStatus && callStatus !== 'idle'}
              style={{ 
                width: '34px', 
                height: '34px', 
                opacity: (callStatus && callStatus !== 'idle') ? 0.45 : 1,
                cursor: (callStatus && callStatus !== 'idle') ? 'not-allowed' : 'pointer'
              }}
            >
              <Phone size={15} color="var(--accent-cyan)" />
            </button>

            <button 
              onClick={() => onStartCall(true)} 
              className="btn btn-icon call-trigger-btn"
              title={callStatus && callStatus !== 'idle' ? 'Call in progress' : 'Start Encrypted Video Call'}
              disabled={callStatus && callStatus !== 'idle'}
              style={{ 
                width: '34px', 
                height: '34px', 
                opacity: (callStatus && callStatus !== 'idle') ? 0.45 : 1,
                cursor: (callStatus && callStatus !== 'idle') ? 'not-allowed' : 'pointer'
              }}
            >
              <Video size={16} color="var(--accent-emerald)" />
            </button>
          </>
        )}

        {!isConnected && (
          <button onClick={onOpenRoomModal} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            <span>Join Room</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
