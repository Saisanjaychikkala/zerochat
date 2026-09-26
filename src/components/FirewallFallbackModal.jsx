import React from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function FirewallFallbackModal({
  isOpen,
  onClose,
  onSwitchToUniversal,
  roomId,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel" style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              background: 'rgba(244, 63, 94, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#f43f5e',
              border: '1px solid rgba(244, 63, 94, 0.3)'
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              Router Firewall Blocked Direct P2P
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              True Private mode was blocked by your local network
            </p>
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5', marginBottom: '8px' }}>
            Your router or Wi-Fi (Symmetric NAT / Strict Firewall) blocked unsolicited incoming UDP packets. The other peer cannot connect to you directly without an encrypted relay.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-emerald)' }}>
            <ShieldCheck size={14} />
            <span>Universal Mode uses end-to-end encrypted relays. Zero logs.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={onSwitchToUniversal}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            <RefreshCw size={16} />
            <span>Switch to Universal Private Mode (Bypass Firewall)</span>
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span>Back to Homescreen Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
}
