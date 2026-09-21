/**
 * ZeroChat - WebRTC P2P Media Calling Engine
 * Manages voice & video calls, dummy canvas tracks for audio-to-video upgrades, track replacement & screen share.
 */

export class MediaCallEngine {
  constructor() {
    this.currentCall = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.isScreenSharing = false;
    this.isAudioMuted = false;
    this.isVideoMuted = false;
    this.facingMode = 'user';
    this.incomingCallData = null; // { mediaConn, callerNickname, isVideo }
  }

  createDummyVideoTrack() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 2, 2);
      }
      if (typeof canvas.captureStream === 'function') {
        const stream = canvas.captureStream(1);
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.enabled = false;
          return track;
        }
      }
    } catch (e) {
      console.warn('[ZeroChat] Canvas captureStream fallback not supported:', e);
    }
    return null;
  }

  async startCall(peer, remotePeerId, isVideo = true, myNickname = 'Anonymous', remoteNickname = 'Peer', sendJson, emit) {
    if (!remotePeerId || !peer) {
      throw new Error('No active peer connected');
    }

    try {
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      this.isScreenSharing = false;

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      let activeIsVideo = isVideo;
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        if (activeIsVideo) {
          console.warn('[ZeroChat] Video acquisition failed, falling back to audio-only call:', mediaErr);
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          activeIsVideo = false;
        } else {
          throw mediaErr;
        }
      }

      // Attach disabled dummy track to audio-only call so the m=video pipeline is established
      if (!activeIsVideo) {
        const dummyTrack = this.createDummyVideoTrack();
        if (dummyTrack) this.localStream.addTrack(dummyTrack);
      }

      emit('local_stream', this.localStream);

      const mediaConn = peer.call(remotePeerId, this.localStream, {
        metadata: {
          isVideo: activeIsVideo,
          callerNickname: myNickname,
        },
      });

      this.currentCall = mediaConn;

      emit('call_started', {
        role: 'caller',
        isVideo: activeIsVideo,
        remoteNickname,
      });

      sendJson({
        type: 'call_signal',
        signal: 'offer',
        isVideo: activeIsVideo,
        callerNickname: myNickname,
      });

      mediaConn.on('stream', (remoteStream) => {
        console.log('[ZeroChat] Remote media stream attached');
        this.remoteStream = remoteStream;
        emit('remote_stream', remoteStream);
      });

      mediaConn.on('close', () => {
        console.log('[ZeroChat] Media call ended by peer');
        this.cleanupCall(emit);
      });

      mediaConn.on('error', (err) => {
        console.error('[ZeroChat] Media call error:', err);
        this.cleanupCall(emit);
      });

      return mediaConn;
    } catch (err) {
      console.error('[ZeroChat] Failed to start media call:', err);
      this.cleanupCall(emit);
      throw err;
    }
  }

  async answerCall(isVideo = null, myNickname = 'Anonymous', remoteNickname = 'Peer', sendJson, emit) {
    if (!this.incomingCallData || !this.incomingCallData.mediaConn) {
      console.warn('[ZeroChat] No incoming media call available to answer');
      return;
    }

    const { mediaConn, isVideo: callIsVideo } = this.incomingCallData;
    let activeUseVideo = isVideo !== null ? isVideo : callIsVideo;

    try {
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      this.isScreenSharing = false;

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: activeUseVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        if (activeUseVideo) {
          console.warn('[ZeroChat] Video acquisition failed on answer, falling back to audio-only:', mediaErr);
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          activeUseVideo = false;
        } else {
          throw mediaErr;
        }
      }

      if (!activeUseVideo) {
        const dummyTrack = this.createDummyVideoTrack();
        if (dummyTrack) this.localStream.addTrack(dummyTrack);
      }

      emit('local_stream', this.localStream);

      mediaConn.answer(this.localStream);
      this.currentCall = mediaConn;
      this.incomingCallData = null;

      emit('call_started', {
        role: 'receiver',
        isVideo: activeUseVideo,
        remoteNickname,
      });

      sendJson({
        type: 'call_signal',
        signal: 'accepted',
      });

      mediaConn.on('stream', (remoteStream) => {
        console.log('[ZeroChat] Remote media stream attached on answer');
        this.remoteStream = remoteStream;
        emit('remote_stream', remoteStream);
      });

      mediaConn.on('close', () => {
        this.cleanupCall(emit);
      });

      mediaConn.on('error', (err) => {
        console.error('[ZeroChat] Media call error:', err);
        this.cleanupCall(emit);
      });
    } catch (err) {
      console.error('[ZeroChat] Failed to answer call:', err);
      this.rejectCall(sendJson, emit);
      throw err;
    }
  }

  rejectCall(sendJson, emit) {
    if (this.incomingCallData && this.incomingCallData.mediaConn) {
      try {
        this.incomingCallData.mediaConn.close();
      } catch (e) {}
    }
    this.incomingCallData = null;
    sendJson({
      type: 'call_signal',
      signal: 'rejected',
    });
    emit('call_ended', { reason: 'rejected' });
  }

  endCall(sendJson, emit) {
    sendJson({
      type: 'call_signal',
      signal: 'ended',
    });
    this.cleanupCall(emit);
  }

  cleanupCall(emit) {
    if (this.screenStream) {
      try {
        this.screenStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.screenStream = null;
    }
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      this.localStream = null;
    }
    if (this.currentCall) {
      try {
        this.currentCall.close();
      } catch (e) {}
      this.currentCall = null;
    }
    this.incomingCallData = null;
    this.remoteStream = null;
    this.isScreenSharing = false;
    this.isAudioMuted = false;
    this.isVideoMuted = false;

    emit('call_ended', { reason: 'ended' });
  }

  toggleAudio(emit) {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isAudioMuted = !audioTrack.enabled;
      emit('call_audio_toggle', { isMuted: this.isAudioMuted });
      return this.isAudioMuted;
    }
    return false;
  }

  async toggleVideo(sendJson, emit) {
    if (!this.localStream) return false;
    let videoTrack = this.localStream.getVideoTracks().find(
      (t) => t.label && !t.label.includes('canvas') && t.readyState === 'live'
    );

    // If no real camera video track exists yet (upgraded from audio-only call), acquire camera
    if (!videoTrack) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: this.facingMode },
          audio: false,
        });
        const realTrack = cameraStream.getVideoTracks()[0];
        realTrack.enabled = true;

        // Swap track on WebRTC peer connection
        if (this.currentCall && this.currentCall.peerConnection) {
          const pc = this.currentCall.peerConnection;
          const senders = pc.getSenders();
          const videoSender = senders.find(
            (s) => (s.track && s.track.kind === 'video') || (s.track === null && s.kind === 'video')
          );
          if (videoSender) {
            await videoSender.replaceTrack(realTrack);
          } else {
            pc.addTrack(realTrack, this.localStream);
          }
        }

        // Clean up dummy tracks from localStream
        const oldTracks = this.localStream.getVideoTracks();
        oldTracks.forEach((t) => {
          try { t.stop(); } catch (e) {}
          this.localStream.removeTrack(t);
        });
        this.localStream.addTrack(realTrack);

        this.isVideoMuted = false;
        emit('local_stream', this.localStream);
        emit('call_video_toggle', { isMuted: false, isVideoActive: true });

        sendJson({
          type: 'call_signal',
          signal: 'camera_toggle',
          isVideoActive: true,
        });

        return false;
      } catch (err) {
        console.error('[ZeroChat] Failed to acquire camera on call upgrade:', err);
        return true;
      }
    } else {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoMuted = !videoTrack.enabled;
      emit('call_video_toggle', { isMuted: this.isVideoMuted, isVideoActive: videoTrack.enabled });
      sendJson({
        type: 'call_signal',
        signal: 'camera_toggle',
        isVideoActive: videoTrack.enabled,
      });
      return this.isVideoMuted;
    }
  }

  async startScreenShare(emit) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen sharing is not supported on this device/browser');
    }
    if (!this.currentCall || !this.currentCall.peerConnection) {
      throw new Error('No active call connection');
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      const pc = this.currentCall.peerConnection;
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, this.localStream);
      }

      this.isScreenSharing = true;
      emit('screen_share_status', { isSharing: true, stream: this.screenStream });

      screenTrack.onended = () => {
        this.stopScreenShare(emit);
      };

      return true;
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('[ZeroChat] Screen share error:', err);
      }
      throw err;
    }
  }

  async stopScreenShare(emit) {
    if (!this.isScreenSharing) return;

    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }

      if (this.currentCall && this.currentCall.peerConnection && this.localStream) {
        const cameraTrack = this.localStream.getVideoTracks()[0] || null;
        const pc = this.currentCall.peerConnection;
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }

      this.isScreenSharing = false;
      emit('screen_share_status', { isSharing: false });
    } catch (err) {
      console.warn('[ZeroChat] Error stopping screen share:', err);
      this.isScreenSharing = false;
      emit('screen_share_status', { isSharing: false });
    }
  }

  async switchCamera(emit) {
    if (!this.localStream || !this.currentCall || !this.currentCall.peerConnection) return false;
    try {
      this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: this.facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.facingMode },
          audio: false,
        });
      }

      const newTrack = newStream.getVideoTracks()[0];
      const pc = this.currentCall.peerConnection;
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

      if (videoSender) {
        await videoSender.replaceTrack(newTrack);
      }

      const oldTrack = this.localStream.getVideoTracks()[0];
      if (oldTrack) {
        oldTrack.stop();
        this.localStream.removeTrack(oldTrack);
      }
      this.localStream.addTrack(newTrack);
      emit('local_stream', this.localStream);
      emit('camera_switched', { facingMode: this.facingMode });
      return true;
    } catch (err) {
      console.warn('[ZeroChat] Failed to switch camera:', err);
      return false;
    }
  }

  handleCallSignal(packet, remoteNickname, emit) {
    console.log('[ZeroChat] Call signal received:', packet.signal);
    if (packet.signal === 'offer') {
      emit('call_signal_offer', {
        isVideo: packet.isVideo,
        callerNickname: packet.callerNickname || remoteNickname || 'Peer',
      });
    } else if (packet.signal === 'accepted') {
      emit('call_signal_accepted');
    } else if (packet.signal === 'rejected') {
      emit('call_signal_rejected');
      this.cleanupCall(emit);
    } else if (packet.signal === 'busy') {
      emit('call_signal_busy');
      this.cleanupCall(emit);
    } else if (packet.signal === 'camera_toggle') {
      emit('remote_camera_toggle', { isVideoActive: !!packet.isVideoActive });
    } else if (packet.signal === 'ended') {
      emit('call_signal_ended');
      this.cleanupCall(emit);
    }
  }
}
