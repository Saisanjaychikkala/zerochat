// Robust Clipboard Copy Utility with fallback for HTTP, LAN, and restricted contexts

export const copyToClipboard = async (text, showPromptFallback = true) => {
  if (!text) return false;

  // Modern Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback below
    }
  }

  // Legacy execCommand fallback for HTTP / restricted contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.warn('[ZeroChat] Clipboard copy execCommand failed:', err);
  }

  // Final LAN IP / HTTP Fallback: Selectable Prompt Dialog
  if (showPromptFallback && typeof window !== 'undefined' && typeof window.prompt === 'function') {
    try {
      window.prompt('Copy room link or code manually (Ctrl+C / Cmd+C):', text);
      return true;
    } catch (_) {}
  }

  return false;
};
