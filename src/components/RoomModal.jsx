import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, ArrowRight, ShieldCheck, Radio } from 'lucide-react';

export default function RoomModal({ 
  isOpen, 
  onClose, 
  roomId, 
  status, 
  onJoinRoom 
}) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('share'); // 'share' or 'join'

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}${window.location.pathname}#${roomId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>P2P Room Connection</h2>
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
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Share My Room
          </button>
          <button 
            onClick={() => setActiveTab('join')}
            className={`btn ${activeTab === 'join' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Join Another Room
          </button>
        </div>

        {activeTab === 'share' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* QR Code Container */}
            <div style={{ 
              background: '#ffffff', 
              padding: '14px', 
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}>
              <QRCodeSVG 
                value={inviteUrl} 
                size={180} 
                level="M"
                includeMargin={false}
              />
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Scan with your phone camera or share the direct link below to start encrypted peer transfer.
            </p>

            {/* Room Code & Copy Link */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                gap: '8px'
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
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none'
                  }} 
                />
                <button onClick={handleCopy} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Connection Radar state if waiting */}
            {status !== 'connected' && (
              <div style={{ 
                width: '100%', 
                padding: '12px', 
                background: 'rgba(0, 242, 254, 0.05)', 
                border: '1px solid rgba(0, 242, 254, 0.15)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)' }} className="animate-pulse" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  Listening for peer handshake on room <strong style={{ color: 'var(--accent-cyan)' }}>{roomId}</strong>...
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Join Existing Room View */
          <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Enter the Room ID or paste the invite link you received:
            </p>

            <input 
              type="text" 
              placeholder="e.g. cyber-nexus-42"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="chat-input"
              style={{ borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)' }}
              autoFocus
            />

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <span>Connect to Peer</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '0.75rem', 
          color: 'var(--text-dim)', 
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px'
        }}>
          <ShieldCheck size={16} color="var(--accent-emerald)" />
          <span>Serverless P2P. Traffic never touches any centralized storage or database.</span>
        </div>
      </div>
    </div>
  );
}
