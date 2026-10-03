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
import { ICE_SERVERS, STUN_ONLY_ICE_SERVERS, UNIVERSAL_ICE_SERVERS, generateRoomId, normalizeRoomId } from './webrtc/constants';
import { FileStreamEngine } from './webrtc/fileStreamEngine';
import { MediaCallEngine } from './webrtc/mediaCallEngine';
import { groupRelayEngine } from './webrtc/groupRelayEngine';

class PeerService {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.myPeerId = null;
    this.currentRoomId = null;
    this.isHost = false;
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
    this.maxConnectAttempts = 6;
    this.isIntentionalDisconnect = false;
    this.isRoomFull = false;

    // Ephemeral RAM outgoing message queue for background reconnect resilience
    this.outgoingQueue = [];
    this.lastActiveTime = Date.now();

    // Sub-Engines
    this.fileStream = new FileStreamEngine();
    this.mediaCall = new MediaCallEngine();

    // Bridge squad relay game events and nudges to peerService listeners
    groupRelayEngine.on('game_event', (eventData) => {
      this.emit('game_event', eventData);
    });
    groupRelayEngine.on('peer_nudge', (nudgeData) => {
      this.emit('peer_nudge', nudgeData);
    });
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

  async init(customId = null, asHost = false) {
    const normalizedRoom = normalizeRoomId(customId);

    if (this.peer && !this.peer.destroyed && this.myPeerId) {
      if (!normalizedRoom || this.currentRoomId === normalizedRoom) {
        if (!this.isHost && !this.isConnected() && normalizedRoom) {
          this.connectToPeer(normalizedRoom);
        }
        return this.myPeerId;
      }
      this.cleanup();
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
    this.isIntentionalDisconnect = false;

    return new Promise((resolve, reject) => {
      const targetRoom = normalizedRoom || this.generateRoomId();
      this.currentRoomId = targetRoom;
      this.connectAttempts = 0;

      // Optimistic Room Claim: Register as targetRoom (Host) first.
      // If the room is already hosted by a peer, PeerJS emits 'unavailable-id' (~150ms),
      // which immediately and seamlessly converts this peer to Guest mode and connects!
      // This completely eliminates the multi-second deadlock where both peers become Guests waiting for a non-existent host.
      this.setupPeerInstance(targetRoom, targetRoom, false, resolve, reject);
    });
  }

  setupPeerInstance(peerId, targetRoom, isGuestAttempt, resolve, reject) {
    const config = {
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 4,
      },
      debug: 1,
    };

    try {
      if (this.peer && !this.peer.destroyed) {
        this.peer.removeAllListeners();
        this.peer.destroy();
      }
    } catch (e) {}

    try {
      this.peer = new Peer(peerId, config);
    } catch (err) {
      this.isInitializing = false;
      return reject(err);
    }

    this.peer.on('open', (id) => {
      this.myPeerId = id;
      this.isInitializing = false;
      this.currentRoomId = targetRoom;
      this.isHost = !isGuestAttempt;
      console.log(`[ZeroChat] Peer online as ${this.isHost ? 'Host' : 'Guest'}: ${id} (Room: ${targetRoom})`);
      this.emit('ready', { id, roomId: targetRoom, isHost: this.isHost });

      if (isGuestAttempt) {
        console.log('[ZeroChat] Auto-connecting Guest to Host room:', targetRoom);
        this.connectToPeer(targetRoom);
      } else if (this.targetPeerId && this.targetPeerId !== id && !this.isConnected()) {
        console.log('[ZeroChat] Executing queued connection to:', this.targetPeerId);
        this.executeConnect(this.targetPeerId);
      }

      resolve(id);
    });

    // Handle incoming connection (Receiver side)
    this.peer.on('connection', (connection) => {
      console.log('[ZeroChat] Incoming peer connection from:', connection.peer);

      // Strict 1-on-1 Guard: If room already occupied by another ACTIVE peer, reject 3rd peer
      const pc = this.conn?.peerConnection;
      const dc = this.conn?._dc || this.conn?.dataChannel;
      const isChannelOpen = !!(this.conn && this.conn.open && (!dc || dc.readyState === 'open'));
      const isIceDead = !pc || (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      );
      const isInactive = !this.lastActiveTime || (Date.now() - this.lastActiveTime > 4000);

      if (isChannelOpen && this.conn.peer !== connection.peer && !isIceDead && !isInactive) {
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

      // If existing connection is stale/dead/reconnecting, replace cleanly
      if (this.conn && this.conn !== connection) {
        try {
          this.conn.close();
        } catch (e) {}
        this.conn = null;
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
        if (!isGuestAttempt && targetRoom) {
          console.warn(`[ZeroChat] Room ID "${targetRoom}" already hosted. Switching to Guest mode...`);
          const guestId = `${targetRoom}-g-${Math.floor(1000 + Math.random() * 9000)}`;
          return this.setupPeerInstance(guestId, targetRoom, true, resolve, reject);
        } else {
          console.warn('[ZeroChat] Random ID collision, generating fresh room...');
          const freshRoom = this.generateRoomId();
          return this.setupPeerInstance(freshRoom, freshRoom, false, resolve, reject);
        }
      }

      if (err.type === 'peer-unavailable') {
        if (this.targetPeerId && this.connectAttempts < this.maxConnectAttempts && !this.isConnected()) {
          this.connectAttempts += 1;
          const FAST_PROBE_DELAYS = [350, 750, 1200, 1800, 2400, 3000];
          const delay = FAST_PROBE_DELAYS[this.connectAttempts - 1] || 2500;
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

        // If target host is unavailable, and we were forced into guest mode by a ghost ID:
        if (isGuestAttempt && targetRoom && this.targetPeerId === targetRoom) {
          console.warn(`[ZeroChat] Host "${targetRoom}" offline or dead ghost. Reclaiming "${targetRoom}" as Host...`);
          this.targetPeerId = null;
          this.connectAttempts = 0;
          return this.setupPeerInstance(targetRoom, targetRoom, false, resolve, reject);
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
  }

  // ==========================================
  // Direct P2P Connection (Initiator Side)
  // ==========================================

  connectToPeer(remoteId) {
    const cleanId = normalizeRoomId(remoteId);
    if (!cleanId) return;

    if (cleanId === this.myPeerId) {
      console.log('[ZeroChat] Re-verifying broker connection for room:', cleanId);
      if (!this.peer || this.peer.destroyed) {
        this.init(cleanId).catch(console.error);
      } else if (this.peer.disconnected) {
        try { this.peer.reconnect(); } catch (e) {}
      } else if (this.remotePeerId && !this.isConnected()) {
        this.executeConnect(this.remotePeerId);
      }
      return;
    }

    this.targetPeerId = cleanId;
    this.currentRoomId = cleanId;
    this.connectAttempts = 0;
    this.isIntentionalDisconnect = false;
    this.isRoomFull = false;

    if (!this.peer || this.peer.destroyed) {
      console.warn('[ZeroChat] Peer not ready, initializing with room:', cleanId);
      this.init(cleanId).then(() => this.executeConnect(cleanId)).catch(console.error);
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

    if (!this.peer.open) {
      console.log('[ZeroChat] Peer opening, queued connectToPeer for:', cleanId);
      return;
    }

    this.executeConnect(cleanId);
  }

  executeConnect(cleanId) {
    const target = normalizeRoomId(cleanId);
    if (!target) return;

    if (this.isConnected() && this.remotePeerId === target) {
      console.log('[ZeroChat] Already connected to peer:', target);
      return;
    }

    if (!this.peer || this.peer.destroyed || !this.peer.open) {
      console.log('[ZeroChat] executeConnect waiting for peer open:', target);
      this.targetPeerId = target;
      return;
    }

    console.log('[ZeroChat] Connecting to remote peer:', target);
    this.emit('status', 'connecting');

    try {
      const connection = this.peer.connect(target, {
        reliable: true,
        serialization: 'binary',
      });

      if (!connection) {
        throw new Error('peer.connect returned null');
      }

      this.handleConnection(connection);

      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected() && this.targetPeerId === target) {
          console.warn('[ZeroChat] Connection attempt timed out for peer:', target);
          if (this.connectAttempts < this.maxConnectAttempts) {
            this.connectAttempts += 1;
            console.log(`[ZeroChat] Retrying connection (${this.connectAttempts}/${this.maxConnectAttempts})...`);
            this.executeConnect(target);
          } else {
            this.emit('peer_not_found', new Error('Connection timed out'));
            this.emit('status', 'disconnected');
          }
        }
      }, 6500);
    } catch (err) {
      console.error('[ZeroChat] executeConnect error:', err);
      this.emit('error', err);
    }
  }

  handleConnection(connection) {
    if (!connection) return;

    if (this.conn && this.conn !== connection) {
      try {
        this.conn.close();
      } catch (e) {}
    }

    this.conn = connection;
    this.remotePeerId = connection.peer;
    this.targetPeerId = connection.peer;

    const onChannelOpen = () => {
      if (this.conn !== connection) return;
      console.log('[ZeroChat] DataChannel is now ACTIVE with:', this.remotePeerId);
      const rawDc = connection.dataChannel || connection._dc;
      if (rawDc) {
        try { rawDc.binaryType = 'arraybuffer'; } catch (e) {}
      }
      this.lastActiveTime = Date.now();
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
      if (this.conn !== connection) return;
      this.handleIncomingPacket(data);
    });

    connection.on('close', () => {
      if (this.conn !== connection) return;
      console.log('[ZeroChat] DataChannel closed with peer:', this.remotePeerId);
      this.stopPingMonitor();
      this.mediaCall.cleanupCall((e, d) => this.emit(e, d));

      const oldRemotePeerId = this.remotePeerId;
      this.conn = null;

      if (this.isRoomFull) {
        this.emit('status', 'disconnected');
        return;
      }

      if (this.isHost) {
        // Host remains waiting in the room for a new or returning guest. Never try to reconnect to an ephemeral guest ID.
        console.log('[ZeroChat] Guest disconnected from host. Host reset to waiting state.');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.remotePeerId = null;
        this.targetPeerId = null;
        this.lastActiveTime = 0;
        this.emit('status', 'disconnected');
        this.emit('peer_disconnected', { peerId: oldRemotePeerId });
        return;
      }

      if (this.isIntentionalDisconnect) {
        this.remotePeerId = null;
        this.targetPeerId = null;
        this.emit('status', 'disconnected');
        this.emit('peer_disconnected', { peerId: oldRemotePeerId });
      } else {
        this.emit('status', 'reconnecting');
        this.emit('peer_disconnected', { peerId: oldRemotePeerId });
        this.schedulePeerReconnect(oldRemotePeerId);
      }
    });

    connection.on('error', (err) => {
      if (this.conn !== connection) return;
      console.error('[ZeroChat] Connection error:', err);
      this.emit('error', err);
    });
  }

  schedulePeerReconnect(targetId = null) {
    const target = targetId || this.remotePeerId;
    if (this.isIntentionalDisconnect || this.isRoomFull || !target || this.isHost) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    console.log('[ZeroChat] Scheduling auto-reconnect to peer:', target);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected() && !this.isIntentionalDisconnect && !this.isRoomFull && target && !this.isHost) {
        console.log('[ZeroChat] Executing auto-reconnect to peer:', target);
        this.executeConnect(target);
      }
    }, 2500);
  }

