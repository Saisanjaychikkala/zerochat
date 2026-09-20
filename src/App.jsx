import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { peerService } from './services/peerService';
import { playSound } from './utils/soundEffects';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import FileTransferArea from './components/FileTransferArea';
import RoomModal from './components/RoomModal';
import NicknameModal from './components/NicknameModal';
import SessionListModal from './components/SessionListModal';
import InfoModal from './components/InfoModal';
import MobileNav from './components/MobileNav';

export default function App() {
  // Identity & Preferences
  const [myNickname, setMyNickname] = useState(() => {
    return localStorage.getItem('zerochat_nickname') || 'Guest-' + Math.floor(100 + Math.random() * 900);
  });
  const [myAvatarBg, setMyAvatarBg] = useState(() => {
    return localStorage.getItem('zerochat_avatar_bg') || 'linear-gradient(135deg, #00f2fe, #4facfe)';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('zerochat_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Networking state
  const [myRoomId, setMyRoomId] = useState('');
  const [activePeerId, setActivePeerId] = useState(null);
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [latency, setLatency] = useState(null);

  // Multi-session dictionary: peerId -> { peerNickname, messages: [], transfers: [], sessionEnded: bool, sessionEndReason: string }
  const [sessions, setSessions] = useState({});

  // Typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerTypingNickname, setPeerTypingNickname] = useState('');

  // Mobile layout state ('chat' | 'files' | 'sessions')
  const [mobileTab, setMobileTab] = useState('chat');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Refs for persistent event handlers (PREVENTS EFFECT TEARDOWNS)
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const activePeerIdRef = useRef(activePeerId);
  activePeerIdRef.current = activePeerId;

  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Sync nickname to PeerService
  useEffect(() => {
    peerService.setNickname(myNickname);
  }, [myNickname]);

  // Current session computed data
  const currentSession = useMemo(() => {
    if (!activePeerId) return { messages: [], transfers: [], peerNickname: null, sessionEnded: false };
    return sessions[activePeerId] || { messages: [], transfers: [], peerNickname: null, sessionEnded: false };
  }, [sessions, activePeerId]);

  // Determine actual active connection status
  const effectiveStatus = useMemo(() => {
    if (activePeerId && peerService.isPeerConnected(activePeerId)) {
      return 'connected';
    }
    return status;
  }, [activePeerId, status, sessions]);

  // SETUP PEER SERVICE ONCE ON MOUNT
  useEffect(() => {
    const unsubReady = peerService.on('ready', (id) => {
      setMyRoomId(id);

      // Handle room joining from URL hash
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== id) {
        console.log('[ZeroChat] Auto-joining room from URL hash:', hash);
        showToast(`Connecting to room ${hash}...`, 'info');
        peerService.connectToPeer(hash);
      }
    });

    const unsubStatus = peerService.on('status', ({ status: newStatus, peerId, error }) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundEnabledRef.current);
        showToast('P2P connection established!', 'success');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#00f2fe', '#4facfe', '#9d4edd', '#10b981']
          });
        } catch (e) {}
      } else if (newStatus === 'disconnected') {
        playSound('disconnect', soundEnabledRef.current);
        setLatency(null);
      }
    });

    const unsubPeerConnected = peerService.on('peer_connected', ({ peerId }) => {
      setActivePeerId(peerId);
      setStatus('connected');
      setIsRoomModalOpen(false);

      setSessions((prev) => {
        const existing = prev[peerId] || { messages: [], transfers: [] };
        return {
          ...prev,
          [peerId]: {
            ...existing,
            peerNickname: existing.peerNickname || 'Peer',
            sessionEnded: false,
            sessionEndReason: null,
          },
        };
      });
    });

    const unsubHandshake = peerService.on('peer_handshake', ({ peerId, nickname }) => {
      setSessions((prev) => {
        const session = prev[peerId] || { messages: [], transfers: [] };
        return {
          ...prev,
          [peerId]: {
            ...session,
            peerNickname: nickname,
          },
        };
      });
      showToast(`${nickname} connected`, 'info');
    });

    const unsubLatency = peerService.on('latency', ({ peerId, latency: ms }) => {
      if (peerId === activePeerIdRef.current || !activePeerIdRef.current) {
        setLatency(ms);
      }
    });

    const unsubMessage = peerService.on('message', (msg) => {
      const fromPeer = msg.senderPeerId;
      setSessions((prev) => {
        const session = prev[fromPeer] || { messages: [], transfers: [], peerNickname: msg.senderNickname };
        return {
          ...prev,
          [fromPeer]: {
            ...session,
            messages: [...session.messages, msg],
          },
        };
      });

      if (mobileTabRef.current !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
      playSound('message', soundEnabledRef.current);
    });

    const unsubAck = peerService.on('message_ack', ({ id, peerId }) => {
      setSessions((prev) => {
        const session = prev[peerId];
        if (!session) return prev;
        return {
          ...prev,
          [peerId]: {
            ...session,
            messages: session.messages.map((m) => (m.id === id ? { ...m, delivered: true } : m)),
          },
        };
      });
    });

    const unsubTyping = peerService.on('typing', ({ peerId, isTyping, nickname }) => {
      if (peerId === activePeerIdRef.current) {
        setIsPeerTyping(isTyping);
        setPeerTypingNickname(nickname);
      }
    });

    const unsubSessionEnded = peerService.on('session_ended', ({ peerId, reason }) => {
      playSound('disconnect', soundEnabledRef.current);
      setSessions((prev) => {
        const session = prev[peerId];
        if (!session) return prev;
        return {
          ...prev,
          [peerId]: {
            ...session,
            sessionEnded: true,
            sessionEndReason: reason,
          },
        };
      });
      if (peerId === activePeerIdRef.current) {
        setStatus('disconnected');
        setLatency(null);
      }
      showToast(`Chat ended: ${reason}`, 'warning');
    });

    const unsubPeerNotFound = peerService.on('peer_not_found', () => {
      showToast('Peer not found. Please verify the room ID.', 'error');
      setStatus('disconnected');
    });

    // File transfer events
    const unsubFileStart = peerService.on('file_start', (fileInfo) => {
      const pId = fileInfo.peerId;
      setSessions((prev) => {
        const session = prev[pId] || { messages: [], transfers: [] };
        return {
          ...prev,
          [pId]: {
            ...session,
            transfers: [
              { ...fileInfo, progress: 0, speedBps: 0, completed: false },
              ...session.transfers,
            ],
          },
        };
      });
      showToast(`Receiving ${fileInfo.fileName}...`, 'info');
    });

    const unsubFileProgress = peerService.on('file_progress', ({ fileId, peerId, progress, speedBps }) => {
      setSessions((prev) => {
        const session = prev[peerId];
        if (!session) return prev;
        return {
          ...prev,
          [peerId]: {
            ...session,
            transfers: session.transfers.map((t) =>
              t.fileId === fileId ? { ...t, progress, speedBps } : t
            ),
          },
        };
      });
    });

    const unsubFileComplete = peerService.on('file_complete', (completedInfo) => {
      const pId = completedInfo.peerId;
      setSessions((prev) => {
        const session = prev[pId];
        if (!session) return prev;
        return {
          ...prev,
          [pId]: {
            ...session,
            transfers: session.transfers.map((t) =>
              t.fileId === completedInfo.fileId
                ? { ...t, ...completedInfo, completed: true, progress: 100 }
                : t
            ),
          },
        };
      });
      playSound('file', soundEnabledRef.current);
      showToast(`Transfer complete: ${completedInfo.fileName}`, 'success');
    });

    const unsubFileCancelled = peerService.on('file_cancelled', ({ fileId }) => {
      setSessions((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((pId) => {
          updated[pId] = {
            ...updated[pId],
            transfers: updated[pId].transfers.filter((t) => t.fileId !== fileId),
          };
        });
        return updated;
      });
      showToast('File transfer cancelled', 'warning');
    });

    // Initialize peer
    peerService.init().catch((err) => {
      console.error('[ZeroChat] Initialization error:', err);
      showToast('Failed to initialize PeerJS network', 'error');
    });

    // Clean up on component unmount ONLY
    return () => {
      unsubReady();
      unsubStatus();
      unsubPeerConnected();
      unsubHandshake();
      unsubLatency();
      unsubMessage();
      unsubAck();
      unsubTyping();
      unsubSessionEnded();
      unsubPeerNotFound();
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      unsubFileCancelled();
      peerService.cleanup();
    };
  }, [showToast]); // Run ONCE on mount!

  // Actions
  const handleSendMessage = useCallback((text) => {
    if (!activePeerId) {
      showToast('Connect to a peer to send messages', 'warning');
      return;
    }
    try {
      const sentMsg = peerService.sendTextMessage(text, activePeerId);
      setSessions((prev) => {
        const session = prev[activePeerId] || { messages: [], transfers: [] };
        return {
          ...prev,
          [activePeerId]: {
            ...session,
            messages: [...session.messages, { ...sentMsg, sender: 'local', delivered: false }],
          },
        };
      });
      playSound('message', soundEnabledRef.current);
    } catch (err) {
      console.error('[ZeroChat] Send message failed:', err);
      showToast('Failed to send message: peer not connected', 'error');
    }
  }, [activePeerId, showToast]);

  const handleSendFile = useCallback(async (file) => {
    if (!activePeerId) {
      showToast('Connect to a peer to send files', 'warning');
      return;
    }
    try {
      await peerService.sendFile(file, activePeerId);
    } catch (err) {
      console.error('[ZeroChat] Send file failed:', err);
      showToast('Failed to send file: peer not connected', 'error');
    }
  }, [activePeerId, showToast]);

  const handleCancelTransfer = useCallback((fileId) => {
    peerService.cancelFileTransfer(fileId, activePeerId);
  }, [activePeerId]);

  const handleTyping = useCallback((typing) => {
    if (activePeerId) {
      peerService.sendTypingStatus(typing, activePeerId);
    }
  }, [activePeerId]);

  const handleJoinRoom = useCallback((targetId) => {
    const cleanId = targetId.includes('#') ? targetId.split('#')[1].trim() : targetId.trim();
    if (cleanId) {
      if (cleanId === myRoomId) {
        showToast('Cannot connect to your own room ID', 'warning');
        return;
      }
      window.location.hash = cleanId;
      showToast(`Connecting to ${cleanId}...`, 'info');
      peerService.connectToPeer(cleanId);
    }
  }, [myRoomId, showToast]);

  const handleEndSession = useCallback(() => {
    if (activePeerId) {
      peerService.endSession('You ended the conversation', activePeerId);
    }
  }, [activePeerId]);

  const handleStartNewRoom = useCallback(() => {
    peerService.cleanup();
    setActivePeerId(null);
    setStatus('disconnected');
    setLatency(null);
    window.history.replaceState(null, '', window.location.pathname);
    peerService.init().catch(console.error);
    setIsRoomModalOpen(true);
  }, []);

  const handleBurnSession = useCallback(() => {
    if (window.confirm('Burn session? This immediately severs all peer channels and completely purges all in-memory chat and file transfer history.')) {
      peerService.cleanup();
      setSessions({});
      setActivePeerId(null);
      setLatency(null);
      setStatus('disconnected');
      window.history.replaceState(null, '', window.location.pathname);
      peerService.init().catch(console.error);
      showToast('Session burned. Memory cleared.', 'success');
    }
  }, [showToast]);

  const handleSaveNickname = (name, color) => {
    setMyNickname(name);
    setMyAvatarBg(color);
    localStorage.setItem('zerochat_nickname', name);
    localStorage.setItem('zerochat_avatar_bg', color);
    peerService.setNickname(name);

    // Broadcast new nickname to all active connections
    peerService.getActiveConnections().forEach((pId) => {
      peerService.sendToPeer(pId, {
        type: 'handshake',
        nickname: name,
        peerId: myRoomId,
      });
    });
    showToast(`Display name updated to ${name}`, 'success');
  };

  const activeTransfersCount = useMemo(() => {
    return currentSession.transfers.filter((t) => !t.completed).length;
  }, [currentSession.transfers]);

  const sessionsCount = Object.keys(sessions).length || 1;

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <Header 
        status={effectiveStatus}
        roomId={myRoomId}
        remotePeerNickname={currentSession.peerNickname}
        myNickname={myNickname}
        myAvatarBg={myAvatarBg}
        latency={latency}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onEndSession={handleEndSession}
        onBurnSession={handleBurnSession}
        onShowRoomModal={() => setIsRoomModalOpen(true)}
        onShowNicknameModal={() => setIsNicknameModalOpen(true)}
        onShowSessionsModal={() => setIsSessionsModalOpen(true)}
        onShowInfoModal={() => setIsInfoModalOpen(true)}
        sessionsCount={sessionsCount}
      />

      {/* Main Workspace */}
      <main className={`main-workspace tab-${mobileTab}`}>
        <ChatArea 
          messages={currentSession.messages}
          onSendMessage={handleSendMessage}
          status={effectiveStatus}
          remotePeerId={activePeerId}
          remotePeerNickname={currentSession.peerNickname}
          myNickname={myNickname}
          isPeerTyping={isPeerTyping}
          peerTypingNickname={peerTypingNickname}
          onTyping={handleTyping}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onStartNewRoom={handleStartNewRoom}
          sessionEnded={currentSession.sessionEnded}
          sessionEndReason={currentSession.sessionEndReason}
          roomId={myRoomId}
        />

        <FileTransferArea 
          transfers={currentSession.transfers}
          onSendFile={handleSendFile}
          onCancelTransfer={handleCancelTransfer}
          status={effectiveStatus}
          remotePeerNickname={currentSession.peerNickname}
        />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav 
        activeTab={mobileTab}
        setActiveTab={(tab) => {
          if (tab === 'sessions') {
            setIsSessionsModalOpen(true);
          } else {
            setMobileTab(tab);
            if (tab === 'chat') setUnreadChatCount(0);
          }
        }}
        unreadCount={unreadChatCount}
        activeTransfersCount={activeTransfersCount}
        sessionsCount={sessionsCount}
      />

      {/* Modals */}
      <RoomModal 
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomId={myRoomId}
        status={effectiveStatus}
        onJoinRoom={handleJoinRoom}
      />

      <NicknameModal 
        isOpen={isNicknameModalOpen}
        onClose={() => setIsNicknameModalOpen(false)}
        currentNickname={myNickname}
        onSaveNickname={handleSaveNickname}
      />

      <SessionListModal 
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        sessions={sessions}
        activePeerId={activePeerId}
        onSelectPeer={(pId) => {
          setActivePeerId(pId);
          peerService.activePeerId = pId;
          const targetStatus = peerService.isPeerConnected(pId) ? 'connected' : 'disconnected';
          setStatus(targetStatus);
        }}
        onNewRoom={handleStartNewRoom}
        onDisconnectPeer={(pId) => peerService.closePeerConnection(pId)}
      />

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
