import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, ArrowRight, ShieldCheck, Radio, Share2 } from 'lucide-react';

export default function RoomModal({ 
  isOpen, 
  onClose, 
  roomId, 
  status, 
  onJoinRoom,
  onOpenGuide
}) {
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState('share'); // 'share' or 'join'

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}${window.location.pathname}#${roomId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my ZeroChat Room',
          text: `Connect with me on ZeroChat (Room: ${roomId}):`,
          url: inviteUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const raw = joinCode.trim();
    if (raw) {
      // Support pasting full invite URLs, hashes, or plain IDs
      const clean = raw.replace(/^.*#/, '').split('?')[0].replace(/\/+$/, '').trim();
      if (clean) {
        onJoinRoom(clean);
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Connect with a Peer</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '4px', 
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button 
            onClick={() => setActiveTab('share')}
            className={`btn ${activeTab === 'share' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            📤 Invite Friend (Host)
          </button>
          <button 
            onClick={() => setActiveTab('join')}
            className={`btn ${activeTab === 'join' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            📥 Join a Friend (Guest)
          </button>
        </div>

        {activeTab === 'share' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            {/* Quick 2-Step Visual Guide */}
            <div className="connection-guide-card">
              <div className="guide-step">
                <span className="guide-step-num">1</span>
                <span><strong>Share your link or QR code</strong> with 1 friend.</span>
              </div>
              <div className="guide-step">
                <span className="guide-step-num">2</span>
                <span>When they open it in their browser, you <strong>connect automatically</strong>!</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div style={{ 
              background: '#ffffff', 
              padding: '12px', 
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}>
              <QRCodeSVG 
                value={inviteUrl} 
                size={160} 
                level="M"
                includeMargin={false}
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '-6px' }}>
              Scan with phone camera to connect instantly
            </span>

            {/* Room Code Badge */}
            <div className="room-code-display">
              <span className="room-code-title">Your 3-Word Room Code</span>
              <div className="room-code-box">
                <span className="room-code-text">{roomId}</span>
                <button onClick={handleCopyCode} className="btn btn-secondary text-xs" style={{ padding: '6px 10px' }}>
                  {copiedCode ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Primary Share Action */}
            <button 
              onClick={handleShare}
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.84rem' }}
            >
              <Share2 size={15} />
              <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Share Room Invite Link'}</span>
            </button>

            {/* Direct URL Input */}
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
              <button onClick={handleCopyLink} className="btn btn-secondary text-xs" style={{ padding: '4px 8px' }} title="Copy Link">
                {copiedLink ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Connection Radar state if waiting */}
            {status !== 'connected' && (
              <div style={{ 
                width: '100%', 
                padding: '10px 12px', 
                background: 'rgba(0, 242, 254, 0.05)', 
                border: '1px solid rgba(0, 242, 254, 0.15)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} className="animate-pulse" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  Listening for your friend on room <strong style={{ color: 'var(--accent-cyan)' }}>{roomId}</strong>...
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Join Existing Room View */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="connection-guide-card">
              <div className="guide-step">
                <span className="guide-step-num">💡</span>
                <span>Ask your friend for their <strong>3-word Room Code</strong> or paste the <strong>full invite link</strong> they sent you:</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                Enter Room Code or Invite Link:
              </label>
              <input 
                type="text" 
                placeholder="e.g. cyber-nexus-42 or paste link"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="chat-input"
                style={{ borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', width: '100%' }}
                autoFocus
              />
            </div>

            <button type="submit" disabled={!joinCode.trim()} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <span>Connect to Friend</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Security & Guide Footer Notice */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '8px', 
          fontSize: '0.74rem', 
          color: 'var(--text-dim)', 
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="var(--accent-emerald)" />
            <span>Direct 1-on-1 • Zero database</span>
          </div>
          {onOpenGuide && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGuide();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '0.74rem',
                textDecoration: 'underline',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📖 How it works</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
