/**
 * ZeroChat - useGroupSession Hook
 * Reactive state and actions for Baton Pass Group Chat.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { groupRelayEngine } from '../services/webrtc/groupRelayEngine';
import { peerService } from '../services/peerService';
import { playSound } from '../utils/soundEffects';
import { generateThumbnailPreview } from './useChatTransfers';

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
  const [myPeerId, setMyPeerId] = useState(null);

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    const unsubReady = groupRelayEngine.on('ready', ({ peerId, roomId, isHost: hostFlag }) => {
      setMyPeerId(peerId);
      setSquadRoomId(roomId);
      setIsHost(hostFlag);
    });

    const unsubStatus = groupRelayEngine.on('status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundRef.current);
        if (showToast) showToast('Connected to squad room!', 'success');
      } else if (newStatus === 'declined' || newStatus === 'superseded') {
        playSound('disconnect', soundRef.current);
      }
    });

    const unsubDeclined = groupRelayEngine.on('declined', (reason) => {
      setDeclineReason(reason);
      if (showToast) showToast(`Admission declined: ${reason}`, 'error');
    });

    const unsubSuperseded = groupRelayEngine.on('superseded', (reason) => {
      setDeclineReason(reason);
      if (showToast) showToast(`Session superseded: ${reason}`, 'warning');
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
      if (msg.type === 'game_action') {
        if (msg.action === 'game_event') {
          if (msg.senderPeerId && msg.senderPeerId === groupRelayEngine.myPeerId) return;
          peerService.emit('game_event', msg.data);
          return;
        }
        if (msg.action === 'peer_nudge') {
          if (msg.senderPeerId && msg.senderPeerId === groupRelayEngine.myPeerId) return;
          peerService.emit('peer_nudge', {
            message: msg.message,
            senderNickname: msg.senderNickname,
            nudgeType: msg.nudgeType,
          });
          return;
        }
        if (msg.action === 'join' && groupRelayEngine.isHost) {
          setMessages(prev => {
            const target = prev.find(m => m.cardId === msg.cardId);
            if (!target) return prev;
            const updates = {};
            const isSameHost = (target.hostClientId && msg.playerClientId && target.hostClientId === msg.playerClientId) ||
              (target.hostPeerId && msg.playerPeerId && target.hostPeerId === msg.playerPeerId) ||
              (!target.hostClientId && !target.hostPeerId && target.hostNickname === msg.playerNickname);

            if (!target.hostNickname && !target.hostPeerId) {
              updates.hostNickname = msg.playerNickname;
              updates.hostAvatarBg = msg.avatarBg;
              updates.hostPeerId = msg.playerPeerId;
              updates.hostClientId = msg.playerClientId;
            } else if (!target.guestNickname && !target.guestPeerId && !isSameHost) {
              updates.guestNickname = msg.playerNickname;
              updates.guestAvatarBg = msg.avatarBg;
              updates.guestPeerId = msg.playerPeerId;
              updates.guestClientId = msg.playerClientId;
              updates.isGuestJoined = true;
            }
            if (Object.keys(updates).length > 0) {
              groupRelayEngine.sendGameAction({ action: 'card_updated', cardId: msg.cardId, cardUpdates: updates });
              return prev.map(m => m.cardId === msg.cardId ? { ...m, ...updates } : m);
            }
            return prev;
          });
          return;
        } else if (msg.action === 'card_updated' && msg.cardUpdates) {
          setMessages(prev => prev.map(m => m.cardId === msg.cardId ? { ...m, ...msg.cardUpdates } : m));
          return;
        }
      }
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

    const unsubError = groupRelayEngine.on('error', (err) => {
      if (err?.type === 'peer-unavailable') {
        if (showToast) showToast('Connecting to squad host...', 'info');
      } else if (err?.type === 'network') {
        if (showToast) showToast('Network blip. Retrying connection...', 'warning');
      }
    });

    const handleFileOffer = (offer) => {
      setMessages((prev) => {
        if (prev.some((m) => m.fileId === offer.fileId)) return prev;
        const isMe = offer.authorId === groupRelayEngine.myPeerId;
        return [
          ...prev,
          {
            id: 'file_msg_' + offer.fileId,
            type: 'file_card',
            fileId: offer.fileId,
            fileName: offer.fileName,
            fileSize: offer.fileSize,
            fileType: offer.fileType,
            previewData: offer.previewData,
            isVoiceNote: !!offer.isVoiceNote,
            durationSec: offer.durationSec || 0,
            waveform: offer.waveform || (offer.previewData && offer.previewData.waveform) || null,
            sender: isMe ? 'local' : 'remote',
            senderNickname: offer.senderNickname || offer.author || 'Peer',
            authorId: offer.authorId || offer.senderPeerId,
            timestamp: offer.timestamp || Date.now(),
            status: isMe ? 'ready' : 'idle',
            progress: isMe ? 100 : 0,
            speedBps: 0,
            downloadUrl: null,
          },
        ];
      });
      playSound('message', soundRef.current);
    };

    const unsubOffer = groupRelayEngine.on('file_offer', handleFileOffer);

    const handleFileProgress = ({ fileId, progress, speedBps }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.fileId === fileId ? { ...m, status: 'downloading', progress, speedBps } : m
        )
      );
    };
    const unsubProgress = groupRelayEngine.on('file_progress', handleFileProgress);

    const handleFileComplete = (completedInfo) => {
      playSound('file', soundRef.current);
      if (showToast) showToast(`Transfer complete: ${completedInfo.fileName}!`, 'success');
      const downloadUrl = completedInfo.downloadUrl;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.fileId === completedInfo.fileId) {
            return {
              ...m,
              status: 'ready',
              progress: 100,
              downloadUrl,
              audioUrl: m.isVoiceNote ? downloadUrl : null,
              imageUrl: m.fileType?.startsWith('image/') ? downloadUrl : null,
            };
          }
          return m;
        })
      );
    };
    const unsubComplete = groupRelayEngine.on('file_complete', handleFileComplete);

    const handleFileError = ({ fileId, reason }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.fileId === fileId
            ? { ...m, status: 'expired', errorReason: reason || 'Media expired from RAM.' }
            : m
        )
      );
      if (showToast) showToast(reason || 'File download unavailable', 'error');
    };
    const unsubFileError = groupRelayEngine.on('file_error', handleFileError);

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
      unsubError();
      unsubOffer();
      unsubProgress();
      unsubComplete();
      unsubFileError();
      unsubSuperseded();
    };
  }, [showToast]);

  const initSquad = useCallback(async (roomId, asHost = false, profile = {}, passcode = null) => {
    setMessages([]);
    setDeclineReason(null);
    setStatus('connecting');
    setSquadRoomId(roomId);
    setIsHost(asHost);
    return groupRelayEngine.init(roomId, asHost, profile, passcode);
  }, []);

  const sendGroupChat = useCallback((text, replyTo = null, customProps = {}) => {
    groupRelayEngine.sendChat(text, replyTo, customProps);
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

  const kickPeer = useCallback((peerId) => {
    groupRelayEngine.kickPeer(peerId);
  }, []);

  const sendGameAction = useCallback((actionData) => {
    groupRelayEngine.sendGameAction(actionData);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => !prev);
  }, []);

  const leaveSquad = useCallback(() => {
    groupRelayEngine.cleanup();
    setStatus('disconnected');
    setSquadRoomId('');
    setIsHost(false);
    setCurrentHostId(null);
    setDesignatedSuccessorId(null);
    setMyPeerId(null);
    setMembers([]);
    setPendingKnocks([]);
    setMessages([]);
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const resumeSquad = useCallback(() => {
    setStatus('connecting');
    setDeclineReason(null);
    groupRelayEngine.resumeSquad();
  }, []);

  const offerGroupFile = useCallback(async (file, previewData = null) => {
    let preview = previewData;
    if (file.isVoiceNote) {
      preview = {
        isVoiceNote: true,
        durationSec: file.durationSec || 0,
        waveform: file.waveform || null,
      };
    } else if (!preview && file.type?.startsWith('image/')) {
      try {
        preview = await generateThumbnailPreview(file);
      } catch (e) {}
    }
    const localUrl = URL.createObjectURL(file);
    const offer = groupRelayEngine.offerFile(file, preview);
    setMessages((prev) => [
      ...prev,
      {
        id: 'file_msg_' + offer.fileId,
        type: 'file_card',
        fileId: offer.fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        previewData: preview,
        isVoiceNote: !!file.isVoiceNote,
        durationSec: file.durationSec || 0,
        waveform: file.waveform || (preview && preview.waveform) || null,
        sender: 'local',
        senderNickname: localStorage.getItem('zerochat_nickname') || 'You',
        authorId: groupRelayEngine.myPeerId,
        timestamp: Date.now(),
        status: 'ready',
        progress: 100,
        downloadUrl: localUrl,
        audioUrl: file.isVoiceNote ? localUrl : null,
        imageUrl: file.type?.startsWith('image/') ? localUrl : null,
      },
    ]);
    return offer;
  }, []);

  const requestGroupDownload = useCallback((fileId, authorId) => {
    setMessages((prev) =>
      prev.map((m) => (m.fileId === fileId ? { ...m, status: 'downloading', progress: 0 } : m))
    );
    groupRelayEngine.requestFileDownload(fileId, authorId);
  }, []);

  const cancelGroupTransfer = useCallback((fileId) => {
    groupRelayEngine.fileStream.cancelFileTransfer(
      fileId,
      (pkt) => {
        if (groupRelayEngine.isHost) groupRelayEngine.dispatchBroadcast(pkt);
        else if (groupRelayEngine.hostConn?.open) groupRelayEngine.hostConn.send(pkt);
      },
      (e, d) => groupRelayEngine.emit(e, d)
    );
  }, []);

  return {
    squadRoomId,
    myPeerId,
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
    sendGameAction,
    offerGroupFile,
    requestGroupDownload,
    cancelGroupTransfer,
    admitKnocker,
    declineKnocker,
    passBaton,
    kickPeer,
    setDesignatedSuccessor,
    toggleLock,
    toggleDrawer,
    leaveSquad,
    resumeSquad
  };
}
