import React, { useState } from 'react';
import { User, Check, X } from 'lucide-react';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #00f2fe, #4facfe)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
];

export default function NicknameModal({ isOpen, onClose, currentNickname, onSaveNickname }) {
  const [nickname, setNickname] = useState(currentNickname || '');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      onSaveNickname(nickname.trim(), selectedColor);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Your Peer Identity</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '4px 0' }}>
            <div 
              style={{ 
                width: '54px', 
                height: '54px', 
                borderRadius: '50%', 
                background: selectedColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                fontWeight: 800,
                fontSize: '1.2rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
              }}
            >
              {nickname ? nickname.substring(0, 2).toUpperCase() : 'ME'}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {AVATAR_COLORS.map((bg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColor(bg)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: bg,
                    border: selectedColor === bg ? '2px solid #fff' : '2px solid transparent',
                    cursor: 'pointer',
                    transform: selectedColor === bg ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Display Nickname</label>
            <input
              type="text"
              placeholder="e.g. Sanjay, Neo, Ghost..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="chat-input"
              maxLength={24}
              autoFocus
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            Your nickname is transmitted directly over WebRTC to identify you in active chat sessions. Never saved to any external database.
          </p>

          <button type="submit" className="btn btn-primary" style={{ padding: '10px' }} disabled={!nickname.trim()}>
            <Check size={16} />
            <span>Save Identity</span>
          </button>
        </form>
      </div>
    </div>
  );
}
