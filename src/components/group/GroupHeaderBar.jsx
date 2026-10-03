import React, { useState } from 'react';
import { Hash, Users, Crown, Zap, ArrowLeft, Copy, Check, QrCode, Lock, Settings } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

export function GroupHeaderBar({
  squadRoomId,
  memberCount,
  isHost,
  isLocked,
  latency,
  onOpenQrModal,
  onToggleDrawer,
  onLeaveSquad,
  onOpenSettings
}) {
  const [copied, setCopied] = useState(false);
  const displayRoomName = squadRoomId ? squadRoomId.replace(/^squad-/, '') : 'nexus-squad';

  const handleCopyCode = async () => {
    const success = await copyToClipboard(squadRoomId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="squad-header">
      {/* Left: Back Arrow + Channel Title + Copy */}
      <div className="squad-header-left">
        <button
          type="button"
          onClick={onLeaveSquad}
          className="btn btn-icon squad-back-btn"
          title="Back to Home Hub"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="squad-channel-title" onClick={handleCopyCode} title="Click to copy Squad Room ID" style={{ cursor: 'pointer' }}>
          <Hash size={17} className="squad-channel-hash" />
          <span>{displayRoomName}</span>
          <button type="button" className="btn btn-icon" style={{ width: '22px', height: '22px', padding: 0 }}>
            {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
          </button>
          {isLocked && (
            <span 
              title="Room locked by Admin" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '3px', 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#f87171', 
                fontSize: '0.68rem', 
                fontWeight: 600, 
                padding: '2px 6px', 
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <Lock size={10} />
              <span>Locked</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Relay Status + Occupancy Pill + Settings + Drawer Toggle */}
      <div className="squad-header-badges">
        {/* Relay Authority Badge */}
        <div className={`relay-status-chip ${isHost ? 'host' : 'guest'}`}>
          {isHost ? (
            <>
              <Crown size={13} />
              <span className="relay-chip-label">Host (You)</span>
            </>
          ) : (
            <>
              <Zap size={13} />
              <span className="relay-chip-label">Relay Active</span>
            </>
          )}
          {latency !== null && (
            <span className="relay-chip-latency">• {latency}ms</span>
          )}
        </div>

        {/* QR Code Modal Trigger */}
        <button
          type="button"
          onClick={onOpenQrModal}
          className="btn btn-icon squad-qr-btn"
          title="Share Squad QR Code"
        >
          <QrCode size={16} />
        </button>

        {/* Member Count Pill / Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleDrawer}
          className="squad-occupancy-pill"
          title="Toggle Squad Member Drawer"
        >
          <Users size={13} />
          <span className="occupancy-count">{memberCount || 1}</span>
          <span className="occupancy-label"> Members</span>
        </button>

        {/* Settings */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-icon squad-settings-btn"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
