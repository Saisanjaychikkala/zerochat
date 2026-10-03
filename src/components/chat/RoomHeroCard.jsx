import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  PlusCircle, 
  ArrowRight, 
  Share2, 
  Copy, 
  Check,
  Sparkles
} from 'lucide-react';
import ConnectionLoader from './ConnectionLoader';
import ConnectionDiagnosticCard from './ConnectionDiagnosticCard';

export default function RoomHeroCard({
  roomId,
  isHost = true,
  onRetryConnection,
  inviteUrl,
  status,
  isConnected,
  roomFullError,
  connectionFailed,
  connectionErrorReason,
  copied,
  copiedCode,
  onCopyLink,
  onCopyCode,
  onShare,
  onCreateNewRoom,
  onOpenRoomModal,
  onOpenInfoModal
}) {
  if (roomFullError && !isConnected) {
    return (
      <div className="waiting-hero-card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.04)' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' 
        }}>
          <Users size={32} color="#f87171" />
        </div>

        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '6px' }}>
            Room is Full (2/2 Peers Connected)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This chat room already has 2 people. ZeroChat is strictly private 1-to-1. Try creating your own room or join a different one.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', justifyContent: 'center' }}>
          <button onClick={onCreateNewRoom} className="btn btn-primary" style={{ flex: '1 1 140px', padding: '10px 14px', fontSize: '0.84rem' }}>
            <PlusCircle size={15} />
            <span>Create My Own Room</span>
          </button>
          <button onClick={onOpenRoomModal} className="btn btn-secondary" style={{ flex: '1 1 120px', padding: '10px 14px', fontSize: '0.84rem' }}>
            <span>Join Another Room</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Friendly Connection Diagnostic Screen when WebRTC STUN/firewall fails or times out
  if (connectionFailed && !isConnected) {
    return (
      <ConnectionDiagnosticCard 
        onRetry={onRetryConnection}
        onCreateNewRoom={onCreateNewRoom}
        reason={connectionErrorReason}
      />
    );
  }

  // Active Minimalist Cyber-Orb Connection Loader
  if (status === 'connecting') {
    return (
      <ConnectionLoader 
        inviteUrl={inviteUrl}
        onCopyLink={onCopyLink}
        copied={copied}
        onCancel={onCreateNewRoom}
      />
    );
  }

  // Ready to Invite / Waiting for Peer
  return (
    <div className="waiting-hero-card">
      {/* QR Code */}
      {roomId ? (
        <div style={{ 
          background: '#ffffff', 
          padding: '10px', 
          borderRadius: '16px', 
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          margin: '0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <QRCodeSVG 
            value={inviteUrl} 
            size={135} 
            level="M"
            includeMargin={false}
          />
        </div>
      ) : (
        <div style={{ 
          width: '135px', 
          height: '135px', 
          borderRadius: '16px', 
          border: '1px dashed var(--border-subtle)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto',
          color: 'var(--text-dim)',
          fontSize: '0.75rem'
        }}>
          <span>Loading room...</span>
        </div>
      )}

      <div>
        <h3 style={{ fontSize: '1.12rem', fontWeight: 700, marginBottom: '3px' }}>
          Waiting for your friend...
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Share the code or link below. As soon as they open it, you'll be connected!
        </p>
      </div>

      {/* Prominent 3-Word Room Code Box */}
      <div className="room-code-display">
        <div className="room-code-box" style={{ padding: '6px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Your Room Code</span>
            <span className="room-code-text" style={{ fontSize: '0.96rem' }}>{roomId}</span>
          </div>
          <button onClick={onCopyCode} className="btn btn-secondary text-xs" style={{ padding: '5px 10px' }} title="Copy 3-word code">
            {copiedCode ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%', justifyContent: 'center' }}>
        <button 
          onClick={onShare}
          className="btn btn-primary"
          style={{ flex: '1 1 140px', padding: '10px 14px', fontSize: '0.84rem' }}
        >
          <Share2 size={15} />
          <span>{copied ? 'Link Copied!' : 'Share Room Link'}</span>
        </button>

        <button 
          onClick={onOpenRoomModal}
          className="btn btn-secondary"
          style={{ flex: '1 1 120px', padding: '10px 14px', fontSize: '0.84rem' }}
        >
          <span>Join a Friend</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Micro Guide Card */}
      <div className="connection-guide-card" style={{ textAlign: 'left' }}>
        <div className="guide-step">
          <span className="guide-step-num">1</span>
          <span>Send 3-word code or link to 1 friend (rooms are strictly 1-to-1).</span>
        </div>
        <div className="guide-step">
          <span className="guide-step-num">2</span>
          <span>When opened, your encrypted chat activates instantly!</span>
        </div>
        {onOpenInfoModal && (
          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onOpenInfoModal}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.74rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              How does 100% private chat work?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
