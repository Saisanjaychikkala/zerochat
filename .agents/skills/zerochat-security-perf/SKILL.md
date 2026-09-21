---
name: zerochat-security-perf
description: Security principles, zero-database guarantees, memory garbage collection (URL.revokeObjectURL), LAN IP clipboard fallbacks, and iOS Safari WebKit audio recording resilience.
---

# ZeroChat Security & Performance Engineering Skill

Use this skill to audit memory safety, browser security restrictions, network edge cases, and client-side cleanup.

## 1. Zero-Database & Ephemeral Security
ZeroChat maintains strict zero-retention principles:
- **No Persistence**: Messages, file chunks, and call metadata exist purely in browser RAM (`messages` and `transfers` React state).
- **Session Burn**: Burning a session or closing the tab wipes the in-memory array and explicitly revokes all Blob URLs:
  ```javascript
  transfers.forEach(t => t.downloadUrl && URL.revokeObjectURL(t.downloadUrl));
  messages.forEach(m => {
    if (m.downloadUrl) URL.revokeObjectURL(m.downloadUrl);
    if (m.imageUrl) URL.revokeObjectURL(m.imageUrl);
    if (m.audioUrl) URL.revokeObjectURL(m.audioUrl);
  });
  ```

## 2. LAN IP Clipboard Compatibility
Modern browsers restrict `navigator.clipboard.writeText` to `localhost` and `https://` contexts. When testing over LAN IP (e.g. `http://192.168.x.x:5173`), `navigator.clipboard` is undefined or throws an error.
ZeroChat implements a resilient fallback in [`src/utils/clipboard.js`](file:///d:/sanjay/antigravity%20projects/project-fun/src/utils/clipboard.js):
```javascript
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {}
  }
  // Fallback: Temporary textarea with document.execCommand('copy')
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const successful = document.execCommand('copy');
  document.body.removeChild(textarea);
  return successful;
}
```

## 3. iOS Safari WebKit Audio Recording Compatibility
iOS Safari often rejects standard `audio/webm;codecs=opus` for `MediaRecorder`.
[`src/utils/voiceRecorder.js`](file:///d:/sanjay/antigravity%20projects/project-fun/src/utils/voiceRecorder.js) dynamically negotiates supported MIME types:
1. `audio/webm;codecs=opus` (Chrome/Firefox/Desktop)
2. `audio/mp4` (iOS Safari)
3. `audio/webm`
4. Default browser fallback

## 4. Performance Benchmarks
- Initial JavaScript bundle size: < 150KB gzipped.
- Zero CPU usage when idle (WebRTC channels sleep with light 3-second heartbeat).
- 16KB ArrayBuffer file chunks stream smoothly at up to 25-50 MB/s over LAN without freezing the UI thread.
