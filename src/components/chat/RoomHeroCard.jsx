import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  PlusCircle, 
  ArrowRight, 
  Share2, 
  Copy, 
  Check 
} from 'lucide-react';

export default function RoomHeroCard({
  roomId,
  inviteUrl,
  status,
  isConnected,
  roomFullError,
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
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'rgba(239, 68, 68, 0.12)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto'
        }}>
          <Users size={32} color="#f87171" />
        </div>

        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '6px' }}>
            Room is Full (2/2 Peers Connected)
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            ZeroChat rooms are strictly private 1-to-1 direct tunnels. This room already has two peers actively communicating. Third-party connections are blocked for privacy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
          <button 
            onClick={onCreateNewRoom}
            className="btn btn-primary"
            style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem' }}
          >
            <PlusCircle size={15} />
            <span>Create My Own Room</span>
          </button>

          <button 
            onClick={onOpenRoomModal}
            className="btn btn-secondary"
            style={{ padding: '10px 14px', fontSize: '0.84rem' }}
          >
            <span>Join Another Room</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-hero-card">
      {/* QR Code */}
      <div style={{ 
        background: '#ffffff', 
        padding: '12px', 
        borderRadius: '16px', 
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        margin: '0 auto'
      }}>
        {roomId && (
          <QRCodeSVG 
            value={inviteUrl} 
            size={145} 
            level="M"
            includeMargin={false}
          />
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '1.12rem', fontWeight: 700, marginBottom: '3px' }}>
          {status === 'connecting' ? 'Connecting to Peer...' : 'Private 1-on-1 Peer Room'}
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Share your invite link or code with 1 friend. Direct browser-to-browser encrypted pipe.
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
      <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
        <button 
          onClick={onShare}
          className="btn btn-primary"
          style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem' }}
        >
          <Share2 size={15} />
          <span>{copied ? 'Link Copied!' : 'Share Room Link'}</span>
        </button>

        <button 
          onClick={onOpenRoomModal}
          className="btn btn-secondary"
          style={{ padding: '10px 14px', fontSize: '0.84rem' }}
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
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Confused? Read 30s Quick Start Guide</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Room Link Quick Copy Input */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        background: 'var(--bg-input)', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        gap: '6px'
      }}>
        <input 
          type="text" 
          readOnly 
          value={inviteUrl} 
          style={{ 
            flex: 1, 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none'
          }} 
        />
        <button 
          onClick={onCopyLink} 
          className="btn btn-secondary text-xs" 
          style={{ padding: '4px 8px' }}
          title="Copy full invite link"
        >
          {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}
