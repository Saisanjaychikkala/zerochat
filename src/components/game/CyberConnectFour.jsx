import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, WifiOff } from 'lucide-react';
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
  // Diagonals (down-right and up-right)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (r <= ROWS - 4 && c <= COLS - 4 && p === board[r+1][c+1] && p === board[r+2][c+2] && p === board[r+3][c+3]) {
        return { winner: p, line: [[r,c], [r+1,c+1], [r+2,c+2], [r+3,c+3]] };
      }
      if (r >= 3 && c <= COLS - 4 && p === board[r-1][c+1] && p === board[r-2][c+2] && p === board[r-3][c+3]) {
        return { winner: p, line: [[r,c], [r-1,c+1], [r-2,c+2], [r-3,c+3]] };
      }
    }
  }
  return board.every(row => row.every(Boolean)) ? { winner: 'Tie', line: [] } : null;
}

export default function CyberConnectFour({ 
  cardId,
  initialState,
  status, 
  isHost = true,
  myNickname = 'You',
  remotePeerNickname = 'Peer', 
  onExitMatch,
  onEndRound,
  onUpdateCardState,
}) {
  const [grid, setGrid] = useState(() => initialState?.grid || createEmptyGrid());
  const [turn, setTurn] = useState(() => initialState?.turn || 'C');
  const [winner, setWinner] = useState(() => initialState?.winner || null);
  const [winningCells, setWinningCells] = useState(() => initialState?.winningCells || []);
  const [scores, setScores] = useState(() => initialState?.scores || { c: 0, m: 0, ties: 0 });
  const [hoverCol, setHoverCol] = useState(null);

  const isConnected = status === 'connected';
  const isReconnecting = status === 'reconnecting';
  const isSolo = !isConnected && status === 'disconnected';

  // Role authority: Host is Cyan ('C'); Guest is Neon ('M')
  const myToken = (!isConnected || isHost) ? 'C' : 'M';
  const opponentToken = myToken === 'C' ? 'M' : 'C';
  const isMyTurn = turn === myToken;
  const opponentLabel = isConnected ? remotePeerNickname || 'Peer' : 'AI Bot';

  // Persist live grid state in memory cache
  useEffect(() => {
    if (onUpdateCardState && cardId) {
      onUpdateCardState(cardId, { grid, turn, winner, winningCells, scores });
    }
  }, [grid, turn, winner, winningCells, scores, cardId, onUpdateCardState]);

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
      if (cardId && event.cardId && event.cardId !== cardId) return;

      if (event.type === 'c4_drop') {
        setGrid((prev) => {
          if (winner) return prev;
          const dropRes = dropToken(prev, event.col, event.token || opponentToken);
          if (!dropRes) return prev;
          const winRes = checkConnectFourWin(dropRes.newBoard);
          if (winRes) {
            if (winRes.winner === 'Tie') {
              setWinner('Tie');
              setScores((s) => {
                const next = { ...s, ties: s.ties + 1 };
                if (onEndRound) onEndRound('Tie', `${next.c} - ${next.m}`);
                return next;
              });
            } else {
              const winnerName = winRes.winner === myToken ? myNickname : remotePeerNickname;
              setWinner(winnerName);
              setWinningCells(winRes.line);
              setScores((s) => {
                const next = { ...s, c: winRes.winner === 'C' ? s.c + 1 : s.c, m: winRes.winner === 'M' ? s.m + 1 : s.m };
                if (onEndRound) onEndRound(winnerName, `${next.c} - ${next.m}`);
                return next;
              });
            }
          } else {
            setTurn(myToken);
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
  }, [winner, myToken, opponentToken, myNickname, remotePeerNickname, onEndRound, scores]);

  // Practice AI Bot (Strictly Solo mode only - never triggers during network reconnects)
  useEffect(() => {
    if (isSolo && turn === 'M' && !winner) {
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
            if (winRes.winner === 'Tie') {
              setWinner('Tie');
              setScores((s) => ({ ...s, ties: s.ties + 1 }));
            } else {
              setWinner(winRes.winner === myToken ? myNickname : 'AI Bot');
              setWinningCells(winRes.line);
              if (winRes.winner === 'C') setScores((s) => ({ ...s, c: s.c + 1 }));
              else setScores((s) => ({ ...s, m: s.m + 1 }));
            }
          } else {
            setTurn('C');
          }
          return dropRes.newBoard;
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [turn, isSolo, winner, grid, myToken, myNickname]);

  const handleColumnClick = (col) => {
    if (winner || !isMyTurn || grid[0][col] || isReconnecting) return;

    const dropRes = dropToken(grid, col, myToken);
    if (!dropRes) return;

    setGrid(dropRes.newBoard);

    if (isConnected) {
      peerService.sendGameEvent({ game: 'c4', cardId, type: 'c4_drop', col, token: myToken });
    }

    const winRes = checkConnectFourWin(dropRes.newBoard);
    if (winRes) {
      if (winRes.winner === 'Tie') {
        setWinner('Tie');
        setScores((s) => {
          const next = { ...s, ties: s.ties + 1 };
          if (onEndRound) onEndRound('Tie', `${next.c} - ${next.m}`);
          return next;
        });
      } else {
        const winnerName = myNickname;
        setWinner(winnerName);
        setWinningCells(winRes.line);
        confetti({ particleCount: 90, spread: 80 });
        setScores((s) => {
          const next = { ...s, c: myToken === 'C' ? s.c + 1 : s.c, m: myToken === 'M' ? s.m + 1 : s.m };
          if (onEndRound) onEndRound(winnerName, `${next.c} - ${next.m}`);
          return next;
        });
      }
    } else {
      setTurn(opponentToken);
    }
  };

  const handleRestart = () => {
    setGrid(createEmptyGrid());
    setWinner(null);
    setWinningCells([]);
    setTurn('C');
    if (isConnected) {
      peerService.sendGameEvent({ game: 'c4', cardId, type: 'c4_restart' });
    }
  };

  const myDisplayScore = myToken === 'C' ? scores.c : scores.m;
  const opponentDisplayScore = myToken === 'C' ? scores.m : scores.c;

  return (
    <div className="cyber-c4-container">
      {/* Subheader Scores (Duplicate back button purged per Item 5) */}
      <div className="c4-status-bar">
        <div className="grid-score-pills">
          <span className="score-pill you">
            {myNickname} ({myToken === 'C' ? 'Cyan' : 'Neon'}): {myDisplayScore}
          </span>
          <span className="score-pill ties">Ties: {scores.ties}</span>
          <span className="score-pill peer" style={{ color: 'var(--accent-purple)', borderColor: 'var(--accent-purple-glow)' }}>
            {opponentLabel} ({opponentToken === 'C' ? 'Cyan' : 'Neon'}): {opponentDisplayScore}
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
            {isMyTurn ? '⚡ Your Turn (Drop Disc)' : `Waiting for ${opponentLabel}...`}
          </span>
        ) : (
          <span className="winner-label">
            {winner === 'Tie' ? '🤝 Tactical Tie!' : `🏆 ${winner} Connects Four!`}
          </span>
        )}
      </div>

      {/* 7x6 Matrix */}
      <div className="c4-matrix-wrapper">
        <div className="c4-col-guides">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              className={`c4-guide-btn ${hoverCol === c && isMyTurn && !winner ? 'active' : ''}`}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => handleColumnClick(c)}
              disabled={!!winner || !isMyTurn || isReconnecting || !!grid[0][c]}
              title={`Drop Disc in Column ${c + 1}`}
            >
              ↓
            </button>
          ))}
        </div>

        <div className="c4-board-grid">
          {grid.map((row, r) => (
            <div key={r} className="c4-row">
              {row.map((cell, c) => {
                const isWin = winningCells.some(([wr, wc]) => wr === r && wc === c);
                return (
                  <div
                    key={c}
                    className={`c4-slot ${cell ? `filled-${cell.toLowerCase()}` : 'empty'} ${isWin ? 'winning-slot' : ''}`}
                    onClick={() => handleColumnClick(c)}
                  >
                    <div className="c4-disc" />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Victory Actions */}
      {winner && (
        <div className="c4-win-action" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={handleRestart} className="btn btn-primary" style={{ gap: '6px' }}>
            <Sparkles size={15} /> Play Next Round
          </button>
          {onExitMatch && (
            <button onClick={onExitMatch} className="btn btn-secondary">
              Return to Chat
            </button>
          )}
        </div>
      )}
    </div>
  );
}
