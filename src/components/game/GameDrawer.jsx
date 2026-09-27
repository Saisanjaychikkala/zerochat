import React from 'react';
import { Gamepad2, CircleDot, Disc, X, Plus, Zap, Flame, Trophy } from 'lucide-react';

const GAMES_LIST = [
  {
    id: 'pong',
    name: 'Cyber Pong',
    tag: 'Fast Duel • 5 Pts',
    desc: 'High-speed 2-player real-time paddle duel. Deflect the cyber ball and score on your opponent.',
    icon: Gamepad2,
    color: '#00f2fe',
    badge: '60 FPS',
  },
  {
    id: 'grid',
    name: 'Cyber Grid (3x3)',
    tag: 'Turn-Based • Tactical',
    desc: 'Neon Tic-Tac-Toe duel. Align 3 cyan or emerald nodes in rows, columns, or diagonal vectors.',
    icon: CircleDot,
    color: '#9d4edd',
    badge: 'Strategic',
  },
  {
    id: 'c4',
    name: 'Connect 4',
    tag: 'Gravity Matrix • 7x6',
    desc: 'Vertical gravity drop battle. Slot your neon discs to connect four in a row before your rival.',
    icon: Disc,
    color: '#f43f5e',
    badge: 'Popular',
  }
];

export default function GameDrawer({
  isOpen,
  onClose,
  onSelectGame,
  activeGame
}) {
  if (!isOpen) return null;

  return (
    <div className="game-drawer-backdrop" onClick={onClose}>
      <div 
        className="game-drawer-panel glass-panel" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Select Game"
      >
        <div className="drawer-drag-pill" />
        <div className="game-drawer-header">
          <div className="game-drawer-title-group">
            <div className="game-drawer-badge-icon">
              <Zap size={18} color="#00f2fe" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Add Game to Chat</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select a duel to post into conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-xs" aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>

        <div className="game-drawer-body">
          {GAMES_LIST.map((game) => {
            const Icon = game.icon;
            const isCurrent = activeGame === game.id;
            return (
              <div 
                key={game.id} 
                data-game={game.id}
                className={`game-drawer-card ${isCurrent ? 'active' : ''}`}
                onClick={() => {
                  onSelectGame(game.id);
                  onClose();
                }}
              >
                <div 
                  className="game-card-icon"
                  style={{ 
                    background: `${game.color}15`, 
                    borderColor: `${game.color}35`,
                    color: game.color 
                  }}
                >
                  <Icon size={24} />
                </div>

                <div className="game-card-details">
                  <div className="game-card-title-row">
                    <span className="game-card-name">{game.name}</span>
                    <span className="game-card-pill" style={{ color: game.color, borderColor: `${game.color}40` }}>
                      {game.badge}
                    </span>
                  </div>
                  <span className="game-card-tag">{game.tag}</span>
                  <p className="game-card-desc">{game.desc}</p>
                </div>

                <button 
                  className="btn btn-primary btn-xs game-card-action game-add-chat-btn"
                  style={{ gap: '4px', padding: '0 10px', height: '28px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGame(game.id);
                    onClose();
                  }}
                >
                  <Plus size={13} />
                  <span>Add to Chat</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="game-drawer-footer">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            All games run peer-to-peer over encrypted WebRTC DataChannels. 0 Cloud Lag.
          </span>
        </div>
      </div>
    </div>
  );
}
