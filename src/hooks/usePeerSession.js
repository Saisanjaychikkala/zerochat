import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { peerService } from '../services/peerService';
import { playSound } from '../utils/soundEffects';

export function usePeerSession({ soundEnabled, showToast, onNewPeerConnection }) {
  const [myRoomId, setMyRoomId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [remoteNickname, setRemoteNickname] = useState('Peer');
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  const [latency, setLatency] = useState(null);
  const [roomFullError, setRoomFullError] = useState(null);

  // Remote typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerTypingNickname, setPeerTypingNickname] = useState('');

  const currentConnectedPeerRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    const unsubReady = peerService.on('ready', (id) => {
      setMyRoomId(id);

      const rawHash = window.location.hash.replace(/^#/, '').trim();
      const hash = rawHash ? rawHash.replace(/\/+$/, '').trim() : '';

      if (hash && hash !== id) {
        console.log('[ZeroChat] Joining room from URL hash:', hash);
        if (showToast) showToast(`Connecting to room ${hash}...`, 'info');
        peerService.connectToPeer(hash);
      } else if (!rawHash) {
        window.history.replaceState(null, '', '#' + id);
      }
    });

    const unsubStatus = peerService.on('status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundEnabledRef.current);
        if (showToast) showToast('P2P channel active!', 'success');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#00f2fe', '#4facfe', '#9d4edd', '#10b981'],
          });
        } catch (e) {}
      } else if (newStatus === 'reconnecting') {
        if (showToast) showToast('Connection interrupted. Reconnecting...', 'warning');
      } else if (newStatus === 'disconnected') {
        setLatency(null);
      }
    });

    const unsubPeerConnected = peerService.on('peer_connected', ({ peerId, nickname }) => {
      if (currentConnectedPeerRef.current && currentConnectedPeerRef.current !== peerId) {
        console.log('[ZeroChat] New peer connected. Resetting conversation.');
        if (onNewPeerConnection) onNewPeerConnection();
      }
      currentConnectedPeerRef.current = peerId;

      setRemotePeerId(peerId);
      if (nickname) setRemoteNickname(nickname);
      setRoomFullError(null);
      setStatus('connected');
    });

    const unsubPeerInfo = peerService.on('peer_info', ({ peerId, nickname }) => {
      setRemotePeerId(peerId);
      setRemoteNickname(nickname || 'Peer');
      if (showToast) showToast(`${nickname || 'Peer'} is online`, 'info');
    });

    const unsubPeerDisconnected = peerService.on('peer_disconnected', () => {
      setLatency(null);
    });

    const unsubPeerNotFound = peerService.on('peer_not_found', () => {
      if (showToast) showToast('Room not found or peer is offline.', 'error');
      setStatus('disconnected');
    });

    const unsubRoomFull = peerService.on('room_full', ({ reason }) => {
      const msg = reason || 'Room is full (2/2 peers connected)';
      setRoomFullError(msg);
      setStatus('disconnected');
      if (showToast) showToast(msg, 'error');
      window.history.replaceState(null, '', window.location.pathname);
    });

    const unsubError = peerService.on('error', (err) => {
      console.warn('[ZeroChat] Peer error event:', err);
      if (err?.type === 'peer-unavailable') {
        if (showToast) showToast('Peer unavailable. Retrying...', 'warning');
      }
    });

    const unsubLatency = peerService.on('latency', (ms) => {
      setLatency(ms);
    });

    const unsubTyping = peerService.on('typing', ({ isTyping, nickname }) => {
      setIsPeerTyping(isTyping);
      setPeerTypingNickname(nickname);
    });

    peerService.init().catch((err) => {
      console.error('[ZeroChat] PeerService init error:', err);
    });

    return () => {
      unsubReady();
      unsubStatus();
      unsubPeerConnected();
      unsubPeerInfo();
      unsubPeerDisconnected();
      unsubPeerNotFound();
      unsubRoomFull();
      unsubError();
      unsubLatency();
      unsubTyping();
    };
  }, [showToast, onNewPeerConnection]);

  const handleJoinRoom = useCallback((targetId) => {
    if (!targetId) return;
    let cleanId = targetId.trim();
    if (cleanId.includes('#')) {
      cleanId = cleanId.split('#').pop();
    }
    cleanId = cleanId.split('?')[0].replace(/\/+$/, '').trim().toLowerCase();

    if (cleanId) {
      if (cleanId === myRoomId) {
        if (showToast) showToast('You are already in this room', 'warning');
        return;
      }
      setRoomFullError(null);
      if (onNewPeerConnection) onNewPeerConnection();
      currentConnectedPeerRef.current = null;
      window.location.hash = cleanId;
      if (showToast) showToast(`Connecting to room ${cleanId}...`, 'info');
      peerService.connectToPeer(cleanId);
    }
  }, [myRoomId, showToast, onNewPeerConnection]);

  const handleDisconnect = useCallback(() => {
    peerService.disconnect();
    currentConnectedPeerRef.current = null;
    setRemotePeerId(null);
    setLatency(null);
    setRoomFullError(null);
    setStatus('disconnected');
    if (onNewPeerConnection) onNewPeerConnection();
    if (showToast) showToast('Disconnected. Session history cleared.', 'info');
  }, [showToast, onNewPeerConnection]);

  const handleCreateNewRoom = useCallback(() => {
    setRoomFullError(null);
    if (onNewPeerConnection) onNewPeerConnection();
    setRemotePeerId(null);
    setLatency(null);
    setStatus('disconnected');
    window.history.replaceState(null, '', window.location.pathname);
    peerService.cleanup();
    peerService.init().then((newId) => {
      window.history.replaceState(null, '', '#' + newId);
      if (showToast) showToast('Fresh private room ready!', 'success');
    }).catch(console.error);
  }, [showToast, onNewPeerConnection]);

  const handleTyping = useCallback((typing) => {
    peerService.sendTypingStatus(typing);
  }, []);

  return {
    myRoomId,
    remotePeerId,
    remoteNickname,
    status,
    latency,
    roomFullError,
    setRoomFullError,
    isPeerTyping,
    peerTypingNickname,
    handleJoinRoom,
    handleDisconnect,
    handleCreateNewRoom,
    handleTyping,
  };
}
