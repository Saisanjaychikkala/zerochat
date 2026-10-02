import React, { useState } from 'react';
import { Play, Pause, Reply, Copy, Smile, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

export function CompactStreamMessage({
  msg,
  myPeerId,
  hostPeerId,
  coHostPeerId,
  onReply,
  onReact
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReactMenu, setShowReactMenu] = useState(false);

  if (msg.type === 'system') {
    return (
      <div className="compact-stream-row system-row">
        <span className="system-notice-badge">{msg.text}</span>
      </div>
    );
  }

  const isAuthorHost = msg.authorId === hostPeerId;
  const isAuthorCoHost = msg.authorId === coHostPeerId;
  const initial = (msg.author || 'A').charAt(0).toUpperCase();
  const timeStr = msg.timestamp 
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const handleCopy = async () => {
    if (msg.text) {
      await copyToClipboard(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handlePlayVoice = () => {
    if (!msg.audio) return;
    try {
      const audio = new Audio(msg.audio);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audio.play();
    } catch (e) {
      setIsPlaying(false);
    }
  };

  const emojis = ['❤️', '🔥', '👍', '😂', '🎉'];

  return (
    <div className="compact-stream-row">
      <div className="stream-avatar">{initial}</div>

      <div className="stream-content">
        <div className="stream-meta-line">
          <span className="stream-author-name">{msg.author || 'Anonymous'}</span>
          {isAuthorHost && <span className="role-chip host">Host</span>}
          {!isAuthorHost && isAuthorCoHost && <span className="role-chip cohost">Co-Host</span>}
          {!isAuthorHost && !isAuthorCoHost && <span className="role-chip member">Member</span>}
          <span className="stream-timestamp">{timeStr}</span>
        </div>

        {msg.replyTo && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--accent-cyan)', paddingLeft: '6px', marginBottom: '4px' }}>
            Replying to <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{msg.replyTo.author}</span>: {msg.replyTo.text?.slice(0, 40)}
          </div>
        )}

        {msg.type === 'group_voice' ? (
          <div className="stream-voice-player">
            <button type="button" onClick={handlePlayVoice} className="voice-play-btn" title="Play Voice Note">
              {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: '2px' }} />}
            </button>
            <div className="voice-waveform-preview">
              {[12, 18, 8, 22, 14, 10, 16, 20, 12, 6, 18].map((h, i) => (
                <div key={i} className="waveform-bar" style={{ height: `${h}px` }} />
              ))}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {msg.duration ? `${Math.round(msg.duration)}s` : '0:15'}
            </span>
          </div>
        ) : (
          <div className="stream-text-body">{msg.text}</div>
        )}

        {/* Reactions List */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact && onReact(msg.id, emoji)}
                style={{
                  background: users.includes(myPeerId) ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: users.includes(myPeerId) ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '2px 6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-main)'
                }}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover Action Bar */}
      <div className="stream-action-bar">
        <button 
          type="button"
          onClick={() => setShowReactMenu(!showReactMenu)} 
          className="stream-action-btn"
          title="Add Reaction"
        >
          <Smile size={13} />
        </button>

        {showReactMenu && (
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-panel)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            {emojis.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  if (onReact) onReact(msg.id, e);
                  setShowReactMenu(false);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <button 
          type="button"
          onClick={() => onReply && onReply(msg)} 
          className="stream-action-btn"
          title="Reply"
        >
          <Reply size={13} />
        </button>

        <button 
          type="button"
          onClick={handleCopy} 
          className="stream-action-btn"
          title="Copy Text"
        >
          {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}
