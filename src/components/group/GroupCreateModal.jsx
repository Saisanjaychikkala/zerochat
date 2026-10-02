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
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="card-icon-box cyan" style={{ width: '32px', height: '32px' }}>
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Launch Squad Group</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#8b949e' }}>
                Baton Pass Relay • Up to 8 Peers • $0 Cost
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#c9d1d9' }}>
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
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#c9d1d9' }}>
              Max Capacity
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[4, 6, 8].map(cap => (
                <button
                  type="button"
                  key={cap}
                  onClick={() => setCapacity(cap)}
                  className={`btn ${capacity === cap ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.8rem', padding: '6px 0' }}
                >
                  {cap} Peers {cap === 8 && '(Max)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#c9d1d9' }}>
              Baton Failover Policy
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPolicy('seniority')}
                className={`btn ${policy === 'seniority' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.76rem', padding: '6px 4px' }}
              >
                ⭐ Co-Host & Seniority
              </button>
              <button
                type="button"
                onClick={() => setPolicy('ping')}
                className={`btn ${policy === 'ping' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.76rem', padding: '6px 4px' }}
              >
                ⚡ Lowest Latency
              </button>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#8b949e' }}>
              If the host disconnects, the baton automatically transfers according to this policy with zero downtime.
            </p>
          </div>

          <div style={{ background: 'rgba(56, 139, 253, 0.08)', border: '1px solid rgba(56, 139, 253, 0.25)', borderRadius: '8px', padding: '10px', fontSize: '0.75rem', color: '#c9d1d9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#58a6ff', marginBottom: '2px' }}>
              <ShieldCheck size={14} />
              <span>Zero-Storage Relay Guarantee</span>
            </div>
            All squad messages and voice notes exist only in browser memory while connected. You will hold the Relay Authority (Baton) upon launch.
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, gap: '6px' }}>
              <Crown size={15} />
              <span>Launch & Take Baton</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
