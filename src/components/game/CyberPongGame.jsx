import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

export default function CyberPongGame({ status, remotePeerNickname }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState(null);

  const gameStateRef = useRef({
    p1Y: 150,
    p2Y: 150,
    ballX: 300,
    ballY: 200,
    ballVx: 4,
    ballVy: 3,
    paddleHeight: 70,
    paddleWidth: 10,
    tableWidth: 600,
    tableHeight: 400,
    isHost: true,
  });

  const isConnected = status === 'connected';

  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event || event.game === 'grid') return;
      if (event.type === 'paddle_move') {
        gameStateRef.current.p2Y = event.y;
      } else if (event.type === 'game_sync') {
        gameStateRef.current.ballX = event.ballX;
        gameStateRef.current.ballY = event.ballY;
        gameStateRef.current.ballVx = event.ballVx;
        gameStateRef.current.ballVy = event.ballVy;
        setScore({ p1: event.p1, p2: event.p2 });
        if (event.winner) {
          setWinner(event.winner);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } else if (event.type === 'game_restart') {
        setWinner(null);
        setScore({ p1: 0, p2: 0 });
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const loop = () => {
      const gs = gameStateRef.current;
      const w = gs.tableWidth;
      const h = gs.tableHeight;

      if (gs.isHost || !isConnected) {
        if (!winner) {
          gs.ballX += gs.ballVx;
          gs.ballY += gs.ballVy;

          if (gs.ballY <= 6 || gs.ballY >= h - 6) {
            gs.ballVy = -gs.ballVy;
          }

          if (
            gs.ballX <= 25 &&
            gs.ballX >= 15 &&
            gs.ballY >= gs.p1Y &&
            gs.ballY <= gs.p1Y + gs.paddleHeight
          ) {
            gs.ballVx = Math.abs(gs.ballVx) * 1.05;
            gs.ballX = 26;
          }

          if (
            gs.ballX >= w - 25 &&
            gs.ballX <= w - 15 &&
            gs.ballY >= gs.p2Y &&
            gs.ballY <= gs.p2Y + gs.paddleHeight
          ) {
            gs.ballVx = -Math.abs(gs.ballVx) * 1.05;
            gs.ballX = w - 26;
          }

          if (!isConnected) {
            const targetY = gs.ballY - gs.paddleHeight / 2;
            gs.p2Y += (targetY - gs.p2Y) * 0.08;
            gs.p2Y = Math.max(10, Math.min(h - gs.paddleHeight - 10, gs.p2Y));
          }

          if (gs.ballX < 0) {
            setScore((prev) => {
              const next = { ...prev, p2: prev.p2 + 1 };
              if (next.p2 >= 5) {
                setWinner('Player 2');
                confetti({ particleCount: 90, spread: 70 });
              }
              return next;
            });
            gs.ballX = w / 2;
            gs.ballY = h / 2;
            gs.ballVx = 4;
            gs.ballVy = (Math.random() - 0.5) * 6;
          } else if (gs.ballX > w) {
            setScore((prev) => {
              const next = { ...prev, p1: prev.p1 + 1 };
              if (next.p1 >= 5) {
                setWinner('Player 1');
                confetti({ particleCount: 90, spread: 70 });
              }
              return next;
            });
            gs.ballX = w / 2;
            gs.ballY = h / 2;
            gs.ballVx = -4;
            gs.ballVy = (Math.random() - 0.5) * 6;
          }

          if (isConnected) {
            peerService.sendGameEvent({
              type: 'game_sync',
              ballX: Math.round(gs.ballX),
              ballY: Math.round(gs.ballY),
              ballVx: gs.ballVx,
              ballVy: gs.ballVy,
              p1: score.p1,
              p2: score.p2,
              winner,
            });
          }
        }
      }

      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'var(--accent-cyan)';
      ctx.shadowColor = 'var(--accent-cyan-glow)';
      ctx.shadowBlur = 12;
      ctx.fillRect(15, gs.p1Y, gs.paddleWidth, gs.paddleHeight);

      ctx.fillStyle = isConnected ? '#10b981' : '#f59e0b';
      ctx.shadowColor = isConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillRect(w - 25, gs.p2Y, gs.paddleWidth, gs.paddleHeight);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(gs.ballX, gs.ballY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [winner, isConnected, score]);

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const relativeY = ((clientY - rect.top) / rect.height) * 400 - 35;
    const clampedY = Math.max(5, Math.min(325, relativeY));

    gameStateRef.current.p1Y = clampedY;

    if (isConnected) {
      peerService.sendGameEvent({
        type: 'paddle_move',
        y: Math.round(clampedY),
      });
    }
  };

  const handleRestart = () => {
    setWinner(null);
    setScore({ p1: 0, p2: 0 });
    if (isConnected) {
      peerService.sendGameEvent({ type: 'game_restart' });
    }
  };

  return (
    <div className="pong-arena-wrapper">
      <div className="pong-subbar">
        <div className="game-scoreboard">
          <span className="player-tag left">You: {score.p1}</span>
          <span className="vs-divider">:</span>
          <span className="player-tag right">
            {isConnected ? remotePeerNickname || 'Peer' : 'Bot'}: {score.p2}
          </span>
        </div>
        <button onClick={handleRestart} className="btn btn-icon" title="Reset Score">
          <RefreshCw size={14} />
        </button>
      </div>

      <div 
        className="game-canvas-wrapper"
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
      >
        <canvas ref={canvasRef} width={600} height={400} className="game-canvas" />

        {winner && (
          <div className="game-winner-overlay">
            <Trophy size={40} color="var(--accent-amber)" className="animate-bounce" />
            <h3>{winner} Wins the Duel!</h3>
            <button onClick={handleRestart} className="btn btn-primary">
              <Sparkles size={15} />
              <span>Play Again</span>
            </button>
          </div>
        )}
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-dim)', padding: '6px' }}>
        Move mouse or touch screen up/down to steer your paddle. First to 5 points wins!
      </p>
    </div>
  );
}
