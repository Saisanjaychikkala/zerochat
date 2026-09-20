import React, { useState, useRef } from 'react';
import { Play, Pause, Download } from 'lucide-react';

export default function AudioPlayerBubble({ audioUrl, durationSec, fileName }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
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

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="audio-bubble-container">
      <audio 
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <button 
        type="button"
        onClick={togglePlay}
        className="audio-play-btn"
        title={isPlaying ? 'Pause' : 'Play Voice Note'}
      >
        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
      </button>

      {/* Simulated Audio Waveform Bars */}
      <div className="audio-waveform">
        {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70, 85, 45, 60].map((height, idx) => {
          const isActive = (currentTime / (durationSec || 1)) >= (idx / 15);
          return (
            <span 
              key={idx} 
              className={`wave-bar ${isActive ? 'active' : ''} ${isPlaying ? 'pulsing' : ''}`}
              style={{ 
                height: `${height}%`,
                animationDelay: `${(idx % 5) * 0.1}s`
              }} 
            />
          );
        })}
      </div>

      <span className="audio-time-label">
        {isPlaying ? formatSeconds(currentTime) : formatSeconds(durationSec || 0)}
      </span>

      <a 
        href={audioUrl} 
        download={fileName || 'voice_note.webm'}
        className="audio-save-btn"
        title="Save voice note"
      >
        <Download size={13} />
      </a>
    </div>
  );
}
