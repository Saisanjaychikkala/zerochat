/**
 * ZeroChat Group Relay Engine (Baton Pass Star Topology)
 * Multi-peer star relay with zero servers, baton passing, and auto-failover.
 */

import Peer from 'peerjs';
import { ICE_SERVERS, GROUP_PACKET_TYPES } from './constants.js';
import { handleGroupPacket } from './groupPacketHandler.js';
import { FileStreamEngine, unpackBinaryChunk } from './fileStreamEngine.js';
import {
  passBaton,
  acceptBatonHandoff,
  handleBatonMigrated,
  setDesignatedSuccessor,
  handleHostDisconnect
} from './groupBatonManager.js';

export class GroupRelayEngine {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.roomId = null;
    this.isHost = false;
    this.currentHostId = null;
    this.hostConn = null;
    this.designatedSuccessorId = null;
    this.isLocked = false;
    this.roomPasscode = null;
    this.enteredPasscode = null;
    this.isAdmitted = false;
    this.connectAttempts = 0;
    this.maxPeers = 8;
    this.myProfile = { nickname: 'Anonymous', avatarId: 1 };
    this.connections = new Map();
    this.pendingKnocks = new Map();
    this.roster = [];
    this.listeners = new Map();
    this.heartbeatInterval = null;
    this.isDestroyed = false;

