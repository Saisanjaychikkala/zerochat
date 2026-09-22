import React, { useEffect, useRef, useState, useCallback } from 'react';
import CallHeaderBar from './call/CallHeaderBar';
import CallControlsDock from './call/CallControlsDock';
import VideoViewport from './call/VideoViewport';
import IncomingCallDialog from './call/IncomingCallDialog';

export default function CallModal({
  callState,
  onAnswer,
  onAccept,
  onReject,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSwitchCamera,
}) {
  const handleAccept = onAnswer || onAccept;
  const overlayRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const {
    status, // 'idle' | 'incoming' | 'calling' | 'connected'
    role,
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
      (t) => (!t.label || !t.label.includes('canvas')) && t.readyState === 'live'
    )
  );

  const hasActiveRemoteVideo = !!(
    (remoteStream &&
      remoteStream.getVideoTracks().some(
        (t) => t.enabled && t.label && !t.label.includes('canvas') && t.readyState === 'live'
      )) ||
    isRemoteCameraActive
  );

  // Active call duration timer
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

  // Fullscreen state listener and escape handling
  useEffect(() => {
    const onFsChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isFull) {
          if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
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
  }, []);

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (status === 'idle') return null;

  // 1. Incoming or Outgoing Dialog States
  if (status === 'incoming' || status === 'calling') {
    return (
      <IncomingCallDialog
        status={status}
        remoteNickname={remoteNickname}
        isVideo={isVideo}
        localStream={localStream}
        onAccept={handleAccept}
        onAnswer={handleAccept}
        onReject={onReject}
        onEndCall={onEndCall}
      />
    );
  }

  // 2. Connected Active Call Overlay with Zoom, Pan & Full Controls
  return (
    <div className="call-overlay" ref={overlayRef}>
      <CallHeaderBar
        remoteNickname={remoteNickname}
        durationSec={durationSec}
        formatDuration={formatDuration}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onEndCall={onEndCall}
      />

      <VideoViewport
        remoteStream={remoteStream}
        localStream={localStream}
        hasActiveRemoteVideo={hasActiveRemoteVideo}
        hasActiveLocalVideo={hasActiveLocalVideo}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        remoteNickname={remoteNickname}
      />

      <CallControlsDock
        isVideo={isVideo}
        isAudioMuted={isAudioMuted}
        onToggleAudio={onToggleAudio}
        hasActiveLocalVideo={hasActiveLocalVideo}
        isVideoMuted={isVideoMuted}
        onToggleVideo={onToggleVideo}
        onSwitchCamera={onSwitchCamera}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={onToggleScreenShare}
        onEndCall={onEndCall}
      />
    </div>
  );
}
