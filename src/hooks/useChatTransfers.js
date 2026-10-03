import { useState, useEffect, useCallback, useRef } from 'react';
import { peerService } from '../services/peerService';
import { groupRelayEngine } from '../services/webrtc/groupRelayEngine';
import { playSound } from '../utils/soundEffects';

export function generateThumbnailPreview(file, maxWidth = 180, maxHeight = 180) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i.test(file.name || '');
    if (!isImage) return resolve(null);

    const safetyTimer = setTimeout(() => resolve(null), 3000);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(safetyTimer);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.55));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(safetyTimer);
        resolve(null);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      clearTimeout(safetyTimer);
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

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

    // On-Demand File Offer Listener (1-on-1 & Squad)
    const handleFileOffer = (offer) => {
      setMessages((prev) => {
        if (prev.some((m) => m.fileId === offer.fileId)) return prev;
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
            sender: 'remote',
            senderNickname: offer.senderNickname || offer.author || 'Peer',
            authorId: offer.authorId || offer.senderPeerId,
            timestamp: offer.timestamp || Date.now(),
            status: 'idle',
            progress: 0,
            speedBps: 0,
            downloadUrl: null,
          },
        ];
      });
      playSound('message', soundEnabledRef.current);
    };

    const unsubOffer1 = peerService.on('file_offer', handleFileOffer);
    const unsubOffer2 = groupRelayEngine.on('file_offer', handleFileOffer);

    // On-Demand File Error / Expired Listener
    const handleFileError = ({ fileId, reason }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.fileId === fileId) {
            return {
              ...m,
              status: 'expired',
              errorReason: reason || 'Media expired or unavailable in RAM.',
            };
          }
          return m;
        })
      );
      if (showToast) showToast(reason || 'File download unavailable', 'error');
    };

    const unsubError1 = peerService.on('file_error', handleFileError);
    const unsubError2 = groupRelayEngine.on('file_error', handleFileError);

    const unsubFileStart = peerService.on('file_start', (fileInfo) => {
      setTransfers((prev) => [
        { ...fileInfo, progress: 0, speedBps: 0, completed: false },
        ...prev,
      ]);
      if (!fileInfo.isSender && showToast) {
        showToast(`Receiving ${fileInfo.fileName}...`, 'info');
      }
    });

    const handleFileProgress = ({ fileId, progress, speedBps }) => {
      setTransfers((prev) =>
        prev.map((t) => (t.fileId === fileId ? { ...t, progress, speedBps } : t))
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.fileId === fileId ? { ...m, status: 'downloading', progress, speedBps } : m
        )
      );
    };

    const unsubFileProgress = peerService.on('file_progress', handleFileProgress);
    const unsubGroupProgress = groupRelayEngine.on('file_progress', handleFileProgress);

    const handleFileComplete = (completedInfo) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.fileId === completedInfo.fileId
            ? { ...t, ...completedInfo, completed: true, progress: 100 }
            : t
        )
      );
      playSound('file', soundEnabledRef.current);
      if (showToast) showToast(`Transfer complete: ${completedInfo.fileName}!`, 'success');

      // Update card to Ready state with blob URL
      const downloadUrl = completedInfo.downloadUrl;
      if (downloadUrl) {
        const isImage =
          completedInfo.fileType?.startsWith('image/') ||
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(completedInfo.fileName);
        const isVoice =
          completedInfo.isVoiceNote ||
          (completedInfo.fileType?.startsWith('audio/') &&
            completedInfo.fileName?.includes('voice_note'));

        setMessages((prev) => {
          const exists = prev.some((m) => m.fileId === completedInfo.fileId);
          if (exists) {
            return prev.map((m) => {
              if (m.fileId === completedInfo.fileId) {
                return {
                  ...m,
                  status: 'ready',
                  progress: 100,
                  downloadUrl,
                  audioUrl: isVoice ? downloadUrl : null,
                  imageUrl: isImage ? downloadUrl : null,
                };
              }
              return m;
            });
          }

          return [
            ...prev,
            {
              id: 'file_msg_' + completedInfo.fileId,
              type: 'file_card',
              fileId: completedInfo.fileId,
              fileName: completedInfo.fileName,
              fileSize: completedInfo.fileSize,
              fileType: completedInfo.fileType,
              sender: completedInfo.isSender ? 'local' : 'remote',
              senderNickname: completedInfo.isSender
                ? localStorage.getItem('zerochat_nickname') || 'You'
                : completedInfo.senderNickname || 'Peer',
              timestamp: Date.now(),
              delivered: true,
              isVoiceNote: isVoice,
              durationSec: completedInfo.durationSec || 0,
              status: 'ready',
              progress: 100,
              downloadUrl,
              audioUrl: isVoice ? downloadUrl : null,
              imageUrl: isImage ? downloadUrl : null,
            },
          ];
        });
      }
    };

    const unsubFileComplete = peerService.on('file_complete', handleFileComplete);
    const unsubGroupComplete = groupRelayEngine.on('file_complete', handleFileComplete);

    const unsubFileCancelled = peerService.on('file_cancelled', ({ fileId }) => {
      setTransfers((prev) => prev.filter((t) => t.fileId !== fileId));
      if (showToast) showToast('File transfer cancelled', 'warning');
    });

    const unsubSessionBurned = peerService.on('session_burned', ({ burnerNickname }) => {
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

    const unsubReaction = peerService.on('chat_reaction', ({ messageId, emoji }) => {
      setMessages((prev) => prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has('remote')) {
          users.delete('remote');
          if (users.size === 0) delete reactions[emoji];
          else reactions[emoji] = Array.from(users);
        } else {
          users.add('remote');
          reactions[emoji] = Array.from(users);
        }
        return { ...m, reactions };
      }));
    });

    return () => {
      unsubMessage();
      unsubAck();
      unsubFlushed();
      unsubOffer1();
      unsubOffer2();
      unsubError1();
      unsubError2();
      unsubFileStart();
      unsubFileProgress();
      unsubGroupProgress();
      unsubFileComplete();
      unsubGroupComplete();
      unsubFileCancelled();
      unsubSessionBurned();
      unsubReaction();
    };
  }, [showToast]);

  const stagedFilesRef = useRef([]);
  const handleSendFileRef = useRef(null);

  // Auto-flush staged files when a peer connection is established
  useEffect(() => {
    const unsubStatus = peerService.on('status', async (newStatus) => {
      if (newStatus === 'connected' && stagedFilesRef.current.length > 0) {
        const toSend = [...stagedFilesRef.current];
        stagedFilesRef.current = [];
        setTransfers((prev) => prev.filter((t) => !t.staged));
        if (showToast) {
          showToast(`Peer connected! Auto-offering ${toSend.length} staged file(s)...`, 'info');
        }
        for (const file of toSend) {
          try {
            if (handleSendFileRef.current) {
              await handleSendFileRef.current(file);
            }
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
    let previewData = null;
    const isImageFile = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i.test(file.name || '');
    if (file.isVoiceNote) {
      previewData = {
        isVoiceNote: true,
        durationSec: file.durationSec || 0,
        waveform: file.waveform || null,
      };
    } else if (isImageFile) {
      try {
        previewData = await generateThumbnailPreview(file);
      } catch (e) {}
    }
    const localUrl = URL.createObjectURL(file);
    let offer;

    if (groupRelayEngine.roomId && (groupRelayEngine.isHost || groupRelayEngine.isAdmitted)) {
      offer = groupRelayEngine.offerFile(file, previewData);
    } else {
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
          showToast(`Staged "${file.name}" — will offer when peer connects`, 'info');
        }
        return;
      }
      offer = peerService.offerFile(file, previewData);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: 'file_msg_' + offer.fileId,
        type: 'file_card',
        fileId: offer.fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        previewData,
        isVoiceNote: !!file.isVoiceNote,
        durationSec: file.durationSec || 0,
        waveform: file.waveform || (previewData && previewData.waveform) || null,
        sender: 'local',
        senderNickname: localStorage.getItem('zerochat_nickname') || 'You',
        timestamp: Date.now(),
        status: 'ready',
        progress: 100,
        downloadUrl: localUrl,
        audioUrl: file.isVoiceNote ? localUrl : null,
        imageUrl: file.type?.startsWith('image/') ? localUrl : null,
      },
    ]);
  }, [showToast]);

  handleSendFileRef.current = handleSendFile;

  const handleRequestDownload = useCallback((fileId, authorId) => {
    setMessages((prev) =>
      prev.map((m) => (m.fileId === fileId ? { ...m, status: 'downloading', progress: 0 } : m))
    );
    if (authorId && groupRelayEngine.roomId) {
      groupRelayEngine.requestFileDownload(fileId, authorId);
    } else {
      peerService.requestFileDownload(fileId);
    }
  }, []);

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

  const handleReaction = useCallback((messageId, emoji) => {
    setMessages((prev) => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = { ...(m.reactions || {}) };
      const users = new Set(reactions[emoji] || []);
      if (users.has('local')) {
        users.delete('local');
        if (users.size === 0) delete reactions[emoji];
        else reactions[emoji] = Array.from(users);
      } else {
        users.add('local');
        reactions[emoji] = Array.from(users);
      }
      return { ...m, reactions };
    }));
    peerService.sendReaction(messageId, emoji);
  }, []);

  return {
    messages,
    setMessages,
    transfers,
    unreadChatCount,
    setUnreadChatCount,
    handleSendMessage,
    handleSendFile,
    handleRequestDownload,
    handleCancelTransfer,
    handleReaction,
    resetHistory,
    handleBurnSession,
  };
}
