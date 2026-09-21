---
name: zerochat-webrtc
description: Deep architectural guide for WebRTC DataChannels, wire protocol serialization, 16KB AirDrop streaming with backpressure, and dummy video canvas track calling pipeline.
---

# ZeroChat WebRTC Protocol & Architecture Skill

Use this skill when modifying, extending, or debugging WebRTC signaling, DataChannel communications, file chunking, or media calling.

## 1. Core Architecture Principles
- **No Central Server / Zero Database**: PeerJS broker is used ONLY for initial ICE candidate and SDP exchange. All messages, files, and media flow directly peer-to-peer.
- **Strict 1-on-1 Topology**: Mesh is intentionally limited to 2 peers. The host enforces this via the `room_occupied` signal.

## 2. Wire Protocol Specification

All DataChannel packets are JSON objects (or binary `ArrayBuffer` instances preceded by `file_chunk_meta`).

```javascript
// Text message with optional threaded quote
{
  type: 'text',
  id: 'msg_abc123_1727000000000',
  text: 'Hello peer!',
  senderNickname: 'Alice',
  timestamp: 1727000000000,
  replyTo: {
    id: 'msg_xyz789_1726999990000',
    senderNickname: 'Bob',
    snippet: 'Hey Alice',
    type: 'text' // 'text' | 'image' | 'file' | 'voice'
  }
}

// Delivery Receipt
{ type: 'ack', id: 'msg_abc123_1727000000000' }

// Typing indicator
{ type: 'typing', isTyping: true, nickname: 'Alice' }

// Latency Heartbeat
{ type: 'ping', sendTime: performance.now() }
{ type: 'pong', sendTime: 12345.67 }

// Room Occupied Signal (Sent to 3rd peer)
{ type: 'room_occupied', reason: 'Room is full (2/2 peers connected)' }

// File Transfer Initiation Header
{
  type: 'file_meta',
  fileId: 'file_xyz123_1727000000000',
  fileName: 'document.pdf',
  fileSize: 1048576,
  fileType: 'application/pdf',
  totalChunks: 64,
  senderNickname: 'Alice',
  isVoiceNote: false,
  durationSec: 0
}

// Chunk Metadata Header (Precedes raw ArrayBuffer)
{
  type: 'file_chunk_meta',
  fileId: 'file_xyz123_1727000000000',
  chunkIndex: 0
}

// File Cancel
{ type: 'file_cancel', fileId: 'file_xyz123_1727000000000' }

// Call Signal
{
  type: 'call_signal',
  signal: 'offer' | 'accepted' | 'rejected' | 'busy' | 'ended' | 'camera_toggle',
  isVideo: true,
  isVideoActive: true,
  callerNickname: 'Alice'
}
```

## 3. Backpressure Rule for 16KB Streaming
Always check `conn.dataChannel.bufferedAmount`:
```javascript
const rawDc = conn?.dataChannel || conn?._dc;
if (rawDc && rawDc.bufferedAmount > 64 * 1024) {
  await new Promise((resolve) => setTimeout(resolve, 20));
  continue;
}
```

## 4. In-Call Camera Upgrade (Dummy Track Pattern)
PeerJS and WebRTC SDP cannot dynamically renegotiate an `m=video` line if the initial call offer/answer was audio-only without video.
ZeroChat establishes a disabled 2x2 dummy canvas track on all audio calls:
```javascript
const canvas = document.createElement('canvas');
canvas.width = 2;
canvas.height = 2;
const stream = canvas.captureStream(1);
const track = stream.getVideoTracks()[0];
track.enabled = false;
localStream.addTrack(track);
```
When upgrading:
```javascript
const realStream = await navigator.mediaDevices.getUserMedia({ video: true });
const realTrack = realStream.getVideoTracks()[0];
const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
await videoSender.replaceTrack(realTrack);
```
