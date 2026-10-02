import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, Gamepad2, Zap, Eye } from 'lucide-react';
import CyberPongGame from './CyberPongGame';
import CyberGridGame from './CyberGridGame';
import CyberConnectFour from './CyberConnectFour';
import { peerService } from '../../services/peerService';
import { playSound } from '../../utils/soundEffects';

const GAME_TITLES = {
  pong: 'Cyber Pong • Duel',
  grid: 'Cyber Grid (3x3)',
  c4: 'Connect 4 Matrix',
};

const EMOTES = ['👏', '🔥', '😂', 'GG'];

export default function ActiveMatchStage({
  cardId,
  activeGame,
  initialState,
  status,
  isHost,
  isSpectator = false,
  player1,
  player2,
  myNickname,
  remotePeerNickname,
  showToast,
  onExitMatch,
  onReturnToChat,
  onEndRound,
  onUpdateCardState,
}) {
  const isConnected = status === 'connected';
  const opponentLabel = isConnected ? remotePeerNickname || 'Peer' : 'AI Bot';
  const [activeEmote, setActiveEmote] = useState(null);

  // Listen for incoming match emotes and turn nudges
  useEffect(() => {
    const unsubGame = peerService.on('game_event', (event) => {
      if (!event || event.game !== activeGame) return;
      if (cardId && event.cardId && event.cardId !== cardId) return;
      if (event.type === 'game_emote') {
        setActiveEmote({ text: event.emoji, sender: event.sender || 'Opponent' });
        try { playSound('pop', true); } catch (e) {}
        setTimeout(() => setActiveEmote(null), 2500);
      } else if (event.type === 'game_nudge') {
        const sender = event.sender || 'Opponent';
        setActiveEmote({ text: '⚡', sender: `${sender} is nudging you!` });
        try { playSound('pop', true); } catch (e) {}
        if (showToast) showToast(`⚡ ${sender} is nudging you! It's your turn in ${GAME_TITLES[activeGame] || 'Game'}!`, 'warning');
        setTimeout(() => setActiveEmote(null), 3000);
      }
    });

    const unsubNudge = peerService.on('peer_nudge', (nudge) => {
      const sender = nudge.senderNickname || 'Opponent';
      setActiveEmote({ text: '⚡', sender: `${sender} nudged you!` });
      try { playSound('pop', true); } catch (e) {}
      if (showToast) showToast(`⚡ ${sender}: ${nudge.message || "It's your turn!"}`, 'warning');
      setTimeout(() => setActiveEmote(null), 3000);
    });

    return () => {
      unsubGame();
      unsubNudge();
    };
  }, [activeGame, cardId, showToast]);

  const handleSendEmote = (emoji) => {
    setActiveEmote({ text: emoji, sender: myNickname || 'You' });
    try { playSound('pop', true); } catch (e) {}
    setTimeout(() => setActiveEmote(null), 2500);

    if (isConnected) {
      peerService.sendGameEvent({
        game: activeGame,
        cardId,
        type: 'game_emote',
        emoji,
        sender: myNickname || 'You',
      });
    }
  };

  const handleTurnNudge = () => {
    if (!isConnected) {
      if (showToast) showToast('Opponent is an AI bot (instant response)', 'info');
      return;
    }
    peerService.sendNudge(`${myNickname || 'Opponent'} is nudging you! It's your turn in ${GAME_TITLES[activeGame] || 'Game'}!`, 'game_turn');
    if (cardId) {
      peerService.sendGameEvent({
        game: activeGame,
        cardId,
        type: 'game_nudge',
        sender: myNickname || 'Opponent',
      });
    }
    try { playSound('pop', true); } catch (e) {}
    if (showToast) showToast(`Sent turn nudge to ${opponentLabel}!`, 'success');
  };

  return (
    <div className="active-match-stage glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* Top Universal Match Navigation Bar */}
      <div className="active-match-top-nav">
        <button 
          type="button"
          onClick={onReturnToChat || onExitMatch} 
          className="btn btn-secondary text-xs return-to-chat-btn" 
          title={onReturnToChat ? "Return to Chat Window (Keep Game Running in Background)" : "Exit Active Match to Arena Lobby"}
        >
          <ArrowLeft size={15} />
          <span>{onReturnToChat ? "Return to Chat" : "Back to Lobby"}</span>
        </button>

        {isSpectator ? (
          <div className="active-match-title-pill" style={{ background: 'rgba(192, 132, 252, 0.12)', borderColor: 'rgba(192, 132, 252, 0.35)' }}>
            <Gamepad2 size={13} color="#c084fc" />
            <span className="match-title-text" style={{ color: '#e9d5ff' }}>{GAME_TITLES[activeGame] || 'P2P Duel'}</span>
            <span className="match-vs-text" style={{ color: '#d8b4fe' }}>
              <span style={{ color: 'var(--accent-cyan, #00f2fe)', fontWeight: 600 }}>{player1 || 'Player 1'}</span> vs <span style={{ color: 'var(--accent-purple, #c084fc)', fontWeight: 600 }}>{player2 || 'Player 2'}</span>
            </span>
          </div>
        ) : (
          <div className="active-match-title-pill">
            <Gamepad2 size={13} color="var(--accent-cyan, #00f2fe)" />
            <span className="match-title-text">{GAME_TITLES[activeGame] || 'P2P Duel'}</span>
            <span className="match-vs-text">
              {myNickname || 'You'} vs {opponentLabel}
            </span>
            <span className={`status-dot ${status}`} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isSpectator ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(192, 132, 252, 0.18)', border: '1px solid rgba(192, 132, 252, 0.45)', color: '#c084fc', fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              <Eye size={13} />
              <span>SPECTATOR • VIEW ONLY</span>
            </span>
          ) : (
            <>
              {isConnected && (
                <button
                  type="button"
                  onClick={handleTurnNudge}
                  className="btn btn-secondary text-xs"
                  style={{ height: '30px', padding: '0 8px', borderColor: 'rgba(0, 242, 254, 0.3)' }}
                  title="Nudge opponent when it is their turn"
                >
                  <Zap size={12} color="#00f2fe" />
                  <span className="exit-btn-label">Nudge</span>
                </button>
              )}

              {onExitMatch && (
                <button 
                  type="button"
                  onClick={onExitMatch} 
                  className="btn btn-secondary text-xs exit-match-btn" 
                  title="End Match & Close Card"
                >
                  <X size={13} />
                  <span className="exit-btn-label">End</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Active Emote Reaction Toast */}
      {activeEmote && (
        <div style={{
          position: 'absolute',
          top: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          background: 'rgba(10, 15, 29, 0.92)',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          borderRadius: '20px',
          padding: '4px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(0, 242, 254, 0.3)',
          animation: 'fade-in 0.2s ease',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.3rem' }}>{activeEmote.text}</span>
          <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{activeEmote.sender}</span>
        </div>
      )}

      {/* Active Game Canvas / Matrix */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', pointerEvents: isSpectator ? 'none' : 'auto' }}>
        {activeGame === 'pong' ? (
          <CyberPongGame 
            cardId={cardId}
            initialState={initialState}
            status={status}
            isHost={isHost}
            isSpectator={isSpectator}
            player1={player1}
            player2={player2}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            onExitMatch={onReturnToChat || onExitMatch}
            onEndRound={onEndRound}
            onUpdateCardState={onUpdateCardState}
          />
        ) : activeGame === 'grid' ? (
          <CyberGridGame 
            cardId={cardId}
            initialState={initialState}
            status={status} 
            isHost={isHost}
            isSpectator={isSpectator}
            player1={player1}
            player2={player2}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname} 
            showToast={showToast}
            onExitMatch={onReturnToChat || onExitMatch}
            onEndRound={onEndRound}
            onUpdateCardState={onUpdateCardState}
          />
        ) : (
          <CyberConnectFour
            cardId={cardId}
            initialState={initialState}
            status={status}
            isHost={isHost}
            isSpectator={isSpectator}
            player1={player1}
            player2={player2}
            myNickname={myNickname}
            remotePeerNickname={remotePeerNickname}
            showToast={showToast}
            onExitMatch={onReturnToChat || onExitMatch}
            onEndRound={onEndRound}
            onUpdateCardState={onUpdateCardState}
          />
        )}
      </div>

      {/* Match Bottom Floating Emote Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(0, 0, 0, 0.45)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginRight: '4px' }}>React:</span>
        {EMOTES.map((emo) => (
          <button
            key={emo}
            type="button"
            onClick={() => handleSendEmote(emo)}
            className="btn btn-icon btn-xs"
            style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}
            title={`Send ${emo}`}
          >
            {emo}
          </button>
        ))}
      </div>
    </div>
  );
}
