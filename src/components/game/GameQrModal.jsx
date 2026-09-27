import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Gamepad2, Share2, Wifi, Info } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

export default function GameQrModal({
  isOpen,
  onClose,
  gameRoomId,
  showToast,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customHost, setCustomHost] = useState('');
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsLocalhost(true);
        setCustomHost('');
      } else {
        setIsLocalhost(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const port = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';

  // If user entered a custom LAN IP (e.g. 192.168.1.5), construct URL with that IP
  const effectiveOrigin = (isLocalhost && customHost.trim())
    ? `http://${customHost.trim().replace(/^http:\/\//, '')}${customHost.includes(':') ? '' : port}`
    : baseOrigin;

  const matchUrl = `${effectiveOrigin}${pathname}#${gameRoomId}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(matchUrl);
    if (success) {
      setCopiedLink(true);
      if (showToast) showToast('Match invite link copied!', 'success');
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleCopyCode = async () => {
    if (!gameRoomId) return;
    const success = await copyToClipboard(gameRoomId);
    if (success) {
      setCopiedCode(true);
      if (showToast) showToast(`Room Code ${gameRoomId} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  const handleShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: 'ZeroChat P2P Arena Duel',
          text: `Join my live P2P game match on ZeroChat (Room: ${gameRoomId}):`,
          url: matchUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="modal-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '6px', borderRadius: '8px' }}>
              <Gamepad2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Scan to Join Game</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ephemeral P2P Match Invitation</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-xs" title="Close">
            <X size={16} />
          </button>
        </div>

        {/* QR Code Canvas */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          margin: '0 auto 16px auto',
          width: 'fit-content'
        }}>
          <QRCodeSVG 
            value={matchUrl} 
            size={180}
            level="M"
            includeMargin={true}
          />
        </div>

        {/* Room Code Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          marginBottom: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              Match Code
            </span>
            <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-purple, #c084fc)' }}>
              #{gameRoomId}
            </span>
          </div>
          <button onClick={handleCopyCode} className="btn btn-secondary btn-xs" style={{ gap: '4px' }}>
            {copiedCode ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Localhost / LAN Wi-Fi Helper Tip */}
        {isLocalhost && (
          <div style={{
            background: 'rgba(0, 242, 254, 0.06)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            marginBottom: '14px',
            fontSize: '0.74rem',
            lineHeight: 1.4,
            color: 'var(--text-muted)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '4px' }}>
              <Wifi size={13} />
              <span>Scanning from Mobile Phone?</span>
            </div>
            <p style={{ margin: '0 0 6px 0' }}>
              Your laptop is running on <code>localhost</code>. To let your phone connect over the same Wi-Fi, enter your laptop's Wi-Fi IP address below:
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="e.g. 192.168.1.15"
                value={customHost}
                onChange={(e) => setCustomHost(e.target.value)}
                className="chat-input text-xs font-mono"
                style={{ padding: '4px 8px', height: '28px' }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={handleCopyLink} className="btn btn-secondary w-full text-xs" style={{ height: '36px' }}>
            {copiedLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
          <button onClick={handleShare} className="btn btn-primary purple-bg w-full text-xs" style={{ height: '36px' }}>
            <Share2 size={14} />
            <span>Share Match</span>
          </button>
        </div>
      </div>
    </div>
  );
}
