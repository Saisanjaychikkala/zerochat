import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from 'lucide-react';

export default function ZoomControls({
  zoomScale = 1.0,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  fitMode = 'contain',
  onToggleFitMode,
  isScreenSharing = false,
}) {
  const percentText = `${Math.round(zoomScale * 100)}%`;
  const isZoomed = zoomScale > 1.01;

  return (
    <div className="call-zoom-dock" role="toolbar" aria-label="Video zoom controls">
      {/* Zoom Out Button */}
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoomScale <= 1.0}
        className="zoom-btn"
        title="Zoom Out (Scroll Down)"
        aria-label="Zoom Out"
      >
        <ZoomOut size={15} />
      </button>

      {/* Clickable Zoom Percentage Badge */}
      <button
        type="button"
        onClick={onResetZoom}
        className={`zoom-pill ${isZoomed ? 'active' : ''}`}
        title="Click to reset zoom to 100%"
        aria-label={`Current zoom ${percentText}. Click to reset`}
      >
        <span>{percentText}</span>
      </button>

      {/* Zoom In Button */}
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoomScale >= 4.0}
        className="zoom-btn"
        title="Zoom In (Scroll Up)"
        aria-label="Zoom In"
      >
        <ZoomIn size={15} />
      </button>

      {/* Aspect Fit / Fill Toggle */}
      <button
        type="button"
        onClick={onToggleFitMode}
        className={`zoom-btn fit-btn ${fitMode === 'cover' ? 'active-fill' : ''}`}
        title={fitMode === 'contain' ? 'Switch to Fill View' : 'Switch to Fit View'}
        aria-label={fitMode === 'contain' ? 'Fill screen' : 'Fit to screen'}
      >
        {fitMode === 'contain' ? <Maximize size={14} /> : <Minimize size={14} />}
      </button>

      {/* Reset Zoom Button (shown when zoomed or panned) */}
      {isZoomed && (
        <button
          type="button"
          onClick={onResetZoom}
          className="zoom-btn reset-btn"
          title="Reset Zoom & Pan (100%)"
          aria-label="Reset zoom and position"
        >
          <RotateCcw size={14} />
        </button>
      )}
    </div>
  );
}
