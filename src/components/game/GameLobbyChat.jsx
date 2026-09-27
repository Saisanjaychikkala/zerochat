import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  Send, 
  Sparkles, 
  Users, 
  Check, 
  Play, 
  ArrowRight,
  MessageSquare,
  Zap,
  Bot,
  Swords,
  RotateCcw
} from 'lucide-react';

const QUICK_CHIPS = ['Ready! 🚀', 'GG! 🏆', 'Rematch! ⚔️', 'Nice shot! 🔥', 'One more! 🎯'];

const AVAILABLE_GAMES = [
  {
    id: 'grid',
    name: 'Cyber Grid (3x3)',
    badge: 'Fast Duel',
    desc: 'Tactical 3-in-a-row grid duel. Strategic and instant turns.',
    icon: Sparkles,
    color: '#00f2fe',
  },
  {
    id: 'pong',
    name: 'Cyber Pong',
    badge: '60fps Physics',
    desc: 'Fast paddle face-off with real-time WebRTC ball sync.',
    icon: Gamepad2,
    color: '#10b981',
  },
  {
    id: 'c4',
    name: 'Connect Four',
    badge: 'Gravity Drop',
    desc: '7x6 vertical drop arena. Connect 4 tokens in a line.',
    icon: Zap,
    color: '#c084fc',
  },
];

