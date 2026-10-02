/**
 * ZeroChat Group Relay Engine (Baton Pass Star Topology)
 * Multi-peer star relay with zero servers, baton passing, and auto-failover.
 */

import Peer from 'peerjs';
import { ICE_SERVERS, GROUP_PACKET_TYPES } from './constants.js';
import { handleGroupPacket } from './groupPacketHandler.js';
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
          this.init(roomId, false, profile).then(resolve).catch(reject);
          return;
        }
        if (err.type === 'peer-unavailable' && !this.isHost) {
          if ((this.connectAttempts || 0) < 3) {
            this.connectAttempts = (this.connectAttempts || 0) + 1;
            setTimeout(() => { if (!this.isDestroyed) this.connectToHost(roomId); }, 1200);
            return;
          }
          this.emit('status', 'host-unavailable');
        }
        this.emit('error', err);
      });
    });
  }

  connectToHost(hostPeerId) {
    this.currentHostId = hostPeerId;
    this.emit('status', 'connecting');
    if (!this.peer || this.peer.destroyed) return;
    const conn = this.peer.connect(hostPeerId, { reliable: true });
    this.hostConn = conn;

    conn.on('open', () => {
      conn.send({
        type: GROUP_PACKET_TYPES.KNOCK,
        nickname: this.myProfile.nickname,
        avatarId: this.myProfile.avatarId,
        passcode: this.enteredPasscode || undefined
      });
      this.emit('status', 'knocking');
    });

    conn.on('data', (data) => handleGroupPacket(this, data, conn));
    conn.on('close', () => this.handleHostDisconnect());
    conn.on('error', (err) => {
      console.warn('[GroupRelay] Host conn error:', err);
      if ((this.connectAttempts || 0) < 4) {
        this.connectAttempts = (this.connectAttempts || 0) + 1;
        setTimeout(() => {
          if (!this.isDestroyed && (!this.hostConn || !this.hostConn.open)) {
            this.connectToHost(hostPeerId);
          }
        }, 1400);
      }
    });
  }

  handleIncomingConnection(conn) {
    if (!this.isHost) return;

    if (this.isLocked || this.connections.size >= this.maxPeers - 1) {
      conn.on('open', () => {
        conn.send({
          type: GROUP_PACKET_TYPES.DECLINE,
          reason: this.isLocked ? 'Room is locked by host.' : 'Squad is at maximum capacity (8).'
        });
        setTimeout(() => conn.close(), 400);
      });
      return;
    }

    conn.on('data', (data) => handleGroupPacket(this, data, conn));
    conn.on('close', () => this.handlePeerDisconnect(conn.peer));
  }

  admitKnocker(peerId) {
    if (!this.isHost) return;
    const knocker = this.pendingKnocks.get(peerId);
    if (!knocker) return;

    this.pendingKnocks.delete(peerId);
    this.connections.set(peerId, knocker.conn);

    this.roster = this.roster.filter(m => m.peerId !== peerId);
    this.roster.push({
      peerId,
      nickname: knocker.nickname,
      avatarId: knocker.avatarId,
      isHost: false,
      isCoHost: false,
      latency: 20,
      joinedAt: Date.now()
    });

    const sendAdmitPacket = () => {
      try {
        knocker.conn.send({
          type: GROUP_PACKET_TYPES.ADMIT,
          roster: this.roster,
          hostId: this.myPeerId,
          successorId: this.designatedSuccessorId,
          isLocked: this.isLocked
        });
      } catch (err) {
        console.warn('[GroupRelay] Admit send error:', err);
      }
    };

    if (knocker.conn.open) {
      sendAdmitPacket();
    } else {
      knocker.conn.on('open', sendAdmitPacket);
    }

    this.broadcastRosterSync();
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

  broadcast(packet, excludePeerId = null) {
    if (!this.isHost) return;
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        try { conn.send(packet); } catch (e) {}
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
  handleBatonMigrated(newHostId, newRoster) { handleBatonMigrated(this, newHostId, newRoster); }
  setDesignatedSuccessor(targetPeerId) { setDesignatedSuccessor(this, targetPeerId); }
  handleHostDisconnect() { handleHostDisconnect(this); }

  toggleLock() {
    if (!this.isHost) return;
    this.isLocked = !this.isLocked;
    this.broadcast({ type: GROUP_PACKET_TYPES.LOCK_SYNC, isLocked: this.isLocked });
    this.emit('room_locked', this.isLocked);
  }

  handlePeerDisconnect(peerId) {
    this.pendingKnocks.delete(peerId);
    this.connections.delete(peerId);
    this.roster = this.roster.filter(m => m.peerId !== peerId);
    if (this.designatedSuccessorId === peerId) this.designatedSuccessorId = null;
    this.broadcastRosterSync();
    this.emit('roster_update', this.roster);
  }

  startHeartbeatLoop() {
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
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connections.forEach(conn => { try { conn.close(); } catch (e) {} });
    this.connections.clear();
    this.pendingKnocks.clear();
    if (this.hostConn) { try { this.hostConn.close(); } catch (e) {} this.hostConn = null; }
    if (this.peer && !this.peer.destroyed) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }
    this.roster = [];
  }
}

export const groupRelayEngine = new GroupRelayEngine();
