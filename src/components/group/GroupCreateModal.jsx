import React, { useState } from 'react';
import { Users, Crown, Zap, ShieldCheck, X, ArrowRight } from 'lucide-react';
import { generateSquadRoomId } from '../../services/webrtc/constants';

export function GroupCreateModal({
  isOpen,
  onClose,
  onCreateSquad
}) {
  const [squadName, setSquadName] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [policy, setPolicy] = useState('seniority');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanId = squadName.trim() 
      ? `squad-${squadName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`
      : generateSquadRoomId();

    onCreateSquad({
      roomId: cleanId,
      capacity,
      policy
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="card-icon-box cyan" style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Launch Squad Room</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Baton Pass Relay • Up to 8 Peers • $0 Cost
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Squad Room Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. nexus-squad (leave blank for random)"
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              className="chat-input text-sm"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Max Capacity
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[4, 6, 8].map(cap => (
                <button
                  type="button"
                  key={cap}
                  onClick={() => setCapacity(cap)}
                  className={`btn ${capacity === cap ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '8px 0', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {cap} Peers {cap === 8 && '(Max)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Baton Failover Policy
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPolicy('seniority')}
                className={`btn ${policy === 'seniority' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px 6px', fontSize: '0.76rem', fontWeight: 600 }}
              >
                ⭐ Co-Host & Seniority
              </button>
              <button
                type="button"
                onClick={() => setPolicy('ping')}
                className={`btn ${policy === 'ping' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px 6px', fontSize: '0.76rem', fontWeight: 600 }}
              >
                ⚡ Lowest Latency
              </button>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              If the host disconnects, the baton automatically transfers according to this policy with zero downtime.
            </p>
          </div>

          <div className="connection-guide-card" style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.76rem', color: 'var(--accent-cyan)' }}>
              <ShieldCheck size={14} />
              <span>100% Serverless Relay Guarantee</span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
              All squad messages and voice notes exist only in browser memory. You will hold the Relay Authority (Baton) upon launch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, height: '40px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '40px', gap: '6px', justifyContent: 'center' }}>
              <Crown size={15} />
              <span>Launch Squad</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
