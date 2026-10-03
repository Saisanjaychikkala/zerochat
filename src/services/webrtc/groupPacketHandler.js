/**
 * ZeroChat Group Packet Handler
 * Handles wire packet dispatching and routing for the Baton Pass Relay.
 */

import { GROUP_PACKET_TYPES } from './constants.js';

function sendPacket(conn, packet) {
  if (conn.open) {
    try { conn.send(packet); } catch (e) {}
  } else {
    conn.on('open', () => { try { conn.send(packet); } catch (e) {} });
  }
}

export function handleGroupPacket(engine, data, conn) {
  if (!data || !data.type) return;

  switch (data.type) {
    case GROUP_PACKET_TYPES.KNOCK:
      if (engine.isHost) {
        const knockerClientId = data.clientId;

        // 1. Host Self-Knock Guard: prevent duplicate host peers on the same machine
        if (knockerClientId && knockerClientId === engine.myProfile?.clientId && conn.peer !== engine.myPeerId) {
          sendPacket(conn, {
            type: GROUP_PACKET_TYPES.DECLINE,
            reason: 'You are already hosting this squad in another tab.'
          });
          setTimeout(() => { try { conn.close(); } catch (e) {} }, 300);
          break;
        }

        // 2. Tab Takeover: Gracefully transfer session if this user opens or switches tabs
        const existingByClient = knockerClientId
          ? engine.roster.find(m => m.clientId && m.clientId === knockerClientId)
          : null;

        if (existingByClient && existingByClient.peerId !== conn.peer) {
          const oldPeerId = existingByClient.peerId;
          const oldConn = engine.connections.get(oldPeerId);
          if (oldConn && oldConn.open) {
            try {
              oldConn.send({
                type: GROUP_PACKET_TYPES.SESSION_SUPERSEDED,
                reason: 'Squad active in another tab.'
              });
            } catch (e) {}
            setTimeout(() => { try { oldConn.close(); } catch (e) {} }, 100);
          }
          engine.connections.delete(oldPeerId);
          engine.connections.set(conn.peer, conn);

          // Update member record in-place (no duplicate array items)
          existingByClient.peerId = conn.peer;
          if (data.nickname) existingByClient.nickname = data.nickname;
          if (data.avatarId) existingByClient.avatarId = data.avatarId;
          if (data.discriminator) existingByClient.discriminator = data.discriminator;

          // Clear any pending knock from same client or peer
          for (const [pId, knocker] of engine.pendingKnocks.entries()) {
            if (knocker.clientId === knockerClientId || pId === conn.peer || pId === oldPeerId) {
              engine.pendingKnocks.delete(pId);
            }
          }

          // Knocker immediately receives updated roster
          sendPacket(conn, {
            type: GROUP_PACKET_TYPES.ADMIT,
            roster: engine.roster,
            hostId: engine.myPeerId,
            successorId: engine.designatedSuccessorId,
            isLocked: engine.isLocked
          });
          engine.broadcastRosterSync();
          engine.emit('roster_update', engine.roster);
          engine.emit('knocks_update', Array.from(engine.pendingKnocks.values()));
          break;
        }

        // 3. Auto-admit any peer in verified roster OR reconnecting from baton transfer
        const isExistingMember = engine.roster.some(m => m.peerId === conn.peer) || !!data.isReconnecting;
        if (isExistingMember) {
          engine.connections.set(conn.peer, conn);
          if (!engine.roster.some(m => m.peerId === conn.peer)) {
            engine.roster.push({
              peerId: conn.peer,
              clientId: data.clientId,
              discriminator: data.discriminator,
              nickname: data.nickname || 'Member',
              avatarId: data.avatarId || 1,
              isHost: false,
              isCoHost: false,
              latency: 20,
              joinedAt: Date.now()
            });
          }
          sendPacket(conn, {
            type: GROUP_PACKET_TYPES.ADMIT,
            roster: engine.roster,
            hostId: engine.myPeerId,
            successorId: engine.designatedSuccessorId,
            isLocked: engine.isLocked
          });
          engine.broadcastRosterSync();
          engine.emit('roster_update', engine.roster);
          break;
        }

        // 4. Passcode squad unlock
        if (engine.roomPasscode) {
          if (data.passcode === engine.roomPasscode) {
            engine.connections.set(conn.peer, conn);
            engine.roster = engine.roster.filter(m => m.peerId !== conn.peer && (!knockerClientId || m.clientId !== knockerClientId));
            engine.roster.push({
              peerId: conn.peer,
              clientId: data.clientId,
              discriminator: data.discriminator,
              nickname: data.nickname || 'Guest',
              avatarId: data.avatarId || 1,
              isHost: false,
              isCoHost: false,
              latency: 20,
              joinedAt: Date.now()
            });
            sendPacket(conn, {
              type: GROUP_PACKET_TYPES.ADMIT,
              roster: engine.roster,
              hostId: engine.myPeerId,
              successorId: engine.designatedSuccessorId,
              isLocked: engine.isLocked
            });
            engine.broadcastRosterSync();
            engine.emit('roster_update', engine.roster);
            break;
          } else {
            sendPacket(conn, {
              type: GROUP_PACKET_TYPES.CHALLENGE,
              reason: 'passcode_required'
            });
            break;
          }
        }

        // 5. Clean up any previous pending knock from the same client before adding new one
        if (knockerClientId) {
          for (const [pId, knocker] of engine.pendingKnocks.entries()) {
            if (knocker.clientId === knockerClientId) {
              try { knocker.conn.close(); } catch (e) {}
              engine.pendingKnocks.delete(pId);
            }
          }
        }

        // 6. Genuine new knocker (no passcode room) — queue for host admission
        engine.pendingKnocks.set(conn.peer, {
          peerId: conn.peer,
          clientId: data.clientId,
          discriminator: data.discriminator,
          nickname: data.nickname || 'Guest',
          avatarId: data.avatarId || 1,
          hasPasscode: !!data.passcode,
          conn,
          timestamp: Date.now()
        });
        sendPacket(conn, { type: GROUP_PACKET_TYPES.KNOCK_ACK, roomName: engine.roomId });
        engine.emit('knocks_update', Array.from(engine.pendingKnocks.values()));
      }
      break;

    case GROUP_PACKET_TYPES.KNOCK_ACK:
      if (!engine.isAdmitted && !engine.isHost) {
        engine.emit('status', 'knocking');
      }
      break;

    case GROUP_PACKET_TYPES.ADMIT:
      engine.isAdmitted = true;
      engine.roster = data.roster || [];
      engine.currentHostId = data.hostId;
      engine.designatedSuccessorId = data.successorId || null;
      engine.isLocked = !!data.isLocked;
      engine.emit('status', 'connected');
      engine.emit('roster_update', engine.roster);
      break;

    case GROUP_PACKET_TYPES.DECLINE:
      engine.emit('status', 'declined');
      engine.emit('declined', data.reason || 'Host declined entry.');
      break;

    case GROUP_PACKET_TYPES.KICK:
      engine.isAdmitted = false;
      engine.emit('status', 'declined');
      engine.emit('declined', data.reason || 'You were removed from the squad by the host.');
      if (engine.hostConn) {
        try { engine.hostConn.close(); } catch (e) {}
        engine.hostConn = null;
      }
      break;

    case GROUP_PACKET_TYPES.SESSION_SUPERSEDED:
      engine.isSuperseded = true;
      engine.isAdmitted = false;
      engine.emit('status', 'superseded');
      engine.emit('superseded', data.reason || 'Squad active in another tab.');
      if (engine.hostConn) {
        try { engine.hostConn.close(); } catch (e) {}
        engine.hostConn = null;
      }
      break;

    case GROUP_PACKET_TYPES.CHALLENGE:
      if (data.reason === 'passcode_required') {
        engine.emit('status', 'passcode_required');
      }
      break;

    case GROUP_PACKET_TYPES.BATCH:
      if (Array.isArray(data.packets)) {
        data.packets.forEach((p) => handleGroupPacket(engine, p, conn));
      }
      break;

    case GROUP_PACKET_TYPES.ROSTER_JOIN:
      if (data.member) {
        engine.roster = engine.roster.filter(m => m.peerId !== data.member.peerId);
        engine.roster.push(data.member);
        engine.currentHostId = data.hostId || engine.currentHostId;
        engine.designatedSuccessorId = data.successorId || engine.designatedSuccessorId;
        engine.emit('roster_update', engine.roster);
      }
      break;

    case GROUP_PACKET_TYPES.ROSTER_LEAVE:
      engine.roster = engine.roster.filter(m => m.peerId !== data.peerId);
      engine.currentHostId = data.hostId || engine.currentHostId;
      engine.designatedSuccessorId = data.successorId || engine.designatedSuccessorId;
      engine.emit('roster_update', engine.roster);
      break;

    case GROUP_PACKET_TYPES.ROSTER_UPDATE:
      if (data.peerId && data.patch) {
        engine.roster = engine.roster.map(m => m.peerId === data.peerId ? { ...m, ...data.patch } : m);
        engine.emit('roster_update', engine.roster);
      }
      break;

    case GROUP_PACKET_TYPES.FILE_OFFER:
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('file_offer', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('file_offer', data);
      }
      break;

    case GROUP_PACKET_TYPES.FILE_REQUEST:
      if (engine.isHost) {
        engine.fileRequests.set(data.fileId, conn.peer);
        if (data.authorId === engine.myPeerId) {
          engine.fileStream.serveFileRequest(
            conn,
            data.fileId,
            engine.myProfile.nickname,
            (pkt) => conn.send(pkt),
            (e, d) => engine.emit(e, d)
          );
        } else {
          const authorConn = engine.connections.get(data.authorId);
          if (authorConn?.open) {
            try { authorConn.send(data); } catch (e) {}
          } else {
            sendPacket(conn, {
              type: GROUP_PACKET_TYPES.FILE_ERROR,
              fileId: data.fileId,
              reason: 'Sender disconnected from squad. Media unavailable.'
            });
          }
        }
      } else {
        engine.fileStream.serveFileRequest(
          conn,
          data.fileId,
          engine.myProfile.nickname,
          (pkt) => conn.send(pkt),
          (e, d) => engine.emit(e, d)
        );
      }
      break;

    case GROUP_PACKET_TYPES.FILE_ERROR:
      if (engine.isHost) {
        const reqPeerId = engine.fileRequests.get(data.fileId);
        if (reqPeerId) {
          const reqConn = engine.connections.get(reqPeerId);
          if (reqConn?.open) {
            try { reqConn.send(data); } catch (e) {}
          }
        }
      } else {
        engine.emit('file_error', data);
      }
      break;

    case GROUP_PACKET_TYPES.GAME_SUBSCRIBE:
      if (engine.isHost && data.cardId) {
        if (!engine.gameSubscriptions.has(data.cardId)) {
          engine.gameSubscriptions.set(data.cardId, new Set());
        }
        engine.gameSubscriptions.get(data.cardId).add(conn.peer);
      }
      break;

    case GROUP_PACKET_TYPES.GAME_UNSUBSCRIBE:
      if (engine.isHost && data.cardId) {
        engine.gameSubscriptions.get(data.cardId)?.delete(conn.peer);
      }
      break;

    case GROUP_PACKET_TYPES.ROSTER_SYNC:
      engine.roster = data.roster || [];
      engine.currentHostId = data.hostId || engine.currentHostId;
      engine.designatedSuccessorId = data.successorId || engine.designatedSuccessorId;
      engine.emit('roster_update', engine.roster);
      break;

    case GROUP_PACKET_TYPES.CHAT:
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('message', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('message', data);
      }
      break;

    case GROUP_PACKET_TYPES.VOICE:
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('voice', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('voice', data);
      }
      break;

    case GROUP_PACKET_TYPES.REACTION:
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('reaction', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('reaction', data);
      }
      break;

    // Game cards and actions are first-class relay packets
    case GROUP_PACKET_TYPES.GAME_CARD:
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('message', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('message', data);
      }
      break;

    case GROUP_PACKET_TYPES.GAME_ACTION:
      if (data.action === 'game_event') {
        if (engine.isHost) {
          if (!engine.connections.has(conn.peer)) return;
          engine.broadcast(data, conn.peer);
        } else {
          if (conn !== engine.hostConn) return;
        }
        engine.emit('game_event', data.data);
        if (data.data?.type === 'game_nudge') {
          engine.emit('peer_nudge', {
            senderNickname: data.data.sender || 'Opponent',
            message: data.data.message || "It's your turn in the game!"
          });
        }
        return;
      }
      if (engine.isHost) {
        if (!engine.connections.has(conn.peer)) return;
        engine.emit('message', data);
        engine.broadcast(data, conn.peer);
      } else {
        if (conn !== engine.hostConn) return;
        engine.emit('message', data);
      }
      break;

    case GROUP_PACKET_TYPES.BATON_OFFER:
      engine.acceptBatonHandoff(data.roster);
      break;

    case GROUP_PACKET_TYPES.BATON_MIGRATED:
      engine.handleBatonMigrated(data.newHostId, data.roster, data);
      break;

    case GROUP_PACKET_TYPES.LOCK_SYNC:
      engine.isLocked = !!data.isLocked;
      engine.emit('room_locked', engine.isLocked);
      break;

    case GROUP_PACKET_TYPES.HEARTBEAT:
      conn.send({ type: GROUP_PACKET_TYPES.HEARTBEAT_ACK, sendTime: data.time });
      break;

    case GROUP_PACKET_TYPES.HEARTBEAT_ACK:
      if (data.sendTime) {
        const lat = Math.max(1, Math.round((Date.now() - data.sendTime) / 2));
        engine.emit('latency', lat);
      }
      break;

    default:
      break;
  }
}
