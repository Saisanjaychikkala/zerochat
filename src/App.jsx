import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { peerService } from './services/peerService';
import { playSound } from './utils/soundEffects';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import FileTransferArea from './components/FileTransferArea';
import RoomModal from './components/RoomModal';
import NicknameModal from './components/NicknameModal';
import InfoModal from './components/InfoModal';
import MobileNav from './components/MobileNav';
import ImageLightboxModal from './components/ImageLightboxModal';

export default function App() {
  // Identity & Preferences
  const [myNickname, setMyNickname] = useState(() => {
    return localStorage.getItem('zerochat_nickname') || 'User-' + Math.floor(100 + Math.random() * 900);
  });
  const [myAvatarBg, setMyAvatarBg] = useState(() => {
    return localStorage.getItem('zerochat_avatar_bg') || 'linear-gradient(135deg, #00f2fe, #4facfe)';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('zerochat_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Room & Peer Networking State
  const [myRoomId, setMyRoomId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState(null);
  const [remoteNickname, setRemoteNickname] = useState('Peer');
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  const [latency, setLatency] = useState(null);

  // Messages & Transfers State
  const [messages, setMessages] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // Typing state
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerTypingNickname, setPeerTypingNickname] = useState('');

  // Mobile layout tab ('chat' | 'files') - PURELY VISUAL TOGGLE
  const [mobileTab, setMobileTab] = useState('chat');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Modals state
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Persistent refs to avoid effect teardown
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;

  const currentConnectedPeerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Update nickname in PeerService
  useEffect(() => {
    peerService.setNickname(myNickname);
  }, [myNickname]);

  // INITIALIZE PEER ONCE ON MOUNT
  useEffect(() => {
    const unsubReady = peerService.on('ready', (id) => {
      setMyRoomId(id);

      // Check if URL has hash to auto-join
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== id) {
        console.log('[ZeroChat] Joining room from URL hash:', hash);
        showToast(`Connecting to room ${hash}...`, 'info');
        peerService.connectToPeer(hash);
      }
    });

    const unsubStatus = peerService.on('status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') {
        playSound('connect', soundEnabledRef.current);
        showToast('P2P channel active!', 'success');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#00f2fe', '#4facfe', '#9d4edd', '#10b981']
          });
        } catch (e) {}
      } else if (newStatus === 'reconnecting') {
        showToast('Connection interrupted. Reconnecting...', 'warning');
      } else if (newStatus === 'disconnected') {
        setLatency(null);
      }
    });

    const unsubPeerConnected = peerService.on('peer_connected', ({ peerId, nickname }) => {
      // RESET CHAT HISTORY IF A DIFFERENT PEER CONNECTS
      if (currentConnectedPeerRef.current && currentConnectedPeerRef.current !== peerId) {
        console.log('[ZeroChat] New peer connected. Starting fresh conversation.');
        setMessages([]);
        setTransfers([]);
      }
      currentConnectedPeerRef.current = peerId;

      setRemotePeerId(peerId);
      if (nickname) setRemoteNickname(nickname);
      setStatus('connected');
      setIsRoomModalOpen(false);
    });

    const unsubPeerInfo = peerService.on('peer_info', ({ peerId, nickname }) => {
      setRemotePeerId(peerId);
      setRemoteNickname(nickname || 'Peer');
      showToast(`${nickname || 'Peer'} is online`, 'info');
    });

    const unsubPeerDisconnected = peerService.on('peer_disconnected', () => {
      setStatus('reconnecting');
    });

    const unsubPeerNotFound = peerService.on('peer_not_found', () => {
      showToast('Room not found. Please verify the link.', 'error');
      setStatus('disconnected');
    });

    const unsubLatency = peerService.on('latency', (ms) => {
      setLatency(ms);
    });

    const unsubMessage = peerService.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (mobileTabRef.current !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
      playSound('message', soundEnabledRef.current);
    });

    const unsubAck = peerService.on('message_ack', (ackId) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === ackId ? { ...m, delivered: true } : m))
      );
    });

    const unsubTyping = peerService.on('typing', ({ isTyping, nickname }) => {
      setIsPeerTyping(isTyping);
      setPeerTypingNickname(nickname);
    });

    // File transfer events
    const unsubFileStart = peerService.on('file_start', (fileInfo) => {
      setTransfers((prev) => [
        { ...fileInfo, progress: 0, speedBps: 0, completed: false },
        ...prev,
      ]);
      if (!fileInfo.isSender) {
        showToast(`Receiving ${fileInfo.fileName}...`, 'info');
      }
    });

    const unsubFileProgress = peerService.on('file_progress', ({ fileId, progress, speedBps }) => {
      setTransfers((prev) =>
        prev.map((t) => (t.fileId === fileId ? { ...t, progress, speedBps } : t))
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
      playSound('file', soundEnabledRef.current);
      showToast(`Transfer complete: ${completedInfo.fileName}!`, 'success');

      // Post to interactive Chat Stream
      const downloadUrl = completedInfo.downloadUrl;
      if (downloadUrl) {
        const isImage = completedInfo.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(completedInfo.fileName);
        const isVoice = completedInfo.isVoiceNote || (completedInfo.fileType?.startsWith('audio/') && completedInfo.fileName?.includes('voice_note'));

        setMessages((prev) => [
          ...prev,
          {
            id: 'file_msg_' + completedInfo.fileId,
            type: isVoice ? 'voice' : (isImage ? 'image' : 'file'),
            sender: completedInfo.isSender ? 'local' : 'remote',
            senderNickname: completedInfo.isSender ? (localStorage.getItem('zerochat_nickname') || 'You') : (completedInfo.senderNickname || 'Peer'),
            timestamp: Date.now(),
            delivered: true,
            isVoiceNote: isVoice,
            durationSec: completedInfo.durationSec || 0,
            audioUrl: isVoice ? downloadUrl : null,
            imageUrl: isImage ? downloadUrl : null,
            fileName: completedInfo.fileName,
            fileSize: completedInfo.fileSize,
            downloadUrl: downloadUrl,
            text: isVoice ? null : (isImage ? null : `📎 ${completedInfo.fileName}`)
          }
        ]);
      }
    });

    const unsubFileCancelled = peerService.on('file_cancelled', ({ fileId }) => {
      setTransfers((prev) => prev.filter((t) => t.fileId !== fileId));
      showToast('File transfer cancelled', 'warning');
    });

    // Initialize peer
    peerService.init().catch((err) => {
      console.error('[ZeroChat] Init error:', err);
    });

    return () => {
      unsubReady();
      unsubStatus();
      unsubPeerConnected();
      unsubPeerInfo();
      unsubPeerDisconnected();
      unsubPeerNotFound();
      unsubLatency();
      unsubMessage();
      unsubAck();
      unsubTyping();
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      unsubFileCancelled();
      peerService.cleanup();
    };
  }, [showToast]);

  // Actions
  const handleSendMessage = useCallback((text) => {
    if (!peerService.isConnected()) {
      showToast('Wait for peer to connect before sending', 'warning');
      return;
    }
    try {
      const sentMsg = peerService.sendTextMessage(text);
      setMessages((prev) => [...prev, { ...sentMsg, sender: 'local', delivered: false }]);
      playSound('message', soundEnabledRef.current);
    } catch (err) {
      console.error('[ZeroChat] Send message failed:', err);
      showToast('Could not send message', 'error');
    }
  }, [showToast]);

  const handleSendFile = useCallback(async (file) => {
    if (!peerService.isConnected()) {
      showToast('Connect a peer before sending files', 'warning');
      return;
    }
    try {
      await peerService.sendFile(file);
    } catch (err) {
      console.error('[ZeroChat] Send file failed:', err);
      showToast('File transfer error', 'error');
    }
  }, [showToast]);

  const handleCancelTransfer = useCallback((fileId) => {
    peerService.cancelFileTransfer(fileId);
  }, []);

  const handleTyping = useCallback((typing) => {
    peerService.sendTypingStatus(typing);
  }, []);

  const handleJoinRoom = useCallback((targetId) => {
    const cleanId = targetId.includes('#') ? targetId.split('#')[1].trim() : targetId.trim();
    if (cleanId) {
      if (cleanId === myRoomId) {
        showToast('Cannot connect to your own room ID', 'warning');
        return;
      }
      // Clear previous conversation when joining another room
      setMessages([]);
      setTransfers([]);
      currentConnectedPeerRef.current = null;
      window.location.hash = cleanId;
      showToast(`Connecting to ${cleanId}...`, 'info');
      peerService.connectToPeer(cleanId);
    }
  }, [myRoomId, showToast]);

  const handleDisconnect = useCallback(() => {
    peerService.disconnect();
    currentConnectedPeerRef.current = null;
    setRemotePeerId(null);
    setLatency(null);
    setStatus('disconnected');
    setMessages([]);
    setTransfers([]);
    showToast('Disconnected. Session history cleared.', 'info');
  }, [showToast]);

  const handleBurnSession = useCallback(() => {
    if (window.confirm('Burn session? This immediately wipes all messages and files from memory and resets the room.')) {
      peerService.cleanup();
      currentConnectedPeerRef.current = null;
      setMessages([]);
      setTransfers([]);
      setRemotePeerId(null);
      setLatency(null);
      setStatus('disconnected');
      window.history.replaceState(null, '', window.location.pathname);
      peerService.init().catch(console.error);
      showToast('Session burned. Fresh room ready.', 'success');
    }
  }, [showToast]);

  const handleSaveNickname = (name, color) => {
    setMyNickname(name);
    setMyAvatarBg(color);
    localStorage.setItem('zerochat_nickname', name);
    localStorage.setItem('zerochat_avatar_bg', color);
    peerService.setNickname(name);
    showToast(`Name updated to ${name}`, 'success');
  };

  const activeTransfersCount = transfers.filter((t) => !t.completed).length;

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
        status={status}
        roomId={myRoomId}
        remotePeerNickname={remoteNickname}
        myNickname={myNickname}
        myAvatarBg={myAvatarBg}
        latency={latency}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onDisconnect={handleDisconnect}
        onBurnSession={handleBurnSession}
        onShowRoomModal={() => setIsRoomModalOpen(true)}
        onShowNicknameModal={() => setIsNicknameModalOpen(true)}
        onShowInfoModal={() => setIsInfoModalOpen(true)}
      />

      {/* Mobile Top Segmented Tab Switcher (Visible on Mobile only) */}
      <MobileNav 
        activeTab={mobileTab}
        setActiveTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'chat') setUnreadChatCount(0);
        }}
        unreadCount={unreadChatCount}
        activeTransfersCount={activeTransfersCount}
      />

      {/* Main Workspace (Desktop: 2-column side-by-side, Mobile: tab-controlled) */}
      <main className={`main-workspace tab-${mobileTab}`}>
        <ChatArea 
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendFile={handleSendFile}
          status={status}
          remotePeerId={remotePeerId}
          remotePeerNickname={remoteNickname}
          myNickname={myNickname}
          isPeerTyping={isPeerTyping}
          peerTypingNickname={peerTypingNickname}
          onTyping={handleTyping}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
          roomId={myRoomId}
        />

        <FileTransferArea 
          transfers={transfers}
          onSendFile={handleSendFile}
          onCancelTransfer={handleCancelTransfer}
          onOpenLightbox={(url, name) => setLightboxImage({ url, name })}
          status={status}
          remotePeerNickname={remoteNickname}
        />
      </main>

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

      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      {/* Lightbox Modal */}
      <ImageLightboxModal 
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url}
        imageName={lightboxImage?.name}
      />
    </div>
  );
}
