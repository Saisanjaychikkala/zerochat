---
name: zerochat-qa
description: Comprehensive regression testing, edge case inspection, WebRTC connectivity auditing, and memory-leak verification for ZeroChat.
---

# ZeroChat QA & Verification Skill

Use this skill whenever verifying new features, auditing regressions, or running quality assurance on ZeroChat.

## 1. Automated Verification
Always run the autonomous test runner before declaring any task complete:
```bash
npm test
```
Then run the production build:
```bash
npm run build
```

## 2. Core Functional Test Matrix

### 2.1 P2P Connection & Handshake
- [ ] **Direct 1-on-1 Room**: Verify host generates a 3-word room code (`word-word-num`) and updates window hash (`#code`).
- [ ] **Peer Join**: When a second browser joins via URL hash or input modal, `peer_connected` fires and status updates to `connected`.
- [ ] **Room Full Rejection**: When a 3rd browser attempts to join an occupied room, the host sends `{ type: 'room_occupied' }`. The 3rd peer stops auto-reconnecting and displays the room-full notice with "Create My Own Room" and "Join Another Room" actions.
- [ ] **Reconnection & Queue**: Interrupted network switches status to `reconnecting`. Outgoing messages queue in memory and flush automatically upon channel restoration.

### 2.2 Messaging & Quoting
- [ ] **Ephemeral Delivery**: Messages travel via WebRTC DataChannel; delivery ACKs mark sent messages with double-check icons.
- [ ] **Threaded Quoting**: Clicking the reply button on any message docks a reply preview above the input. Sent replies display an inset quote card with click-to-scroll navigation and a glowing pulse highlight.
- [ ] **Code Snippets**: Text enclosed in triple backticks renders as a syntax-highlighted card with a one-click copy button.
- [ ] **Image Paste**: Pasting a screenshot directly from clipboard (Ctrl+V) immediately sends the image.

### 2.3 AirDrop 16KB Memory Streaming
- [ ] **Chunking & Flow Control**: Files stream in 16KB `ArrayBuffer` slices. Backpressure check pauses streaming if `bufferedAmount > 64KB`.
- [ ] **Progress Tracking**: Real-time progress bar and speed (KB/s or MB/s) display on both sender and receiver.
- [ ] **Bidirectional Cancellation**: Clicking cancel stops file reading immediately on the sender and purges partial chunks on the receiver.
- [ ] **Memory Teardown**: Burning the session or disconnecting calls `URL.revokeObjectURL` on all generated blobs.

### 2.4 Voice & Video Calling
- [ ] **Audio-to-Video In-Call Upgrade**: Audio calls attach a silent dummy canvas track (`m=video` pipeline). When the user taps "Camera On", `replaceTrack` acquires the physical camera and swaps tracks seamlessly without renegotiation failure.
- [ ] **Floating Pill Controls Dock**: Controls dock is centered at `bottom: 24px` with a high `z-index`, ensuring it is never pushed offscreen or obscured by browser fullscreen banners.
- [ ] **Header Quick End Call**: A dedicated red `PhoneOff` button in the header bar allows exiting calls even if bottom controls are shifted.
- [ ] **Procedural Ringtones**: Incoming and outgoing ringtones synthesize dynamically via Web Audio API; sound toggle silences ringtones immediately.
