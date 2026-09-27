import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, RefreshCw, Sparkles, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { peerService } from '../../services/peerService';

export default function CyberPongGame({
  status,
  isHost = true,
  myNickname = 'You',
  remotePeerNickname = 'Peer',
  onExitMatch,
  onEndRound,
}) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState(null);

  const isConnected = status === 'connected';
  const roleIsHost = !isConnected || isHost;

  const stateRef = useRef({
    p1Y: 160, p2Y: 160, ballX: 300, ballY: 200,
    ballVx: 4.5, ballVy: 2.8, p1Score: 0, p2Score: 0,
    paddleHeight: 70, paddleWidth: 10, tableWidth: 600, tableHeight: 400,
    lastSyncTime: 0, isHost: roleIsHost,
  });

  stateRef.current.isHost = roleIsHost;

  useEffect(() => {
    const unsub = peerService.on('game_event', (event) => {
      if (!event || event.game !== 'pong') return;

      if (event.type === 'pong_paddle') {
        if (roleIsHost) stateRef.current.p2Y = event.y;
        else stateRef.current.p1Y = event.y;
      } else if (event.type === 'pong_sync') {
        if (!roleIsHost) {
          stateRef.current.ballX = event.ballX;
          stateRef.current.ballY = event.ballY;
          stateRef.current.p1Y = event.p1Y;
          setScore({ p1: event.p1, p2: event.p2 });
          if (event.winner) {
            setWinner(event.winner);
            if (onEndRound) onEndRound(event.winner, `${event.p1}-${event.p2}`);
            try { confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } }); } catch (e) {}
          }
        }
      } else if (event.type === 'pong_restart') {
        stateRef.current.p1Score = 0;
        stateRef.current.p2Score = 0;
        stateRef.current.ballX = 300;
        stateRef.current.ballY = 200;
        stateRef.current.ballVx = 4.5;
        stateRef.current.ballVy = 2.8;
        setScore({ p1: 0, p2: 0 });
        setWinner(null);
      }
    });

    return () => unsub();
  }, [roleIsHost, onEndRound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const loop = () => {
      const gs = stateRef.current;
      const w = gs.tableWidth;
      const h = gs.tableHeight;
      const now = performance.now();

      if (gs.isHost && !winner) {
        gs.ballX += gs.ballVx;
        gs.ballY += gs.ballVy;

        if (gs.ballY <= 8 || gs.ballY >= h - 8) gs.ballVy = -gs.ballVy;

        // Left paddle collision
        if (gs.ballX <= 26 && gs.ballX >= 14 && gs.ballY >= gs.p1Y - 6 && gs.ballY <= gs.p1Y + gs.paddleHeight + 6) {
          gs.ballVx = Math.abs(gs.ballVx) * 1.04;
          gs.ballX = 27;
          gs.ballVy = (gs.ballY - (gs.p1Y + gs.paddleHeight / 2)) * 0.12;
        }

        // Right paddle collision
        if (gs.ballX >= w - 26 && gs.ballX <= w - 14 && gs.ballY >= gs.p2Y - 6 && gs.ballY <= gs.p2Y + gs.paddleHeight + 6) {
          gs.ballVx = -Math.abs(gs.ballVx) * 1.04;
          gs.ballX = w - 27;
          gs.ballVy = (gs.ballY - (gs.p2Y + gs.paddleHeight / 2)) * 0.12;
        }

        if (!isConnected) {
          const targetY = gs.ballY - gs.paddleHeight / 2;
          gs.p2Y += (targetY - gs.p2Y) * 0.085;
          gs.p2Y = Math.max(8, Math.min(h - gs.paddleHeight - 8, gs.p2Y));
        }

        if (gs.ballX < 0) {
          gs.p2Score += 1;
          const newScore = { p1: gs.p1Score, p2: gs.p2Score };
          setScore(newScore);
          if (gs.p2Score >= 5) {
            const wName = isConnected ? remotePeerNickname || 'Player 2' : 'Cyber Bot';
            setWinner(wName);
            if (onEndRound) onEndRound(wName, `${newScore.p1}-${newScore.p2}`);
            try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
          }
          gs.ballX = w / 2; gs.ballY = h / 2; gs.ballVx = 4.5; gs.ballVy = (Math.random() - 0.5) * 5;
        } else if (gs.ballX > w) {
          gs.p1Score += 1;
          const newScore = { p1: gs.p1Score, p2: gs.p2Score };
          setScore(newScore);
          if (gs.p1Score >= 5) {
            const wName = myNickname || 'Player 1';
            setWinner(wName);
            if (onEndRound) onEndRound(wName, `${newScore.p1}-${newScore.p2}`);
            try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
          }
          gs.ballX = w / 2; gs.ballY = h / 2; gs.ballVx = -4.5; gs.ballVy = (Math.random() - 0.5) * 5;
        }

        if (isConnected && now - gs.lastSyncTime > 32) {
          gs.lastSyncTime = now;
          peerService.sendGameEvent({
            game: 'pong', type: 'pong_sync',
            ballX: Math.round(gs.ballX), ballY: Math.round(gs.ballY), p1Y: Math.round(gs.p1Y),
            p1: gs.p1Score, p2: gs.p2Score,
            winner: gs.p1Score >= 5 ? myNickname : gs.p2Score >= 5 ? remotePeerNickname : null,
          });
        }
      }

      ctx.fillStyle = '#06080d';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = 'rgba(0, 242, 254, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillRect(14, gs.p1Y, gs.paddleWidth, gs.paddleHeight);

      ctx.fillStyle = isConnected ? '#10b981' : '#f59e0b';
      ctx.shadowColor = isConnected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillRect(w - 24, gs.p2Y, gs.paddleWidth, gs.paddleHeight);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(gs.ballX, gs.ballY, 7, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [winner, isConnected, myNickname, remotePeerNickname, onEndRound]);

  const updatePaddle = useCallback((relativeY) => {
    const clampedY = Math.max(6, Math.min(324, relativeY));
    const gs = stateRef.current;
    if (roleIsHost) gs.p1Y = clampedY; else gs.p2Y = clampedY;
    if (isConnected) {
      peerService.sendGameEvent({ game: 'pong', type: 'pong_paddle', y: Math.round(clampedY) });
    }
  }, [roleIsHost, isConnected]);

  const handlePointer = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    updatePaddle(((clientY - rect.top) / rect.height) * 400 - 35);
  };

  const handleNudge = useCallback((delta) => {
    const curY = roleIsHost ? stateRef.current.p1Y : stateRef.current.p2Y;
    updatePaddle(curY + delta);
  }, [roleIsHost, updatePaddle]);

  // Desktop keyboard controls (W/S or Up/Down arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleNudge(-28);
      } else if (e.key === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        handleNudge(28);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNudge]);

  const handleRestart = () => {
    setWinner(null);
    setScore({ p1: 0, p2: 0 });
    const gs = stateRef.current;
    gs.p1Score = 0; gs.p2Score = 0; gs.ballX = 300; gs.ballY = 200; gs.ballVx = 4.5; gs.ballVy = 2.8;
    if (isConnected) peerService.sendGameEvent({ game: 'pong', type: 'pong_restart' });
  };

  return (
    <div className="pong-arena-wrapper">
      <div className="pong-subbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            You: <strong style={{ color: roleIsHost ? '#00f2fe' : '#10b981' }}>{roleIsHost ? 'Left (P1)' : 'Right (P2)'}</strong>
          </span>
        </div>

        <div className="game-scoreboard">
          <span className="player-tag left">{roleIsHost ? myNickname : remotePeerNickname}: {score.p1}</span>
          <span className="vs-divider">:</span>
          <span className="player-tag right">{!roleIsHost ? myNickname : (isConnected ? remotePeerNickname : 'Bot')}: {score.p2}</span>
        </div>

        <button onClick={handleRestart} className="btn btn-icon btn-xs" title="Reset Score">
          <RefreshCw size={13} />
        </button>
      </div>

      <div 
        className="game-canvas-wrapper"
        onMouseMove={handlePointer}
        onTouchMove={(e) => { e.preventDefault(); handlePointer(e); }}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} width={600} height={400} className="game-canvas" />

        {winner && (
          <div className="game-winner-overlay">
            <Trophy size={42} color="#eab308" className="animate-bounce" />
            <h3 style={{ margin: '8px 0', fontSize: '1.2rem', color: '#fff' }}>{winner} Wins the Duel!</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button onClick={handleRestart} className="btn btn-primary">
                <Sparkles size={14} />
                <span>Play Again</span>
              </button>
              {onExitMatch && (
                <button onClick={onExitMatch} className="btn btn-secondary">
                  <span>Return to Chat</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pong-mobile-controls" style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: '8px 0' }}>
        <button onPointerDown={() => handleNudge(-35)} className="btn btn-secondary text-xs" style={{ minWidth: '90px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ChevronUp size={16} />
          <span>Steer Up</span>
        </button>
        <button onPointerDown={() => handleNudge(35)} className="btn btn-secondary text-xs" style={{ minWidth: '90px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ChevronDown size={16} />
          <span>Steer Down</span>
        </button>
      </div>
    </div>
  );
}
