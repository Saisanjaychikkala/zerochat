import React, { useState } from 'react';
import { Hash, Users, Crown, Zap, SidebarClose, LogOut, ArrowLeft, Copy, Check, QrCode } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

export function GroupHeaderBar({
  squadRoomId,
  memberCount,
  isHost,
  latency,
  onOpenQrModal,
  onToggleDrawer,
  onLeaveSquad
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={onLeaveSquad}
          className="btn btn-icon"
          title="Back to Home Hub"
          style={{ width: '32px', height: '32px' }}
        >
          <ArrowLeft size={16} />
        </button>

        <div className="squad-channel-title" onClick={handleCopyCode} title="Click to copy Squad Room ID" style={{ cursor: 'pointer' }}>
          <Hash size={17} className="squad-channel-hash" />
          <span>{displayRoomName}</span>
          <button type="button" className="btn btn-icon" style={{ width: '22px', height: '22px', padding: 0 }}>
            {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Right: Relay Status + Occupancy Pill + Drawer Toggle */}
      <div className="squad-header-badges">
        {/* Relay Authority Badge */}
        <div className={`relay-status-chip ${isHost ? 'host' : 'guest'}`}>
          {isHost ? (
            <>
              <Crown size={13} />
              <span>Host (You)</span>
            </>
          ) : (
            <>
              <Zap size={13} />
              <span>Relay Active</span>
            </>
          )}
          {latency !== null && (
            <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>• {latency}ms</span>
          )}
        </div>

        {/* QR Code Modal Trigger */}
        <button 
          type="button"
          onClick={onOpenQrModal}
          className="btn btn-icon"
          title="Share Squad QR Code"
          style={{ width: '32px', height: '32px' }}
        >
          <QrCode size={16} />
        </button>

        {/* Member Count Pill */}
        <button 
          type="button"
          onClick={onToggleDrawer}
          className="squad-occupancy-pill"
          title="Toggle Squad Member Drawer"
        >
          <Users size={13} />
          <span>{memberCount || 1} Members</span>
        </button>

        {/* Toggle Drawer Button */}
        <button 
          type="button"
          onClick={onToggleDrawer}
          className="btn btn-icon"
          title="Toggle Members Panel"
          style={{ width: '32px', height: '32px' }}
        >
          <SidebarClose size={16} />
        </button>

        {/* Leave Squad */}
        <button 
          type="button"
          onClick={onLeaveSquad}
          className="btn btn-icon"
          title="Leave Squad Room"
          style={{ width: '32px', height: '32px', color: '#f87171' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
