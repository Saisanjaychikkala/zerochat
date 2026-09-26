import React, { useState, useEffect } from 'react';
import { RefreshCw, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export default function CyberGridGame({
  status,
  remotePeerNickname,
  showToast
}) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X'); // 'X' (Local / Player 1) | 'O' (Remote / Player 2)
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [scores, setScores] = useState({ x: 0, o: 0, ties: 0 });

  const isConnected = status === 'connected';

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
          nextBoard[event.index] = 'O';

          const res = checkWinner(nextBoard);
          if (res) {
            setWinner(res.winner);
            setWinningLine(res.line);
            if (res.winner === 'O') {
              setScores((s) => ({ ...s, o: s.o + 1 }));
            } else if (res.winner === 'Tie') {
              setScores((s) => ({ ...s, ties: s.ties + 1 }));
            }
          } else {
            setTurn('X');
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
  }, [winner]);

  // AI Move (Practice Mode)
  useEffect(() => {
    if (!isConnected && turn === 'O' && !winner) {
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
            setWinner(res.winner);
            setWinningLine(res.line);
            if (res.winner === 'O') setScores((s) => ({ ...s, o: s.o + 1 }));
            if (res.winner === 'Tie') setScores((s) => ({ ...s, ties: s.ties + 1 }));
          } else {
            setTurn('X');
          }
          return next;
        });
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [turn, isConnected, winner, board]);

  const handleSquareClick = (index) => {
    if (board[index] || winner || turn !== 'X') return;

    const nextBoard = [...board];
    nextBoard[index] = 'X';
    setBoard(nextBoard);

    if (isConnected) {
      peerService.sendGameEvent({
        game: 'grid',
        type: 'grid_move',
        index,
      });
    }

    const res = checkWinner(nextBoard);
    if (res) {
      setWinner(res.winner);
      setWinningLine(res.line);
      if (res.winner === 'X') {
        setScores((s) => ({ ...s, x: s.x + 1 }));
        confetti({ particleCount: 80, spread: 70 });
      } else if (res.winner === 'Tie') {
        setScores((s) => ({ ...s, ties: s.ties + 1 }));
      }
    } else {
      setTurn('O');
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

  return (
    <div className="cyber-grid-container">
      {/* Grid Subheader */}
      <div className="grid-status-bar">
        <div className="grid-score-pills">
          <span className="score-pill you">You (X): {scores.x}</span>
          <span className="score-pill ties">Ties: {scores.ties}</span>
          <span className="score-pill peer">
            {isConnected ? remotePeerNickname || 'Peer' : 'Bot'} (O): {scores.o}
          </span>
        </div>

        <button onClick={handleRestart} className="btn btn-icon" title="Reset Grid">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Turn Banner */}
      <div className="grid-turn-indicator">
        {!winner ? (
          <span className={turn === 'X' ? 'active-turn user' : 'active-turn opponent'}>
            {turn === 'X' ? '⚡ Your Turn (Place X)' : `Waiting for ${isConnected ? remotePeerNickname || 'Peer' : 'Bot'}...`}
          </span>
        ) : (
          <span className="winner-label">
            {winner === 'Tie' ? '🤝 Tactical Tie!' : `🏆 ${winner === 'X' ? 'You Win!' : `${remotePeerNickname || 'Peer'} Wins!`}`}
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
              disabled={!!cell || !!winner || turn !== 'X'}
            >
              {cell}
            </button>
          );
        })}
      </div>

      {/* Victory Celebration Overlay */}
      {winner && (
        <div className="grid-win-action">
          <button onClick={handleRestart} className="btn btn-primary">
            <Sparkles size={15} />
            <span>Play Next Round</span>
          </button>
        </div>
      )}
    </div>
  );
}
