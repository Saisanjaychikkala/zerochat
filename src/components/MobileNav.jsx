import React from 'react';
import { MessageSquare, Zap, Users } from 'lucide-react';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  unreadCount = 0, 
  activeTransfersCount = 0,
  sessionsCount = 1 
}) {
  return (
    <nav className="mobile-nav-bar">
      <button 
        onClick={() => setActiveTab('chat')} 
        className={`mobile-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <MessageSquare size={18} />
          {unreadCount > 0 && activeTab !== 'chat' && (
            <span className="nav-badge">{unreadCount}</span>
          )}
        </div>
        <span>Chat</span>
      </button>

      <button 
        onClick={() => setActiveTab('files')} 
        className={`mobile-nav-item ${activeTab === 'files' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <Zap size={18} />
          {activeTransfersCount > 0 && (
            <span className="nav-badge" style={{ background: 'var(--accent-cyan)', color: '#000' }}>
              {activeTransfersCount}
            </span>
          )}
        </div>
        <span>AirDrop</span>
      </button>

      <button 
        onClick={() => setActiveTab('sessions')} 
        className={`mobile-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <Users size={18} />
          {sessionsCount > 1 && (
            <span className="nav-badge" style={{ background: 'var(--accent-purple)' }}>
              {sessionsCount}
            </span>
          )}
        </div>
        <span>Rooms</span>
      </button>
    </nav>
  );
}