    // Sub-engines & On-Demand Optimizations
    this.fileStream = new FileStreamEngine();
    this.wireBatchingEnabled = true; // Host preference: dual-priority wire batching
    this.batchQueue = [];
    this.batchTimer = null;
    this.retryTimer = null;
    this.gameSubscriptions = new Map(); // cardId -> Set<peerId> (On-Demand Spectator Streaming)
    this.fileRequests = new Map(); // fileId -> requesterPeerId
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (this.listeners.has(event)) {
      this.listeners.set(event, this.listeners.get(event).filter(c => c !== cb));
    }
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[GroupRelay] error:', e); }
    });
  }

  async init(roomId, isHost = false, profile = {}, passcode = null) {
    this.cleanup();
    this.isDestroyed = false;
    this.roomId = roomId;
    this.isHost = isHost;
    this.roomPasscode = isHost ? (passcode || null) : null;
    this.enteredPasscode = !isHost ? (passcode || null) : null;
    this.isAdmitted = isHost;
    this.connectAttempts = 0;
    this.myProfile = { nickname: profile.nickname || 'Anonymous', avatarId: profile.avatarId || 1 };

    const config = { config: { iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 }, debug: 1 };
    const peerId = isHost ? roomId : undefined;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, config);
      } catch (err) {
        return reject(err);
      }

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        this.emit('ready', { peerId: id, roomId, isHost: this.isHost });

        if (this.isHost) {
          this.currentHostId = id;
          this.roster = [{
            peerId: id,
            nickname: this.myProfile.nickname,
            avatarId: this.myProfile.avatarId,
            isHost: true,
            isCoHost: false,
            latency: 5,
            joinedAt: Date.now()
          }];
          this.emit('roster_update', this.roster);
          this.emit('status', 'connected');
        } else {
          this.connectToHost(roomId);
        }
        this.startHeartbeatLoop();
        resolve(id);
      });

      this.peer.on('connection', (conn) => this.handleIncomingConnection(conn));

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && this.isHost) {
          this.isHost = false;
          try { this.peer.destroy(); } catch (e) {}
          this.init(roomId, false, profile, passcode).then(resolve).catch(reject);
          return;
        }
        if (err.type === 'peer-unavailable' && !this.isHost) {
          this.scheduleHostRetry(roomId);
          return;
        }
        this.emit('error', err);
      });
    });
  }

  connectToHost(hostPeerId, opts = {}) {
    this.currentHostId = hostPeerId;
    this.emit('status', opts.isReconnecting ? 'connected' : 'connecting');
    if (!this.peer || this.peer.destroyed) return;

    if (this.hostConn && this.hostConn !== null) {
      try { this.hostConn.close(); } catch (e) {}
      this.hostConn = null;
    }

    const conn = this.peer.connect(hostPeerId, { reliable: true });
    this.hostConn = conn;

    conn.on('open', () => {
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.connectAttempts = 0;
      conn.send({
        type: GROUP_PACKET_TYPES.KNOCK,
        nickname: this.myProfile.nickname,
        avatarId: this.myProfile.avatarId,
        passcode: this.enteredPasscode || undefined,
        isReconnecting: !!opts.isReconnecting
      });
      if (!opts.isReconnecting) this.emit('status', 'knocking');
    });

    conn.on('data', (data) => {
      if (data instanceof ArrayBuffer || (data.buffer && data.buffer instanceof ArrayBuffer)) {
        this.handleBinaryData(data, conn);
        return;
      }
      handleGroupPacket(this, data, conn);
    });
    conn.on('close', () => { if (this.currentHostId === hostPeerId) this.handleHostDisconnect(); });
    conn.on('error', (err) => {
      console.warn('[GroupRelay] Host conn error:', err);
      this.scheduleHostRetry(hostPeerId, opts);
    });
  }

  scheduleHostRetry(hostPeerId, opts = {}) {
    if (this.isDestroyed || this.isHost) return;
    if (this.retryTimer) return;
    if ((this.connectAttempts || 0) < 4) {
      this.connectAttempts = (this.connectAttempts || 0) + 1;
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (!this.isDestroyed && (!this.hostConn || !this.hostConn.open)) {
          this.connectToHost(hostPeerId, opts);
        }
      }, 1400);
      return;
    }
    this.emit('status', 'host-unavailable');
  }

  handleBinaryData(data, conn) {
    if (this.isHost) {
      const unpacked = unpackBinaryChunk(data);
      if (unpacked && unpacked.fileId) {
        const targetPeerId = this.fileRequests.get(unpacked.fileId);
        if (targetPeerId && targetPeerId !== conn.peer) {
          const targetConn = this.connections.get(targetPeerId);
          if (targetConn && targetConn.open) {
            try { targetConn.send(data); } catch (e) {}
            return;
          }
        }
      }
      this.dispatchBroadcast(data, conn.peer);
    } else {
      this.fileStream.handleBinaryFileChunk(data, (e, d) => this.emit(e, d));
    }
  }

  reconnectWithPasscode(passcode) {
    this.enteredPasscode = passcode || null;
    if (this.currentHostId && !this.isDestroyed) {
      if (this.hostConn) {
        try { this.hostConn.close(); } catch (e) {}
        this.hostConn = null;
      }
      this.connectToHost(this.currentHostId);
    }
  }

  handleIncomingConnection(conn) {
    if (!this.isHost) return;
    const isExisting = this.roster.some(m => m.peerId === conn.peer);
    if (!isExisting && (this.isLocked || this.connections.size >= this.maxPeers - 1)) {
      conn.on('open', () => {
        conn.send({
          type: GROUP_PACKET_TYPES.DECLINE,
          reason: this.isLocked ? 'Room is locked by host.' : 'Squad is at maximum capacity (8).'
        });
        setTimeout(() => conn.close(), 400);
      });
      return;
    }
    conn.on('data', (data) => {
      if (data instanceof ArrayBuffer || (data.buffer && data.buffer instanceof ArrayBuffer)) {
        this.handleBinaryData(data, conn);
        return;
      }
      handleGroupPacket(this, data, conn);
    });
    conn.on('close', () => this.handlePeerDisconnect(conn.peer));
    conn.on('error', (err) => console.warn('[GroupRelay] Inbound conn error:', err));
  }

  admitKnocker(peerId) {
    if (!this.isHost) return;
    const knocker = this.pendingKnocks.get(peerId);
    if (!knocker) return;

    this.pendingKnocks.delete(peerId);
    this.connections.set(peerId, knocker.conn);

    const newMember = {
      peerId,
      nickname: knocker.nickname,
      avatarId: knocker.avatarId,
      isHost: false,
      isCoHost: false,
      latency: 20,
      joinedAt: Date.now()
    };

    this.roster = this.roster.filter(m => m.peerId !== peerId);
    this.roster.push(newMember);

    // Knocker receives full verified roster
    const pkt = {
      type: GROUP_PACKET_TYPES.ADMIT,
      roster: this.roster,
      hostId: this.myPeerId,
      successorId: this.designatedSuccessorId,
      isLocked: this.isLocked
    };
    if (knocker.conn.open) { try { knocker.conn.send(pkt); } catch (e) {} }
    else { knocker.conn.on('open', () => { try { knocker.conn.send(pkt); } catch (e) {} }); }

    // Existing peers receive lightweight delta patch
    this.broadcast({
      type: GROUP_PACKET_TYPES.ROSTER_JOIN,
      member: newMember,
      hostId: this.myPeerId,
      successorId: this.designatedSuccessorId
    }, peerId);

    this.emit('knocks_update', Array.from(this.pendingKnocks.values()));
    this.emit('roster_update', this.roster);
  }

  declineKnocker(peerId, reason = 'Host declined admission') {
    if (!this.isHost) return;
    const knocker = this.pendingKnocks.get(peerId);
    if (knocker) {
      if (knocker.conn.open) {
        knocker.conn.send({ type: GROUP_PACKET_TYPES.DECLINE, reason });
        setTimeout(() => knocker.conn.close(), 300);
      }
      this.pendingKnocks.delete(peerId);
      this.emit('knocks_update', Array.from(this.pendingKnocks.values()));
    }
  }

  setWireBatching(enabled) {
    this.wireBatchingEnabled = !!enabled;
    if (!this.wireBatchingEnabled && this.batchQueue.length > 0) {
      this.flushBatch();
    }
  }

  isUrgentPacket(packet) {
    if (!packet || typeof packet !== 'object') return true;
    const URGENT_TYPES = [
      GROUP_PACKET_TYPES.GAME_ACTION,
      GROUP_PACKET_TYPES.GAME_CARD,
      GROUP_PACKET_TYPES.KNOCK,
      GROUP_PACKET_TYPES.KNOCK_ACK,
      GROUP_PACKET_TYPES.ADMIT,
      GROUP_PACKET_TYPES.DECLINE,
      GROUP_PACKET_TYPES.CHALLENGE,
      GROUP_PACKET_TYPES.KICK,
      GROUP_PACKET_TYPES.NUDGE,
      GROUP_PACKET_TYPES.CALL_RING,
      GROUP_PACKET_TYPES.CALL_OFFER,
      GROUP_PACKET_TYPES.CALL_ANSWER,
      GROUP_PACKET_TYPES.CALL_REJECT,
      GROUP_PACKET_TYPES.CALL_END,
      GROUP_PACKET_TYPES.BATON_OFFER,
      GROUP_PACKET_TYPES.BATON_ACCEPT,
      GROUP_PACKET_TYPES.BATON_MIGRATED,
      GROUP_PACKET_TYPES.LOCK_SYNC,
      GROUP_PACKET_TYPES.ROSTER_JOIN,
      GROUP_PACKET_TYPES.ROSTER_LEAVE,
      GROUP_PACKET_TYPES.ROSTER_UPDATE,
      GROUP_PACKET_TYPES.FILE_OFFER,
      GROUP_PACKET_TYPES.FILE_REQUEST,
      GROUP_PACKET_TYPES.FILE_ERROR,
      GROUP_PACKET_TYPES.GAME_SUBSCRIBE,
      GROUP_PACKET_TYPES.GAME_UNSUBSCRIBE
    ];
    return URGENT_TYPES.includes(packet.type);
  }

  broadcast(packet, excludePeerId = null) {
    if (!this.isHost) return;

    if (!this.wireBatchingEnabled || this.isUrgentPacket(packet) || (packet instanceof ArrayBuffer)) {
      this.dispatchBroadcast(packet, excludePeerId);
      return;
    }

    // Coalesce relaxed packets (reactions, text, typing) in 25ms tick
    this.batchQueue.push({ packet, excludePeerId });
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), 25);
    }
  }

  dispatchBroadcast(packet, excludePeerId = null) {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        try { conn.send(packet); } catch (e) {}
      }
    });
  }

  flushBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    if (this.batchQueue.length === 0) return;

    const queued = [...this.batchQueue];
    this.batchQueue = [];

    this.connections.forEach((conn, peerId) => {
      if (!conn.open) return;
      const relevant = queued.filter(item => item.excludePeerId !== peerId).map(item => item.packet);
      if (relevant.length === 1) {
        try { conn.send(relevant[0]); } catch (e) {}
      } else if (relevant.length > 1) {
        try {
          conn.send({
            type: GROUP_PACKET_TYPES.BATCH,
            packets: relevant
          });
        } catch (e) {}
      }
    });
  }

  broadcastRosterSync() {
    this.broadcast({
      type: GROUP_PACKET_TYPES.ROSTER_SYNC,
      roster: this.roster,
      hostId: this.currentHostId,
      successorId: this.designatedSuccessorId
    });
  }

  broadcastRosterUpdate(peerId, patch) {
    this.roster = this.roster.map(m => m.peerId === peerId ? { ...m, ...patch } : m);
    this.broadcast({
      type: GROUP_PACKET_TYPES.ROSTER_UPDATE,
      peerId,
      patch
    });
    this.emit('roster_update', this.roster);
  }

  sendChat(text, replyTo = null, extra = {}) {
    const msg = {
      id: extra.id || `gmsg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: extra.type || GROUP_PACKET_TYPES.CHAT,
      text, author: this.myProfile.nickname, authorId: this.myPeerId,
      avatarId: this.myProfile.avatarId, timestamp: Date.now(), replyTo, ...extra
    };
    if (this.isHost) { this.broadcast(msg); this.emit('message', msg); }
    else if (this.isAdmitted && this.hostConn?.open) { this.hostConn.send(msg); this.emit('message', msg); }
  }

  offerFile(file, previewData = null) {
    const offer = this.fileStream.stageFileOffer(file, previewData);
    const packet = {
      type: GROUP_PACKET_TYPES.FILE_OFFER,
      ...offer,
      author: this.myProfile.nickname,
      authorId: this.myPeerId,
      timestamp: Date.now()
    };
    if (this.isHost) {
      this.broadcast(packet);
      this.emit('file_offer', packet);
    } else if (this.isAdmitted && this.hostConn?.open) {
      this.hostConn.send(packet);
      this.emit('file_offer', packet);
    }
    return offer;
  }

  requestFileDownload(fileId, authorId) {
    if (!authorId || !this.roster.some(m => m.peerId === authorId)) {
      this.emit('file_error', {
        fileId,
        reason: 'Sender disconnected from squad. Media unavailable in RAM.'
      });
      return;
    }

    const packet = {
      type: GROUP_PACKET_TYPES.FILE_REQUEST,
      fileId,
      authorId,
      requesterId: this.myPeerId
    };

    if (this.isHost) {
      this.fileRequests.set(fileId, this.myPeerId);
      const authorConn = this.connections.get(authorId);
      if (authorConn?.open) {
        try { authorConn.send(packet); } catch (e) {}
      } else {
        this.emit('file_error', { fileId, reason: 'Sender disconnected from squad.' });
      }
    } else if (this.isAdmitted && this.hostConn?.open) {
      this.hostConn.send(packet);
    }
  }

  subscribeGameEvents(cardId) {
    const pkt = { type: GROUP_PACKET_TYPES.GAME_SUBSCRIBE, cardId, peerId: this.myPeerId };
    if (this.isHost) {
      if (!this.gameSubscriptions.has(cardId)) this.gameSubscriptions.set(cardId, new Set());
      this.gameSubscriptions.get(cardId).add(this.myPeerId);
    } else if (this.hostConn?.open) {
      this.hostConn.send(pkt);
    }
  }

  unsubscribeGameEvents(cardId) {
    const pkt = { type: GROUP_PACKET_TYPES.GAME_UNSUBSCRIBE, cardId, peerId: this.myPeerId };
    if (this.isHost) {
      this.gameSubscriptions.get(cardId)?.delete(this.myPeerId);
    } else if (this.hostConn?.open) {
      this.hostConn.send(pkt);
    }
  }

  sendVoice(audioData, duration) {
    const voiceMsg = {
      id: `gvoice-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: GROUP_PACKET_TYPES.VOICE, audio: audioData, duration,
      author: this.myProfile.nickname, authorId: this.myPeerId,
      avatarId: this.myProfile.avatarId, timestamp: Date.now()
    };
    if (this.isHost) { this.broadcast(voiceMsg); this.emit('voice', voiceMsg); }
    else if (this.isAdmitted && this.hostConn?.open) { this.hostConn.send(voiceMsg); this.emit('voice', voiceMsg); }
  }

  sendReaction(messageId, emoji) {
    const packet = {
      type: GROUP_PACKET_TYPES.REACTION, messageId, emoji,
      authorId: this.myPeerId, authorName: this.myProfile.nickname
    };
    if (this.isHost) { this.broadcast(packet); this.emit('reaction', packet); }
    else if (this.isAdmitted && this.hostConn?.open) { this.hostConn.send(packet); this.emit('reaction', packet); }
  }

  passBaton(targetPeerId) { passBaton(this, targetPeerId); }
  acceptBatonHandoff(incomingRoster) { acceptBatonHandoff(this, incomingRoster); }
  handleBatonMigrated(newHostId, newRoster, extra = {}) { handleBatonMigrated(this, newHostId, newRoster, extra); }
  setDesignatedSuccessor(targetPeerId) { setDesignatedSuccessor(this, targetPeerId); }
  handleHostDisconnect() { handleHostDisconnect(this); }

  toggleLock() {
    if (!this.isHost) return;
    this.isLocked = !this.isLocked;
    this.broadcast({ type: GROUP_PACKET_TYPES.LOCK_SYNC, isLocked: this.isLocked });
    this.emit('room_locked', this.isLocked);
  }

  kickPeer(peerId) {
    if (!this.isHost || !peerId || peerId === this.myPeerId) return;
    const conn = this.connections.get(peerId);
    if (conn?.open) {
      try { conn.send({ type: GROUP_PACKET_TYPES.KICK, reason: 'Removed from squad by host.' }); } catch (e) {}
      setTimeout(() => { try { conn.close(); } catch (e) {} }, 100);
    }
    this.handlePeerDisconnect(peerId);
  }

  sendGameAction(actionData) {
    const packet = { type: GROUP_PACKET_TYPES.GAME_ACTION, ...actionData, timestamp: Date.now() };
    if (actionData.action === 'game_event') {
      if (this.isHost) {
        // Forward to subscribers if present, otherwise broadcast
        const subscribers = actionData.cardId ? this.gameSubscriptions.get(actionData.cardId) : null;
        if (subscribers && subscribers.size > 0) {
          this.connections.forEach((conn, peerId) => {
            if (subscribers.has(peerId) && conn.open) {
              try { conn.send(packet); } catch (e) {}
            }
          });
        } else {
          this.dispatchBroadcast(packet);
        }
      } else if (this.isAdmitted && this.hostConn?.open) {
        this.hostConn.send(packet);
      }
      return;
    }
    if (this.isHost) { this.broadcast(packet); this.emit('message', packet); }
    else if (this.isAdmitted && this.hostConn?.open) { this.hostConn.send(packet); this.emit('message', packet); }
  }

  handlePeerDisconnect(peerId) {
    const wasPending = this.pendingKnocks.has(peerId);
    this.pendingKnocks.delete(peerId);
    this.connections.delete(peerId);
    this.roster = this.roster.filter(m => m.peerId !== peerId);
    if (this.designatedSuccessorId === peerId) this.designatedSuccessorId = null;

    // Clean up spectator game subscriptions
    this.gameSubscriptions.forEach(subs => subs.delete(peerId));

    if (wasPending) {
      this.emit('knocks_update', Array.from(this.pendingKnocks.values()));
    }

    // Broadcast lightweight ROSTER_LEAVE delta!
    this.broadcast({
      type: GROUP_PACKET_TYPES.ROSTER_LEAVE,
      peerId,
      hostId: this.myPeerId,
      successorId: this.designatedSuccessorId
    });
    this.emit('roster_update', this.roster);
  }

  startHeartbeatLoop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.heartbeatInterval = setInterval(() => {
      if (this.isDestroyed) return;
      const pkt = { type: GROUP_PACKET_TYPES.HEARTBEAT, time: Date.now() };
      if (this.isHost) this.broadcast(pkt);
      else if (this.hostConn?.open) this.hostConn.send(pkt);
    }, 2500);
  }

  cleanup() {
    this.isDestroyed = true;
    this.isAdmitted = false;
    this.roomId = null;
    this.myPeerId = null;
    this.currentHostId = null;
    this.isHost = false;
    this.roomPasscode = null;
    this.enteredPasscode = null;
    this.designatedSuccessorId = null;
    this.isLocked = false;
    this.connectAttempts = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchQueue = [];
    this.connections.forEach(conn => { try { conn.close(); } catch (e) {} });
    this.connections.clear();
    this.pendingKnocks.clear();
    this.gameSubscriptions.clear();
    this.fileRequests.clear();
    if (this.fileStream) this.fileStream.clear();
    if (this.hostConn) { try { this.hostConn.close(); } catch (e) {} this.hostConn = null; }
    if (this.peer && !this.peer.destroyed) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }
    this.roster = [];
  }
}

export const groupRelayEngine = new GroupRelayEngine();
