/**
 * ZeroChat - Cyber-Glass On-Demand File & Media Preview Card
 * WhatsApp-Style Media Previews & Telegram-Style Distinctive Document Cards
 * Supports: Idle, Downloading, Ready, and Expired states with zero database RAM-only WebRTC streaming.
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
  AlertTriangle,
  Eye,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import AudioPlayerBubble from '../AudioPlayerBubble';

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function getFileCategory(fileName = '', fileType = '') {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  if (['pdf'].includes(ext)) {
    return 'pdf';
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'json', 'py', 'rs', 'go', 'c', 'cpp', 'h', 'hpp', 'sh', 'sql', 'yaml', 'yml', 'xml', 'md'].includes(ext)) {
    return 'code';
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(ext)) {
    return 'doc';
  }
  if (fileType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (fileType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov', 'avi'].includes(ext)) {
    return 'video';
  }
  return 'generic';
}

function TelegramDocBadge({ category, extLabel }) {
  const label = extLabel.length > 4 ? extLabel.slice(0, 3) : extLabel;
  switch (category) {
    case 'pdf':
      return (
        <div className="telegram-doc-badge pdf" title="PDF Document">
          <FileText size={20} className="doc-icon" />
          <span className="doc-badge-pill">PDF</span>
        </div>
      );
    case 'archive':
      return (
        <div className="telegram-doc-badge archive" title="Compressed Archive">
          <FileArchive size={20} className="doc-icon" />
          <span className="doc-badge-pill">ZIP</span>
        </div>
      );
    case 'code':
      return (
        <div className="telegram-doc-badge code" title="Source Code">
          <FileCode size={20} className="doc-icon" />
          <span className="doc-badge-pill">{label}</span>
        </div>
      );
    case 'doc':
      return (
        <div className="telegram-doc-badge doc" title="Document">
          <FileText size={20} className="doc-icon" />
          <span className="doc-badge-pill">{label}</span>
        </div>
      );
    case 'audio':
      return (
        <div className="telegram-doc-badge audio" title="Audio Track">
          <Music size={20} className="doc-icon" />
          <span className="doc-badge-pill">AUD</span>
        </div>
      );
    case 'video':
      return (
        <div className="telegram-doc-badge video" title="Video Clip">
          <Film size={20} className="doc-icon" />
          <span className="doc-badge-pill">VID</span>
        </div>
      );
    default:
      return (
        <div className="telegram-doc-badge generic" title="File">
          <FileGeneric size={20} className="doc-icon" />
          <span className="doc-badge-pill">{label}</span>
        </div>
      );
  }
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

  const category = getFileCategory(fileName, fileType);
  const isImage = category === 'image';
  const formattedSize = formatFileSize(fileSize);
  const extLabel = fileName.split('.').pop()?.toUpperCase() || 'FILE';

  // =========================================================================
  // 1. Voice Note Bubble (WhatsApp-style dynamic waveform & duration)
  // =========================================================================
  if (isVoiceNote && (downloadUrl || fileInfo.audioUrl)) {
    return (
      <AudioPlayerBubble
        audioUrl={downloadUrl || fileInfo.audioUrl}
        durationSec={durationSec}
        fileName={fileName}
        waveform={fileInfo.waveform}
      />
    );
  }

  // =========================================================================
  // 2. WhatsApp-Style Image Card (Idle / Downloading / Ready)
  // =========================================================================
  if (isImage) {
    // 2A. Ready State (Full high-res image with bottom glass action strip)
    if (status === 'ready' && (downloadUrl || fileInfo.imageUrl)) {
      const imgSource = downloadUrl || fileInfo.imageUrl;
      return (
        <div className="wa-media-card ready">
          <div className="wa-media-image-wrap" onClick={() => onOpenLightbox && onOpenLightbox(imgSource, fileName)}>
            <img
              src={imgSource}
              alt={fileName}
              className="wa-media-img"
              loading="lazy"
            />
            <div className="wa-media-zoom-overlay">
              <Eye size={18} />
              <span>Preview</span>
            </div>
          </div>
          <div className="wa-media-glass-bar">
            <div className="wa-media-info">
              <span className="wa-media-name" title={fileName}>{fileName}</span>
              <span className="wa-media-meta">{formattedSize}</span>
            </div>
            <a
              href={imgSource}
              download={fileName}
              className="wa-media-save-btn"
              title={`Save ${fileName} to disk`}
            >
              <Download size={14} />
              <span>Save</span>
            </a>
          </div>
        </div>
      );
    }

    // 2B. Downloading State (Centered circular progress ring with backdrop)
    if (status === 'downloading') {
      const formattedSpeed = speedBps > 1024 * 1024
        ? (speedBps / (1024 * 1024)).toFixed(1) + ' MB/s'
        : Math.round(speedBps / 1024) + ' KB/s';

      const circumference = 2 * Math.PI * 22;
      const strokeDashoffset = circumference - (progress / 100) * circumference;

      return (
        <div className="wa-media-card downloading">
          {previewData ? (
            <div className="wa-media-backdrop blur" style={{ backgroundImage: `url(${previewData})` }} />
          ) : (
            <div className="wa-media-backdrop pattern">
              <div className="wa-media-pattern-content">
                <ImageIcon size={32} color="var(--accent-cyan)" />
                <span className="wa-media-pattern-label">Loading...</span>
              </div>
            </div>
          )}
          <div className="wa-media-center-action">
            <div className="wa-progress-circle-wrap">
              <svg className="wa-progress-svg" width="56" height="56" viewBox="0 0 56 56">
                <circle className="wa-progress-track" cx="28" cy="28" r="22" strokeWidth="3.5" fill="transparent" />
                <circle
                  className="wa-progress-fill"
                  cx="28"
                  cy="28"
                  r="22"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <button
                type="button"
                className="wa-progress-cancel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel && onCancel(fileId);
                }}
                title="Cancel download"
              >
                <X size={15} />
              </button>
            </div>
            <span className="wa-download-status-text">{progress}% • {formattedSpeed}</span>
          </div>
          <div className="wa-media-glass-bar compact">
            <span className="wa-media-name" title={fileName}>{fileName}</span>
            <span className="wa-media-meta">{formattedSize}</span>
          </div>
        </div>
      );
    }

    // 2C. Expired Image State
    if (status === 'expired') {
      return (
        <div className="wa-media-card expired">
          <div className="wa-media-backdrop pattern expired" />
          <div className="wa-media-center-action">
            <div className="wa-expired-circle">
              <AlertTriangle size={24} color="#f59e0b" />
            </div>
            <span className="wa-download-status-text expired">File Unavailable</span>
            <span className="wa-expired-sub">{errorReason || 'Peer closed tab • Files stay in volatile RAM only'}</span>
          </div>
        </div>
      );
    }

    // 2D. Idle / Offer State (WhatsApp-style progressive preview with centered download button)
    return (
      <div 
        className="wa-media-card idle"
        onClick={() => onRequestDownload && onRequestDownload(fileId, authorId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRequestDownload && onRequestDownload(fileId, authorId);
          }
        }}
        title={`Click to download ${fileName} (${formattedSize})`}
      >
        {previewData ? (
          <div className="wa-media-backdrop blur" style={{ backgroundImage: `url(${previewData})` }} />
        ) : (
          <div className="wa-media-backdrop pattern">
            <div className="wa-media-pattern-content">
              <ImageIcon size={32} color="var(--accent-cyan)" />
              <span className="wa-media-pattern-label">Photo</span>
            </div>
          </div>
        )}
        <div className="wa-media-center-action">
          <button 
            type="button"
            className="wa-center-download-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDownload && onRequestDownload(fileId, authorId);
            }}
            title={`Download ${fileName} (${formattedSize})`}
            aria-label={`Download ${fileName}`}
          >
            <Download size={22} />
          </button>
          <span className="wa-download-pill">{formattedSize} • Tap to Load</span>
        </div>
        <div className="wa-media-glass-bar compact">
          <span className="wa-media-name" title={fileName}>{fileName}</span>
          <span className="wa-media-badge-tag">{extLabel}</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. Telegram-Style Document / File Cards (PDF, ZIP, CODE, TXT, etc.)
  // =========================================================================

  // 3A. Ready State (File loaded into volatile RAM with direct save)
  if (status === 'ready' && downloadUrl) {
    return (
      <div className="telegram-doc-card ready">
        <TelegramDocBadge category={category} extLabel={extLabel} />
        <div className="doc-card-body">
          <span className="doc-card-title" title={fileName}>{fileName}</span>
          <div className="doc-card-sub">
            <span className="doc-size-pill">{formattedSize}</span>
            <span className="doc-dot">•</span>
            <span className="doc-status-pill success">
              <CheckCircle size={11} /> Ready
            </span>
          </div>
        </div>
        <a
          href={downloadUrl}
          download={fileName}
          className="telegram-action-btn ready"
          title={`Save ${fileName} to disk`}
        >
          <Download size={15} />
          <span>Save</span>
        </a>
      </div>
    );
  }

  // 3B. Expired State (Sender Disconnected or RAM Cleared)
  if (status === 'expired') {
    return (
      <div className="telegram-doc-card expired">
        <div className="telegram-doc-badge expired" title="Media Expired in Volatile RAM">
          <AlertTriangle size={20} color="#f59e0b" />
          <span className="doc-badge-pill expired">EXPIRED</span>
        </div>
        <div className="doc-card-body">
          <span className="doc-card-title expired" title={fileName}>{fileName}</span>
          <div className="doc-card-sub">
            <span className="doc-size-pill expired">{formattedSize}</span>
            <span className="doc-dot">•</span>
            <span className="doc-status-pill error">
              {errorReason || 'Peer closed tab • RAM Cleared'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3C. Downloading State (Circular progress ring with live speed)
  if (status === 'downloading') {
    const formattedSpeed = speedBps > 1024 * 1024
      ? (speedBps / (1024 * 1024)).toFixed(1) + ' MB/s'
      : Math.round(speedBps / 1024) + ' KB/s';

    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="telegram-doc-card downloading">
        <div className="doc-progress-ring-box">
          <svg className="doc-progress-svg" width="44" height="44" viewBox="0 0 44 44">
            <circle className="doc-progress-track" cx="22" cy="22" r="18" strokeWidth="3" fill="transparent" />
            <circle
              className="doc-progress-fill"
              cx="22"
              cy="22"
              r="18"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <button
            type="button"
            className="doc-progress-cancel-btn"
            onClick={() => onCancel && onCancel(fileId)}
            title="Cancel download"
          >
            <X size={13} />
          </button>
        </div>
        <div className="doc-card-body">
          <span className="doc-card-title" title={fileName}>{fileName}</span>
          <div className="doc-card-sub">
            <span className="doc-size-pill">{progress}%</span>
            <span className="doc-dot">•</span>
            <span className="doc-speed-text">{formattedSpeed}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3D. Idle / Offer State (Telegram-style interactive document card)
  return (
    <div 
      className="telegram-doc-card idle"
      onClick={() => onRequestDownload && onRequestDownload(fileId, authorId)}
      title={`Click to fetch ${fileName} (${formattedSize})`}
    >
      <TelegramDocBadge category={category} extLabel={extLabel} />
      <div className="doc-card-body">
        <span className="doc-card-title" title={fileName}>{fileName}</span>
        <div className="doc-card-sub">
          <span className="doc-size-pill">{formattedSize}</span>
          <span className="doc-dot">•</span>
          <span className="doc-ext-tag">{extLabel}</span>
        </div>
      </div>
      <button
        type="button"
        className="telegram-action-btn fetch"
        onClick={(e) => {
          e.stopPropagation();
          onRequestDownload && onRequestDownload(fileId, authorId);
        }}
        title={`Download ${fileName}`}
      >
        <Download size={15} />
        <span>Get</span>
      </button>
    </div>
  );
}
