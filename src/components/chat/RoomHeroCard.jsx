import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  PlusCircle, 
  ArrowRight, 
  Share2, 
  Copy, 
  Check,
  RefreshCw,
  Radio,
  Sparkles
} from 'lucide-react';

export default function RoomHeroCard({
  roomId,
  isHost = true,
  onRetryConnection,
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
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    let t;
    if (status === 'connecting') {
      setElapsedSecs(1);
      t = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    } else {
      setElapsedSecs(0);
    }
    return () => clearInterval(t);
  }, [status]);

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

        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
          <button onClick={onCreateNewRoom} className="btn btn-primary" style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem' }}>
            <PlusCircle size={15} />
            <span>Create My Own Room</span>
          </button>
          <button onClick={onOpenRoomModal} className="btn btn-secondary" style={{ padding: '10px 14px', fontSize: '0.84rem' }}>
            <span>Join Another Room</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Active Connecting State (Both Joiner and Host when handshake is underway)
  if (status === 'connecting') {
    return (
      <div className="waiting-hero-card">
        {/* Pulsing Cyber Radar Animation */}
        <div style={{
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,242,254,0.18) 0%, rgba(79,172,254,0.04) 70%, transparent 100%)',
          border: '2px solid rgba(0,242,254,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          position: 'relative',
          boxShadow: '0 0 30px rgba(0,242,254,0.25)'
        }}>
          <Radio size={40} color="var(--accent-cyan)" className="animate-pulse" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.18rem', fontWeight: 700 }}>
              Connecting to your friend...
            </h3>
            <span style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              background: 'rgba(0, 242, 254, 0.15)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid rgba(0, 242, 254, 0.3)'
            }}>
              {elapsedSecs}s
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45, maxWidth: '380px', margin: '0 auto' }}>
            Setting up an encrypted, direct connection. No servers store your messages.
          </p>
        </div>

        <div style={{
          width: '100%',
          maxWidth: '380px',
          margin: '0 auto',
          background: 'rgba(0,0,0,0.25)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Connecting
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {elapsedSecs < 4 ? 'Step 1/3' : elapsedSecs < 8 ? 'Step 2/3' : 'Step 3/3'}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} className="animate-spin text-cyan-400" />
            <span>
              {elapsedSecs < 4 
                ? 'Finding your friend...' 
                : elapsedSecs < 8 
                ? 'Getting through firewalls... hang tight' 
                : 'Almost there — finalizing connection...'}
            </span>
          </div>
        </div>

        {/* Helpful Tip */}
        <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.4 }}>
          💡 Tip: Both peers must have ZeroChat open on screen. Connection usually completes in 2–7 seconds.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
          {onRetryConnection && (
            <button 
              onClick={onRetryConnection}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.84rem' }}
              title="Force connection retry"
            >
              <RefreshCw size={14} className="animate-spin" />
              <span>Retry Connection</span>
            </button>
          )}

          <button 
            onClick={onCreateNewRoom}
            className="btn btn-secondary"
            style={{ padding: '10px 14px', fontSize: '0.84rem' }}
            title="Start your own private room"
          >
            <PlusCircle size={14} />
            <span>Create New Room</span>
          </button>
        </div>
      </div>
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
