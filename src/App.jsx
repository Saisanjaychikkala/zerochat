import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { peerService } from './services/peerService';
import { playSound } from './utils/soundEffects';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import FileTransferArea from './components/FileTransferArea';
import RoomModal from './components/RoomModal';
import InfoModal from './components/InfoModal';

export default function App() {
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [roomId, setRoomId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [latency, setLatency] = useState(null);
  const [messages, setMessages] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('zerochat_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Save sound preference
  useEffect(() => {
    localStorage.setItem('zerochat_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Setup Peer Service listeners
  useEffect(() => {
    const unsubReady = peerService.on('ready', (id) => {
      setRoomId(id);

      // Check if URL hash specifies a target room to join
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== id) {
        console.log('Detected room hash in URL, joining peer:', hash);
        peerService.connectToPeer(hash);
      }
    });

    const unsubStatus = peerService.on('status', (newStatus) => {
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
      setRemotePeerId(peerId);
      setIsRoomModalOpen(false);
    });

    const unsubPeerDisconnected = peerService.on('peer_disconnected', () => {
      setRemotePeerId(null);
      setIsPeerTyping(false);
    });

    const unsubMessage = peerService.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      playSound('message', soundEnabled);
    });

    const unsubAck = peerService.on('message_ack', (ackId) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === ackId ? { ...m, delivered: true } : m))
      );
    });

    const unsubTyping = peerService.on('typing', (typing) => {
      setIsPeerTyping(typing);
    });

    const unsubLatency = peerService.on('latency', (ms) => {
      setLatency(ms);
    });

    // File transfer events
    const unsubFileStart = peerService.on('file_start', (fileInfo) => {
      setTransfers((prev) => [
        {
          ...fileInfo,
          progress: 0,
          speedBps: 0,
          completed: false,
        },
        ...prev,
      ]);
    });

    const unsubFileProgress = peerService.on('file_progress', ({ fileId, progress, speedBps }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.fileId === fileId ? { ...t, progress, speedBps } : t
        )
      );
    });

    const unsubFileComplete = peerService.on('file_complete', (completedInfo) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.fileId === completedInfo.fileId
            ? { ...t, ...completedInfo, completed: true, progress: 100 }
            : t
        )
      );
      playSound('file', soundEnabled);
    });

    // Initialize peer
    peerService.init().catch((err) => {
      console.error('Failed to initialize PeerJS:', err);
    });

    return () => {
      unsubReady();
      unsubStatus();
      unsubPeerConnected();
      unsubPeerDisconnected();
      unsubMessage();
      unsubAck();
      unsubTyping();
      unsubLatency();
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      peerService.cleanup();
    };
  }, [soundEnabled]);

  // Actions
  const handleSendMessage = useCallback((text) => {
    try {
      const sentMsg = peerService.sendTextMessage(text);
      setMessages((prev) => [...prev, { ...sentMsg, sender: 'local', delivered: false }]);
      playSound('message', soundEnabled);
    } catch (err) {
      console.error('Failed to send text:', err);
    }
  }, [soundEnabled]);

  const handleSendFile = useCallback(async (file) => {
    try {
      await peerService.sendFile(file);
    } catch (err) {
      console.error('Failed to send file:', err);
    }
  }, []);

  const handleTyping = useCallback((isTyping) => {
    peerService.sendTypingStatus(isTyping);
  }, []);

  const handleJoinRoom = useCallback((targetId) => {
    // If target is a full URL, extract hash
    const cleanId = targetId.includes('#') ? targetId.split('#')[1].trim() : targetId.trim();
    if (cleanId) {
      window.location.hash = cleanId;
      peerService.connectToPeer(cleanId);
    }
  }, []);

  const handleBurnSession = useCallback(() => {
    if (window.confirm('Burn session? This immediately closes the direct peer channel and purges all ephemeral chat logs and file history.')) {
      peerService.cleanup();
      setMessages([]);
      setTransfers([]);
      setLatency(null);
      setRemotePeerId(null);
      setStatus('disconnected');
      window.history.replaceState(null, '', window.location.pathname);
      peerService.init().catch(console.error);
    }
  }, []);

  return (
    <div className="app-container">
      {/* Header with live status, room link, burn button */}
      <Header 
        status={status}
        roomId={roomId}
        remotePeerId={remotePeerId}
        latency={latency}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onBurnSession={handleBurnSession}
        onShowRoomModal={() => setIsRoomModalOpen(true)}
        onShowInfoModal={() => setIsInfoModalOpen(true)}
      />

      {/* Main Workspace (Split: Chat + File Drop) */}
      <main className="main-workspace">
        <ChatArea 
          messages={messages}
          onSendMessage={handleSendMessage}
          status={status}
          remotePeerId={remotePeerId}
          isPeerTyping={isPeerTyping}
          onTyping={handleTyping}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          roomId={roomId}
        />

        <FileTransferArea 
          transfers={transfers}
          onSendFile={handleSendFile}
          status={status}
        />
      </main>

      {/* Modals */}
      <RoomModal 
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomId={roomId}
        status={status}
        onJoinRoom={handleJoinRoom}
      />

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </div>
  );
}
