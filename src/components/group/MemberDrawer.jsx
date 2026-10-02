import React from 'react';
import { 
  Users, 
  Crown, 
  Star, 
  Lock, 
  Unlock, 
  X, 
  Share2, 
  Check, 
  Zap, 
  ShieldAlert 
} from 'lucide-react';

export function MemberDrawer({
  isOpen,
  onClose,
  isHost,
  myPeerId,
  currentHostId,
  designatedSuccessorId,
  members,
  pendingKnocks,
  isLocked,
  squadRoomId,
  onAdmitKnocker,
  onDeclineKnocker,
  onPassBaton,
  onSetSuccessor,
  onToggleLock
}) {
  const hostMember = members.find(m => m.peerId === currentHostId);
  const otherMembers = members.filter(m => m.peerId !== currentHostId);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#squad-${squadRoomId?.replace(/^squad-/, '')}`
      : `#${squadRoomId}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      alert('Squad room invite link copied to clipboard!');
    }
  };

  return (
    <aside className={`squad-member-drawer ${isOpen ? 'drawer-open' : ''}`}>
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} />
          <span>Squad Members ({members.length})</span>
        </div>
        <button onClick={onClose} className="btn btn-icon" style={{ width: '28px', height: '28px' }}>
          <X size={15} />
        </button>
      </div>

      <div className="drawer-content">
        {/* Section 1: Pending Knocks */}
        {isHost && pendingKnocks.length > 0 && (
          <div>
            <div className="drawer-section-title" style={{ color: '#58a6ff' }}>
              Pending Admission ({pendingKnocks.length})
            </div>
            {pendingKnocks.map(k => (
              <div key={k.peerId} className="pending-knock-card">
                <div className="knock-top-line">
                  <span className="knock-name">{k.nickname}</span>
                  <span style={{ fontSize: '0.68rem', color: '#8b949e' }}>Knocking...</span>
                </div>
                <div className="knock-actions">
                  <button 
                    onClick={() => onAdmitKnocker(k.peerId)} 
                    className="btn-knock-admit"
                    title="Admit to Squad"
                  >
                    <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    Admit
                  </button>
                  <button 
                    onClick={() => onDeclineKnocker(k.peerId)} 
                    className="btn-knock-decline"
                    title="Decline Entry"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 2: Active Relay Authority */}
        <div>
          <div className="drawer-section-title">Relay Authority</div>
          <div className="drawer-member-card is-host-card">
            <div className="member-card-left">
              <Crown size={15} color="#f2cc60" />
              <div>
                <div className="member-name-text">
                  {hostMember?.nickname || 'Host'} {hostMember?.peerId === myPeerId && '(You)'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#f2cc60', fontWeight: 600 }}>
                  ⚡ Baton Active • Star Hub
                </div>
              </div>
            </div>
            <span className="latency-chip">{hostMember?.latency || 12}ms</span>
          </div>
        </div>

        {/* Section 3: Squad Members */}
        <div>
          <div className="drawer-section-title">Members ({otherMembers.length})</div>
          {otherMembers.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: '#8b949e', fontStyle: 'italic', padding: '6px 0' }}>
              No other squad members yet. Invite friends!
            </div>
          ) : (
            otherMembers.map(m => {
              const isCoHost = m.peerId === designatedSuccessorId;
              const isMe = m.peerId === myPeerId;

              return (
                <div key={m.peerId} className="drawer-member-card">
                  <div className="member-card-left">
                    <span className="status-dot-sm" />
                    <div>
                      <div className="member-name-text">
                        {m.nickname} {isMe && '(You)'}
                      </div>
                      {isCoHost && (
                        <div style={{ fontSize: '0.68rem', color: '#d2a8ff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Star size={10} />
                          <span>Designated Co-Host</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="latency-chip">{m.latency || 20}ms</span>

                    {/* Host Controls */}
                    {isHost && (
                      <>
                        <button
                          onClick={() => onSetSuccessor(m.peerId)}
                          className={`btn-star-cohost ${isCoHost ? 'active' : ''}`}
                          title={isCoHost ? 'Remove Co-Host designation' : 'Designate as Co-Host / Successor'}
                        >
                          <Star size={13} fill={isCoHost ? '#d2a8ff' : 'none'} />
                        </button>

                        <button
                          onClick={() => onPassBaton(m.peerId)}
                          className="btn-pass-baton"
                          title={`Transfer active Relay Authority (Baton) to ${m.nickname}`}
                        >
                          Pass Baton
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="drawer-footer">
        {isHost && (
          <div className="lock-toggle-row">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isLocked ? <Lock size={14} color="#f85149" /> : <Unlock size={14} color="#3fb950" />}
              <span>Lock Room</span>
            </span>
            <button 
              onClick={onToggleLock}
              className={`btn ${isLocked ? 'btn-danger' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '3px 10px' }}
            >
              {isLocked ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Zap size={12} color="#f2cc60" />
          <span>Failover: Co-Host & Seniority</span>
        </div>

        <button 
          onClick={handleShare}
          className="btn btn-secondary w-full"
          style={{ fontSize: '0.78rem', gap: '6px', padding: '6px 0' }}
        >
          <Share2 size={13} />
          <span>Copy Squad Invite Link</span>
        </button>
      </div>
    </aside>
  );
}
