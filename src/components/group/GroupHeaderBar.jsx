import React from 'react';
import { Hash, Users, Crown, Zap, SidebarClose, LogOut } from 'lucide-react';

export function GroupHeaderBar({
  squadRoomId,
  memberCount,
  isHost,
  latency,
  onToggleDrawer,
  onLeaveSquad
}) {
  const displayRoomName = squadRoomId ? squadRoomId.replace(/^squad-/, '') : 'nexus-squad';

  return (
    <header className="squad-header">
      <div className="squad-channel-title">
        <Hash size={18} className="squad-channel-hash" />
        <span>{displayRoomName}</span>
      </div>

      <div className="squad-header-badges">
        {/* Relay Authority Badge */}
        <div className={`relay-status-chip ${isHost ? 'host' : 'guest'}`}>
          {isHost ? (
            <>
              <Crown size={13} />
              <span>Relay Authority (You)</span>
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

        {/* Member Count Pill */}
        <button 
          onClick={onToggleDrawer}
          className="squad-occupancy-pill"
          title="Toggle Squad Member Drawer"
        >
          <Users size={13} />
          <span>{memberCount || 1} Members</span>
        </button>

        {/* Toggle Drawer Button */}
        <button 
          onClick={onToggleDrawer}
          className="btn btn-icon"
          title="Open Drawer"
          style={{ width: '32px', height: '32px' }}
        >
          <SidebarClose size={16} />
        </button>

        {/* Leave Squad */}
        <button 
          onClick={onLeaveSquad}
          className="btn btn-icon text-rose-400"
          title="Leave Squad Room"
          style={{ width: '32px', height: '32px' }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