  // ==========================================
  // Incoming DataChannel Packet Dispatcher
  // ==========================================

  handleIncomingPacket(data) {
    if (!data) return;
    this.lastActiveTime = Date.now();

    // Binary file chunk
    if (data instanceof ArrayBuffer || (data.buffer && data.buffer instanceof ArrayBuffer)) {
      this.fileStream.handleBinaryFileChunk(data, (e, d) => this.emit(e, d));
      return;
    }

    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      data.arrayBuffer().then((buf) => {
        this.fileStream.handleBinaryFileChunk(buf, (e, d) => this.emit(e, d));
      }).catch((err) => console.error('[ZeroChat] Blob conversion error:', err));
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

      case 'session_burned':
        console.warn('[ZeroChat] Remote peer burned the session!');
        this.emit('session_burned', {
          burnerNickname: packet.burnerNickname || this.remoteNickname || 'Peer',
        });
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

      case 'file_offer':
        this.emit('file_offer', {
          fileId: packet.fileId,
          fileName: packet.fileName,
          fileSize: packet.fileSize,
          fileType: packet.fileType,
          previewData: packet.previewData,
          senderNickname: packet.senderNickname || this.remoteNickname || 'Peer',
          isVoiceNote: !!packet.isVoiceNote,
          durationSec: packet.durationSec || 0,
          waveform: packet.waveform || (packet.previewData && packet.previewData.waveform) || null,
          timestamp: packet.timestamp || Date.now(),
        });
        break;

      case 'file_request':
        this.fileStream.serveFileRequest(
          this.conn,
          packet.fileId,
          this.myNickname,
          (data) => this.sendJson(data),
          (e, d) => this.emit(e, d)
        );
        break;

      case 'file_error':
        this.emit('file_error', {
          fileId: packet.fileId,
          reason: packet.reason || 'Media expired or unavailable in RAM.',
        });
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

      case 'peer_nudge':
        this.emit('peer_nudge', {
          message: packet.message,
          senderNickname: packet.senderNickname || this.remoteNickname || 'Peer',
          nudgeType: packet.nudgeType || 'calling_soon',
        });
        break;

      case 'game_event':
        this.emit('game_event', packet.data);
        break;

      case 'chat_reaction':
        this.emit('chat_reaction', { messageId: packet.messageId, emoji: packet.emoji });
        break;

      default:
        break;
    }
  }

  sendNudge(message = "I'll be calling you in 5 seconds! Get ready.", nudgeType = 'calling_soon') {
    const text = (typeof message === 'string' && message.trim()) ? message.trim() : "I'll be calling you in 5 seconds! Get ready.";
    if (groupRelayEngine.roomId && (groupRelayEngine.isHost || groupRelayEngine.isAdmitted)) {
      groupRelayEngine.sendGameAction({
        action: 'game_event',
        data: {
          type: 'game_nudge',
          sender: this.myNickname,
          message: text,
          nudgeType: typeof nudgeType === 'string' ? nudgeType : 'calling_soon',
        },
        senderPeerId: groupRelayEngine.myPeerId,
      });
      return;
    }
    if (!this.isConnected()) {
      return;
    }
    this.sendJson({
      type: 'peer_nudge',
      message: text,
      senderNickname: this.myNickname,
      nudgeType: typeof nudgeType === 'string' ? nudgeType : 'calling_soon',
    });
  }

  sendGameEvent(data) {
    if (groupRelayEngine.roomId && (groupRelayEngine.isHost || groupRelayEngine.isAdmitted)) {
      groupRelayEngine.sendGameAction({
        action: 'game_event',
        data,
        senderPeerId: groupRelayEngine.myPeerId,
      });
      return;
    }
    this.sendJson({
      type: 'game_event',
      data,
    });
  }

  sendReaction(messageId, emoji) {
    if (groupRelayEngine.roomId && (groupRelayEngine.isHost || groupRelayEngine.isAdmitted)) {
      groupRelayEngine.sendReaction(messageId, emoji);
      return;
    }
    if (this.conn && this.conn.open) {
      this.sendJson({
        type: 'chat_reaction',
        messageId,
        emoji,
      });
    }
  }

  burnSession() {
    try {
      this.sendJson({
        type: 'session_burned',
        burnerNickname: this.myNickname,
      });
    } catch (e) {}
    this.isIntentionalDisconnect = true;
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

  offerFile(file, previewData = null) {
    if (!this.isConnected()) {
      throw new Error('Peer not connected');
    }
    const offer = this.fileStream.stageFileOffer(file, previewData);
    this.sendJson({
      ...offer,
      senderNickname: this.myNickname,
      senderPeerId: this.myPeerId,
    });
    return offer;
  }

  requestFileDownload(fileId) {
    if (!this.isConnected()) {
      this.emit('file_error', {
        fileId,
        reason: 'Peer not connected. Media unavailable.',
      });
      return;
    }
    this.sendJson({
      type: 'file_request',
      fileId,
    });
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

  setAudioMute(isMuted) {
    return this.mediaCall.setAudioMute(isMuted, (e, d) => this.emit(e, d));
  }

  toggleVideo() {
    return this.mediaCall.toggleVideo(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  startScreenShare() {
    return this.mediaCall.startScreenShare(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
  }

  stopScreenShare() {
    return this.mediaCall.stopScreenShare(
      (data) => this.sendJson(data),
      (e, d) => this.emit(e, d)
    );
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

  disconnect(explicit = false) {
    this.isIntentionalDisconnect = explicit;
    this.isRoomFull = false;
    this.stopPingMonitor();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connectRetryTimer) clearTimeout(this.connectRetryTimer);
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

    if (this.conn) {
      try {
        if (explicit) {
          this.sendJson({ type: 'disconnect' });
        }
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

  handleWake() {
    if (this.isIntentionalDisconnect || this.isRoomFull) return;

    // 1. Reconnect to PeerJS broker if socket suspended while device slept
    if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
      console.log('[ZeroChat] Reconnecting to broker after wake...');
      try {
        this.peer.reconnect();
      } catch (e) {}
    }

    // 2. Check if active DataChannel is alive; if dead or disconnected, reconnect
    const pc = this.conn?.peerConnection;
    const isDead = !this.conn || !this.conn.open || (pc && (
      pc.iceConnectionState === 'disconnected' ||
      pc.iceConnectionState === 'failed' ||
      pc.iceConnectionState === 'closed'
    ));

    if (isDead && (this.targetPeerId || this.remotePeerId)) {
      const target = this.targetPeerId || this.remotePeerId;
      console.log('[ZeroChat] DataChannel stale after wake. Re-establishing connection with:', target);
      if (this.conn) {
        try { this.conn.close(); } catch (e) {}
        this.conn = null;
      }
      this.executeConnect(target);
    } else if (this.isConnected()) {
      this.sendJson({ type: 'ping', sendTime: performance.now() });
    }
  }

  cleanup() {
    this.disconnect(true);
    this.mediaCall.cleanupCall((e, d) => this.emit(e, d));
    if (this.peer) {
      try {
        this.peer.removeAllListeners();
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.myPeerId = null;
    this.currentRoomId = null;
    this.isHost = false;
    this.isInitializing = false;
    this.isIntentionalDisconnect = false;
    this.fileStream.clear();
  }
}

export const peerService = new PeerService();

// Handle tab visibility resume (phone lock/unlock screen wake)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      peerService.handleWake();
    }
  });
}

// Hardware & Media Security: Instantly release camera, mic, and WebRTC tracks on page unload or tab close
if (typeof window !== 'undefined') {
  window.__peerService = peerService;
  const onPageExit = () => {
    try {
      peerService.cleanup();
    } catch (e) {}
  };
  window.addEventListener('beforeunload', onPageExit);
  window.addEventListener('pagehide', onPageExit);
}

