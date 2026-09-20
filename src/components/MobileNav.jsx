import React from 'react';
import { MessageSquare, Zap } from 'lucide-react';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  unreadCount = 0, 
  activeTransfersCount = 0 
}) {
  return (
    <div className="mobile-segmented-bar">
      <button 
        type="button"
        onClick={() => setActiveTab('chat')} 
        className={`segment-btn ${activeTab === 'chat' ? 'active' : ''}`}
      >
        <MessageSquare size={15} />
        <span>Messages</span>
        {unreadCount > 0 && activeTab !== 'chat' && (
          <span className="segment-badge">{unreadCount}</span>
        )}
      </button>

      <button 
        type="button"
        onClick={() => setActiveTab('files')} 
        className={`segment-btn ${activeTab === 'files' ? 'active' : ''}`}
      >
        <Zap size={15} />
        <span>AirDrop Files</span>
        {activeTransfersCount > 0 && (
          <span className="segment-badge cyan">{activeTransfersCount}</span>
        )}
      </button>
    </div>
  );
}
