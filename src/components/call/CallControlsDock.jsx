import React from 'react';
import { Mic, MicOff, Video, VideoOff, RefreshCw, Monitor, MonitorOff, PhoneOff } from 'lucide-react';
import { isScreenShareSupported } from '../../services/webrtc/streamHelpers';

export default function CallControlsDock({
  isAudioMuted,
  onToggleAudio,
  hasActiveLocalVideo,
  isVideoMuted,
  onToggleVideo,
  onSwitchCamera,
  isScreenSharing,
  onToggleScreenShare,
  onEndCall,
}) {
  const isVideoOff = !hasActiveLocalVideo || isVideoMuted;
  const canShareScreen = isScreenShareSupported();

  return (
    <nav className="call-controls-dock" role="toolbar" aria-label="Active call controls">
      {/* Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        className={`call-dock-btn ${isAudioMuted ? 'muted' : ''}`}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        <span className="dock-btn-label">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        className={`call-dock-btn ${isVideoOff ? 'muted' : ''}`}
        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        aria-label={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        <span className="dock-btn-label">{isVideoOff ? 'Camera On' : 'Cam Off'}</span>
      </button>

      {/* Camera Flip (Mobile Front/Back) */}
      {hasActiveLocalVideo && !isVideoMuted && onSwitchCamera && (
        <button
          type="button"
          onClick={onSwitchCamera}
          className="call-dock-btn"
          title="Flip Camera (Front/Back)"
          aria-label="Flip Camera between front and back"
        >
          <RefreshCw size={20} />
          <span className="dock-btn-label">Flip</span>
        </button>
      )}

      {/* Screen Sharing */}
      {canShareScreen && (
        <button
          type="button"
          onClick={onToggleScreenShare}
          className={`call-dock-btn ${isScreenSharing ? 'active-screen' : ''}`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          <span className="dock-btn-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
        </button>
      )}

      {/* End Call Button */}
      <button
        type="button"
        onClick={onEndCall}
        className="call-dock-btn end-call"
        title="End Call"
        aria-label="End Call"
      >
        <PhoneOff size={22} />
        <span className="dock-btn-label">End</span>
      </button>
    </nav>
  );
}
