import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  Send, 
  Sparkles, 
  MessageSquare,
  Plus
} from 'lucide-react';
import InChatGameCard from './InChatGameCard';

const QUICK_CHIPS = ['Ready! 🚀', 'GG! 🏆', 'Rematch! ⚔️', 'Nice shot! 🔥', 'One more! 🎯'];

export default function GameLobbyChat({
  status,
  myNickname,
  myAvatarBg,
  remotePeerNickname,
  remoteAvatarBg,
  chatMessages,
  onSendChatMessage,
  onOpenDrawer,
  onJoinCard,
  onLaunchCard,
  isHost,
}) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
      {/* Unified In-Game Chat Feed with In-Chat Game Cards */}
      <div className="game-chat-feed unified-arena-feed">
        <div className="game-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={13} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>Arena Chat & Games</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {isConnected ? `Online with ${remotePeerNickname || 'Opponent'}` : 'Ephemeral Session'}
          </span>
        </div>

        <div className="game-chat-messages">
          {chatMessages.length === 0 ? (
            <div className="empty-game-chat">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', maxWidth: '320px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#c084fc'
                }}>
                  <Gamepad2 size={24} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Arena Chat & Games
                </h4>
                <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Chat with your opponent or select a game to post an interactive duel card into the chat!
                </p>
                <button 
                  onClick={onOpenDrawer}
                  className="btn btn-primary purple-bg btn-xs"
                  style={{ gap: '6px', padding: '0 12px', height: '30px' }}
                >
                  <Plus size={13} />
                  <span>Add Game to Chat</span>
                </button>
              </div>
            </div>
          ) : (
            chatMessages.map((msg, i) => {
              if (msg.type === 'game_card') {
                return (
                  <InChatGameCard 
                    key={msg.cardId || i}
                    card={msg}
                    myNickname={myNickname}
                    onJoinCard={onJoinCard}
                    onLaunchCard={onLaunchCard}
                  />
                );
              }

              const isMine = msg.sender === 'me';
              return (
                <div key={i} className={`game-chat-item game-msg-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && (
                    <div 
                      className="game-msg-avatar" 
                      style={{ background: msg.avatarBg || 'var(--accent-purple)' }}
                    >
                      {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'P'}
                    </div>
                  )}
                  <div className={`game-msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                    <span className="game-msg-text chat-text">{msg.text}</span>
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

        {/* Chat Input Bar with "+ Games" trigger */}
        <form onSubmit={handleSubmit} className="game-chat-input-bar">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="btn btn-secondary btn-xs game-add-card-btn"
            title="Open Game Drawer to add a game challenge to chat"
            style={{ height: '34px', padding: '0 10px', gap: '5px', borderRadius: '8px' }}
          >
            <Gamepad2 size={15} color="var(--accent-purple, #c084fc)" />
            <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>+ Game</span>
          </button>

          <input
            type="text"
            placeholder="Type a message or react..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="chat-input text-xs"
            autoComplete="off"
            style={{ flex: 1 }}
          />

          <button type="submit" className="btn btn-primary btn-xs game-chat-send-btn" disabled={!inputText.trim()} style={{ height: '34px', width: '34px', padding: 0 }}>
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
