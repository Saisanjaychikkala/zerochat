import React from 'react';
import { ArrowLeft, Gamepad2, Copy, Check, Radio, QrCode } from 'lucide-react';
import GameVoiceDock from './GameVoiceDock';

export default function GameArenaHeader({
  onExit,
  gameRoomId,
  status,
  isConnected,
  isConnecting,
  copied,
  onCopyLink,
  onOpenQr,
  callState,
  isVoiceConnected,
  onStartCall,
  onAnswerCall,
  onRejectCall,
  onEndCall,
  onToggleAudio,
  onSetMute,
  remotePeerNickname,
  onOpenDrawer,
}) {
  return (
    <div className="game-header">
      <div className="game-header-left">
        <button onClick={onExit} className="btn btn-secondary text-xs game-nav-btn" title="Return to ZeroChat Home">
          <ArrowLeft size={14} />
          <span className="game-nav-label">Home</span>
        </button>

        {gameRoomId && (
          <div className="game-room-pill" title="Unified Room Code">
            <Radio 
              size={12} 
              className={isConnected ? "text-emerald-400 animate-pulse" : isConnecting ? "text-cyan-400 animate-spin" : "text-amber-400"} 
            />
            <span className="game-room-code font-mono">#{gameRoomId}</span>
            <span className={`status-dot ${status}`} />
            <button onClick={onCopyLink} className="btn btn-icon btn-xs" title="Copy Invite Link">
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
            <button onClick={onOpenQr} className="btn btn-icon btn-xs" title="Scan QR Code to Join">
              <QrCode size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Action Controls: Game Selector Drawer & Voice Deck */}
      <div className="game-header-right">
        <GameVoiceDock 
          status={status}
          callState={callState}
          isVoiceConnected={isVoiceConnected}
          isAudioMuted={callState?.isAudioMuted || false}
          onConnectVoice={() => onStartCall && onStartCall(false)}
          onAnswerVoice={onAnswerCall}
          onDisconnectVoice={callState?.status === 'incoming' ? onRejectCall : onEndCall}
          onToggleMute={onToggleAudio}
          onSetMute={onSetMute}
          remotePeerNickname={remotePeerNickname}
        />

        <button 
          onClick={onOpenDrawer} 
          className="btn btn-primary btn-xs game-drawer-btn"
          title="Open Game Drawer to add a game to chat"
        >
          <Gamepad2 size={13} />
          <span className="game-drawer-btn-label">Games</span>
        </button>
      </div>
    </div>
  );
}
