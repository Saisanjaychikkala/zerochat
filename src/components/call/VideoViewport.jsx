import React, { useRef, useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import ZoomControls from './ZoomControls';
import { useVideoZoomPan } from '../../hooks/useVideoZoomPan';

export default function VideoViewport({
  isVideo = true,
  remoteStream,
  localStream,
  hasActiveRemoteVideo,
  hasActiveLocalVideo,
  isVideoMuted,
  isScreenSharing,
  isRemoteScreenSharing = false,
  remoteNickname,
  myNickname,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const viewportRef = useRef(null);
  const [, setTrackVersion] = useState(0);

  const {
    zoomScale,
    pan,
    fitMode,
    isDragging,
    isZoomed,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleFitMode,
    handleDoubleClick,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useVideoZoomPan({
    hasActiveRemoteVideo,
    isScreenSharing,
    isRemoteScreenSharing,
    viewportRef,
  });

  // Track addition listener: re-evaluates when late-arriving video tracks land
  useEffect(() => {
    if (!remoteStream) return;
    const onTrack = () => setTrackVersion((v) => v + 1);
    remoteStream.addEventListener('addtrack', onTrack);
    remoteStream.getVideoTracks().forEach((t) => t.addEventListener('unmute', onTrack));
    return () => {
      remoteStream.removeEventListener('addtrack', onTrack);
      remoteStream.getVideoTracks().forEach((t) => t.removeEventListener('unmute', onTrack));
    };
  }, [remoteStream]);

  // Bind remote stream with hardware decoder synchronization & play() queue safety
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (!videoEl) return;

    if (remoteStream && hasActiveRemoteVideo) {
      if (videoEl.srcObject !== remoteStream) {
        videoEl.srcObject = remoteStream;
      }
      videoEl.defaultMuted = true;
      videoEl.muted = true;

      const playRemote = () => {
        if (videoEl && videoEl.paused) {
          videoEl.play().catch((err) => {
            console.warn('[ZeroChat] Remote video playback caught:', err);
          });
        }
      };

      videoEl.onloadedmetadata = playRemote;
      videoEl.oncanplay = playRemote;
      videoEl.onloadeddata = playRemote;

      const vTracks = remoteStream.getVideoTracks();
      vTracks.forEach((t) => {
        t.onunmute = playRemote;
      });

      playRemote();

      return () => {
        videoEl.onloadedmetadata = null;
        videoEl.oncanplay = null;
        videoEl.onloadeddata = null;
        vTracks.forEach((t) => {
          if (t.onunmute === playRemote) t.onunmute = null;
        });
      };
    } else {
      videoEl.srcObject = null;
    }
  }, [remoteStream, hasActiveRemoteVideo]);

  // Bind local stream to local camera preview
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (!videoEl) return;

    if (localStream && hasActiveLocalVideo && !isVideoMuted && !isScreenSharing) {
      if (videoEl.srcObject !== localStream) {
        videoEl.srcObject = localStream;
      }
      videoEl.defaultMuted = true;
      videoEl.muted = true;
      videoEl.play().catch((err) => {
        console.warn('[ZeroChat] Local video playback caught:', err);
      });
    } else {
      videoEl.srcObject = null;
    }
  }, [localStream, hasActiveLocalVideo, isVideoMuted, isScreenSharing]);

  // Dedicated audio binding ensuring incoming peer voice is ALWAYS audible
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (!audioEl) return;

    if (remoteStream) {
      if (audioEl.srcObject !== remoteStream) {
        audioEl.srcObject = remoteStream;
      }
      audioEl.play().catch((err) => {
        console.warn('[ZeroChat] Remote audio playback caught:', err);
      });
    } else {
      audioEl.srcObject = null;
    }
  }, [remoteStream]);

  return (
    <div
      className="call-viewport"
      ref={viewportRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      style={{
        cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: isZoomed ? 'none' : 'auto',
      }}
    >
      {/* Persistent audio element for guaranteed incoming voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Remote Feed or Audio Visualizer */}
      {isVideo && hasActiveRemoteVideo ? (
        <div className="call-remote-container">
          <div
            className="call-zoom-wrapper"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className={`call-remote-video ${fitMode === 'cover' ? 'fill-cover' : 'fit-contain'}`}
            />
          </div>

          {/* Screen Share Indicator Badge */}
          {isRemoteScreenSharing && (
            <div
              className="remote-sharing-badge"
              style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                zIndex: 70,
                padding: '5px 12px',
                background: 'rgba(10, 14, 24, 0.84)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
              }}
            >
              <Monitor size={14} />
              <span>{remoteNickname || 'Peer'} is sharing screen</span>
            </div>
          )}

          {/* Floating Cyber-Glass Zoom Controls */}
          <ZoomControls
            zoomScale={zoomScale}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            fitMode={fitMode}
            onToggleFitMode={handleToggleFitMode}
            isScreenSharing={isScreenSharing || isRemoteScreenSharing}
          />

          {/* Subtle helper badge when zoomed */}
          {isZoomed && (
            <div className="call-zoom-hint">
              <span>Drag to pan • Double-click to reset</span>
            </div>
          )}
        </div>
      ) : (
        /* Audio-only Profile Visualizer */
        <div className="call-audio-visualizer">
          <div className="audio-visualizer-orb">
            <div className="audio-visualizer-wave wave-1" />
            <div className="audio-visualizer-wave wave-2" />
            <div className="audio-visualizer-avatar">
              {remoteNickname ? remoteNickname.substring(0, 1).toUpperCase() : 'P'}
            </div>
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '18px' }}>
            {remoteNickname || 'Peer'}
          </h3>
          <div className="voice-wave-bars">
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
            <div className="voice-wave-bar" />
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', marginTop: '8px', fontWeight: 600 }}>
            Encrypted Voice Call Active
          </p>
        </div>
      )}

      {/* Local Camera Picture-in-Picture (Video Calls Only) */}
      {isVideo && localStream && hasActiveLocalVideo && !isVideoMuted && !isScreenSharing && (
        <div className="call-local-pip">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="call-local-video"
          />
          <span className="pip-label">You</span>
        </div>
      )}
    </div>
  );
}
