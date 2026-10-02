import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, Sparkles, WifiOff, Handshake, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function CyberGridGame({
  cardId,
  initialState,
  status,
  isHost = true,
  isSpectator = false,
  player1 = 'Player 1',
  player2 = 'Player 2',
  myNickname = 'You',
  remotePeerNickname = 'Peer',
  showToast,
  onExitMatch,
  onEndRound,
  onUpdateCardState,
}) {
  const [board, setBoard] = useState(() => initialState?.board || Array(9).fill(null));
  const [turn, setTurn] = useState(() => initialState?.turn || 'X'); // 'X' moves first
  const [winner, setWinner] = useState(() => initialState?.winner || null);
  const [winningLine, setWinningLine] = useState(() => initialState?.winningLine || null);
  const [scores, setScores] = useState(() => initialState?.scores || { x: 0, o: 0, ties: 0 });

  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isSolo = !isConnected && status === 'disconnected';

  // Role authority: Host is X (Cyan, moves first); Guest is O (Neon, moves second)
  const mySymbol = (!isConnected || isHost) ? 'X' : 'O';
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const isMyTurn = !isSpectator && turn === mySymbol;

  // Persist live board state in memory cache
  useEffect(() => {
    if (onUpdateCardState && cardId) {
      onUpdateCardState(cardId, { board, turn, winner, winningLine, scores });
    }
  }, [board, turn, winner, winningLine, scores, cardId, onUpdateCardState]);

  // Check victory condition
  const checkWinner = (squares) => {
    for (let i = 0; i < WINNING_LINES.length; i++) {
      const [a, b, c] = WINNING_LINES[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    if (squares.every(Boolean)) {
      return { winner: 'Tie', line: null };
    }
    return null;
  };

  // Peer Event Listener
  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event || event.game !== 'grid') return;
      if (cardId && event.cardId && event.cardId !== cardId) return;

      if (event.type === 'grid_move') {
        setBoard((prev) => {
          if (prev[event.index] || winner) return prev;
          const nextBoard = [...prev];
          const symbolPlayed = event.symbol || opponentSymbol;
          nextBoard[event.index] = symbolPlayed;

          const res = checkWinner(nextBoard);
          if (res) {
            if (res.winner === 'Tie') {
              setWinner('Tie');
              setScores((s) => {
                const next = { ...s, ties: s.ties + 1 };
                if (onEndRound) onEndRound('Tie', `${next.x} - ${next.o}`);
                return next;
              });
            } else {
              const winnerName = isSpectator
                ? (res.winner === 'X' ? (player1 || 'Player 1') : (player2 || 'Player 2'))
                : (res.winner === mySymbol ? myNickname : remotePeerNickname);
              setWinner(winnerName);
              setWinningLine(res.line);
              setScores((s) => {
                const next = {
                  ...s,
                  x: res.winner === 'X' ? s.x + 1 : s.x,
                  o: res.winner === 'O' ? s.o + 1 : s.o,
                };
                if (onEndRound) onEndRound(winnerName, `${next.x} - ${next.o}`);
                return next;
              });
            }
          } else {
            setTurn(symbolPlayed === 'X' ? 'O' : 'X');
          }
          return nextBoard;
        });
      } else if (event.type === 'grid_restart') {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine(null);
        setTurn('X');
      }
    });

    return () => unsub();
  }, [winner, mySymbol, opponentSymbol, myNickname, remotePeerNickname, onEndRound, scores, isSpectator, player1, player2, cardId]);

  // AI Move (Strictly Practice / Solo Mode ONLY - Never during network reconnection)
  useEffect(() => {
    if (isSolo && turn === 'O' && !winner) {
      const timer = setTimeout(() => {
        const available = board
          .map((val, idx) => (val === null ? idx : null))
          .filter((val) => val !== null);

        if (available.length === 0) return;

        // Smart pick: center, then corners, or random
        let pick = available.includes(4) ? 4 : available[Math.floor(Math.random() * available.length)];

        setBoard((prev) => {
          const next = [...prev];
          next[pick] = 'O';
          const res = checkWinner(next);
          if (res) {
            if (res.winner === 'Tie') {
              setWinner('Tie');
              setScores((s) => ({ ...s, ties: s.ties + 1 }));
            } else {
              setWinner(res.winner === mySymbol ? myNickname : 'AI Bot');
              setWinningLine(res.line);
              if (res.winner === 'X') setScores((s) => ({ ...s, x: s.x + 1 }));
              else setScores((s) => ({ ...s, o: s.o + 1 }));
            }
          } else {
            setTurn('X');
          }
          return next;
        });
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [turn, isSolo, winner, board, mySymbol, myNickname]);

  const handleSquareClick = (index) => {
    if (board[index] || winner || !isMyTurn || isReconnecting) return;

    const nextBoard = [...board];
    nextBoard[index] = mySymbol;
    setBoard(nextBoard);

    if (isConnected) {
      peerService.sendGameEvent({
        game: 'grid',
        cardId,
        type: 'grid_move',
        index,
        symbol: mySymbol,
      });
    }

    const res = checkWinner(nextBoard);
    if (res) {
      if (res.winner === 'Tie') {
        setWinner('Tie');
        setScores((s) => {
          const next = { ...s, ties: s.ties + 1 };
          if (onEndRound) onEndRound('Tie', `${next.x} - ${next.o}`);
          return next;
        });
      } else {
        const winnerName = myNickname;
        setWinner(winnerName);
        setWinningLine(res.line);
        confetti({ particleCount: 80, spread: 70 });
        setScores((s) => {
          const next = {
            ...s,
            x: mySymbol === 'X' ? s.x + 1 : s.x,
            o: mySymbol === 'O' ? s.o + 1 : s.o,
          };
          if (onEndRound) onEndRound(winnerName, `${next.x} - ${next.o}`);
          return next;
        });
      }
    } else {
      setTurn(opponentSymbol);
    }
  };

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
    setTurn('X');
    if (isConnected) {
      peerService.sendGameEvent({ game: 'grid', cardId, type: 'grid_restart' });
    }
  };

  const myDisplayScore = mySymbol === 'X' ? scores.x : scores.o;
  const opponentDisplayScore = mySymbol === 'X' ? scores.o : scores.x;
  const opponentLabel = isConnected ? remotePeerNickname || 'Peer' : 'AI Bot';

  return (
    <div className="cyber-grid-container">
      {/* Subheader: Scores & Reset (Duplicate Back button purged per Item 5) */}
      <div className="grid-status-bar">
        <div className="grid-score-pills">
          <span className="score-pill you">
            {isSpectator ? (player1 || 'Player 1') : myNickname} ({isSpectator ? 'X' : mySymbol}): {isSpectator ? scores.x : myDisplayScore}
          </span>
          <span className="score-pill ties">Ties: {scores.ties}</span>
          <span className="score-pill peer">
            {isSpectator ? (player2 || 'Player 2') : opponentLabel} ({isSpectator ? 'O' : opponentSymbol}): {isSpectator ? scores.o : opponentDisplayScore}
          </span>
        </div>

        <button onClick={handleRestart} className="btn btn-icon btn-xs" title="Reset Grid for New Round">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Network Reconnection Pause Notice */}
      {isReconnecting && (
        <div className="game-pause-banner">
          <WifiOff size={13} className="animate-spin text-amber-400" />
          <span>Opponent reconnecting... Pausing match.</span>
        </div>
      )}

      {/* Turn Banner */}
      <div className="grid-turn-indicator">
        {!winner ? (
          <span className={isMyTurn ? 'active-turn user' : 'active-turn opponent'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {isSpectator ? (
              <span>Turn: {turn === 'X' ? (player1 || 'Player 1') : (player2 || 'Player 2')} ({turn})</span>
            ) : isMyTurn ? (
              <>
                <Zap size={13} />
                <span>Your Turn (Place {mySymbol})</span>
              </>
            ) : (
              <span>Waiting for {opponentLabel} ({opponentSymbol})...</span>
            )}
          </span>
        ) : (
          <span className="winner-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {winner === 'Tie' ? (
              <>
                <Handshake size={14} color="#00e5ff" />
                <span>Tactical Tie!</span>
              </>
            ) : (
              <>
                <Trophy size={14} color="#eab308" />
                <span>{winner} Wins!</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* 3x3 Board */}
      <div className="cyber-board">
        {board.map((cell, idx) => {
          const isWinningCell = winningLine && winningLine.includes(idx);
          return (
            <button
              key={idx}
              className={`cyber-cell ${cell ? `filled-${cell.toLowerCase()}` : ''} ${isWinningCell ? 'winning-cell' : ''}`}
              onClick={() => handleSquareClick(idx)}
              disabled={!!cell || !!winner || !isMyTurn || isReconnecting}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Victory Celebration Overlay */}
      {winner && (
        <div className="grid-win-action" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!isSpectator && (
            <button onClick={handleRestart} className="btn btn-primary">
              <Sparkles size={15} />
              <span>Play Next Round</span>
            </button>
          )}
          {onExitMatch && (
            <button onClick={onExitMatch} className="btn btn-secondary">
              <span>Return to Chat</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
