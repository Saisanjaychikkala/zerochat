import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { peerService } from '../services/peerService';
import { normalizeRoomId, isSquadRoomId } from '../services/webrtc/constants';
import { playSound } from '../utils/soundEffects';

export function usePeerSession({ soundEnabled, showToast, onNewPeerConnection }) {
  // Extract and normalize initial room from URL hash immediately (exclude squad rooms)
  const rawHash = typeof window !== 'undefined' ? normalizeRoomId(window.location.hash) : '';
  const initialHash = isSquadRoomId(rawHash) ? '' : rawHash;
  const [myRoomId, setMyRoomId] = useState(initialHash);
  const [isHost, setIsHost] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [remoteNickname, setRemoteNickname] = useState('Peer');
  const [status, setStatus] = useState(initialHash ? 'connecting' : 'disconnected');
  const [latency, setLatency] = useState(null);
  const [roomFullError, setRoomFullError] = useState(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [connectionErrorReason, setConnectionErrorReason] = useState(null);

  // Remote typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerTypingNickname, setPeerTypingNickname] = useState('');

  const currentConnectedPeerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    const unsubReady = peerService.on('ready', (payload) => {
      const canonicalRoom = (typeof payload === 'object' && payload.roomId) 
        ? payload.roomId 
        : (typeof payload === 'string' ? payload : '');
      const hostFlag = typeof payload === 'object' && payload.isHost !== undefined ? payload.isHost : true;

      if (canonicalRoom) {
        setMyRoomId(canonicalRoom);
        setIsHost(hostFlag);
        const currentHash = typeof window !== 'undefined' ? normalizeRoomId(window.location.hash) : '';
        if (currentHash !== canonicalRoom) {
          window.history.replaceState(null, '', '#' + canonicalRoom);
        }
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
      setConnectionFailed(false);
      setConnectionErrorReason(null);
      setStatus('connected');
    });

    const unsubPeerInfo = peerService.on('peer_info', ({ peerId, nickname }) => {
      setRemotePeerId(peerId);
      setRemoteNickname(nickname || 'Peer');
      if (showToast) showToast(`${nickname || 'Peer'} is online`, 'info');
    });

    const unsubPeerDisconnected = peerService.on('peer_disconnected', () => {
      setLatency(null);
      setRemotePeerId(null);
    });

    const unsubPeerNotFound = peerService.on('peer_not_found', () => {
      setConnectionFailed(true);
      setConnectionErrorReason('peer_offline');
      setStatus('disconnected');
    });

    const unsubRoomFull = peerService.on('room_full', ({ reason }) => {
      const msg = reason || 'Room is full (2/2 peers connected)';
      setRoomFullError(msg);
      setConnectionFailed(false);
      setStatus('disconnected');
      if (showToast) showToast(msg, 'error');
      window.history.replaceState(null, '', window.location.pathname);
    });

    const unsubError = peerService.on('error', (err) => {
      console.warn('[ZeroChat] Peer error event:', err);
      if (err?.type === 'peer-unavailable') {
        if (showToast) showToast('Waiting for peer to open room...', 'warning');
      } else if (err?.type === 'network' || err?.type === 'webrtc') {
        setConnectionFailed(true);
        setConnectionErrorReason('network');
      }
    });

    const unsubLatency = peerService.on('latency', (ms) => {
      setLatency(ms);
    });

    const unsubTyping = peerService.on('typing', ({ isTyping, nickname }) => {
      setIsPeerTyping(isTyping);
      setPeerTypingNickname(nickname);
    });

    // Initialize peer ONLY if initial room is specified in URL hash (e.g. direct invite link)
    if (initialHash) {
      peerService.init(initialHash).catch((err) => {
        console.error('[ZeroChat] PeerService init error:', err);
      });
    }

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
  }, [initialHash, showToast, onNewPeerConnection]);

  // Connection timeout guard for strict NATs / unreachable peers
  useEffect(() => {
    if (status === 'connecting') {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = setTimeout(() => {
        if (!currentConnectedPeerRef.current) {
          console.warn('[ZeroChat] Direct connection timeout. Showing friendly diagnostic.');
          setConnectionFailed(true);
          setConnectionErrorReason('timeout');
        }
      }, 16000);
    } else {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (status === 'connected') {
        setConnectionFailed(false);
        setConnectionErrorReason(null);
      }
    }
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [status]);

  const handleJoinRoom = useCallback((targetId, asHost = false) => {
    if (!targetId || isSquadRoomId(targetId)) return;
    const cleanId = normalizeRoomId(targetId);
    if (!cleanId || isSquadRoomId(cleanId)) return;

    if (cleanId) {
      if (cleanId === myRoomId && status === 'connected') {
        if (showToast) showToast('You are already connected to this room', 'warning');
        return;
      }
      setRoomFullError(null);
      setConnectionFailed(false);
      setConnectionErrorReason(null);
      if (onNewPeerConnection) onNewPeerConnection();
      currentConnectedPeerRef.current = null;
      setMyRoomId(cleanId);
      setIsHost(asHost);
      setStatus('connecting');
      window.history.replaceState(null, '', '#' + cleanId);
      if (showToast) showToast(`Connecting to room ${cleanId}...`, 'info');
      if (asHost || !peerService.peer || peerService.peer.destroyed) {
        peerService.init(cleanId, asHost).catch((err) => {
          console.error('[ZeroChat] Join init error:', err);
          setStatus('disconnected');
          setConnectionFailed(true);
        });
      } else {
        peerService.connectToPeer(cleanId);
      }
    }
  }, [myRoomId, status, showToast, onNewPeerConnection]);

  const handleRetryConnection = useCallback(() => {
    if (!myRoomId) return;
    setConnectionFailed(false);
    setConnectionErrorReason(null);
    setRoomFullError(null);
    if (showToast) showToast(`Retrying connection to room ${myRoomId}...`, 'info');
    setStatus('connecting');
    if (!peerService.peer || peerService.peer.destroyed) {
      peerService.init(myRoomId).catch(() => {
        setStatus('disconnected');
        setConnectionFailed(true);
      });
    } else {
      peerService.connectToPeer(myRoomId);
    }
  }, [myRoomId, showToast]);

  // Synchronize room state when URL hash changes (pasting link, clicking invite link, browser navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashSync = () => {
      const currentHashRoom = normalizeRoomId(window.location.hash);
      if (!currentHashRoom) {
        if (myRoomId) {
          peerService.cleanup();
          currentConnectedPeerRef.current = null;
          setMyRoomId('');
          setRemotePeerId(null);
          setLatency(null);
          setRoomFullError(null);
          setStatus('disconnected');
          setIsHost(false);
        }
        return;
      }

      if (currentHashRoom !== myRoomId) {
        console.log(`[ZeroChat] URL hash changed to "${currentHashRoom}". Joining room...`);
        handleJoinRoom(currentHashRoom);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, [myRoomId, handleJoinRoom]);

  const handleDisconnect = useCallback(() => {
    peerService.cleanup();
    currentConnectedPeerRef.current = null;
    setMyRoomId('');
    setRemotePeerId(null);
    setLatency(null);
    setRoomFullError(null);
    setConnectionFailed(false);
    setConnectionErrorReason(null);
    setStatus('disconnected');
    setIsHost(false);
    window.history.replaceState(null, '', window.location.pathname);
    if (onNewPeerConnection) onNewPeerConnection();
    if (showToast) showToast('Disconnected. Session closed.', 'info');
  }, [showToast, onNewPeerConnection]);

  const handleCreateNewRoom = useCallback(() => {
    setRoomFullError(null);
    setConnectionFailed(false);
    setConnectionErrorReason(null);
    if (onNewPeerConnection) onNewPeerConnection();
    setRemotePeerId(null);
    setLatency(null);
    setStatus('disconnected');
    setIsHost(true);
    window.history.replaceState(null, '', window.location.pathname);
    peerService.cleanup();
    peerService.init().then((newId) => {
      const room = peerService.currentRoomId || newId;
      setMyRoomId(room);
      window.history.replaceState(null, '', '#' + room);
      if (showToast) showToast('Fresh private room ready!', 'success');
    }).catch(console.error);
  }, [showToast, onNewPeerConnection]);

  const handleTyping = useCallback((typing) => {
    peerService.sendTypingStatus(typing);
  }, []);

  return {
    myRoomId,
    roomId: myRoomId,
    isHost,
    remotePeerId,
    remoteNickname,
    status,
    latency,
    roomFullError,
    setRoomFullError,
    connectionFailed,
    connectionErrorReason,
    isPeerTyping,
    peerTypingNickname,
    handleJoinRoom,
    handleRetryConnection,
    handleDisconnect,
    handleCreateNewRoom,
    handleTyping,
  };
}
