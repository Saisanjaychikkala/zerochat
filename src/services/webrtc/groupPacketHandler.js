/**
 * ZeroChat Group Packet Handler
 * Handles wire packet dispatching and routing for the Baton Pass Relay.
 */

import { GROUP_PACKET_TYPES } from './constants.js';

export function handleGroupPacket(engine, data, conn) {
  if (!data || !data.type) return;

  switch (data.type) {
    case GROUP_PACKET_TYPES.KNOCK:
      if (engine.isHost) {
        // --- Auto-admit any peer already in the verified roster ---
        // This covers baton migration, reconnects, and failover elections.
        // No knock queue, no UI alert, no audio chime — seamless re-entry.
        const isExistingMember = engine.roster.some(m => m.peerId === conn.peer);
        if (isExistingMember) {
          engine.connections.set(conn.peer, conn);
          conn.send({
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

        // Passcode challenge — send CHALLENGE (not DECLINE) so the guest can
        // display an inline input and retry without leaving the room.
        if (engine.roomPasscode && data.passcode !== engine.roomPasscode) {
          conn.send({
            type: GROUP_PACKET_TYPES.CHALLENGE,
            reason: 'passcode_required'
          });
          setTimeout(() => conn.close(), 350);
          break;
        }

        // Genuine new knocker — queue for host admission
        engine.pendingKnocks.set(conn.peer, {
          peerId: conn.peer,
          nickname: data.nickname || 'Guest',
          avatarId: data.avatarId || 1,
          hasPasscode: !!data.passcode,
          conn,
          timestamp: Date.now()
        });
        conn.send({ type: GROUP_PACKET_TYPES.KNOCK_ACK, roomName: engine.roomId });
        engine.emit('knocks_update', Array.from(engine.pendingKnocks.values()));
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

    // Host sends CHALLENGE when passcode is required — guest shows inline prompt
    case GROUP_PACKET_TYPES.CHALLENGE:
      if (data.reason === 'passcode_required') {
        engine.emit('status', 'passcode_required');
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
    case GROUP_PACKET_TYPES.GAME_ACTION:
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
      engine.handleBatonMigrated(data.newHostId, data.roster);
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
