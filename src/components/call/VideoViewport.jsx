import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, VideoOff } from 'lucide-react';
import ZoomControls from './ZoomControls';
import { clampZoomScale } from '../../services/webrtc/streamHelpers';

export default function VideoViewport({
  isVideo = true,
  remoteStream,
  localStream,
  hasActiveRemoteVideo,
  hasActiveLocalVideo,
  isVideoMuted,
  isScreenSharing,
  remoteNickname,
  myNickname,
}) {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const viewportRef = useRef(null);

  // Zoom & Pan interactive state
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState('contain');
  const [isDragging, setIsDragging] = useState(false);

  // Refs for tracking drag coordinates without re-triggering effects
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1.0 });

  // Reset zoom & pan when video stream stops or changes
  useEffect(() => {
    if (!hasActiveRemoteVideo) {
      setZoomScale(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [hasActiveRemoteVideo, remoteStream]);

  // Bind remote stream whenever remote stream or active state mounts the <video> element
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream && hasActiveRemoteVideo) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((err) => {
          console.warn('[ZeroChat] Remote video playback caught:', err);
        });
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream, hasActiveRemoteVideo]);

  // Bind local stream to local camera preview
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream && hasActiveLocalVideo && !isVideoMuted && !isScreenSharing) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch((err) => {
          console.warn('[ZeroChat] Local video playback caught:', err);
        });
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream, hasActiveLocalVideo, isVideoMuted, isScreenSharing]);

  // Dedicated audio binding ensuring incoming peer voice is ALWAYS audible
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((err) => {
          console.warn('[ZeroChat] Remote audio playback caught:', err);
        });
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // Zoom control callbacks
  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => clampZoomScale(prev + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => {
      const next = clampZoomScale(prev - 0.25);
      if (next <= 1.01) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomScale(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleToggleFitMode = useCallback(() => {
    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  }, []);

  // Double-click / Double-tap toggles between 1x and 2x zoom
  const handleDoubleClick = useCallback((e) => {
    if (zoomScale > 1.05) {
      setZoomScale(1.0);
      setPan({ x: 0, y: 0 });
    } else {
      setZoomScale(2.0);
    }
  }, [zoomScale]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    if (!hasActiveRemoteVideo) return;
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.2;
    setZoomScale((prev) => {
      const next = clampZoomScale(prev + delta);
      if (next <= 1.01) setPan({ x: 0, y: 0 });
      return next;
    });
  }, [hasActiveRemoteVideo]);

  // Attach non-passive wheel listener to allow e.preventDefault()
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (hasActiveRemoteVideo) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * 0.25;
        setZoomScale((prev) => {
          const next = clampZoomScale(prev + delta);
          if (next <= 1.01) setPan({ x: 0, y: 0 });
          return next;
        });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasActiveRemoteVideo]);

  // Mouse pan & drag when zoomed in
  const handleMouseDown = useCallback((e) => {
    if (zoomScale <= 1.01 || !hasActiveRemoteVideo) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }, [zoomScale, hasActiveRemoteVideo, pan]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      // Max boundary calculation based on zoom level
      const maxPan = (zoomScale - 1) * 350;
      setPan({
        x: Math.min(Math.max(dragStartRef.current.panX + dx, -maxPan), maxPan),
        y: Math.min(Math.max(dragStartRef.current.panY + dy, -maxPan), maxPan),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoomScale]);

  // Touch gestures: Pinch-to-zoom & Touch pan
  const handleTouchStart = useCallback((e) => {
    if (!hasActiveRemoteVideo) return;
    if (e.touches.length === 1 && zoomScale > 1.01) {
      setIsDragging(true);
      dragStartRef.current = {
        mouseX: e.touches[0].clientX,
        mouseY: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      pinchStartRef.current = { distance: dist, scale: zoomScale };
    }
  }, [hasActiveRemoteVideo, zoomScale, pan]);

  const handleTouchMove = useCallback((e) => {
    if (!hasActiveRemoteVideo) return;
    if (e.touches.length === 2 && pinchStartRef.current.distance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartRef.current.distance;
      const newScale = clampZoomScale(pinchStartRef.current.scale * ratio);
      setZoomScale(newScale);
      if (newScale <= 1.01) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && zoomScale > 1.01) {
      const dx = e.touches[0].clientX - dragStartRef.current.mouseX;
      const dy = e.touches[0].clientY - dragStartRef.current.mouseY;
      const maxPan = (zoomScale - 1) * 350;
      setPan({
        x: Math.min(Math.max(dragStartRef.current.panX + dx, -maxPan), maxPan),
        y: Math.min(Math.max(dragStartRef.current.panY + dy, -maxPan), maxPan),
      });
    }
  }, [hasActiveRemoteVideo, isDragging, zoomScale]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    pinchStartRef.current = { distance: 0, scale: zoomScale };
  }, [zoomScale]);

  const isZoomed = zoomScale > 1.01;

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

          {/* Floating Cyber-Glass Zoom Controls */}
          <ZoomControls
            zoomScale={zoomScale}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            fitMode={fitMode}
            onToggleFitMode={handleToggleFitMode}
            isScreenSharing={isScreenSharing}
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
