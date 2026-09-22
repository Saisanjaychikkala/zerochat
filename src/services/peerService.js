/**
 * ZeroChat - WebRTC Peer Service Facade
 * 
 * Coordinates:
 * - PeerJS Connection Lifecycle & 1-on-1 Room Guard
 * - Background Auto-Reconnect Loop & Ephemeral RAM Queue
 * - FileStreamEngine (16KB Chunk Streaming & Backpressure)
 * - MediaCallEngine (E2EE Voice/Video Calls, In-Call Camera Upgrades & Screen Share)
 */

import Peer from 'peerjs';
import { ICE_SERVERS, generateRoomId } from './webrtc/constants';
import { FileStreamEngine } from './webrtc/fileStreamEngine';
import { MediaCallEngine } from './webrtc/mediaCallEngine';

class PeerService {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.myPeerId = null;
    this.remotePeerId = null;
    this.targetPeerId = null;
    this.myNickname = 'Anonymous';
    this.remoteNickname = 'Peer';
    this.listeners = new Map();
    this.pingInterval = null;
    this.isInitializing = false;
    this.reconnectTimer = null;
    this.connectRetryTimer = null;
    this.connectionTimeout = null;
    this.connectAttempts = 0;
    this.maxConnectAttempts = 4;
    this.isIntentionalDisconnect = false;
    this.isRoomFull = false;

    // Ephemeral RAM outgoing message queue for background reconnect resilience
    this.outgoingQueue = [];

