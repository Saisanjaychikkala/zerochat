import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Loader2, AlertCircle } from 'lucide-react';

const DEFAULT_WAVEFORM = [35, 70, 50, 85, 55, 95, 65, 40, 60, 80, 50, 75, 90, 45, 65, 30];

export default function AudioPlayerBubble({
  audioUrl,
  durationSec,
  fileName,
  waveform = null,
  fileId = null,
  authorId = null,
  status = 'ready',
  progress = 0,
  errorReason = null,
  onRequestDownload = null,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const pendingAutoplayRef = useRef(false);

  // Normalize waveform heights to percentage (15% - 100%)
  const normalizedWaveform = React.useMemo(() => {
    if (Array.isArray(waveform) && waveform.length > 0) {
      return waveform.slice(0, 16).map((val) => {
        const num = typeof val === 'number' ? val : parseFloat(val) || 0.3;
        const pct = num <= 1.0 ? Math.round(num * 100) : Math.round(num);
        return Math.max(15, Math.min(100, pct));
      });
    }
    return DEFAULT_WAVEFORM;
  }, [waveform]);

  // Autoplay as soon as audio arrives if requested by user
  useEffect(() => {
    if (audioUrl && pendingAutoplayRef.current && audioRef.current) {
      pendingAutoplayRef.current = false;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.warn('[ZeroChat] Autoplay failed:', e));
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (status === 'expired') {
      return;
    }

    // Lazy on-demand audio pull: if audio not downloaded yet, request it!
    if (!audioUrl) {
      if (status === 'downloading') return;
      if (onRequestDownload && fileId) {
        pendingAutoplayRef.current = true;
        onRequestDownload(fileId, authorId);
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('[ZeroChat] Audio play failed:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleWaveformClick = (e) => {
    if (!audioUrl || !audioRef.current) {
      togglePlay();
      return;
    }
    const totalDuration = durationSec || audioRef.current.duration || 1;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * totalDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const isDownloading = status === 'downloading' || (!audioUrl && pendingAutoplayRef.current);
  const isExpired = status === 'expired';

  return (
    <div className={`audio-bubble-container ${isExpired ? 'expired' : ''}`}>
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      <button 
        type="button"
        onClick={togglePlay}
        disabled={isExpired}
        className={`audio-play-btn ${isDownloading ? 'downloading' : ''} ${isExpired ? 'expired' : ''}`}
        title={
          isExpired
            ? (errorReason || 'Audio expired from RAM')
            : isDownloading
            ? `Downloading voice memo (${progress}%)...`
            : isPlaying
            ? 'Pause'
            : audioUrl
            ? 'Play Voice Note'
            : 'Download & Play Voice Note'
        }
      >
        {isExpired ? (
          <AlertCircle size={15} color="#ef4444" />
        ) : isDownloading ? (
          <Loader2 size={15} className="spin-loader" />
        ) : isPlaying ? (
          <Pause size={15} />
        ) : (
          <Play size={15} style={{ marginLeft: '2px' }} />
        )}
      </button>

      {/* Interactive Audio Waveform Bars (16-Point Array) */}
      <div 
        className="audio-waveform" 
        onClick={handleWaveformClick}
        title={audioUrl ? 'Click to seek' : 'Click to load and play'}
        style={{ cursor: isExpired ? 'not-allowed' : 'pointer' }}
      >
        {normalizedWaveform.map((height, idx) => {
          const totalPoints = normalizedWaveform.length;
          const isActive = audioUrl && (currentTime / (durationSec || 1)) >= (idx / totalPoints);
          return (
            <span 
              key={idx} 
              className={`wave-bar ${isActive ? 'active' : ''} ${isPlaying ? 'pulsing' : ''} ${isExpired ? 'expired' : ''}`}
              style={{ 
                height: `${height}%`,
                animationDelay: `${(idx % 5) * 0.08}s`
              }} 
            />
          );
        })}
      </div>

      <span 
        className={`audio-time-label ${isExpired ? 'expired' : ''}`}
        title={isExpired ? 'Peer closed tab • Voice notes stay in volatile RAM only' : undefined}
      >
        {isExpired
          ? 'RAM Cleared'
          : isDownloading
          ? `${progress}%`
          : isPlaying
          ? formatSeconds(currentTime)
          : formatSeconds(durationSec || 0)}
      </span>

      {audioUrl && !isExpired && (
        <a 
          href={audioUrl} 
          download={fileName || 'voice_note.webm'}
          className="audio-save-btn"
          title="Save voice note"
        >
          <Download size={13} />
        </a>
      )}
    </div>
  );
}
