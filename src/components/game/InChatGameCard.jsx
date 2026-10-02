import React from 'react';
import { Gamepad2, CircleDot, Disc, Users, Check, Play, Ban, Trophy, RefreshCw, X, Handshake, Zap, Eye } from 'lucide-react';

const GAME_CONFIGS = {
  pong: {
    icon: Gamepad2,
    color: '#00f2fe',
    tag: 'Cyber Pong • 2P Duel',
  },
  grid: {
    icon: CircleDot,
    color: '#10b981',
    tag: 'Cyber Grid (3x3) • Tactical',
  },
  c4: {
    icon: Disc,
    color: '#c084fc',
    tag: 'Connect 4 • 7x6 Matrix',
  },
};

export default function InChatGameCard({
  card,
  myNickname,
  onJoinCard,
  onLaunchCard,
  onResumeCard,
  onExitCard,
  onRematch,
}) {
  const config = GAME_CONFIGS[card.gameId] || GAME_CONFIGS.pong;
  const Icon = config.icon;
  const isConcluded = !!card.isConcluded;
  const isHostSlot = card.hostNickname && myNickname && card.hostNickname.toLowerCase() === myNickname.toLowerCase();
  const isGuestSlot = card.guestNickname && myNickname && card.guestNickname.toLowerCase() === myNickname.toLowerCase();
  const isPlayer = isHostSlot || isGuestSlot;
  const joinedCount = (card.hostNickname ? 1 : 0) + (card.guestNickname ? 1 : 0);
  const isFull = joinedCount >= 2;
  const isPlaying = !!card.isPlaying;
  const canJoin = !isFull && !isPlayer && !isConcluded;

  return (
    <div className={`in-chat-game-card glass-panel ${isConcluded ? 'concluded' : ''}`}>
      {/* Card Header */}
      <div className="in-chat-card-header">
        <div className="in-chat-card-title-group">
          <div 
            className="in-chat-card-icon"
            style={{ 
              background: isConcluded ? 'rgba(255,255,255,0.05)' : `${config.color}20`,
              borderColor: isConcluded ? 'rgba(255,255,255,0.1)' : `${config.color}40`,
              color: isConcluded ? '#888' : config.color
            }}
          >
            <Icon size={18} />
          </div>
          <div>
            <h4 className="in-chat-card-title">{card.gameName}</h4>
            <span className="in-chat-card-tag">{config.tag}</span>
          </div>
        </div>

        <div className="in-chat-card-badge">
          {isConcluded ? (
            <span className="badge-concluded">
              <Ban size={11} />
              <span>Concluded</span>
            </span>
          ) : isPlaying ? (
            <span className="badge-ready" style={{ background: 'rgba(0, 242, 254, 0.15)', borderColor: 'var(--accent-cyan)' }}>
              <span className="status-dot connected" style={{ width: '6px', height: '6px' }} />
              <span style={{ color: 'var(--accent-cyan)' }}>In Progress</span>
            </span>
          ) : isFull ? (
            <span className="badge-ready">
              <Check size={11} />
              <span>2/2 Ready!</span>
            </span>
          ) : joinedCount === 1 ? (
            <span className="badge-waiting">
              <Users size={11} />
              <span>1/2 Joined</span>
            </span>
          ) : (
            <span className="badge-waiting" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              <Users size={11} />
              <span>0/2 Open Slots</span>
            </span>
          )}
        </div>
      </div>

      {/* Players Row */}
      <div className="in-chat-players-row">
        {/* Player 1 Slot */}
        {card.hostNickname ? (
          <div className="in-chat-player-slot ready">
            <div 
              className="in-chat-player-avatar" 
              style={{ background: card.hostAvatarBg || 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
            >
              <span>{card.hostNickname.charAt(0).toUpperCase()}</span>
            </div>
            <div className="in-chat-player-info">
              <span className="in-chat-player-name">{card.hostNickname}</span>
              <span className="in-chat-player-role">Player 1</span>
            </div>
            <div className="in-chat-ready-dot" title="Joined">
              <Check size={12} color="#10b981" />
            </div>
          </div>
        ) : (
          <div className="in-chat-player-slot waiting">
            <div className="in-chat-player-avatar empty">
              <Users size={14} color="var(--text-dim)" />
            </div>
            <div className="in-chat-player-info">
              <span className="in-chat-player-name empty">Open Slot</span>
              <span className="in-chat-player-role">Player 1</span>
            </div>
          </div>
        )}

        <span className="in-chat-vs-label">VS</span>

        {/* Player 2 Slot */}
        {card.guestNickname ? (
          <div className="in-chat-player-slot ready">
            <div 
              className="in-chat-player-avatar" 
              style={{ background: card.guestAvatarBg || 'linear-gradient(135deg, #c084fc, #f43f5e)' }}
            >
              <span>{card.guestNickname.charAt(0).toUpperCase()}</span>
            </div>
            <div className="in-chat-player-info">
              <span className="in-chat-player-name">{card.guestNickname}</span>
              <span className="in-chat-player-role">Player 2</span>
            </div>
            <div className="in-chat-ready-dot" title="Joined">
              <Check size={12} color="#10b981" />
            </div>
          </div>
        ) : (
          <div className="in-chat-player-slot waiting">
            <div className="in-chat-player-avatar empty">
              <Users size={14} color="var(--text-dim)" />
            </div>
            <div className="in-chat-player-info">
              <span className="in-chat-player-name empty">Open Slot</span>
              <span className="in-chat-player-role">Player 2</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="in-chat-card-actions">
        {isConcluded ? (
          <div className="in-chat-concluded-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="in-chat-winner-banner" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: card.winner ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: card.winner ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.76rem',
              color: 'var(--text-main)',
            }}>
              {card.winner ? (
                card.winner === 'draw' || card.winner === 'Tactical Draw' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Handshake size={14} color="#00e5ff" />
                    <span>Tactical Draw {card.finalScore ? `(${card.finalScore})` : ''}</span>
                  </span>
                ) : (
                  <>
                    <Trophy size={14} color="#eab308" />
                    <span>
                      <strong style={{ color: '#00f2fe' }}>{card.winner}</strong> won! {card.finalScore ? `(${card.finalScore})` : ''}
                    </span>
                  </>
                )
              ) : (
                <span>Match Concluded • Resources Cleared</span>
              )}
            </div>
            {onRematch && (
              <button 
                type="button"
                onClick={() => onRematch(card.gameId)}
                className="btn btn-secondary btn-xs w-full rematch-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--accent-cyan)',
                  borderColor: 'rgba(0, 242, 254, 0.3)',
                  height: '32px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} />
                <span>Play Rematch</span>
              </button>
            )}
          </div>
        ) : isPlayer ? (
          isFull ? (
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <button 
                type="button"
                onClick={() => (onResumeCard || onLaunchCard) && (onResumeCard || onLaunchCard)(card.cardId)}
                className="btn btn-primary btn-xs resume-card-btn"
                style={{ flex: 1 }}
              >
                <Play size={13} />
                <span>{isPlaying ? `Resume ${card.gameName} Match` : `Launch ${card.gameName} Now!`}</span>
              </button>
              {onExitCard && isPlaying && (
                <button
                  type="button"
                  onClick={() => onExitCard(card.cardId)}
                  className="btn btn-secondary btn-xs"
                  style={{ padding: '0 10px', fontSize: '0.72rem', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                  title="End match and conclude duel"
                >
                  <X size={12} />
                  <span>End</span>
                </button>
              )}
            </div>
          ) : (
            <div className="in-chat-waiting-msg">
              <span className="animate-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={12} />
                <span>Joined! Waiting for opponent to join...</span>
              </span>
            </div>
          )
        ) : canJoin ? (
          <button 
            type="button"
            onClick={() => onJoinCard && onJoinCard(card.cardId)}
            className="btn btn-primary btn-xs w-full join-card-btn"
          >
            <Play size={13} />
            <span>Join Match ({joinedCount}/2)</span>
          </button>
        ) : isFull ? (
          <button 
            type="button"
            onClick={() => onLaunchCard && onLaunchCard(card.cardId, { isSpectator: true })}
            className="btn btn-secondary btn-xs w-full spectate-card-btn"
            style={{ borderColor: 'rgba(192, 132, 252, 0.4)', color: '#c084fc', background: 'rgba(192, 132, 252, 0.08)' }}
          >
            <Eye size={13} />
            <span>Spectate Match (2/2 Playing)</span>
          </button>
        ) : (
          <div className="in-chat-waiting-msg">
            <span className="animate-pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={12} />
              <span>Waiting for players to join...</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
