import React from 'react';
import { Gamepad2, AlertTriangle, ArrowRight, X } from 'lucide-react';

export default function ConfirmGameModal({
  isOpen,
  onClose,
  onConfirm,
  activeRoomId
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '24px' }}
      >
        <div className="modal-header">
          <div className="modal-title-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '10px', 
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple, #a855f7)'
              }}
            >
              <Gamepad2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Launch Isolated Game Arena?
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Direct P2P Duel Sandbox
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-xs" aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ margin: '16px 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <div 
            style={{ 
              background: 'rgba(234, 179, 8, 0.08)', 
              border: '1px solid rgba(234, 179, 8, 0.25)', 
              borderRadius: '8px', 
              padding: '12px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              marginBottom: '14px'
            }}
          >
            <AlertTriangle size={18} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.82rem', color: '#fef08a' }}>
              Transitioning will close your active chat session <strong>{activeRoomId ? `#${activeRoomId}` : ''}</strong> and wipe volatile message history.
            </span>
          </div>
          <p style={{ margin: 0 }}>
            ZeroChat games run in a completely sandboxed room with a dedicated game room code and direct invite link.
          </p>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Stay in Chat
          </button>
          <button 
            onClick={onConfirm} 
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #9333ea, #7928ca)', borderColor: '#a855f7' }}
          >
            <span>Enter Game Arena</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
