import { useState, useRef, useEffect, useCallback } from 'react';
import { clampZoomScale } from '../services/webrtc/streamHelpers';

export function useVideoZoomPan({ hasActiveRemoteVideo, isScreenSharing, isRemoteScreenSharing, viewportRef }) {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState('contain');
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const pinchStartRef = useRef({ distance: 0, scale: 1.0 });

  // Auto-fit contain for screen sharing to preserve text legibility
  useEffect(() => {
    if (isScreenSharing || isRemoteScreenSharing) {
      setFitMode('contain');
    }
  }, [isScreenSharing, isRemoteScreenSharing]);

  // Reset zoom & pan when video stream stops or turns off
  useEffect(() => {
    if (!hasActiveRemoteVideo) {
      setZoomScale(1.0);
      setPan({ x: 0, y: 0 });
    }
  }, [hasActiveRemoteVideo]);

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

  const handleDoubleClick = useCallback(() => {
    if (zoomScale > 1.05) {
      setZoomScale(1.0);
      setPan({ x: 0, y: 0 });
    } else {
      setZoomScale(2.0);
    }
  }, [zoomScale]);

  // Non-passive wheel listener for smooth desktop trackpad/mouse zoom
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
  }, [hasActiveRemoteVideo, viewportRef]);

  // Mouse pan & drag when zoomed
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
      const maxPan = (zoomScale - 1) * 350;
      setPan({
        x: Math.min(Math.max(dragStartRef.current.panX + dx, -maxPan), maxPan),
        y: Math.min(Math.max(dragStartRef.current.panY + dy, -maxPan), maxPan),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoomScale]);

  // Mobile pinch-to-zoom and touch pan
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
      pinchStartRef.current = { distance: Math.hypot(dx, dy), scale: zoomScale };
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

  return {
    zoomScale,
    pan,
    fitMode,
    isDragging,
    isZoomed: zoomScale > 1.01,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleToggleFitMode,
    handleDoubleClick,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
