import Peer from 'peerjs';

class PeerService {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.myPeerId = null;
    this.remotePeerId = null;
    this.listeners = new Map();
    this.pingInterval = null;
    this.lastPing = null;
    this.incomingFiles = new Map(); // fileId -> { meta, chunks: [], receivedBytes }
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

  // Initialize Peer with random readable ID or custom ID
  async init(customId = null) {
    if (this.peer && !this.peer.destroyed) {
      return this.myPeerId;
    }

    return new Promise((resolve, reject) => {
      // Configuration with free Google STUN servers for reliable NAT traversal
      const config = {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
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
        // Accept incoming peer connection
        this.handleConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.emit('error', err);
        if (!this.myPeerId) {
          reject(err);
        }
      });

      this.peer.on('disconnected', () => {
        this.emit('status', 'disconnected');
      });

      this.peer.on('close', () => {
        this.cleanup();
      });
    });
  }

  // Connect to a remote room ID
  connectToPeer(remoteId) {
    if (!this.peer || this.peer.destroyed) {
      throw new Error('Peer not initialized. Call init() first.');
    }

    this.emit('status', 'connecting');
    const connection = this.peer.connect(remoteId, {
      reliable: true,
      serialization: 'json',
    });

    this.handleConnection(connection);
  }

  handleConnection(connection) {
    if (this.conn) {
      // If already connected, close old connection
      this.conn.close();
    }

    this.conn = connection;
    this.remotePeerId = connection.peer;

    this.conn.on('open', () => {
      this.emit('status', 'connected');
      this.emit('peer_connected', { peerId: this.remotePeerId });
      this.startPingMonitor();
    });

    this.conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    this.conn.on('close', () => {
      this.stopPingMonitor();
      this.emit('status', 'disconnected');
      this.emit('peer_disconnected', { peerId: this.remotePeerId });
      this.conn = null;
      this.remotePeerId = null;
    });

    this.conn.on('error', (err) => {
      console.error('DataConnection error:', err);
      this.emit('error', err);
    });
  }

  handleIncomingData(data) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'text':
        this.emit('message', {
          id: data.id,
          text: data.text,
          sender: 'remote',
          timestamp: data.timestamp || Date.now(),
        });
        // Send back ACK
        this.sendRaw({ type: 'ack', id: data.id });
        break;

      case 'ack':
        this.emit('message_ack', data.id);
        break;

      case 'typing':
        this.emit('typing', data.isTyping);
        break;

      case 'ping':
        this.sendRaw({ type: 'pong', sendTime: data.sendTime });
        break;

      case 'pong':
        if (data.sendTime) {
          const latency = Math.round(performance.now() - data.sendTime);
          this.emit('latency', latency);
        }
        break;

      case 'file_meta':
        this.incomingFiles.set(data.fileId, {
          meta: data,
          chunks: new Array(data.totalChunks),
          receivedChunksCount: 0,
          receivedBytes: 0,
          startTime: performance.now(),
        });
        this.emit('file_start', {
          fileId: data.fileId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
          isSender: false,
        });
        break;

      case 'file_chunk':
        this.processFileChunk(data);
        break;

      default:
        console.log('Unknown message type received:', data.type);
    }
  }

  processFileChunk(data) {
    const fileRecord = this.incomingFiles.get(data.fileId);
    if (!fileRecord) return;

    fileRecord.chunks[data.chunkIndex] = data.chunk;
    fileRecord.receivedChunksCount += 1;
    fileRecord.receivedBytes += data.chunkSize || 0;

    const progress = Math.min(
      100,
      Math.round((fileRecord.receivedChunksCount / fileRecord.meta.totalChunks) * 100)
    );

    const elapsedSec = (performance.now() - fileRecord.startTime) / 1000;
    const speedBps = elapsedSec > 0 ? fileRecord.receivedBytes / elapsedSec : 0;

    this.emit('file_progress', {
      fileId: data.fileId,
      progress,
      speedBps,
      isSender: false,
    });

    if (fileRecord.receivedChunksCount === fileRecord.meta.totalChunks) {
      // All chunks received! Reassemble blob
      const blob = new Blob(fileRecord.chunks, { type: fileRecord.meta.fileType });
      const downloadUrl = URL.createObjectURL(blob);

      this.emit('file_complete', {
        fileId: data.fileId,
        fileName: fileRecord.meta.fileName,
        fileSize: fileRecord.meta.fileSize,
        fileType: fileRecord.meta.fileType,
        downloadUrl,
        blob,
        isSender: false,
      });

      this.incomingFiles.delete(data.fileId);
    }
  }

  // Send a text message
  sendTextMessage(text) {
    if (!this.isConnected()) throw new Error('Not connected to any peer');

    const message = {
      type: 'text',
      id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      text,
      timestamp: Date.now(),
    };

    this.sendRaw(message);
    return message;
  }

  // Send typing status
  sendTypingStatus(isTyping) {
    if (!this.isConnected()) return;
    this.sendRaw({ type: 'typing', isTyping });
  }

  // Send file via WebRTC DataChannel with backpressure flow control
  async sendFile(file, onProgress) {
    if (!this.isConnected()) throw new Error('Not connected to any peer');

    const fileId = 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    const CHUNK_SIZE = 32 * 1024; // 32KB chunks for stable WebRTC throughput
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Send metadata header first
    this.sendRaw({
      type: 'file_meta',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
    });

    this.emit('file_start', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
    });

    let offset = 0;
    let chunkIndex = 0;
    const startTime = performance.now();

    // Read and stream chunks with backpressure
    while (offset < file.size) {
      if (!this.isConnected()) throw new Error('Peer disconnected during transfer');

      // Check DataChannel buffer to avoid overflow
      const rawChannel = this.conn.dataChannel;
      if (rawChannel && rawChannel.bufferedAmount > 4 * 1024 * 1024) {
        // Pause until buffer drains
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await slice.arrayBuffer();

      this.sendRaw({
        type: 'file_chunk',
        fileId,
        chunkIndex,
        chunk: arrayBuffer,
        chunkSize: arrayBuffer.byteLength,
      });

      offset += CHUNK_SIZE;
      chunkIndex += 1;

      const progress = Math.min(100, Math.round((offset / file.size) * 100));
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedBps = elapsedSec > 0 ? offset / elapsedSec : 0;

      if (onProgress) {
        onProgress(progress, speedBps);
      }
      this.emit('file_progress', {
        fileId,
        progress,
        speedBps,
        isSender: true,
      });

      // Yield event loop
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    this.emit('file_complete', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isSender: true,
    });

    return fileId;
  }

  sendRaw(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  startPingMonitor() {
    this.stopPingMonitor();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendRaw({ type: 'ping', sendTime: performance.now() });
      }
    }, 4000);
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

  cleanup() {
    this.stopPingMonitor();
    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.myPeerId = null;
    this.remotePeerId = null;
    this.incomingFiles.clear();
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
