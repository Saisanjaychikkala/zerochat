export function extractSnippet(msg) {
  if (!msg) return '';
  if (msg.isVoiceNote) {
    const dur = msg.durationSec ? ` (${msg.durationSec}s)` : '';
    return `🎤 Voice Note${dur}`;
  }
  if (msg.imageUrl || msg.type === 'image') {
    return `📷 Photo ${msg.fileName ? `(${msg.fileName})` : ''}`.trim();
  }
  if (msg.downloadUrl || msg.type === 'file') {
    return `📎 File: ${msg.fileName || 'Attachment'}`;
  }
  if (msg.type === 'game_card') {
    return `🎮 Game: ${msg.gameName || 'P2P Challenge'}`;
  }
  const text = msg.text || '';
  if (text.startsWith('```') && text.endsWith('```')) {
    return '💻 Code Snippet';
  }
  return text.length > 70 ? text.substring(0, 67) + '...' : text;
}

export function handleScrollToMessage(targetId) {
  if (!targetId || typeof document === 'undefined') return;
  const el = document.getElementById('msg_' + targetId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('message-pulse-highlight');
    void el.offsetWidth; // trigger reflow
    el.classList.add('message-pulse-highlight');
    setTimeout(() => {
      el.classList.remove('message-pulse-highlight');
    }, 1600);
  }
}

export async function shareRoomInvite(roomId, fallbackCopy) {
  if (!roomId || typeof window === 'undefined') return;
  const url = `${window.location.origin}${window.location.pathname}#${roomId}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join my ZeroChat Room',
        text: 'Connect to my private, encrypted ZeroChat peer room:',
        url,
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  if (fallbackCopy) fallbackCopy();
}
