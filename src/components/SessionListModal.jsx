import React from 'react';
import { Users, Plus, X, Radio, ArrowRight, ShieldCheck } from 'lucide-react';

export default function SessionListModal({ 
  isOpen, 
  onClose, 
  sessions, 
  activePeerId, 
  onSelectPeer, 
  onNewRoom,
  onDisconnectPeer 
}) {
  if (!isOpen) return null;

  const peerIds = Object.keys(sessions);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Active Conversations ({peerIds.length})</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          ZeroChat isolates each peer session in RAM. Switch between chats without leaking history.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {peerIds.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No active peer conversations. Share your room link or join a room to begin.
            </div>
          ) : (
            peerIds.map((pid) => {
              const session = sessions[pid];
              const isActive = pid === activePeerId;
              return (
                <div 
                  key={pid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-secondary)',
                    border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onClick={() => {
                    onSelectPeer(pid);
                    onClose();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {(session.peerNickname || pid).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                        {session.peerNickname || 'Anonymous Peer'}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        #{pid.substring(0, 12)}... • {session.messages?.length || 0} msgs
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isActive ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>Active</span>
                    ) : (
                      <ArrowRight size={15} color="var(--text-dim)" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button 
          onClick={() => {
            onClose();
            onNewRoom();
          }} 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '10px' }}
        >
          <Plus size={16} />
          <span>Start Another New Chat</span>
        </button>
      </div>
    </div>
  );
}
