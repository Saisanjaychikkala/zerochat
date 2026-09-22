import React from 'react';
import { MessageSquare, Zap } from 'lucide-react';

export default function MobileNav({ 
  activeTab, 
  setActiveTab, 
  onTabChange,
  unreadCount = 0, 
  unreadChatCount = 0,
  activeTransfersCount = 0,
  transfersCount = 0
}) {
  const handleTab = onTabChange || setActiveTab;
  const badgeUnread = unreadCount || unreadChatCount;
  const badgeTransfers = activeTransfersCount || transfersCount;

  return (
    <div className="mobile-segmented-bar">
      <button 
        type="button"
        onClick={() => handleTab && handleTab('chat')} 
        className={`segment-btn ${activeTab === 'chat' ? 'active' : ''}`}
      >
        <MessageSquare size={15} />
        <span>Messages</span>
        {badgeUnread > 0 && activeTab !== 'chat' && (
          <span className="segment-badge">{badgeUnread}</span>
        )}
      </button>

      <button 
        type="button"
        onClick={() => handleTab && handleTab('files')} 
        className={`segment-btn ${activeTab === 'files' ? 'active' : ''}`}
      >
        <Zap size={15} />
        <span>AirDrop Files</span>
        {badgeTransfers > 0 && (
          <span className="segment-badge cyan">{badgeTransfers}</span>
        )}
      </button>
    </div>
  );
}
