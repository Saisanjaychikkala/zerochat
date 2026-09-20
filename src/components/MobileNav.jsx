import React from 'react';
import { MessageSquare, Zap } from 'lucide-react';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  unreadCount = 0, 
  activeTransfersCount = 0
}) {
  return (
    <nav className="mobile-nav-bar">
      <button 
        onClick={() => setActiveTab('chat')} 
        className={`mobile-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <MessageSquare size={19} />
          {unreadCount > 0 && activeTab !== 'chat' && (
            <span className="nav-badge">{unreadCount}</span>
          )}
        </div>
        <span>Messages</span>
      </button>

      <button 
        onClick={() => setActiveTab('files')} 
        className={`mobile-nav-item ${activeTab === 'files' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative' }}>
          <Zap size={19} />
          {activeTransfersCount > 0 && (
            <span className="nav-badge" style={{ background: 'var(--accent-cyan)', color: '#000' }}>
              {activeTransfersCount}
            </span>
          )}
        </div>
        <span>AirDrop Files</span>
      </button>
    </nav>
  );
}
