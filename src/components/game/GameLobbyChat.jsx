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
  Shield,
  Zap
} from 'lucide-react';

const QUICK_CHIPS = ['Ready! 🚀', 'GG! 🏆', 'Rematch! ⚔️', 'Nice shot! 🔥', 'One more! 🎯'];

export default function GameLobbyChat({
  status,
  myNickname,
  myAvatarBg,
  remotePeerNickname,
  remoteAvatarBg,
  activeChallenge,
  onJoinChallenge,
  onStartMatch,
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
      {/* Top Banner: Arena Match Stage & Challenge Cards */}
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

              <div className="challenge-status-pill">
                <span className={`status-dot ${activeChallenge.isGuestJoined ? 'connected' : 'connecting'}`} />
                <span>{activeChallenge.isGuestJoined ? 'Both Ready!' : 'Waiting for Opponent'}</span>
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
                      {isHost ? `Waiting for ${remotePeerNickname || 'Peer'}...` : 'You can join!'}
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
          <div className="no-challenge-hero">
            <div className="hero-icon-bubble">
              <Zap size={28} color="var(--accent-purple, #a855f7)" />
            </div>
            <h3>P2P Game Arena Duel</h3>
            <p>Select a game from the library to propose a match to your opponent.</p>
            <button onClick={onOpenDrawer} className="btn btn-primary purple-bg text-xs">
              <Gamepad2 size={15} />
              <span>Open Game Library</span>
            </button>
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
              <span>Send quick reactions or chat while waiting for the match to begin!</span>
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
