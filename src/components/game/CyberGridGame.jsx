import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, Sparkles, WifiOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function CyberGridGame({
  status,
  isHost = true,
  myNickname = 'You',
  remotePeerNickname = 'Peer',
  showToast,
  onExitMatch,
  onEndRound,
}) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X'); // 'X' moves first
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [scores, setScores] = useState({ x: 0, o: 0, ties: 0 });

  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isSolo = !isConnected && status === 'disconnected';

  // Role authority: Host is X (Cyan, moves first); Guest is O (Neon, moves second)
  const mySymbol = (!isConnected || isHost) ? 'X' : 'O';
  const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
  const isMyTurn = turn === mySymbol;

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

      if (event.type === 'grid_move') {
        setBoard((prev) => {
          if (prev[event.index] || winner) return prev;
          const nextBoard = [...prev];
          nextBoard[event.index] = event.symbol || opponentSymbol;

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
              const winnerName = res.winner === mySymbol ? myNickname : remotePeerNickname;
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
            setTurn(mySymbol);
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
  }, [winner, mySymbol, opponentSymbol, myNickname, remotePeerNickname, onEndRound, scores]);

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
      peerService.sendGameEvent({ game: 'grid', type: 'grid_restart' });
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
            {myNickname} ({mySymbol}): {myDisplayScore}
          </span>
          <span className="score-pill ties">Ties: {scores.ties}</span>
          <span className="score-pill peer">
            {opponentLabel} ({opponentSymbol}): {opponentDisplayScore}
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
          <span className={isMyTurn ? 'active-turn user' : 'active-turn opponent'}>
            {isMyTurn 
              ? `⚡ Your Turn (Place ${mySymbol})` 
              : `Waiting for ${opponentLabel} (${opponentSymbol})...`}
          </span>
        ) : (
          <span className="winner-label">
            {winner === 'Tie' ? '🤝 Tactical Tie!' : `🏆 ${winner} Wins!`}
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
          <button onClick={handleRestart} className="btn btn-primary">
            <Sparkles size={15} />
            <span>Play Next Round</span>
          </button>
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
