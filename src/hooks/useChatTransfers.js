import { useState, useEffect, useCallback, useRef } from 'react';
import { peerService } from '../services/peerService';
import { playSound } from '../utils/soundEffects';

export function useChatTransfers({ soundEnabled, mobileTab, showToast }) {
  const [messages, setMessages] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const mobileTabRef = useRef(mobileTab);
  mobileTabRef.current = mobileTab;

  useEffect(() => {
    const unsubMessage = peerService.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (mobileTabRef.current !== 'chat') {
        setUnreadChatCount((c) => c + 1);
      }
      playSound('message', soundEnabledRef.current);
    });

    const unsubAck = peerService.on('message_ack', (ackId) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === ackId ? { ...m, pending: false, delivered: true } : m))
      );
    });

    const unsubFlushed = peerService.on('message_flushed', ({ id }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pending: false } : m))
      );
      playSound('message', soundEnabledRef.current);
    });

    const unsubFileStart = peerService.on('file_start', (fileInfo) => {
      setTransfers((prev) => [
        { ...fileInfo, progress: 0, speedBps: 0, completed: false },
        ...prev,
      ]);
      if (!fileInfo.isSender && showToast) {
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
      if (showToast) showToast(`Transfer complete: ${completedInfo.fileName}!`, 'success');

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
      if (showToast) showToast('File transfer cancelled', 'warning');
    });

    const unsubSessionBurned = peerService.on('session_burned', ({ burnerNickname }) => {
      // Hardware & Memory Security: Immediately revoke all local blob memory and wipe RAM state
      setTransfers((prev) => {
        prev.forEach((t) => {
          if (t.downloadUrl) {
            try { URL.revokeObjectURL(t.downloadUrl); } catch (e) {}
          }
        });
        return [];
      });
      setMessages((prev) => {
        prev.forEach((m) => {
          if (m.downloadUrl) {
            try { URL.revokeObjectURL(m.downloadUrl); } catch (e) {}
          }
          if (m.imageUrl) {
            try { URL.revokeObjectURL(m.imageUrl); } catch (e) {}
          }
          if (m.audioUrl) {
            try { URL.revokeObjectURL(m.audioUrl); } catch (e) {}
          }
        });
        return [];
      });
      playSound('burn', soundEnabledRef.current);
      if (showToast) {
        showToast(`🔥 ${burnerNickname || 'The other user'} burned the session! All messages & files were permanently deleted.`, 'warning');
      }
    });

    return () => {
      unsubMessage();
      unsubAck();
      unsubFlushed();
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      unsubFileCancelled();
      unsubSessionBurned();
    };
  }, [showToast]);

  const stagedFilesRef = useRef([]);

  // Auto-flush staged files when a peer connection is established
  useEffect(() => {
    const unsubStatus = peerService.on('status', async (newStatus) => {
      if (newStatus === 'connected' && stagedFilesRef.current.length > 0) {
        const toSend = [...stagedFilesRef.current];
        stagedFilesRef.current = [];
        setTransfers((prev) => prev.filter((t) => !t.staged));
        if (showToast) {
          showToast(`Peer connected! Auto-sending ${toSend.length} staged file(s)...`, 'info');
        }
        for (const file of toSend) {
          try {
            await peerService.sendFile(file);
          } catch (e) {
            console.error('[ZeroChat] Auto-send staged file failed:', e);
          }
        }
      }
    });
    return () => unsubStatus();
  }, [showToast]);

  const handleSendMessage = useCallback((text, replyTo = null) => {
    try {
      const sentMsg = peerService.sendTextMessage(text, replyTo);
      setMessages((prev) => [
        ...prev,
        { ...sentMsg, sender: 'local', delivered: false, pending: !!sentMsg.pending },
      ]);
      if (sentMsg.pending) {
        if (showToast) showToast('Message queued — will send when reconnected', 'info');
      } else {
        playSound('message', soundEnabledRef.current);
      }
    } catch (err) {
      console.error('[ZeroChat] Send message failed:', err);
      if (showToast) showToast(err.message || 'Could not send message', 'error');
    }
  }, [showToast]);

  const handleSendFile = useCallback(async (file) => {
    if (!peerService.isConnected()) {
      stagedFilesRef.current.push(file);
      const stagedId = 'staged_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      setTransfers((prev) => [
        {
          fileId: stagedId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isSender: true,
          progress: 0,
          speedBps: 0,
          completed: false,
          staged: true,
        },
        ...prev,
      ]);
      if (showToast) {
        showToast(`Staged "${file.name}" — will auto-transfer when peer connects`, 'info');
      }
      return;
    }
    try {
      await peerService.sendFile(file);
    } catch (err) {
      console.error('[ZeroChat] Send file failed:', err);
      if (showToast) showToast('File transfer error', 'error');
    }
  }, [showToast]);

  const handleCancelTransfer = useCallback((fileId) => {
    if (fileId && fileId.startsWith('staged_')) {
      setTransfers((prev) => prev.filter((t) => t.fileId !== fileId));
      stagedFilesRef.current = stagedFilesRef.current.filter((f) => f.name !== fileId);
      if (showToast) showToast('Staged file removed', 'info');
      return;
    }
    peerService.cancelFileTransfer(fileId);
  }, [showToast]);

  const resetHistory = useCallback(() => {
    setMessages([]);
    setTransfers([]);
  }, []);

  const handleBurnSession = useCallback((onReset) => {
    if (window.confirm('Burn session? This immediately wipes all messages and files from memory and resets the room.')) {
      // Notify remote peer to burn their session memory too
      peerService.burnSession();

      // Revoke all Blob URLs and wipe state safely
      setTransfers((prev) => {
        prev.forEach((t) => {
          if (t.downloadUrl) {
            try { URL.revokeObjectURL(t.downloadUrl); } catch (e) {}
          }
        });
        return [];
      });
      setMessages((prev) => {
        prev.forEach((m) => {
          if (m.downloadUrl) {
            try { URL.revokeObjectURL(m.downloadUrl); } catch (e) {}
          }
          if (m.imageUrl) {
            try { URL.revokeObjectURL(m.imageUrl); } catch (e) {}
          }
          if (m.audioUrl) {
            try { URL.revokeObjectURL(m.audioUrl); } catch (e) {}
          }
        });
        return [];
      });

      setTimeout(() => {
        peerService.cleanup();
        if (onReset) onReset();
        window.history.replaceState(null, '', window.location.pathname);
        peerService.init().catch(console.error);
        if (showToast) showToast('Session burned. Fresh room ready.', 'success');
      }, 50);
    }
  }, [showToast]);

  return {
    messages,
    transfers,
    unreadChatCount,
    setUnreadChatCount,
    handleSendMessage,
    handleSendFile,
    handleCancelTransfer,
    resetHistory,
    handleBurnSession,
  };
}
