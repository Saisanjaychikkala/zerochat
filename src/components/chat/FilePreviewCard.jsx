/**
 * ZeroChat - Cyber-Glass On-Demand File Preview Card
 * WhatsApp-style lazy file & media card supporting Idle, Downloading, Ready, and Expired states.
 */
import React from 'react';
import { 
  Download, 
  X, 
  FileText, 
  FileArchive, 
  Film, 
  Music, 
  FileCode, 
  File as FileGeneric, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import AudioPlayerBubble from '../AudioPlayerBubble';

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function getFileIcon(fileName = '', fileType = '') {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (fileType.startsWith('image/')) return null;
  if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Music size={20} className="file-type-icon audio" />;
  }
  if (fileType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
    return <Film size={20} className="file-type-icon video" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={20} className="file-type-icon archive" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'rs', 'go', 'c', 'cpp'].includes(ext)) {
    return <FileCode size={20} className="file-type-icon code" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText size={20} className="file-type-icon doc" />;
  }
  return <FileGeneric size={20} className="file-type-icon generic" />;
}

export default function FilePreviewCard({
  fileInfo,
  onRequestDownload,
  onCancel,
  onOpenLightbox
}) {
  if (!fileInfo) return null;

  const {
    fileId,
    fileName = 'Unnamed File',
    fileSize = 0,
    fileType = '',
    previewData = null,
    isVoiceNote = false,
    durationSec = 0,
    status = 'idle', // 'idle' | 'downloading' | 'ready' | 'expired'
    progress = 0,
    speedBps = 0,
    downloadUrl = null,
    errorReason = null,
    authorId = null
  } = fileInfo;

  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
  const formattedSize = formatFileSize(fileSize);
  const extLabel = fileName.split('.').pop()?.toUpperCase() || 'FILE';

  // 1. Ready State for Voice Note
  if (isVoiceNote && (downloadUrl || fileInfo.audioUrl)) {
    return (
      <AudioPlayerBubble
        audioUrl={downloadUrl || fileInfo.audioUrl}
        durationSec={durationSec}
        fileName={fileName}
      />
    );
  }

  // 2. Ready State for Image
  if (status === 'ready' && isImage && (downloadUrl || fileInfo.imageUrl)) {
    const imgSource = downloadUrl || fileInfo.imageUrl;
    return (
      <div className="file-ready-image-wrap">
        <img
          src={imgSource}
          alt={fileName}
          className="chat-image-preview"
          onClick={() => onOpenLightbox && onOpenLightbox(imgSource, fileName)}
        />
        <div className="file-ready-meta-row">
          <span className="file-ready-name">{fileName}</span>
          <a
            href={imgSource}
            download={fileName}
            className="file-download-link-btn"
            title="Save to disk"
          >
            <Download size={13} />
            <span>Save</span>
          </a>
        </div>
      </div>
    );
  }

  // 3. Ready State for Other Files
  if (status === 'ready' && downloadUrl) {
    return (
      <div className="file-preview-card ready">
        <div className="file-icon-box ready">
          <CheckCircle size={22} color="var(--accent-emerald)" />
        </div>
        <div className="file-card-details">
          <span className="file-card-name" title={fileName}>{fileName}</span>
          <span className="file-card-meta">{formattedSize} • {extLabel} • Ready</span>
        </div>
        <a
          href={downloadUrl}
          download={fileName}
          className="file-card-action-btn ready"
          title="Save file"
        >
          <Download size={15} />
          <span>Save</span>
        </a>
      </div>
    );
  }

  // 4. Expired State (Sender Disconnected or RAM Cleared)
  if (status === 'expired') {
    return (
      <div className="file-preview-card expired">
        <div className="file-icon-box expired">
          <AlertTriangle size={20} color="#ef4444" />
        </div>
        <div className="file-card-details">
          <span className="file-card-name expired" title={fileName}>{fileName}</span>
          <span className="file-card-meta expired">
            {errorReason || 'Media Expired from RAM • Sender disconnected'}
          </span>
        </div>
        <div className="file-card-badge expired">
          <span>Unavailable</span>
        </div>
      </div>
    );
  }

  // 5. Downloading State (Progress Ring)
  if (status === 'downloading') {
    const formattedSpeed = speedBps > 1024 * 1024
      ? (speedBps / (1024 * 1024)).toFixed(1) + ' MB/s'
      : Math.round(speedBps / 1024) + ' KB/s';

    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="file-preview-card downloading">
        <div className="file-progress-ring-box">
          <svg className="progress-ring-svg" width="44" height="44" viewBox="0 0 44 44">
            <circle
              className="progress-ring-track"
              cx="22"
              cy="22"
              r="18"
              fill="transparent"
              strokeWidth="3"
            />
            <circle
              className="progress-ring-fill"
              cx="22"
              cy="22"
              r="18"
              fill="transparent"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <button
            type="button"
            className="progress-ring-cancel-btn"
            onClick={() => onCancel && onCancel(fileId)}
            title="Cancel download"
          >
            <X size={13} />
          </button>
        </div>
        <div className="file-card-details">
          <span className="file-card-name" title={fileName}>{fileName}</span>
          <span className="file-card-meta">
            {progress}% • {formattedSpeed}
          </span>
        </div>
      </div>
    );
  }

  // 6. Idle / Offer State (WhatsApp Style Preview)
  return (
    <div className={`file-preview-card idle ${previewData ? 'has-preview' : ''}`}>
      {previewData && (
        <div 
          className="file-card-backdrop"
          style={{ backgroundImage: `url(${previewData})` }}
        />
      )}
      <div className="file-card-overlay-content">
        <div className="file-card-left">
          <div className="file-icon-box">
            {getFileIcon(fileName, fileType) || <FileGeneric size={20} />}
          </div>
          <div className="file-card-details">
            <span className="file-card-name" title={fileName}>{fileName}</span>
            <span className="file-card-meta">
              {formattedSize} • {extLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="file-card-action-btn download"
          onClick={() => onRequestDownload && onRequestDownload(fileId, authorId)}
          title={`Download ${fileName} (${formattedSize})`}
        >
          <Download size={16} />
          <span>Get</span>
        </button>
      </div>
    </div>
  );
}
