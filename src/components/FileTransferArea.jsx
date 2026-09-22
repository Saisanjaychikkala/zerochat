import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  Download, 
  FileText, 
  FileCode, 
  Image as ImageIcon, 
  Film, 
  Music, 
  Archive, 
  HardDriveDownload,
  Zap,
  XCircle,
  Eye
} from 'lucide-react';
import AudioPlayerBubble from './AudioPlayerBubble';

export default function FileTransferArea({ 
  transfers, 
  onSendFile, 
  onCancelTransfer,
  onOpenLightbox,
  status,
  remotePeerNickname,
  showToast 
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (status === 'connected') {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (status !== 'connected') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        onSendFile(file);
      });
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => {
        onSendFile(file);
      });
      e.target.value = '';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bps) => {
    if (!bps || bps === 0) return '';
    return `${formatBytes(bps)}/s`;
  };

  const getFileIcon = (fileName = '', fileType = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon size={20} color="var(--accent-cyan)" />;
    }
    if (fileType.startsWith('video/') || ['mp4', 'mkv', 'mov', 'webm'].includes(ext)) {
      return <Film size={20} color="var(--accent-purple)" />;
    }
    if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return <Music size={20} color="var(--accent-emerald)" />;
    }
    if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
      return <Archive size={20} color="var(--accent-amber)" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'json'].includes(ext)) {
      return <FileCode size={20} color="#38bdf8" />;
    }
    return <FileText size={20} color="var(--text-muted)" />;
  };

  const isConnected = status === 'connected';

  return (
    <aside className="sidebar-container">
      {/* AirDrop Card */}
      <div className="glass-panel file-drop-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Direct AirDrop</h3>
          </div>
          <span style={{ 
            fontSize: '0.7rem', 
            color: 'var(--text-dim)', 
            fontFamily: 'var(--font-mono)' 
          }}>
            Zero Server Upload
          </span>
        </div>

        <div 
          role="button"
          tabIndex={0}
          className={`drop-zone ${isDragOver ? 'active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          style={{ cursor: 'pointer' }}
          title={isConnected ? 'Tap to choose files' : 'Select files to queue for AirDrop'}
        >
          <input 
            id="airdrop-file-input"
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInputChange} 
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              border: 0,
              opacity: 0,
              pointerEvents: 'none'
            }}
            multiple
          />
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '12px', 
            background: 'rgba(0, 242, 254, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UploadCloud size={24} color="var(--accent-cyan)" />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {isConnected ? 'Drop files here or tap to select' : 'Tap to select files for AirDrop'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {isConnected ? 'Tap to choose photos, videos, or documents' : 'Select files now — auto-transfers once peer connects'}
            </p>
          </div>
        </div>
      </div>

      {/* Transfers Activity Feed */}
      <div className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700 }}>File Transfers ({transfers.length})</h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
            16KB Buffered Stream
          </span>
        </div>

        <div className="transfers-list">
          {transfers.length === 0 ? (
            <div style={{ 
              margin: 'auto', 
              textAlign: 'center', 
              padding: '28px 12px',
              color: 'var(--text-dim)',
              fontSize: '0.8rem'
            }}>
              <HardDriveDownload size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p>No active or past transfers</p>
              <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>Files you send or receive will appear here.</p>
            </div>
          ) : (
            transfers.map((item) => (
              <div key={item.fileId} className="transfer-item">
                <div className="transfer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {getFileIcon(item.fileName, item.fileType)}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ 
                        fontSize: '0.82rem', 
                        fontWeight: 600, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        maxWidth: '210px'
                      }}>
                        {item.fileName}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {formatBytes(item.fileSize)} • {item.isSender ? 'Outgoing' : `From ${item.senderNickname || remotePeerNickname || 'Peer'}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.completed ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.downloadUrl && item.fileType?.startsWith('image/') && (
                          <button
                            type="button"
                            onClick={() => onOpenLightbox && onOpenLightbox(item.downloadUrl, item.fileName)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                            title="Preview Image"
                          >
                            <Eye size={13} />
                          </button>
                        )}

                        {item.downloadUrl && (
                          <a 
                            href={item.downloadUrl} 
                            download={item.fileName} 
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            <Download size={13} />
                            <span>Save</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        {item.staged ? (
                          <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>
                            Waiting for peer...
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                            {item.progress}%
                          </span>
                        )}
                        {onCancelTransfer && (
                          <button 
                            onClick={() => onCancelTransfer(item.fileId)}
                            style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Cancel Transfer"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Voice Note Audio preview if completed */}
                {item.completed && item.isVoiceNote && item.downloadUrl && (
                  <AudioPlayerBubble 
                    audioUrl={item.downloadUrl}
                    durationSec={item.durationSec}
                    fileName={item.fileName}
                  />
                )}

                {/* Progress bar */}
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ 
                      width: item.staged ? '100%' : `${item.completed ? 100 : item.progress}%`,
                      background: item.staged ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : undefined,
                      opacity: item.staged ? 0.65 : 1
                    }} 
                  />
                </div>

                {/* Speed indicator */}
                {!item.completed && item.speedBps > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '0.7rem', 
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-mono)' 
                  }}>
                    <span>{formatSpeed(item.speedBps)}</span>
                    <span>Streaming...</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
