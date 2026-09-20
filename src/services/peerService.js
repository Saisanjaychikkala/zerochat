import Peer from 'peerjs';

class PeerService {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.activePeerId = null;
    this.myPeerId = null;
    this.myNickname = 'Anonymous';
    this.listeners = new Map();
    this.pingIntervals = new Map(); // peerId -> interval
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedCount, totalBytes }
    this.activeSenders = new Map(); // fileId -> { cancel: boolean }
  }

  setNickname(name) {
    this.myNickname = name || 'Anonymous';
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
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }

  async init(customId = null) {
    if (this.peer && !this.peer.destroyed) {
      return this.myPeerId;
    }

    return new Promise((resolve, reject) => {
      const config = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
          ],
        },
        debug: 1,
      };

      const peerId = customId || this.generateRoomId();
      this.peer = new Peer(peerId, config);

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        this.emit('ready', id);
        resolve(id);
      });

      this.peer.on('connection', (connection) => {
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.emit('error', err);
        if (!this.myPeerId) {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this.emit('status', { status: 'disconnected', peerId: this.activePeerId });
      });

      this.peer.on('close', () => {
        this.cleanup();
      });
    });
  }

  connectToPeer(remoteId) {
    if (!this.peer || this.peer.destroyed) {
      throw new Error('Peer not initialized');
    }

    if (remoteId === this.myPeerId) {
      throw new Error('Cannot connect to your own room ID');
    }

    this.emit('status', { status: 'connecting', peerId: remoteId });
    const connection = this.peer.connect(remoteId, {
      reliable: true,
      serialization: 'json',
    });

    this.setupConnection(connection);
  }

  setupConnection(connection) {
    const peerId = connection.peer;

    connection.on('open', () => {
      this.connections.set(peerId, connection);
      this.activePeerId = peerId;

      // 1. Send Handshake with Nickname immediately
      this.sendToPeer(peerId, {
        type: 'handshake',
        nickname: this.myNickname,
        peerId: this.myPeerId,
      });

      // 2. Send Immediate Ping
      this.sendToPeer(peerId, {
        type: 'ping',
        sendTime: performance.now(),
      });

      // 3. Start periodic Ping monitor
      this.startPingMonitor(peerId);

      this.emit('status', { status: 'connected', peerId });
      this.emit('peer_connected', { peerId });
    });

    connection.on('data', (data) => {
      this.handleIncomingData(peerId, data);
    });

    connection.on('close', () => {
      this.stopPingMonitor(peerId);
      this.connections.delete(peerId);
      this.emit('status', { status: 'disconnected', peerId });
      this.emit('session_ended', { peerId, reason: 'disconnected' });

      if (this.activePeerId === peerId) {
        // Switch to another active connection if available
        const remaining = Array.from(this.connections.keys());
        this.activePeerId = remaining.length > 0 ? remaining[0] : null;
        this.emit('active_peer_changed', this.activePeerId);
      }
    });

    connection.on('error', (err) => {
      console.error(`Connection error with ${peerId}:`, err);
      this.emit('error', { peerId, error: err });
    });
  }

  handleIncomingData(fromPeerId, data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'handshake':
        this.emit('peer_handshake', {
          peerId: fromPeerId,
          nickname: data.nickname || 'Peer',
        });
        break;

      case 'text':
        this.emit('message', {
          id: data.id,
          text: data.text,
          senderPeerId: fromPeerId,
          senderNickname: data.senderNickname || 'Peer',
          sender: 'remote',
          timestamp: data.timestamp || Date.now(),
          encrypted: data.encrypted || false,
        });
        // Send ACK
        this.sendToPeer(fromPeerId, { type: 'ack', id: data.id });
        break;

      case 'ack':
        this.emit('message_ack', { id: data.id, peerId: fromPeerId });
        break;

      case 'typing':
        this.emit('typing', {
          peerId: fromPeerId,
          isTyping: data.isTyping,
          nickname: data.nickname || 'Peer',
        });
        break;

      case 'ping':
        this.sendToPeer(fromPeerId, {
          type: 'pong',
          sendTime: data.sendTime,
        });
        break;

      case 'pong':
        if (data.sendTime) {
          const latency = Math.max(1, Math.round(performance.now() - data.sendTime));
          this.emit('latency', { peerId: fromPeerId, latency });
        }
        break;

      case 'session_end':
        this.emit('session_ended', {
          peerId: fromPeerId,
          reason: data.reason || 'Peer left the session',
        });
        this.closePeerConnection(fromPeerId);
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
          senderNickname: data.senderNickname,
          peerId: fromPeerId,
          isSender: false,
        });
        break;

      case 'file_chunk':
        this.processFileChunk(fromPeerId, data);
        break;

      case 'file_cancel':
        this.incomingFiles.delete(data.fileId);
        this.emit('file_cancelled', { fileId: data.fileId });
        break;

      default:
        break;
    }
  }

  processFileChunk(fromPeerId, data) {
    const record = this.incomingFiles.get(data.fileId);
    if (!record) return;

    // Convert Base64 chunk string back to ArrayBuffer
    const binary = window.atob(data.chunkData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    record.chunks[data.chunkIndex] = bytes.buffer;
    record.receivedCount += 1;
    record.receivedBytes += bytes.length;

    const progress = Math.min(
      100,
      Math.round((record.receivedCount / record.meta.totalChunks) * 100)
    );
    const elapsedSec = (performance.now() - record.startTime) / 1000;
    const speedBps = elapsedSec > 0 ? record.receivedBytes / elapsedSec : 0;

    this.emit('file_progress', {
      fileId: data.fileId,
      peerId: fromPeerId,
      progress,
      speedBps,
      isSender: false,
    });

    if (record.receivedCount === record.meta.totalChunks) {
      // Reassemble file
      const blob = new Blob(record.chunks, { type: record.meta.fileType });
      const downloadUrl = URL.createObjectURL(blob);

      this.emit('file_complete', {
        fileId: data.fileId,
        fileName: record.meta.fileName,
        fileSize: record.meta.fileSize,
        fileType: record.meta.fileType,
        senderNickname: record.meta.senderNickname,
        peerId: fromPeerId,
        downloadUrl,
        blob,
        isSender: false,
      });

      this.incomingFiles.delete(data.fileId);
    }
  }

  sendTextMessage(text, targetPeerId = null, encrypted = false) {
    const peerId = targetPeerId || this.activePeerId;
    if (!peerId || !this.isPeerConnected(peerId)) {
      throw new Error('Not connected to peer');
    }

    const message = {
      type: 'text',
      id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      text,
      senderNickname: this.myNickname,
      timestamp: Date.now(),
      encrypted,
    };

    this.sendToPeer(peerId, message);
    return message;
  }

  sendTypingStatus(isTyping, targetPeerId = null) {
    const peerId = targetPeerId || this.activePeerId;
    if (!peerId || !this.isPeerConnected(peerId)) return;

    this.sendToPeer(peerId, {
      type: 'typing',
      isTyping,
      nickname: this.myNickname,
    });
  }

  async sendFile(file, targetPeerId = null, onProgress = null) {
    const peerId = targetPeerId || this.activePeerId;
    if (!peerId || !this.isPeerConnected(peerId)) {
      throw new Error('Not connected to peer');
    }

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const CHUNK_SIZE = 32 * 1024; // 32KB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    this.activeSenders.set(fileId, { cancel: false });

    // Send metadata header
    this.sendToPeer(peerId, {
      type: 'file_meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      senderNickname: this.myNickname,
    });

    this.emit('file_start', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      peerId,
      isSender: true,
    });

    let offset = 0;
    let chunkIndex = 0;
    const startTime = performance.now();

    while (offset < file.size) {
      if (!this.isPeerConnected(peerId)) {
        throw new Error('Peer disconnected during transfer');
      }

      if (this.activeSenders.get(fileId)?.cancel) {
        this.sendToPeer(peerId, { type: 'file_cancel', fileId });
        this.emit('file_cancelled', { fileId });
        this.activeSenders.delete(fileId);
        return;
      }

      // Backpressure check on DataChannel buffer
      const conn = this.connections.get(peerId);
      const rawChannel = conn?.dataChannel;
      if (rawChannel && rawChannel.bufferedAmount > 4 * 1024 * 1024) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        continue;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      // Convert slice to Base64
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const chunkData = window.btoa(binary);

      this.sendToPeer(peerId, {
        type: 'file_chunk',
        fileId,
        chunkIndex,
        chunkData,
      });

      offset += CHUNK_SIZE;
      chunkIndex += 1;

      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedBps = elapsedSec > 0 ? offset / elapsedSec : 0;

      if (onProgress) onProgress(progress, speedBps);
      this.emit('file_progress', {
        fileId,
        peerId,
        progress,
        speedBps,
        isSender: true,
      });

      await new Promise((resolve) => setTimeout(resolve, 3));
    }

    this.activeSenders.delete(fileId);

    this.emit('file_complete', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      peerId,
      isSender: true,
    });

    return fileId;
  }

  cancelFileTransfer(fileId, targetPeerId = null) {
    const peerId = targetPeerId || this.activePeerId;
    if (this.activeSenders.has(fileId)) {
      this.activeSenders.get(fileId).cancel = true;
    }
    if (peerId) {
      this.sendToPeer(peerId, { type: 'file_cancel', fileId });
    }
  }

  endSession(reason = 'User closed session', targetPeerId = null) {
    const peerId = targetPeerId || this.activePeerId;
    if (peerId && this.isPeerConnected(peerId)) {
      this.sendToPeer(peerId, {
        type: 'session_end',
        reason,
      });
      this.closePeerConnection(peerId);
      this.emit('session_ended', { peerId, reason: 'You ended the session' });
    }
  }

  closePeerConnection(peerId) {
    this.stopPingMonitor(peerId);
    const conn = this.connections.get(peerId);
    if (conn) {
      try {
        conn.close();
      } catch (e) {}
      this.connections.delete(peerId);
    }
    if (this.activePeerId === peerId) {
      const remaining = Array.from(this.connections.keys());
      this.activePeerId = remaining.length > 0 ? remaining[0] : null;
      this.emit('active_peer_changed', this.activePeerId);
    }
  }

  sendToPeer(peerId, data) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  startPingMonitor(peerId) {
    this.stopPingMonitor(peerId);
    const interval = setInterval(() => {
      if (this.isPeerConnected(peerId)) {
        this.sendToPeer(peerId, {
          type: 'ping',
          sendTime: performance.now(),
        });
      }
    }, 3000);
    this.pingIntervals.set(peerId, interval);
  }

  stopPingMonitor(peerId) {
    if (this.pingIntervals.has(peerId)) {
      clearInterval(this.pingIntervals.get(peerId));
      this.pingIntervals.delete(peerId);
    }
  }

  isPeerConnected(peerId) {
    const conn = this.connections.get(peerId);
    return !!(conn && conn.open);
  }

  getActiveConnections() {
    return Array.from(this.connections.keys());
  }

  cleanup() {
    this.pingIntervals.forEach((interval) => clearInterval(interval));
    this.pingIntervals.clear();

    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {}
    });
    this.connections.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    this.myPeerId = null;
    this.activePeerId = null;
    this.incomingFiles.clear();
    this.activeSenders.clear();
  }

  generateRoomId() {
    const adjectives = ['cyber', 'quantum', 'ghost', 'cosmic', 'hyper', 'pulse', 'stealth', 'zero'];
    const nouns = ['link', 'vault', 'node', 'nexus', 'core', 'portal', 'wave', 'stream'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `${adj}-${noun}-${num}`;
  }
}

export const peerService = new PeerService();
