import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

const ROWS = 6;
const COLS = 7;

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function checkConnectFourWin(board) {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p && p === board[r][c+1] && p === board[r][c+2] && p === board[r][c+3]) {
        return { winner: p, line: [[r,c], [r,c+1], [r,c+2], [r,c+3]] };
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const p = board[r][c];
      if (p && p === board[r+1][c] && p === board[r+2][c] && p === board[r+3][c]) {
        return { winner: p, line: [[r,c], [r+1,c], [r+2,c], [r+3,c]] };
      }
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p && p === board[r+1][c+1] && p === board[r+2][c+2] && p === board[r+3][c+3]) {
        return { winner: p, line: [[r,c], [r+1,c+1], [r+2,c+2], [r+3,c+3]] };
      }
    }
  }
  // Diagonal up-right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const p = board[r][c];
      if (p && p === board[r-1][c+1] && p === board[r-2][c+2] && p === board[r-3][c+3]) {
        return { winner: p, line: [[r,c], [r-1,c+1], [r-2,c+2], [r-3,c+3]] };
      }
    }
  }
  // Tie check
  if (board.every(row => row.every(Boolean))) {
    return { winner: 'Tie', line: [] };
  }
  return null;
}

export default function CyberConnectFour({ status, remotePeerNickname }) {
  const [grid, setGrid] = useState(createEmptyGrid);
  const [turn, setTurn] = useState('C'); // 'C' (Cyan/Local) | 'M' (Magenta/Opponent)
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState({ c: 0, m: 0, ties: 0 });
  const [hoverCol, setHoverCol] = useState(null);

  const isConnected = status === 'connected';

  // Apply a drop in a column
  const dropToken = (board, col, player) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][col]) {
        const next = board.map(row => [...row]);
        next[r][col] = player;
        return { newBoard: next, row: r };
      }
    }
    return null;
  };

  // Peer event synchronization
  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event || event.game !== 'c4') return;

      if (event.type === 'c4_drop') {
        setGrid((prev) => {
          if (winner) return prev;
          const dropRes = dropToken(prev, event.col, 'M');
          if (!dropRes) return prev;
          const winRes = checkConnectFourWin(dropRes.newBoard);
          if (winRes) {
            setWinner(winRes.winner);
            setWinningCells(winRes.line);
            if (winRes.winner === 'M') setScores((s) => ({ ...s, m: s.m + 1 }));
            if (winRes.winner === 'Tie') setScores((s) => ({ ...s, ties: s.ties + 1 }));
          } else {
            setTurn('C');
          }
          return dropRes.newBoard;
        });
      } else if (event.type === 'c4_restart') {
        setGrid(createEmptyGrid());
        setWinner(null);
        setWinningCells([]);
        setTurn('C');
      }
    });

    return () => unsub();
  }, [winner]);

  // Practice AI Bot
  useEffect(() => {
    if (!isConnected && turn === 'M' && !winner) {
      const timer = setTimeout(() => {
        const validCols = [];
        for (let c = 0; c < COLS; c++) {
          if (!grid[0][c]) validCols.push(c);
        }
        if (validCols.length === 0) return;

        // Smart Bot: check winning move, then block human win, else prefer center
        let pick = validCols[0];
        let found = false;

        // Check if AI can win
        for (const col of validCols) {
          const test = dropToken(grid, col, 'M');
          if (test && checkConnectFourWin(test.newBoard)?.winner === 'M') {
            pick = col;
            found = true;
            break;
          }
        }
        // Block human win
        if (!found) {
          for (const col of validCols) {
            const test = dropToken(grid, col, 'C');
            if (test && checkConnectFourWin(test.newBoard)?.winner === 'C') {
              pick = col;
              found = true;
              break;
            }
          }
        }
        // Center preference
        if (!found) {
          if (validCols.includes(3)) pick = 3;
          else pick = validCols[Math.floor(Math.random() * validCols.length)];
        }

        setGrid((prev) => {
          const dropRes = dropToken(prev, pick, 'M');
          if (!dropRes) return prev;
          const winRes = checkConnectFourWin(dropRes.newBoard);
          if (winRes) {
            setWinner(winRes.winner);
            setWinningCells(winRes.line);
            if (winRes.winner === 'M') setScores((s) => ({ ...s, m: s.m + 1 }));
            if (winRes.winner === 'Tie') setScores((s) => ({ ...s, ties: s.ties + 1 }));
          } else {
            setTurn('C');
          }
          return dropRes.newBoard;
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, isConnected, winner, grid]);

  const handleColumnClick = (col) => {
    if (winner || turn !== 'C' || grid[0][col]) return;

    const dropRes = dropToken(grid, col, 'C');
    if (!dropRes) return;

    setGrid(dropRes.newBoard);

    if (isConnected) {
      peerService.sendGameEvent({ game: 'c4', type: 'c4_drop', col });
    }

    const winRes = checkConnectFourWin(dropRes.newBoard);
    if (winRes) {
      setWinner(winRes.winner);
      setWinningCells(winRes.line);
      if (winRes.winner === 'C') {
        setScores((s) => ({ ...s, c: s.c + 1 }));
        confetti({ particleCount: 90, spread: 80 });
      } else if (winRes.winner === 'Tie') {
        setScores((s) => ({ ...s, ties: s.ties + 1 }));
      }
    } else {
      setTurn('M');
    }
  };

  const handleRestart = () => {
    setGrid(createEmptyGrid());
    setWinner(null);
    setWinningCells([]);
    setTurn('C');
    if (isConnected) {
      peerService.sendGameEvent({ game: 'c4', type: 'c4_restart' });
    }
  };

  return (
    <div className="cyber-c4-container">
      {/* Subheader Scores */}
      <div className="c4-status-bar">
        <div className="grid-score-pills">
          <span className="score-pill you">You (Cyan): {scores.c}</span>
          <span className="score-pill ties">Ties: {scores.ties}</span>
          <span className="score-pill peer" style={{ color: 'var(--accent-purple)', borderColor: 'var(--accent-purple-glow)' }}>
            {isConnected ? remotePeerNickname || 'Peer' : 'Bot'} (Neon): {scores.m}
          </span>
        </div>
        <button onClick={handleRestart} className="btn btn-icon" title="Reset Grid">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Turn Banner */}
      <div className="grid-turn-indicator">
        {!winner ? (
          <span className={turn === 'C' ? 'active-turn user' : 'active-turn opponent'}>
            {turn === 'C' ? '⚡ Your Turn (Drop Disc)' : `Waiting for ${isConnected ? remotePeerNickname || 'Peer' : 'Bot'}...`}
          </span>
        ) : (
          <span className="winner-label">
            {winner === 'Tie' ? '🤝 Tactical Tie!' : `🏆 ${winner === 'C' ? 'You Connect Four!' : `${remotePeerNickname || 'Peer'} Wins!`}`}
          </span>
        )}
      </div>

      {/* 7x6 Connect Four Board */}
      <div className="c4-board-shell">
        <div className="c4-columns-container">
          {Array.from({ length: COLS }).map((_, c) => {
            const isFull = !!grid[0][c];
            return (
              <div
                key={c}
                className={`c4-column ${hoverCol === c && turn === 'C' && !isFull && !winner ? 'col-hover' : ''}`}
                onClick={() => handleColumnClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
              >
                {Array.from({ length: ROWS }).map((_, r) => {
                  const val = grid[r][c];
                  const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);
                  return (
                    <div key={r} className="c4-slot">
                      <div className={`c4-disc ${val ? `disc-${val.toLowerCase()}` : 'empty'} ${isWinning ? 'winning-disc' : ''}`} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Play Again Action */}
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
