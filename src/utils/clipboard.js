// Robust Clipboard Copy Utility with fallback for HTTP, LAN, and restricted contexts

export const copyToClipboard = async (text) => {
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
    return successful;
  } catch (err) {
    console.warn('[ZeroChat] Clipboard copy fallback failed:', err);
    return false;
  }
};
