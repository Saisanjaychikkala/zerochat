import Peer from 'peerjs';

class PeerService {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.myPeerId = null;
    this.remotePeerId = null;
    this.myNickname = 'Anonymous';
    this.remoteNickname = 'Peer';
    this.listeners = new Map();
    this.pingInterval = null;
    this.isInitializing = false;
    this.reconnectTimer = null;

    // File transfer state
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedBytes, totalChunks }
    this.activeSenders = new Map(); // fileId -> { cancel: boolean }
  }

  setNickname(name) {
    this.myNickname = name || 'Anonymous';
    if (this.isConnected()) {
      this.sendJson({
        type: 'nickname_update',
        nickname: this.myNickname,
      });
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(
      event,
      this.listeners.get(event).filter((cb) => cb !== callback)
    );
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[ZeroChat] Listener error on ${event}:`, e);
        }
      });
    }
  }

  // Initialize PeerJS
  async init(customId = null) {
    if (this.peer && !this.peer.destroyed && this.myPeerId) {
      return this.myPeerId;
    }

    if (this.isInitializing) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.myPeerId) {
            clearInterval(interval);
            resolve(this.myPeerId);
          }
        }, 80);
      });
    }

    this.isInitializing = true;

    return new Promise((resolve, reject) => {
      const config = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
        },
        debug: 1,
      };

      const peerId = customId || this.generateRoomId();

      try {
        if (this.peer && !this.peer.destroyed) {
          this.peer.destroy();
        }
        this.peer = new Peer(peerId, config);
      } catch (err) {
        this.isInitializing = false;
        return reject(err);
      }

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        this.isInitializing = false;
        console.log('[ZeroChat] Peer online:', id);
        this.emit('ready', id);
        resolve(id);
      });

      // Handle incoming connection (Receiver side)
      this.peer.on('connection', (connection) => {
        console.log('[ZeroChat] Incoming peer connection from:', connection.peer);
        this.handleConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.error('[ZeroChat] Peer error:', err);
        this.isInitializing = false;

        if (err.type === 'unavailable-id') {
          console.warn('[ZeroChat] Room ID taken, retrying with new ID...');
          resolve(this.init(null));
          return;
        }

        if (err.type === 'peer-unavailable') {
          this.emit('peer_not_found', err);
          this.emit('status', 'disconnected');
        } else {
          this.emit('error', err);
        }

        if (!this.myPeerId) {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        console.warn('[ZeroChat] Peer broker link disconnected, reconnecting...');
        try {
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        } catch (e) {}
      });

      this.peer.on('close', () => {
        this.myPeerId = null;
        this.isInitializing = false;
      });
    });
  }

  // Connect to target room (Initiator side)
  connectToPeer(remoteId) {
    if (!this.peer || this.peer.destroyed) {
      console.warn('[ZeroChat] Peer not ready');
      return;
    }

    const cleanId = remoteId.trim();
    if (!cleanId || cleanId === this.myPeerId) {
      return;
    }

    console.log('[ZeroChat] Connecting to remote peer:', cleanId);
    this.emit('status', 'connecting');

    // Use binary serialization for fast, zero-copy typed arrays
    const connection = this.peer.connect(cleanId, {
      reliable: true,
      serialization: 'binary',
    });

    this.handleConnection(connection);
  }

  handleConnection(connection) {
    // If existing active connection with another peer, close it cleanly
    if (this.conn && this.conn.peer !== connection.peer) {
      try {
        this.conn.close();
      } catch (e) {}
    }

    this.conn = connection;
    this.remotePeerId = connection.peer;

    const onChannelOpen = () => {
      console.log('[ZeroChat] DataChannel is now ACTIVE with:', this.remotePeerId);

      // 1. Send Handshake with Nickname
      this.sendJson({
        type: 'handshake',
        nickname: this.myNickname,
        peerId: this.myPeerId,
      });

      // 2. Immediate Ping
      this.sendJson({
        type: 'ping',
        sendTime: performance.now(),
      });

      // 3. Start Heartbeat
      this.startPingMonitor();

      this.emit('status', 'connected');
      this.emit('peer_connected', {
        peerId: this.remotePeerId,
        nickname: this.remoteNickname,
      });
    };

    if (connection.open) {
      onChannelOpen();
    } else {
      connection.on('open', onChannelOpen);
    }

    connection.on('data', (data) => {
      this.handleIncomingPacket(data);
    });

    connection.on('close', () => {
      console.log('[ZeroChat] DataChannel closed with peer:', this.remotePeerId);
      this.stopPingMonitor();
      this.emit('status', 'reconnecting');
      this.emit('peer_disconnected', { peerId: this.remotePeerId });

      // Note: We do NOT wipe chat messages on disconnect!
    });

    connection.on('error', (err) => {
      console.error('[ZeroChat] Connection error:', err);
      this.emit('error', err);
    });
  }

  handleIncomingPacket(data) {
    if (!data) return;

    // Check if packet is ArrayBuffer (Binary File Chunk)
    if (data instanceof ArrayBuffer || (data.buffer && data.buffer instanceof ArrayBuffer)) {
      this.handleBinaryFileChunk(data);
      return;
    }

    // Packet is JSON object
    switch (data.type) {
      case 'handshake':
      case 'nickname_update':
        this.remoteNickname = data.nickname || 'Peer';
        this.emit('peer_info', {
          peerId: this.remotePeerId,
          nickname: this.remoteNickname,
        });
        if (data.type === 'handshake') {
          // Respond with handshake_ack so both sides know names
          this.sendJson({
            type: 'handshake_ack',
            nickname: this.myNickname,
            peerId: this.myPeerId,
          });
        }
        break;

      case 'handshake_ack':
        this.remoteNickname = data.nickname || 'Peer';
        this.emit('peer_info', {
          peerId: this.remotePeerId,
          nickname: this.remoteNickname,
        });
        break;

      case 'text':
        this.emit('message', {
          id: data.id,
          text: data.text,
          senderNickname: data.senderNickname || this.remoteNickname || 'Peer',
          sender: 'remote',
          timestamp: data.timestamp || Date.now(),
        });
        // Send delivery ACK
        this.sendJson({ type: 'ack', id: data.id });
        break;

      case 'ack':
        this.emit('message_ack', data.id);
        break;

      case 'typing':
        this.emit('typing', {
          isTyping: !!data.isTyping,
          nickname: data.nickname || this.remoteNickname || 'Peer',
        });
        break;

      case 'ping':
        this.sendJson({ type: 'pong', sendTime: data.sendTime });
        break;

      case 'pong':
        if (data.sendTime) {
          const latency = Math.max(1, Math.round(performance.now() - data.sendTime));
          this.emit('latency', latency);
        }
        break;

      case 'file_meta':
        this.incomingFiles.set(data.fileId, {
          meta: data,
          chunks: new Array(data.totalChunks),
          receivedCount: 0,
          receivedBytes: 0,
          startTime: performance.now(),
        });
        this.emit('file_start', {
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          senderNickname: data.senderNickname || this.remoteNickname,
          isSender: false,
          isVoiceNote: !!data.isVoiceNote,
          durationSec: data.durationSec || 0,
        });
        break;

      case 'file_chunk_meta':
        // Metadata preceding binary chunk
        this.currentReceivingChunk = {
          fileId: data.fileId,
          chunkIndex: data.chunkIndex,
        };
        break;

      case 'file_cancel':
        this.incomingFiles.delete(data.fileId);
        this.emit('file_cancelled', { fileId: data.fileId });
        break;

      default:
        break;
    }
  }

  handleBinaryFileChunk(arrayBuffer) {
    if (!this.currentReceivingChunk) return;

    const { fileId, chunkIndex } = this.currentReceivingChunk;
    const record = this.incomingFiles.get(fileId);
    if (!record) return;

    record.chunks[chunkIndex] = arrayBuffer;
    record.receivedCount += 1;
    record.receivedBytes += arrayBuffer.byteLength;

    const progress = Math.min(
      100,
      Math.round((record.receivedCount / record.meta.totalChunks) * 100)
    );
    const elapsedSec = (performance.now() - record.startTime) / 1000;
    const speedBps = elapsedSec > 0 ? record.receivedBytes / elapsedSec : 0;

    this.emit('file_progress', {
      fileId,
      progress,
      speedBps,
      isSender: false,
    });

    if (record.receivedCount === record.meta.totalChunks) {
      const blob = new Blob(record.chunks, { type: record.meta.fileType });
      const downloadUrl = URL.createObjectURL(blob);

        this.emit('file_complete', {
          fileId,
          fileName: record.meta.fileName,
          fileSize: record.meta.fileSize,
          fileType: record.meta.fileType,
          senderNickname: record.meta.senderNickname,
          downloadUrl,
          blob,
          isSender: false,
          isVoiceNote: !!record.meta.isVoiceNote,
          durationSec: record.meta.durationSec || 0,
        });

      this.incomingFiles.delete(fileId);
      this.currentReceivingChunk = null;
    }
  }

  sendTextMessage(text) {
    if (!this.isConnected()) {
      throw new Error('Not connected to peer');
    }

    const message = {
      type: 'text',
      id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      text,
      senderNickname: this.myNickname,
      timestamp: Date.now(),
    };

    this.sendJson(message);
    return message;
  }

  sendTypingStatus(isTyping) {
    if (!this.isConnected()) return;
    this.sendJson({
      type: 'typing',
      isTyping: !!isTyping,
      nickname: this.myNickname,
    });
  }

  // BULLETPROOF FILE SENDER WITH 16KB CHUNKS & WEBRTC BACKPRESSURE
  async sendFile(file, onProgress = null) {
    if (!this.isConnected()) {
      throw new Error('Peer not connected');
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const CHUNK_SIZE = 16 * 1024; // 16KB safe standard WebRTC chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    this.activeSenders.set(fileId, { cancel: false });

    // 1. Send file metadata header
    this.sendJson({
      type: 'file_meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      senderNickname: this.myNickname,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    this.emit('file_start', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    let offset = 0;
    let chunkIndex = 0;
    const startTime = performance.now();

    while (offset < file.size) {
      if (!this.isConnected()) {
        throw new Error('Connection lost during file transfer');
      }

      if (this.activeSenders.get(fileId)?.cancel) {
        this.sendJson({ type: 'file_cancel', fileId });
        this.emit('file_cancelled', { fileId });
        this.activeSenders.delete(fileId);
        return;
      }

      // CRITICAL BACKPRESSURE: Check underlying RTCDataChannel buffer
      const rawDc = this.conn?._dc;
      if (rawDc && rawDc.bufferedAmount > 64 * 1024) {
        // Wait until buffer drains below 64KB
        await new Promise((resolve) => setTimeout(resolve, 20));
        continue;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      // Send chunk header then raw binary buffer
      this.sendJson({
        type: 'file_chunk_meta',
        fileId,
        chunkIndex,
      });

      // Send raw binary buffer (Native WebRTC zero-copy)
      this.conn.send(arrayBuffer);

      offset += CHUNK_SIZE;
      chunkIndex += 1;

      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedBps = elapsedSec > 0 ? offset / elapsedSec : 0;

      if (onProgress) onProgress(progress, speedBps);
      this.emit('file_progress', {
        fileId,
        progress,
        speedBps,
        isSender: true,
      });

      // Small tick to prevent UI locking on mobile
      if (chunkIndex % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
    }

    this.activeSenders.delete(fileId);

    const downloadUrl = URL.createObjectURL(file);

    this.emit('file_complete', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
      downloadUrl,
      blob: file,
      isVoiceNote: !!file.isVoiceNote,
      durationSec: file.durationSec || 0,
    });

    return fileId;
  }

  cancelFileTransfer(fileId) {
    if (this.activeSenders.has(fileId)) {
      this.activeSenders.get(fileId).cancel = true;
    }
    this.sendJson({ type: 'file_cancel', fileId });
  }

  sendJson(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
      } catch (err) {
        console.error('[ZeroChat] sendJson error:', err);
      }
    }
  }

  startPingMonitor() {
    this.stopPingMonitor();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendJson({
          type: 'ping',
          sendTime: performance.now(),
        });
      }
    }, 3000);
  }

  stopPingMonitor() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected() {
    return !!(this.conn && this.conn.open);
  }

  disconnect() {
    this.stopPingMonitor();
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    this.remotePeerId = null;
    this.remoteNickname = 'Peer';
    this.emit('status', 'disconnected');
  }

  cleanup() {
    this.disconnect();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.myPeerId = null;
    this.isInitializing = false;
    this.incomingFiles.clear();
    this.activeSenders.clear();
  }

  generateRoomId() {
    const words = [
      'alpha', 'bravo', 'cosmic', 'delta', 'echo', 'flame',
      'galaxy', 'hyper', 'ion', 'jet', 'kinetic', 'lunar',
      'matrix', 'nexus', 'orbit', 'pulse', 'quantum', 'radar',
      'solar', 'titan', 'ultra', 'vortex', 'wave', 'zenith'
    ];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${w1}-${w2}-${num}`;
  }
}

export const peerService = new PeerService();
