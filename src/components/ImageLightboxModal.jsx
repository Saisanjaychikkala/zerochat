import React, { useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function ImageLightboxModal({ isOpen = true, onClose, imageUrl, imageName, fileName }) {
  const activeName = imageName || fileName || 'Image Preview';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ zIndex: 10000, background: 'rgba(3, 5, 9, 0.94)', backdropFilter: 'blur(12px)' }}
    >
      <div 
        style={{ 
          position: 'relative', 
          maxWidth: '90vw', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeName}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a 
              href={imageUrl} 
              download={activeName}
              className="btn btn-primary text-xs"
              style={{ padding: '6px 12px' }}
            >
              <Download size={14} />
              <span>Save</span>
            </a>

            <button onClick={onClose} className="btn btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Full Image */}
        <div style={{ 
          maxWidth: '100%', 
          maxHeight: '80vh', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
        }}>
          <img 
            src={imageUrl} 
            alt={imageName || 'Preview'} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '80vh', 
              objectFit: 'contain',
              borderRadius: 'var(--radius-lg)'
            }} 
          />
        </div>
      </div>
    </div>
  );
}
