import React from 'react';
import { Maximize2, Minimize2, PhoneOff, ShieldCheck } from 'lucide-react';

export default function CallHeaderBar({
  remoteNickname,
  durationSec = 0,
  formatDuration,
  isFullscreen,
  onToggleFullscreen,
  onEndCall,
}) {
  return (
    <header className="call-header-bar" role="banner">
      {/* Left: Peer status, timer & encryption badge */}
      <div className="call-header-left">
        <div className="call-peer-badge">
          <span className="call-status-dot" aria-hidden="true" />
          <span className="call-peer-name">
            {remoteNickname || 'Peer'}
          </span>
        </div>

        <div className="call-timer-badge" aria-label={`Call duration ${formatDuration(durationSec)}`}>
          {formatDuration(durationSec)}
        </div>

        <div className="call-security-badge" title="WebRTC DTLS/SRTP Direct Peer Connection">
          <ShieldCheck size={13} color="var(--accent-emerald)" aria-hidden="true" />
          <span>E2E SRTP</span>
        </div>
      </div>

      {/* Right: Fullscreen and Immediate End Call action */}
      <div className="call-header-right">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="call-icon-btn"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        <button
          type="button"
          onClick={onEndCall}
          className="call-icon-btn end-call-header-btn"
          title="End Call Immediately"
          aria-label="End Call Immediately"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </header>
  );
}
