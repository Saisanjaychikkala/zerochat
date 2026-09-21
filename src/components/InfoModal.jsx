import React, { useState } from 'react';
import { X, ShieldCheck, Zap, Globe, Cpu, BookOpen, Users, Lock, Send, RefreshCw, Smartphone } from 'lucide-react';

export default function InfoModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'security'

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'guide' ? (
              <BookOpen size={22} color="var(--accent-cyan)" />
            ) : (
              <ShieldCheck size={22} color="var(--accent-cyan)" />
            )}
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {activeTab === 'guide' ? 'How ZeroChat Works' : 'Privacy & Architecture'}
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-icon" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="room-tabs" style={{ marginBottom: '14px' }}>
          <button
            className={`room-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={14} />
            <span>📖 Quick Start Guide</span>
          </button>
          <button
            className={`room-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <ShieldCheck size={14} />
            <span>🛡️ Privacy & Tech</span>
          </button>
        </div>

        {/* Tab 1: Quick Start Guide */}
        {activeTab === 'guide' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <p style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
              ZeroChat is a <strong>private, zero-database 1-on-1 link</strong>. Follow these 3 simple steps to connect:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', color: '#000', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '2px', fontWeight: 600 }}>
                    Share your Room Code or Link
                  </h4>
                  <p style={{ fontSize: '0.8rem' }}>
                    Tap the <strong>QR / Invite</strong> button in the header or copy your 3-word code (e.g. <code style={{ color: 'var(--accent-cyan)', background: 'rgba(0,242,254,0.1)', padding: '2px 5px', borderRadius: '4px' }}>cyber-nexus-42</code>) and send it to your friend.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))', color: '#fff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '2px', fontWeight: 600 }}>
                    Friend Opens Link or Enters Code
                  </h4>
                  <p style={{ fontSize: '0.8rem' }}>
                    Your friend opens the link directly, or clicks <strong>"Join a Friend"</strong> and pastes the 3-word code. No accounts, passwords, or phone numbers needed.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-emerald), #059669)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '2px', fontWeight: 600 }}>
                    Direct Encrypted Chat & AirDrop
                  </h4>
                  <p style={{ fontSize: '0.8rem' }}>
                    Within seconds, you are connected peer-to-peer! Chat with zero delays, send high-res files without compression limits, and start encrypted P2P calls.
                  </p>
                </div>
              </div>
            </div>

            {/* Crucial Tips */}
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 242, 254, 0.15)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.85rem' }}>
                <Users size={16} />
                <span>Good to Know:</span>
              </div>
              <ul style={{ paddingLeft: '18px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Strictly 1-on-1:</strong> For strict privacy, each room holds exactly 2 peers. If a 3rd device joins, they will be notified the room is full.</li>
                <li><strong>Mobile Friendly:</strong> Works across mobile browsers (Chrome, Safari) and desktop seamlessly.</li>
                <li><strong>Burn on Close:</strong> When you leave or click Burn, all messages and transferred files vanish completely from RAM.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Privacy & Architecture */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <p style={{ color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                🔒 100% Zero-Knowledge & Serverless
              </p>
              <p style={{ fontSize: '0.8rem' }}>
                Unlike traditional apps (WhatsApp, Slack, Telegram), ZeroChat stores <strong>zero messages, zero logs, and zero files</strong> on any database. All communication travels directly from device to device.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                  <Cpu size={16} color="var(--accent-cyan)" />
                  <span>WebRTC Mesh</span>
                </div>
                <p style={{ fontSize: '0.76rem' }}>
                  Direct browser-to-browser UDP/SCTP channels encrypted with DTLS and SRTP.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                  <Zap size={16} color="var(--accent-emerald)" />
                  <span>Direct AirDrop</span>
                </div>
                <p style={{ fontSize: '0.76rem' }}>
                  Chunked memory streaming allows sending files of any size at maximum LAN/Wi-Fi speed.
                </p>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>
                <Globe size={16} color="var(--accent-purple)" />
                <span>Zero Running Costs Forever</span>
              </div>
              <p style={{ fontSize: '0.76rem' }}>
                Built with client-side React + Vite, hosted on GitHub Pages for free, utilizing free public Google STUN relays for peer NAT traversal.
              </p>
            </div>
          </div>
        )}

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '10px', marginTop: '6px' }}>
          Got It, Let's Chat!
        </button>
      </div>
    </div>
  );
}

