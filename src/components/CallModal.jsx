import React, { useEffect, useRef, useState } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Maximize2, 
  Minimize2, 
  ShieldCheck, 
  Radio,
  RefreshCw 
} from 'lucide-react';

export default function CallModal({
  callState,
  onAccept,
  onReject,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSwitchCamera,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const overlayRef = useRef(null);

  const {
    status, // 'idle' | 'incoming' | 'calling' | 'connected'
    role, // 'caller' | 'receiver'
    isVideo,
    remoteNickname,
    localStream,
    remoteStream,
    isScreenSharing,
    isAudioMuted,
    isVideoMuted,
    isRemoteCameraActive = false,
  } = callState;

  const hasActiveLocalVideo = !!(
    localStream &&
    localStream.getVideoTracks().some(
      (t) => t.enabled && t.label && !t.label.includes('canvas') && t.readyState === 'live'
    )
  );

  const hasActiveRemoteVideo = !!(
    (remoteStream &&
      remoteStream.getVideoTracks().some(
        (t) => t.enabled && t.label && !t.label.includes('canvas') && t.readyState === 'live'
      )) ||
    isRemoteCameraActive
  );

  // Escape key exits fullscreen or closes call
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isFull) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active call duration timer (ticks second-by-second when connected)
  useEffect(() => {
    if (status === 'connected') {
      setDurationSec(0);
      const interval = setInterval(() => {
        setDurationSec((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setDurationSec(0);
    }
  }, [status]);

  // Fullscreen state listener
  useEffect(() => {
    const onFsChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Bind local stream to local video element
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream, status]);

  // Bind remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream, status]);

  // Persistent remote audio binding (guarantees voice is ALWAYS audible even in audio-only calls)
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((err) => {
          console.warn('[ZeroChat] Remote audio play caught:', err);
        });
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream, status]);

  // Format call duration (mm:ss)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    const el = overlayRef.current;
    if (!el) return;
    const reqFullscreen = el.requestFullscreen || el.webkitRequestFullscreen;
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);

    if (!isFull) {
      if (reqFullscreen) {
        reqFullscreen.call(el).catch(() => {});
        setIsFullscreen(true);
      }
    } else {
      if (exitFullscreen) {
        exitFullscreen.call(document).catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  if (status === 'idle') return null;

  // 1. INCOMING CALL DIALOG
  if (status === 'incoming') {
    return (
      <div className="modal-overlay" style={{ zIndex: 10000 }}>
        <div className="modal-content call-incoming-dialog" style={{ maxWidth: '380px', textAlign: 'center' }}>
          <div className="incoming-avatar-ring">
            <div className="call-avatar-pulse" />
            <div className="call-avatar-inner">
              {remoteNickname ? remoteNickname.substring(0, 1).toUpperCase() : 'P'}
            </div>
          </div>

          <div style={{ margin: '14px 0 6px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {remoteNickname || 'Peer'}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              {isVideo ? <Video size={16} /> : <Phone size={16} />}
              <span>Incoming {isVideo ? 'Video' : 'Voice'} Call...</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
            <ShieldCheck size={14} color="var(--accent-emerald)" />
            <span>P2P Encrypted • Direct Device Link</span>
          </div>

          <div className="incoming-call-actions">
            <button
              onClick={onReject}
              className="btn btn-call-decline"
              title="Decline Call"
            >
              <PhoneOff size={22} />
              <span>Decline</span>
            </button>

            <button
              onClick={() => onAccept(isVideo)}
              className="btn btn-call-accept"
              title="Answer Call"
            >
              {isVideo ? <Video size={22} /> : <Phone size={22} />}
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. OUTGOING CALLING STATE
  if (status === 'calling') {
    return (
      <div className="modal-overlay" style={{ zIndex: 10000 }}>
        <div className="modal-content call-incoming-dialog" style={{ maxWidth: '380px', textAlign: 'center' }}>
          <div className="incoming-avatar-ring">
            <div className="call-avatar-pulse outgoing" />
            <div className="call-avatar-inner">
              {remoteNickname ? remoteNickname.substring(0, 1).toUpperCase() : 'P'}
            </div>
          </div>

          <div style={{ margin: '14px 0 6px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {remoteNickname || 'Peer'}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              <Radio size={16} className="animate-pulse" />
              <span>Calling... Waiting for answer</span>
            </p>
          </div>

          {/* Local video preview if video call */}
          {isVideo && localStream && (
            <div className="calling-pip-preview">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={onEndCall}
              className="btn btn-call-decline"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            >
              <PhoneOff size={20} />
              <span>Cancel Call</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. ACTIVE CONNECTED CALL OVERLAY
  return (
    <div className="call-overlay" ref={overlayRef}>
      {/* Top Bar Header */}
      <div className="call-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="call-peer-badge">
            <span className="call-status-dot" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              {remoteNickname || 'Peer'}
            </span>
          </div>
          <div className="call-timer-badge">
            {formatDuration(durationSec)}
          </div>
          <div className="call-security-badge" title="WebRTC DTLS/SRTP Direct Peer Connection">
            <ShieldCheck size={13} color="var(--accent-emerald)" />
            <span>E2E SRTP</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={toggleFullscreen} 
            className="call-icon-btn" 
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <button 
            onClick={onEndCall} 
            className="call-icon-btn end-call-header-btn" 
            title="End Call Immediately"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>

      {/* Dedicated audio element ensuring incoming voice is ALWAYS audible */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      {/* Main Viewport */}
      <div className="call-viewport">
        {/* Remote Video Stream or Screen Share */}
        {hasActiveRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="call-remote-video"
          />
        ) : (
          /* Audio-only Avatar Visualizer */
          <div className="call-audio-visualizer">
            <div className="audio-visualizer-orb">
              <div className="audio-visualizer-wave wave-1" />
              <div className="audio-visualizer-wave wave-2" />
              <div className="audio-visualizer-avatar">
                {remoteNickname ? remoteNickname.substring(0, 1).toUpperCase() : 'P'}
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '16px' }}>
              {remoteNickname || 'Peer'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>
              Encrypted Voice Call Active
            </p>
          </div>
        )}

        {/* Local Camera Picture-in-Picture */}
        {localStream && (
          <div className="call-local-pip">
            {hasActiveLocalVideo && !isVideoMuted && !isScreenSharing ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="call-local-video"
              />
            ) : (
              <div className="call-local-placeholder">
                {isScreenSharing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <Monitor size={22} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>Sharing Screen</span>
                  </div>
                ) : (
                  <VideoOff size={20} color="var(--text-dim)" />
                )}
              </div>
            )}
            <span className="pip-label">You</span>
          </div>
        )}
      </div>

      {/* Control Dock Bottom Bar */}
      <div className="call-controls-dock">
        {/* Mute Microphone */}
        <button
          onClick={onToggleAudio}
          className={`call-dock-btn ${isAudioMuted ? 'muted' : ''}`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span className="dock-btn-label">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={onToggleVideo}
          className={`call-dock-btn ${(!hasActiveLocalVideo || isVideoMuted) ? 'muted' : ''}`}
          title={(!hasActiveLocalVideo || isVideoMuted) ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {(!hasActiveLocalVideo || isVideoMuted) ? <VideoOff size={20} /> : <Video size={20} />}
          <span className="dock-btn-label">{(!hasActiveLocalVideo || isVideoMuted) ? 'Camera On' : 'Cam Off'}</span>
        </button>

        {/* Flip Camera (Front / Rear on mobile) */}
        {hasActiveLocalVideo && !isVideoMuted && onSwitchCamera && (
          <button
            onClick={onSwitchCamera}
            className="call-dock-btn"
            title="Flip Camera (Front/Back)"
          >
            <RefreshCw size={20} />
            <span className="dock-btn-label">Flip</span>
          </button>
        )}

        {/* Screen Sharing Toggle */}
        {typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia && (
          <button
            onClick={onToggleScreenShare}
            className={`call-dock-btn ${isScreenSharing ? 'active-screen' : ''}`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="dock-btn-label">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>
        )}

        {/* End Call Hang Up */}
        <button
          onClick={onEndCall}
          className="call-dock-btn end-call"
          title="End Call"
        >
          <PhoneOff size={22} />
          <span className="dock-btn-label">End</span>
        </button>
      </div>
    </div>
  );
}
