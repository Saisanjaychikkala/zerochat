import React from 'react';
import { CornerUpLeft } from 'lucide-react';

export default function ReplyQuoteBox({ replyTo, onScrollToMessage }) {
  if (!replyTo) return null;

  return (
    <div 
      className="message-reply-quote"
      onClick={() => onScrollToMessage(replyTo.id)}
      title="Click to jump to original message"
    >
      <div className="reply-quote-author">
        <CornerUpLeft size={10} color="var(--accent-cyan)" />
        <span>{replyTo.senderNickname || 'Peer'}</span>
      </div>
      <div className="reply-quote-snippet">
        {replyTo.snippet}
      </div>
    </div>
  );
}
