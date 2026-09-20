import React from 'react';
import { X, ShieldCheck, Zap, Globe, Cpu, Radio, Lock } from 'lucide-react';

export default function InfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>ZeroChat Architecture</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
            <p style={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
              🔒 100% Zero-Knowledge & Serverless
            </p>
            <p>
              Unlike traditional apps (WhatsApp, Slack, Telegram), ZeroChat stores <strong>zero messages, zero logs, and zero files</strong> on any database. All communication travels directly from device to device.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                <Cpu size={16} color="var(--accent-cyan)" />
                <span>WebRTC Mesh</span>
              </div>
              <p style={{ fontSize: '0.78rem' }}>
                Direct browser-to-browser UDP/SCTP channels encrypted with DTLS and SRTP.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                <Zap size={16} color="var(--accent-emerald)" />
                <span>Direct AirDrop</span>
              </div>
              <p style={{ fontSize: '0.78rem' }}>
                Chunked memory streaming allows sending files of any size at maximum LAN/Wi-Fi speed.
              </p>
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
              <Globe size={16} color="var(--accent-purple)" />
              <span>Zero Running Costs Forever</span>
            </div>
            <p style={{ fontSize: '0.78rem' }}>
              Built with client-side React + Vite, hosted on GitHub Pages for free, utilizing free public Google STUN relays for peer NAT traversal.
            </p>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
          Got It
        </button>
      </div>
    </div>
  );
}
