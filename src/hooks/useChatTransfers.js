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

    return () => {
      unsubMessage();
      unsubAck();
      unsubFlushed();
      unsubFileStart();
      unsubFileProgress();
      unsubFileComplete();
      unsubFileCancelled();
    };
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
      if (showToast) showToast('Connect a peer before sending files', 'warning');
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
    peerService.cancelFileTransfer(fileId);
  }, []);

  const resetHistory = useCallback(() => {
    setMessages([]);
    setTransfers([]);
  }, []);

  const handleBurnSession = useCallback((onReset) => {
    if (window.confirm('Burn session? This immediately wipes all messages and files from memory and resets the room.')) {
      peerService.cleanup();

      // Revoke all Blob URLs to completely free RAM
      transfers.forEach((t) => {
        if (t.downloadUrl) {
          try { URL.revokeObjectURL(t.downloadUrl); } catch (e) {}
        }
      });
      messages.forEach((m) => {
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

      setMessages([]);
      setTransfers([]);
      if (onReset) onReset();
      window.history.replaceState(null, '', window.location.pathname);
      peerService.init().catch(console.error);
      if (showToast) showToast('Session burned. Fresh room ready.', 'success');
    }
  }, [transfers, messages, showToast]);

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
