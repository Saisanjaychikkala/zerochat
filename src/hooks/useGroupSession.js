/**
 * ZeroChat - useGroupSession Hook
 * Reactive state and actions for Baton Pass Group Chat.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { groupRelayEngine } from '../services/webrtc/groupRelayEngine';
import { playSound } from '../utils/soundEffects';

export function useGroupSession({ soundEnabled, showToast }) {
  const [squadRoomId, setSquadRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [currentHostId, setCurrentHostId] = useState(null);
  const [designatedSuccessorId, setDesignatedSuccessorId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [declineReason, setDeclineReason] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingKnocks, setPendingKnocks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [latency, setLatency] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    const unsubReady = groupRelayEngine.on('ready', ({ roomId, isHost: hostFlag }) => {
      setSquadRoomId(roomId);
      setIsHost(hostFlag);
    });

    const unsubStatus = groupRelayEngine.on('status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundRef.current);
        if (showToast) showToast('Connected to squad room!', 'success');
      } else if (newStatus === 'declined') {
        playSound('disconnect', soundRef.current);
      }
    });

    const unsubDeclined = groupRelayEngine.on('declined', (reason) => {
      setDeclineReason(reason);
      if (showToast) showToast(`Admission declined: ${reason}`, 'error');
    });

    const unsubRoster = groupRelayEngine.on('roster_update', (newRoster) => {
      setMembers(newRoster);
      const hostMember = newRoster.find(m => m.isHost);
      if (hostMember) setCurrentHostId(hostMember.peerId);
      const coHostMember = newRoster.find(m => m.isCoHost);
      setDesignatedSuccessorId(coHostMember ? coHostMember.peerId : null);
    });

    const unsubKnocks = groupRelayEngine.on('knocks_update', (knocks) => {
      setPendingKnocks(knocks);
      if (knocks.length > 0) {
        playSound('notification', soundRef.current);
      }
    });

    const unsubMessage = groupRelayEngine.on('message', (msg) => {
      setMessages(prev => [...prev, msg]);
      playSound('message', soundRef.current);
    });

    const unsubVoice = groupRelayEngine.on('voice', (voiceMsg) => {
      setMessages(prev => [...prev, voiceMsg]);
      playSound('message', soundRef.current);
    });

    const unsubReaction = groupRelayEngine.on('reaction', ({ messageId, emoji, authorId, authorName }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has(authorId)) {
          users.delete(authorId);
          if (users.size === 0) delete reactions[emoji];
          else reactions[emoji] = Array.from(users);
        } else {
          users.add(authorId);
          reactions[emoji] = Array.from(users);
        }
        return { ...m, reactions };
      }));
    });

    const unsubBaton = groupRelayEngine.on('baton_changed', ({ isHost: hostFlag, newHostId, failover }) => {
      setIsHost(hostFlag);
      setCurrentHostId(newHostId);
      playSound('notification', soundRef.current);
      if (failover) {
        const sysMsg = {
          id: `sys-${Date.now()}`,
          type: 'system',
          text: hostFlag 
            ? '👑 Previous host disconnected. You have assumed Relay Authority (Baton)!'
            : '⚡ Previous host disconnected. Baton passed to next in line.',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, sysMsg]);
      }
    });

    const unsubLock = groupRelayEngine.on('room_locked', (locked) => {
      setIsLocked(locked);
    });

    const unsubLatency = groupRelayEngine.on('latency', (lat) => {
      setLatency(lat);
    });

    return () => {
      unsubReady();
      unsubStatus();
      unsubDeclined();
      unsubRoster();
      unsubKnocks();
      unsubMessage();
      unsubVoice();
      unsubReaction();
      unsubBaton();
      unsubLock();
      unsubLatency();
    };
  }, [showToast]);

  const initSquad = useCallback(async (roomId, asHost = false, profile = {}) => {
    setMessages([]);
    setDeclineReason(null);
    setStatus('connecting');
    return groupRelayEngine.init(roomId, asHost, profile);
  }, []);

  const sendGroupChat = useCallback((text, replyTo = null) => {
    groupRelayEngine.sendChat(text, replyTo);
  }, []);

  const sendGroupVoice = useCallback((audioData, duration) => {
    groupRelayEngine.sendVoice(audioData, duration);
  }, []);

  const sendGroupReaction = useCallback((messageId, emoji) => {
    groupRelayEngine.sendReaction(messageId, emoji);
  }, []);

  const admitKnocker = useCallback((peerId) => {
    groupRelayEngine.admitKnocker(peerId);
  }, []);

  const declineKnocker = useCallback((peerId, reason) => {
    groupRelayEngine.declineKnocker(peerId, reason);
  }, []);

  const passBaton = useCallback((targetPeerId) => {
    groupRelayEngine.passBaton(targetPeerId);
  }, []);

  const setDesignatedSuccessor = useCallback((targetPeerId) => {
    groupRelayEngine.setDesignatedSuccessor(targetPeerId);
  }, []);

  const toggleLock = useCallback(() => {
    groupRelayEngine.toggleLock();
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  const leaveSquad = useCallback(() => {
    groupRelayEngine.cleanup();
    setStatus('disconnected');
    setSquadRoomId('');
    setMembers([]);
    setPendingKnocks([]);
    setMessages([]);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return {
    squadRoomId,
    isHost,
    currentHostId,
    designatedSuccessorId,
    status,
    declineReason,
    members,
    pendingKnocks,
    messages,
    latency,
    isLocked,
    isDrawerOpen,
    setIsDrawerOpen,
    initSquad,
    sendGroupChat,
    sendGroupVoice,
    sendGroupReaction,
    admitKnocker,
    declineKnocker,
    passBaton,
    setDesignatedSuccessor,
    toggleLock,
    toggleDrawer,
    leaveSquad
  };
}
