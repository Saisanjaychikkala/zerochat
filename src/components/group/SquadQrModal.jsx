import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, X, Share2, Users } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

export function SquadQrModal({
  isOpen,
  onClose,
  squadRoomId
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const displayRoomId = squadRoomId ? squadRoomId.replace(/^#/, '') : 'nexus-squad';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#${displayRoomId}`
    : `#${displayRoomId}`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(displayRoomId);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my ZeroChat Squad',
          text: `Join my private encrypted squad chat (${displayRoomId}):`,
          url: shareUrl,
        });
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="card-icon-box cyan" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
              <QrCode size={18} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Scan to Join Squad</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>1-Tap Camera Connect</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Room Code Display Box */}
        <div className="room-code-box" style={{ width: '100%', boxSizing: 'border-box' }}>
          <span className="room-code-text" style={{ fontSize: '0.92rem' }}>#{displayRoomId}</span>
          <button type="button" onClick={handleCopyCode} className="btn btn-icon" title="Copy Code" style={{ width: '28px', height: '28px' }}>
            {copiedCode ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          </button>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
          <div style={{
            background: '#ffffff',
            padding: '12px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
          }}>
            <QRCodeSVG 
              value={shareUrl} 
              size={180} 
              level="M" 
              includeMargin={false} 
            />
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          Point any smartphone camera at this code to join the squad room instantly.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button 
            type="button" 
            onClick={handleCopyLink} 
            className="btn btn-secondary" 
            style={{ flex: 1, gap: '6px', height: '38px', justifyContent: 'center' }}
          >
            {copiedLink ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button 
            type="button" 
            onClick={handleNativeShare} 
            className="btn btn-primary" 
            style={{ flex: 1, gap: '6px', height: '38px', justifyContent: 'center' }}
          >
            <Share2 size={14} />
            <span>Share Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