export default function GameLobbyChat({
  status,
  myNickname,
  myAvatarBg,
  remotePeerNickname,
  remoteAvatarBg,
  activeChallenge,
  onJoinChallenge,
  onStartMatch,
  onSelectGame,
  onOpenDrawer,
  chatMessages,
  onSendChatMessage,
  isHost,
}) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChallenge]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendChatMessage(inputText.trim());
    setInputText('');
  };

  const handleChipClick = (chip) => {
    onSendChatMessage(chip);
  };

  return (
    <div className="game-lobby-chat-container">
      {/* Top Banner: Active Challenge vs Interactive Game Selection Shelf */}
      <div className="game-lobby-stage glass-panel">
        {activeChallenge ? (
          <div className="active-challenge-card">
            <div className="challenge-card-header">
              <div className="challenge-game-info">
                <div className="challenge-icon-box">
                  <Gamepad2 size={20} color="#00f2fe" />
                </div>
                <div>
                  <h4 className="challenge-title">{activeChallenge.gameName} Duel</h4>
                  <span className="challenge-sub">P2P Ephemeral Arena Match</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="challenge-status-pill">
                  <span className={`status-dot ${activeChallenge.isGuestJoined ? 'connected' : 'connecting'}`} />
                  <span>{activeChallenge.isGuestJoined ? 'Both Ready!' : 'Waiting for Opponent'}</span>
                </div>
                {onSelectGame && (
                  <button 
                    onClick={() => onSelectGame(null)} 
                    className="btn btn-secondary btn-xs"
                    title="Choose a different game"
                    style={{ height: '24px', padding: '0 6px', fontSize: '0.7rem', gap: '3px' }}
                  >
                    <RotateCcw size={11} />
                    <span>Change</span>
                  </button>
                )}
              </div>
            </div>

            {/* Players Face-Off Card */}
            <div className="challenge-players-grid">
              {/* Player 1 (Host / Proposer) */}
              <div className="challenge-player-box host">
                <div 
                  className="challenge-avatar"
                  style={{ background: activeChallenge.hostAvatarBg || 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
                >
                  <span>{activeChallenge.hostNickname ? activeChallenge.hostNickname.charAt(0).toUpperCase() : 'H'}</span>
                </div>
                <div className="challenge-player-meta">
                  <span className="player-name">{activeChallenge.hostNickname}</span>
                  <span className="player-role-badge">Creator (P1)</span>
                </div>
                <div className="player-ready-check">
                  <Check size={14} color="#10b981" />
                </div>
              </div>

              <div className="challenge-vs-badge">
                <span>VS</span>
              </div>

              {/* Player 2 (Guest / Joiner) */}
              <div className={`challenge-player-box guest ${activeChallenge.isGuestJoined ? 'joined' : 'empty'}`}>
                {activeChallenge.isGuestJoined ? (
                  <>
                    <div 
                      className="challenge-avatar"
                      style={{ background: activeChallenge.guestAvatarBg || 'linear-gradient(135deg, #9d4edd, #f43f5e)' }}
                    >
                      <span>{activeChallenge.guestNickname ? activeChallenge.guestNickname.charAt(0).toUpperCase() : 'G'}</span>
                    </div>
                    <div className="challenge-player-meta">
                      <span className="player-name">{activeChallenge.guestNickname}</span>
                      <span className="player-role-badge">Challenger (P2)</span>
                    </div>
                    <div className="player-ready-check">
                      <Check size={14} color="#10b981" />
                    </div>
                  </>
                ) : (
                  <div className="guest-waiting-slot">
                    <div className="avatar-placeholder">
                      <Users size={18} />
                    </div>
                    <span className="waiting-label">
                      {isHost ? `Waiting for ${remotePeerNickname || 'Opponent'}...` : 'You can join!'}
                    </span>
                    {!isHost && (
                      <button onClick={onJoinChallenge} className="btn btn-primary btn-xs join-btn">
                        <Play size={12} />
                        <span>Join Match</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Launch Match Trigger */}
            <div className="challenge-action-row">
              {activeChallenge.isGuestJoined ? (
                <button onClick={onStartMatch} className="btn btn-primary w-full launch-match-btn">
                  <Play size={15} />
                  <span>Launch {activeChallenge.gameName} Now!</span>
                </button>
              ) : isHost ? (
                <div className="waiting-hint-bar">
                  <span className="pulse-text">⚡ Waiting for {remotePeerNickname || 'Opponent'} to click Join Match...</span>
                </div>
              ) : (
                <button onClick={onJoinChallenge} className="btn btn-primary w-full join-large-btn">
                  <Play size={15} />
                  <span>Join Match as Player 2</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Prominent Interactive Game Shelf */
          <div className="game-shelf-container">
            <div className="game-shelf-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Swords size={16} color="var(--accent-purple, #c084fc)" />
                <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Select a Game to Play
                </h4>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isConnected ? `Online with ${remotePeerNickname || 'Opponent'}` : 'Solo / Waiting for Peer'}
              </span>
            </div>

            <div className="game-cards-row">
              {AVAILABLE_GAMES.map((game) => {
                const IconComponent = game.icon;
                return (
                  <div key={game.id} className="game-select-card glass-panel">
                    <div className="game-card-top">
                      <div className="game-card-icon" style={{ background: `${game.color}18`, borderColor: `${game.color}40` }}>
                        <IconComponent size={20} color={game.color} />
                      </div>
                      <span className="game-card-badge" style={{ color: game.color, background: `${game.color}15` }}>
                        {game.badge}
                      </span>
                    </div>

                    <h5 className="game-card-title">{game.name}</h5>
                    <p className="game-card-desc">{game.desc}</p>

                    <div className="game-card-actions">
                      <button
                        onClick={() => onSelectGame && onSelectGame(game.id, false)}
                        className="btn btn-primary btn-xs w-full"
                        style={{ height: '28px', fontSize: '0.74rem', gap: '4px' }}
                        title={isConnected ? `Propose ${game.name} duel to opponent` : `Start ${game.name}`}
                      >
                        <Swords size={12} />
                        <span>{isConnected ? 'Duel Opponent' : 'Play Game'}</span>
                      </button>

                      {isConnected && (
                        <button
                          onClick={() => onSelectGame && onSelectGame(game.id, true)}
                          className="btn btn-secondary btn-xs"
                          style={{ height: '28px', fontSize: '0.7rem', padding: '0 8px', gap: '3px' }}
                          title="Practice vs AI offline without interrupting peer"
                        >
                          <Bot size={11} />
                          <span>Solo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Game Arena Ephemeral Chat Feed */}
      <div className="game-chat-feed">
        <div className="game-chat-header">
          <MessageSquare size={13} color="var(--accent-cyan)" />
          <span>In-Game Ephemeral Chat</span>
        </div>

        <div className="game-chat-messages">
          {chatMessages.length === 0 ? (
            <div className="empty-game-chat">
              <span>Send quick reactions or chat while challenging your opponent!</span>
            </div>
          ) : (
            chatMessages.map((msg, i) => {
              const isMine = msg.sender === 'me';
              return (
                <div key={i} className={`game-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && (
                    <div 
                      className="game-msg-avatar" 
                      style={{ background: msg.avatarBg || 'var(--accent-purple)' }}
                    >
                      {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'P'}
                    </div>
                  )}
                  <div className={`game-msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    <span className="game-msg-text">{msg.text}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Reaction Chips */}
        <div className="game-quick-chips">
          {QUICK_CHIPS.map((chip, idx) => (
            <button key={idx} onClick={() => handleChipClick(chip)} className="chip-btn">
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSubmit} className="game-chat-input-bar">
          <input
            type="text"
            placeholder="Type a message or react..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="chat-input text-xs"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-xs" disabled={!inputText.trim()}>
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
