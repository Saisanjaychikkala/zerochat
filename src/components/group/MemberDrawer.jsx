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
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

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
  onOpenQrModal,
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
      ? `${window.location.origin}${window.location.pathname}#${squadRoomId}`
      : `#${squadRoomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my ZeroChat Squad',
          text: `Join my private ephemeral squad chat (${squadRoomId}):`,
          url: shareUrl,
        });
      } catch (_) {}
    } else {
      await copyToClipboard(shareUrl);
      alert('Squad room invite link copied to clipboard!');
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile & closing outside */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'active' : ''}`} 
        onClick={onClose} 
      />

      <aside className={`squad-member-drawer ${isOpen ? 'drawer-open' : ''}`}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 700 }}>Squad Members ({members.length})</span>
          </div>
          <button type="button" onClick={onClose} className="btn btn-icon" style={{ width: '28px', height: '28px' }}>
            <X size={15} />
          </button>
        </div>

        <div className="drawer-content">
          {/* Section 1: Pending Knocks */}
          {isHost && pendingKnocks.length > 0 && (
            <div>
              <div className="drawer-section-title" style={{ color: 'var(--accent-cyan)' }}>
                Pending Admission ({pendingKnocks.length})
              </div>
              {pendingKnocks.map(k => (
                <div key={k.peerId} className="pending-knock-card">
                  <div className="knock-top-line">
                    <span className="knock-name">{k.nickname}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Knocking...</span>
                  </div>
                  <div className="knock-actions">
                    <button 
                      type="button"
                      onClick={() => onAdmitKnocker(k.peerId)} 
                      className="btn-knock-admit"
                      title="Admit to Squad"
                    >
                      <Check size={12} style={{ display: 'inline', marginRight: '3px' }} />
                      Admit
                    </button>
                    <button 
                      type="button"
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
                <Crown size={16} color="var(--accent-amber)" />
                <div>
                  <div className="member-name-text">
                    {hostMember?.nickname || 'Host'} {hostMember?.peerId === myPeerId && '(You)'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                    ⚡ Active Relay Host
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
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                No other squad members yet. Share invite link!
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
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                            type="button"
                            onClick={() => onSetSuccessor(m.peerId)}
                            className={`btn-star-cohost ${isCoHost ? 'active' : ''}`}
                            title={isCoHost ? 'Remove Co-Host designation' : 'Designate as Co-Host / Successor'}
                          >
                            <Star size={13} fill={isCoHost ? 'var(--accent-purple)' : 'none'} />
                          </button>

                          <button
                            type="button"
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
          {isHost ? (
            <div className="lock-toggle-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isLocked ? <Lock size={14} color="#f87171" /> : <Unlock size={14} color="var(--accent-emerald)" />}
                <span>Lock Squad Room (Admin)</span>
              </span>
              <button 
                type="button"
                onClick={onToggleLock}
                className={`btn ${isLocked ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              >
                {isLocked ? 'Locked' : 'Unlocked'}
              </button>
            </div>
          ) : (
            <div className="lock-toggle-row" style={{ opacity: 0.85 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: isLocked ? '#f87171' : 'var(--text-muted)' }}>
                {isLocked ? <Lock size={14} color="#f87171" /> : <Unlock size={14} color="var(--accent-emerald)" />}
                <span>Squad Access: {isLocked ? 'Locked (Admin Only)' : 'Open (Accepting Members)'}</span>
              </span>
            </div>
          )}

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={12} color="var(--accent-amber)" />
            <span>Failover: Co-Host & Seniority</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button 
              type="button"
              onClick={onOpenQrModal}
              className="btn btn-secondary"
              style={{ flex: '1 1 0', minWidth: 0, fontSize: '0.78rem', gap: '5px', height: '36px', justifyContent: 'center', padding: '0 8px' }}
              title="Show Squad QR Code"
            >
              <QrCode size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Show QR</span>
            </button>
            <button 
              type="button"
              onClick={handleShare}
              className="btn btn-primary"
              style={{ flex: '1 1 0', minWidth: 0, fontSize: '0.78rem', gap: '5px', height: '36px', justifyContent: 'center', padding: '0 8px' }}
            >
              <Share2 size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Share Link</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
