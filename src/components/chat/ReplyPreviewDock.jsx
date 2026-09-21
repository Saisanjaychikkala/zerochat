import React from 'react';
import { CornerUpLeft, X } from 'lucide-react';

export default function ReplyPreviewDock({
  replyingTo,
  myNickname,
  remotePeerNickname,
  snippet,
  onCancelReply
}) {
  if (!replyingTo) return null;

  const authorName = replyingTo.sender === 'local' 
    ? (myNickname || 'You') 
    : (replyingTo.senderNickname || remotePeerNickname || 'Peer');

  return (
    <div className="reply-preview-dock">
      <div className="reply-preview-accent" />
      <div className="reply-preview-content">
        <div className="reply-preview-author">
          <CornerUpLeft size={11} color="var(--accent-cyan)" />
          <span>Replying to {authorName}</span>
        </div>
        <p className="reply-preview-snippet">
          {snippet}
        </p>
      </div>
      <button 
        type="button" 
        onClick={onCancelReply}
        className="reply-preview-close"
        title="Cancel reply"
      >
        <X size={14} />
      </button>
    </div>
  );
}