    // Sub-Engines
    this.fileStream = new FileStreamEngine();
    this.mediaCall = new MediaCallEngine();
  }

  // ==========================================
  // Event Emitter Implementation
  // ==========================================

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

  // ==========================================
  // Nickname & Identity Management
  // ==========================================

  setNickname(name) {
    this.myNickname = name || 'Anonymous';
    if (this.isConnected()) {
      this.sendJson({
        type: 'nickname_update',
        nickname: this.myNickname,
      });
    }
  }

  generateRoomId() {
    return generateRoomId();
  }

  // ==========================================
  // PeerJS Broker & Connection Initialization
  // ==========================================

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
          iceServers: ICE_SERVERS,
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

        if (this.targetPeerId && this.targetPeerId !== id && !this.isConnected()) {
          console.log('[ZeroChat] Executing queued connection to:', this.targetPeerId);
          this.executeConnect(this.targetPeerId);
        }

        resolve(id);
      });

      // Handle incoming connection (Receiver side)
      this.peer.on('connection', (connection) => {
        console.log('[ZeroChat] Incoming peer connection from:', connection.peer);

        // Strict 1-on-1 Guard: If room already occupied by another peer, reject 3rd peer
        if (this.conn && this.conn.open && this.conn.peer !== connection.peer) {
          console.warn(`[ZeroChat] Room full (2/2 peers connected). Rejecting 3rd peer: ${connection.peer}`);

          const sendRoomFullAndClose = () => {
            try {
              connection.send({
                type: 'room_occupied',
                reason: 'Room is full (2/2 peers connected)',
              });
            } catch (e) {
              console.warn('[ZeroChat] Error sending room_occupied packet:', e);
            }
            setTimeout(() => {
              try {
                connection.close();
              } catch (e) {}
            }, 350);
          };

          if (connection.open) {
            sendRoomFullAndClose();
          } else {
            connection.on('open', sendRoomFullAndClose);
            setTimeout(() => {
              try {
                connection.close();
              } catch (e) {}
            }, 3000);
          }
          return;
        }

        this.handleConnection(connection);
      });

      // Handle incoming WebRTC media call
      this.peer.on('call', (mediaConn) => {
        console.log('[ZeroChat] Incoming WebRTC media call from:', mediaConn.peer);

        if (this.mediaCall.currentCall || this.mediaCall.incomingCallData) {
          console.warn('[ZeroChat] Already on call or call pending. Rejecting call from:', mediaConn.peer);
          try {
            mediaConn.close();
          } catch (e) {}
          this.sendJson({
            type: 'call_signal',
            signal: 'busy',
          });
          return;
        }

        const metadata = mediaConn.metadata || {};
        const isVideo = metadata.isVideo !== undefined ? metadata.isVideo : true;
        const callerNickname = metadata.callerNickname || this.remoteNickname || 'Peer';

        this.mediaCall.incomingCallData = { mediaConn, callerNickname, isVideo };
        this.emit('call_incoming', {
          mediaConn,
          callerNickname,
          isVideo,
          peerId: mediaConn.peer,
        });
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
          if (this.targetPeerId && this.connectAttempts < this.maxConnectAttempts && !this.isConnected()) {
            this.connectAttempts += 1;
            const delay = this.connectAttempts * 1200;
            console.warn(`[ZeroChat] Peer ${this.targetPeerId} not ready yet. Retrying (${this.connectAttempts}/${this.maxConnectAttempts}) in ${delay}ms...`);
            this.emit('status', 'connecting');
            if (this.connectRetryTimer) clearTimeout(this.connectRetryTimer);
            this.connectRetryTimer = setTimeout(() => {
              if (this.targetPeerId && !this.isConnected()) {
                this.executeConnect(this.targetPeerId);
              }
            }, delay);
            return;
          }

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

  // ==========================================
  // Direct P2P Connection (Initiator Side)
  // ==========================================

  connectToPeer(remoteId) {
    const cleanId = remoteId ? remoteId.trim() : '';
    if (!cleanId || cleanId === this.myPeerId) {
      return;
    }

    this.targetPeerId = cleanId;
    this.connectAttempts = 0;
    this.isIntentionalDisconnect = false;
    this.isRoomFull = false;

    if (!this.peer || this.peer.destroyed) {
      console.warn('[ZeroChat] Peer not ready, initializing first...');
      this.init().then(() => this.executeConnect(cleanId)).catch(console.error);
      return;
    }

    if (this.peer.disconnected) {
      console.warn('[ZeroChat] Peer broker disconnected, reconnecting...');
      try {
        this.peer.reconnect();
      } catch (e) {}
      setTimeout(() => this.executeConnect(cleanId), 800);
      return;
    }

    this.executeConnect(cleanId);
  }

  executeConnect(cleanId) {
    if (this.isConnected() && this.remotePeerId === cleanId) {
      console.log('[ZeroChat] Already connected to peer:', cleanId);
      return;
    }

    console.log('[ZeroChat] Connecting to remote peer:', cleanId);
    this.emit('status', 'connecting');

    try {
      const connection = this.peer.connect(cleanId, {
        reliable: true,
        serialization: 'binary',
      });

      if (!connection) {
        throw new Error('peer.connect returned null');
      }

      this.handleConnection(connection);

      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected() && this.targetPeerId === cleanId) {
          console.warn('[ZeroChat] Connection attempt timed out for peer:', cleanId);
          if (this.connectAttempts < this.maxConnectAttempts) {
            this.connectAttempts += 1;
            console.log(`[ZeroChat] Retrying connection (${this.connectAttempts}/${this.maxConnectAttempts})...`);
            this.executeConnect(cleanId);
          } else {
            this.emit('peer_not_found', new Error('Connection timed out'));
            this.emit('status', 'disconnected');
          }
        }
      }, 10000);
    } catch (err) {
      console.error('[ZeroChat] executeConnect error:', err);
      this.emit('error', err);
    }
  }

  handleConnection(connection) {
    if (!connection) return;

    if (this.conn && (this.conn.peer !== connection.peer || !this.conn.open)) {
      try {
        this.conn.close();
      } catch (e) {}
    }

    this.conn = connection;
    this.remotePeerId = connection.peer;
    this.targetPeerId = connection.peer;

    const onChannelOpen = () => {
      console.log('[ZeroChat] DataChannel is now ACTIVE with:', this.remotePeerId);
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      if (this.connectRetryTimer) {
        clearTimeout(this.connectRetryTimer);
        this.connectRetryTimer = null;
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connectAttempts = 0;
      this.isIntentionalDisconnect = false;

      // 1. Send Handshake
      this.sendJson({
        type: 'handshake',
        nickname: this.myNickname,
        peerId: this.myPeerId,
      });

      // 2. Ping Latency Check
      this.sendJson({
        type: 'ping',
        sendTime: performance.now(),
      });

      // 3. Heartbeat
      this.startPingMonitor();

      // 4. Flush queued offline messages
      this.flushOutgoingQueue();

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
      this.mediaCall.cleanupCall((e, d) => this.emit(e, d));

      if (this.isRoomFull) {
        this.emit('status', 'disconnected');
        return;
      }

      if (this.isIntentionalDisconnect) {
        this.emit('status', 'disconnected');
        this.emit('peer_disconnected', { peerId: this.remotePeerId });
      } else {
        this.emit('status', 'reconnecting');
        this.emit('peer_disconnected', { peerId: this.remotePeerId });
        this.schedulePeerReconnect();
      }
    });

    connection.on('error', (err) => {
      console.error('[ZeroChat] Connection error:', err);
      this.emit('error', err);
    });
  }

  schedulePeerReconnect() {
    if (this.isIntentionalDisconnect || this.isRoomFull || !this.remotePeerId) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    console.log('[ZeroChat] Scheduling auto-reconnect to peer:', this.remotePeerId);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected() && !this.isIntentionalDisconnect && !this.isRoomFull && this.remotePeerId) {
        console.log('[ZeroChat] Executing auto-reconnect to peer:', this.remotePeerId);
        this.executeConnect(this.remotePeerId);
      }
    }, 2500);
  }

  // ==========================================
  // Incoming DataChannel Packet Dispatcher
  // ==========================================

  handleIncomingPacket(data) {
    if (!data) return;

    // Binary file chunk
    if (data instanceof ArrayBuffer || (data.buffer && data.buffer instanceof ArrayBuffer)) {
      this.fileStream.handleBinaryFileChunk(data, (e, d) => this.emit(e, d));
      return;
    }

    let packet = data;
    if (typeof packet === 'string') {
      try {
        packet = JSON.parse(packet);
      } catch (e) {
        packet = {
          type: 'text',
          id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          text: packet,
          senderNickname: this.remoteNickname || 'Peer',
          timestamp: Date.now(),
        };
      }
    }

    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'handshake':
      case 'nickname_update':
        this.remoteNickname = packet.nickname || 'Peer';
        this.emit('peer_info', {
          peerId: this.remotePeerId,
          nickname: this.remoteNickname,
        });
        if (packet.type === 'handshake') {
          this.sendJson({
            type: 'handshake_ack',
            nickname: this.myNickname,
            peerId: this.myPeerId,
          });
        }
        break;

      case 'handshake_ack':
        this.remoteNickname = packet.nickname || 'Peer';
        this.emit('peer_info', {
          peerId: this.remotePeerId,
          nickname: this.remoteNickname,
        });
        break;

      case 'text':
        this.emit('message', {
          id: packet.id,
          text: packet.text,
          senderNickname: packet.senderNickname || this.remoteNickname || 'Peer',
          sender: 'remote',
          timestamp: packet.timestamp || Date.now(),
          replyTo: packet.replyTo || null,
        });
        this.sendJson({ type: 'ack', id: packet.id });
        break;

      case 'ack':
        this.emit('message_ack', packet.id);
        break;

      case 'typing':
        this.emit('typing', {
          isTyping: !!packet.isTyping,
          nickname: packet.nickname || this.remoteNickname || 'Peer',
        });
        break;

      case 'ping':
        this.sendJson({ type: 'pong', sendTime: packet.sendTime });
        break;

      case 'pong':
        if (packet.sendTime) {
          const latency = Math.max(1, Math.round(performance.now() - packet.sendTime));
          this.emit('latency', latency);
        }
        break;

      case 'disconnect':
        console.log('[ZeroChat] Remote peer ended session');
        this.isIntentionalDisconnect = true;
        this.disconnect();
        this.emit('status', 'disconnected');
        break;

      case 'call_signal':
        this.mediaCall.handleCallSignal(packet, this.remoteNickname, (e, d) => this.emit(e, d));
        break;

      case 'room_occupied':
        console.warn('[ZeroChat] Room is full/occupied:', packet.reason);
        this.isIntentionalDisconnect = true;
        this.isRoomFull = true;
        this.targetPeerId = null;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.connectRetryTimer) clearTimeout(this.connectRetryTimer);
        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.emit('room_full', {
          reason: packet.reason || 'Room is full (2/2 peers connected)',
        });
        this.emit('status', 'disconnected');
        break;

      case 'file_meta':
        this.fileStream.handleFileMeta(packet, this.remoteNickname, (e, d) => this.emit(e, d));
        break;

      case 'file_chunk_meta':
        this.fileStream.handleFileChunkMeta(packet);
        break;

      case 'file_cancel':
        this.fileStream.handleFileCancel(packet.fileId, (e, d) => this.emit(e, d));
        break;

      default:
        break;
    }
  }

  // ==========================================
  // Outgoing Message Dispatcher & Offline Queue
  // ==========================================

  sendTextMessage(text, replyTo = null) {
    if (!text || !text.trim()) {
      throw new Error('Message cannot be empty');
    }

    const message = {
      type: 'text',
      id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      text: text.trim(),
      senderNickname: this.myNickname,
      timestamp: Date.now(),
      ...(replyTo ? { replyTo } : {}),
    };

    if (this.isConnected()) {
      const sent = this.sendJson(message);
      if (sent) {
        return { ...message, pending: false };
      }
    }

    if (this.targetPeerId || this.remotePeerId || this.myPeerId) {
      console.log('[ZeroChat] Message queued in memory (waiting for channel open):', message.id);
      this.outgoingQueue.push(message);
      return { ...message, pending: true };
    }

    throw new Error('Connect to a peer to send messages');
  }

  flushOutgoingQueue() {
    if (this.outgoingQueue.length === 0 || !this.isConnected()) return;

    console.log(`[ZeroChat] Flushing ${this.outgoingQueue.length} queued messages across DataChannel...`);
    const queueToFlush = [...this.outgoingQueue];
    this.outgoingQueue = [];

    for (const msg of queueToFlush) {
      const sent = this.sendJson(msg);
      if (sent) {
        this.emit('message_flushed', { id: msg.id });
      } else {
        this.outgoingQueue.unshift(msg);
        break;
      }
    }
  }

  sendTypingStatus(isTyping) {
    if (!this.isConnected()) return;
    this.sendJson({
      type: 'typing',
      isTyping: !!isTyping,
      nickname: this.myNickname,
    });
  }

  // ==========================================
  // File Transfer Delegations
  // ==========================================

  sendFile(file, onProgress = null) {
    return this.fileStream.sendFile(
      this.conn,
      file,
      this.myNickname,
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d),
      onProgress
    );
  }

  cancelFileTransfer(fileId) {
    this.fileStream.cancelFileTransfer(
      fileId,
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  // ==========================================
  // WebRTC Media Calling Delegations
  // ==========================================

  startCall(isVideo = true) {
    return this.mediaCall.startCall(
      this.peer,
      this.remotePeerId,
      isVideo,
      this.myNickname,
      this.remoteNickname,
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  answerCall(isVideo = null) {
    return this.mediaCall.answerCall(
      isVideo,
      this.myNickname,
      this.remoteNickname,
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  rejectCall() {
    this.mediaCall.rejectCall(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  endCall() {
    this.mediaCall.endCall(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  toggleAudio() {
    return this.mediaCall.toggleAudio((e, d) => this.emit(e, d));
  }

  toggleVideo() {
    return this.mediaCall.toggleVideo(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  startScreenShare() {
    return this.mediaCall.startScreenShare((e, d) => this.emit(e, d));
  }

  stopScreenShare() {
    return this.mediaCall.stopScreenShare((e, d) => this.emit(e, d));
  }

  switchCamera() {
    return this.mediaCall.switchCamera((e, d) => this.emit(e, d));
  }

  // ==========================================
  // Low-Level DataChannel JSON & Heartbeat
  // ==========================================

  sendJson(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
        return true;
      } catch (err) {
        console.error('[ZeroChat] sendJson error:', err);
        return false;
      }
    }
    return false;
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
    this.isIntentionalDisconnect = true;
    this.isRoomFull = false;
    this.stopPingMonitor();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connectRetryTimer) clearTimeout(this.connectRetryTimer);
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

    if (this.conn) {
      try {
        this.sendJson({ type: 'disconnect' });
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    this.mediaCall.cleanupCall((e, d) => this.emit(e, d));
    this.remotePeerId = null;
    this.targetPeerId = null;
    this.remoteNickname = 'Peer';
    this.outgoingQueue = [];
    this.emit('status', 'disconnected');
  }

  cleanup() {
    this.disconnect();
    this.mediaCall.cleanupCall((e, d) => this.emit(e, d));
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.myPeerId = null;
    this.isInitializing = false;
    this.fileStream.clear();
  }
}

export const peerService = new PeerService();

// Hardware & Media Security: Instantly release camera, mic, and WebRTC tracks on page unload or tab close
if (typeof window !== 'undefined') {
  const onPageExit = () => {
    try {
      peerService.cleanup();
    } catch (e) {}
  };
  window.addEventListener('beforeunload', onPageExit);
  window.addEventListener('pagehide', onPageExit);
}
