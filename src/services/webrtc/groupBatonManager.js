/**
 * ZeroChat Group Baton Manager
 * Coordinates manual baton transfer and automatic failover election.
 */

import { GROUP_PACKET_TYPES } from './constants.js';

export function passBaton(engine, targetPeerId) {
  if (!engine.isHost || targetPeerId === engine.myPeerId) return;
  const targetConn = engine.connections.get(targetPeerId);
  if (!targetConn?.open) return;

  targetConn.send({
    type: GROUP_PACKET_TYPES.BATON_OFFER,
    newHostId: targetPeerId,
    roster: engine.roster
  });
}

export function acceptBatonHandoff(engine, incomingRoster) {
  engine.isHost = true;
  engine.currentHostId = engine.myPeerId;
  engine.roster = (incomingRoster || engine.roster).map(m => ({
    ...m,
    isHost: m.peerId === engine.myPeerId
  }));

  engine.broadcast({
    type: GROUP_PACKET_TYPES.BATON_MIGRATED,
    newHostId: engine.myPeerId,
    roster: engine.roster
  });

  engine.emit('baton_changed', { isHost: true, newHostId: engine.myPeerId });
  engine.emit('roster_update', engine.roster);
}

export function handleBatonMigrated(engine, newHostId, newRoster) {
  engine.currentHostId = newHostId;
  engine.isHost = (newHostId === engine.myPeerId);
  engine.roster = newRoster || engine.roster;

  if (!engine.isHost) {
    if (engine.hostConn) {
      try { engine.hostConn.close(); } catch (e) {}
    }
    setTimeout(() => engine.connectToHost(newHostId), 300);
  }

  engine.emit('baton_changed', { isHost: engine.isHost, newHostId });
  engine.emit('roster_update', engine.roster);
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
    setTimeout(() => engine.connectToHost(successor.peerId), 500);
  }
}
