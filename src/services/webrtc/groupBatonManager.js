/**
 * ZeroChat Group Baton Manager
 * Coordinates manual baton transfer and automatic failover election.
 */

import { GROUP_PACKET_TYPES } from './constants.js';

export function passBaton(engine, targetPeerId) {
  if (!engine.isHost || !targetPeerId || targetPeerId === engine.myPeerId) return;
  const targetConn = engine.connections.get(targetPeerId);
  if (!targetConn?.open) return;

  const oldHostId = engine.myPeerId;
  const updatedRoster = engine.roster.map(m => ({
    ...m,
    isHost: m.peerId === targetPeerId,
    isCoHost: m.peerId === oldHostId ? false : m.isCoHost
  }));

  // 1. Broadcast BATON_MIGRATED to ALL connected peers in the star relay
  engine.broadcast({
    type: GROUP_PACKET_TYPES.BATON_MIGRATED,
    newHostId: targetPeerId,
    oldHostId,
    roster: updatedRoster,
    roomPasscode: engine.roomPasscode || engine.enteredPasscode || null,
    isLocked: !!engine.isLocked
  });

  // 2. Transition current host to guest role
  engine.isHost = false;
  engine.isAdmitted = true;
  engine.currentHostId = targetPeerId;
  engine.roster = updatedRoster;
  engine.emit('baton_changed', { isHost: false, newHostId: targetPeerId });
  engine.emit('roster_update', engine.roster);
  engine.emit('status', 'connected');

  // 3. Gracefully switch connection: close old peer connections and connect to new host as guest
  setTimeout(() => {
    engine.connections.forEach(conn => {
      try { conn.close(); } catch (e) {}
    });
    engine.connections.clear();
    if (!engine.isDestroyed) {
      engine.connectToHost(targetPeerId, { isReconnecting: true });
    }
  }, 350);
}

export function acceptBatonHandoff(engine, incomingRoster) {
  handleBatonMigrated(engine, engine.myPeerId, incomingRoster);
}

export function handleBatonMigrated(engine, newHostId, newRoster, extra = {}) {
  const isNewHost = (newHostId === engine.myPeerId);
  engine.currentHostId = newHostId;
  engine.isHost = isNewHost;
  engine.isAdmitted = true;
  engine.roster = (newRoster || engine.roster).map(m => ({
    ...m,
    isHost: m.peerId === newHostId
  }));

  if (isNewHost) {
    // I am now promoted to Host of the star relay!
    if (extra.roomPasscode) engine.roomPasscode = extra.roomPasscode;
    if (extra.isLocked !== undefined) engine.isLocked = !!extra.isLocked;
    if (engine.hostConn) {
      try { engine.hostConn.close(); } catch (e) {}
      engine.hostConn = null;
    }
    engine.emit('baton_changed', { isHost: true, newHostId: engine.myPeerId });
    engine.emit('roster_update', engine.roster);
    engine.emit('status', 'connected');
  } else {
    // I am a guest, switch connection to the new host
    if (engine.hostConn) {
      try { engine.hostConn.close(); } catch (e) {}
      engine.hostConn = null;
    }
    engine.emit('baton_changed', { isHost: false, newHostId });
    engine.emit('roster_update', engine.roster);
    engine.emit('status', 'connected');
    setTimeout(() => {
      if (!engine.isDestroyed) {
        engine.connectToHost(newHostId, { isReconnecting: true });
      }
    }, 300);
  }
}

export function setDesignatedSuccessor(engine, targetPeerId) {
  if (!engine.isHost) return;
  engine.designatedSuccessorId = (engine.designatedSuccessorId === targetPeerId) ? null : targetPeerId;
  engine.roster = engine.roster.map(m => ({
    ...m,
    isCoHost: m.peerId === engine.designatedSuccessorId
  }));
  engine.broadcastRosterSync();
  engine.emit('roster_update', engine.roster);
}

export function handleHostDisconnect(engine) {
  if (engine.isHost || !engine.roster.length) return;
  const survivors = engine.roster.filter(m => m.peerId !== engine.currentHostId);
  if (!survivors.length) return;

  let successor = null;
  if (engine.designatedSuccessorId) {
    successor = survivors.find(m => m.peerId === engine.designatedSuccessorId);
  }
  if (!successor) {
    survivors.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) || a.peerId.localeCompare(b.peerId));
    successor = survivors[0];
  }
  if (!successor) return;

  if (successor.peerId === engine.myPeerId) {
    engine.isHost = true;
    engine.currentHostId = engine.myPeerId;
    engine.roster = survivors.map(m => ({ ...m, isHost: m.peerId === engine.myPeerId }));
    engine.emit('baton_changed', { isHost: true, newHostId: engine.myPeerId, failover: true });
    engine.emit('roster_update', engine.roster);
  } else {
    engine.currentHostId = successor.peerId;
    engine.roster = survivors.map(m => ({ ...m, isHost: m.peerId === successor.peerId }));
    engine.emit('baton_changed', { isHost: false, newHostId: successor.peerId, failover: true });
    engine.emit('roster_update', engine.roster);
    setTimeout(() => engine.connectToHost(successor.peerId, { isReconnecting: true }), 500);
  }
}
