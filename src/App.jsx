import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Sync nickname to PeerService
  useEffect(() => {
    peerService.setNickname(myNickname);
  }, [myNickname]);

  // Active session data
  const currentSession = useMemo(() => {
    if (!activePeerId) return { messages: [], transfers: [], peerNickname: null, sessionEnded: false };
    return sessions[activePeerId] || { messages: [], transfers: [], peerNickname: null, sessionEnded: false };
  }, [sessions, activePeerId]);

  // Setup Peer Service Event Listeners
  useEffect(() => {
    const unsubReady = peerService.on('ready', (id) => {
      setMyRoomId(id);

      // Handle URL hash joining
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== id) {
        console.log('Connecting to target peer room from URL hash:', hash);
        peerService.connectToPeer(hash);
      }
    });

    const unsubStatus = peerService.on('status', ({ status: newStatus, peerId }) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundEnabled);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#00f2fe', '#4facfe', '#9d4edd', '#10b981']
          });
        } catch (e) {}
      } else if (newStatus === 'disconnected') {
        playSound('disconnect', soundEnabled);
        setLatency(null);
      }
    });

    const unsubPeerConnected = peerService.on('peer_connected', ({ peerId }) => {
      setActivePeerId(peerId);
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
    });

    const unsubLatency = peerService.on('latency', ({ peerId, latency: ms }) => {
      if (peerId === peerService.activePeerId || !peerService.activePeerId) {
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

      if (mobileTab !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
      playSound('message', soundEnabled);
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
      if (peerId === activePeerId) {
        setIsPeerTyping(isTyping);
        setPeerTypingNickname(nickname);
      }
    });

    const unsubSessionEnded = peerService.on('session_ended', ({ peerId, reason }) => {
      playSound('disconnect', soundEnabled);
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
      if (peerId === activePeerId) {
        setStatus('disconnected');
        setLatency(null);
      }
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
      playSound('file', soundEnabled);
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
    });

    // Initialize peer
    peerService.init().catch((err) => {
      console.error('Failed to initialize PeerJS:', err);
    });

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
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      unsubFileCancelled();
      peerService.cleanup();
    };
  }, [soundEnabled, activePeerId, mobileTab]);

  // Actions
  const handleSendMessage = useCallback((text) => {
    if (!activePeerId) return;
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
      playSound('message', soundEnabled);
    } catch (err) {
      console.error('Failed to send text:', err);
    }
  }, [activePeerId, soundEnabled]);

  const handleSendFile = useCallback(async (file) => {
    if (!activePeerId) return;
    try {
      await peerService.sendFile(file, activePeerId);
    } catch (err) {
      console.error('Failed to send file:', err);
    }
  }, [activePeerId]);

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
      window.location.hash = cleanId;
      peerService.connectToPeer(cleanId);
    }
  }, []);

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
    if (window.confirm('Burn session? This immediately closes all peer channels and completely purges all in-memory chat and file transfer history.')) {
      peerService.cleanup();
      setSessions({});
      setActivePeerId(null);
      setLatency(null);
      setStatus('disconnected');
      window.history.replaceState(null, '', window.location.pathname);
      peerService.init().catch(console.error);
    }
  }, []);

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
  };

  const activeTransfersCount = useMemo(() => {
    return currentSession.transfers.filter((t) => !t.completed).length;
  }, [currentSession.transfers]);

  const sessionsCount = Object.keys(sessions).length || 1;

  return (
    <div className="app-container">
      {/* Header */}
      <Header 
        status={status}
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

      {/* Main Workspace (Mobile tab-filtered, Desktop split) */}
      <main className={`main-workspace tab-${mobileTab}`}>
        <ChatArea 
          messages={currentSession.messages}
          onSendMessage={handleSendMessage}
          status={status}
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
          status={status}
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
        status={status}
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
