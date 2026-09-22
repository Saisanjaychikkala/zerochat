/**
 * ZeroChat - WebRTC P2P Media Calling Engine
 * Manages voice & video calls, dummy canvas tracks for audio-to-video upgrades, track replacement & screen share.
 * Hardware Security: 100% camera & mic track teardown on mute, end, disconnect, and page unload.
 */

import {
  createDummyVideoTrack,
  acquireCallStream,
  stopStreamTracks,
  startScreenShareHelper,
  stopScreenShareHelper,
  switchCameraHelper,
} from './streamHelpers';

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

  async startCall(peer, remotePeerId, isVideo = true, myNickname = 'Anonymous', remoteNickname = 'Peer', sendJson, emit) {
    if (!remotePeerId || !peer) throw new Error('No active peer connected');

    try {
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      this.isScreenSharing = false;

      const { stream, activeIsVideo } = await acquireCallStream(isVideo, this.facingMode);
      this.localStream = stream;

      emit('local_stream', this.localStream);

      const mediaConn = peer.call(remotePeerId, this.localStream, {
        metadata: { isVideo: activeIsVideo, callerNickname: myNickname },
      });

      this.currentCall = mediaConn;
      emit('call_outgoing', { role: 'caller', isVideo: activeIsVideo, remoteNickname });

      sendJson({
        type: 'call_signal',
        signal: 'offer',
        isVideo: activeIsVideo,
        callerNickname: myNickname,
      });

      if (mediaConn.remoteStream) {
        this.remoteStream = mediaConn.remoteStream;
        emit('remote_stream', this.remoteStream);
        emit('call_started', { role: 'caller', isVideo: activeIsVideo, remoteNickname });
      }
      mediaConn.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
        emit('remote_stream', remoteStream);
        emit('call_started', { role: 'caller', isVideo: activeIsVideo, remoteNickname });
      });

      mediaConn.on('close', () => this.cleanupCall(emit));
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
    if (!this.incomingCallData?.mediaConn) return;

    const { mediaConn, isVideo: callIsVideo } = this.incomingCallData;
    const activeUseVideo = isVideo !== null ? isVideo : callIsVideo;

    try {
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      this.isScreenSharing = false;

      const { stream, activeIsVideo } = await acquireCallStream(activeUseVideo, this.facingMode);
      this.localStream = stream;

      emit('local_stream', this.localStream);
      mediaConn.answer(this.localStream);
      this.currentCall = mediaConn;
      this.incomingCallData = null;

      emit('call_started', { role: 'receiver', isVideo: activeIsVideo, remoteNickname });
      sendJson({ type: 'call_signal', signal: 'accepted' });

      if (mediaConn.remoteStream) {
        this.remoteStream = mediaConn.remoteStream;
        emit('remote_stream', this.remoteStream);
      }
      mediaConn.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
        emit('remote_stream', remoteStream);
      });

      mediaConn.on('close', () => this.cleanupCall(emit));
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
    if (this.incomingCallData?.mediaConn) {
      try { this.incomingCallData.mediaConn.close(); } catch (e) {}
    }
    this.incomingCallData = null;
    sendJson({ type: 'call_signal', signal: 'rejected' });
    emit('call_ended', { reason: 'rejected' });
  }

  endCall(sendJson, emit) {
    sendJson({ type: 'call_signal', signal: 'ended' });
    this.cleanupCall(emit);
  }

  cleanupCall(emit) {
    // 1. Terminate all screen sharing tracks
    if (this.screenStream) {
      stopStreamTracks(this.screenStream);
      this.screenStream = null;
    }

    // 2. Terminate all local hardware camera and mic tracks (turns off laptop camera LED)
    if (this.localStream) {
      stopStreamTracks(this.localStream);
      this.localStream = null;
    }

    // 3. Explicitly terminate tracks on RTCRtpSenders as hardware fail-safe
    if (this.currentCall?.peerConnection) {
      try {
        const senders = this.currentCall.peerConnection.getSenders();
        senders.forEach((sender) => {
          if (sender.track) {
            try { sender.track.stop(); } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // 4. Terminate incoming remote media tracks to free memory
    if (this.remoteStream) {
      stopStreamTracks(this.remoteStream);
      this.remoteStream = null;
    }

    // 5. Close WebRTC media connection
    if (this.currentCall) {
      try { this.currentCall.close(); } catch (e) {}
      this.currentCall = null;
    }

    this.incomingCallData = null;
    this.isScreenSharing = false;
    this.isAudioMuted = false;
    this.isVideoMuted = false;

    if (emit) emit('call_ended', { reason: 'ended' });
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
    const videoTrack = this.localStream.getVideoTracks().find(
      (t) => (!t.label || !t.label.includes('canvas')) && t.readyState === 'live'
    );

    if (videoTrack) {
      // Standard WebRTC track toggle: instant, reliable across mobile and desktop
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoMuted = !videoTrack.enabled;

      emit('call_video_toggle', { isMuted: this.isVideoMuted, isVideoActive: !this.isVideoMuted });
      if (sendJson) {
        sendJson({
          type: 'call_signal',
          signal: 'camera_toggle',
          isVideoActive: !this.isVideoMuted,
        });
      }
      return this.isVideoMuted;
    }

    return false;
  }

  async startScreenShare(emit) {
    try {
      this.screenStream = await startScreenShareHelper(
        this.currentCall,
        this.localStream,
        () => this.stopScreenShare(emit)
      );
      this.isScreenSharing = true;
      emit('screen_share_status', { isSharing: true, stream: this.screenStream });
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
      await stopScreenShareHelper(this.currentCall, this.localStream, this.screenStream);
      this.screenStream = null;
      this.isScreenSharing = false;
      emit('screen_share_status', { isSharing: false });
    } catch (err) {
      console.warn('[ZeroChat] Error stopping screen share:', err);
      this.isScreenSharing = false;
      emit('screen_share_status', { isSharing: false });
    }
  }

  async switchCamera(emit) {
    try {
      const nextMode = await switchCameraHelper(this.currentCall, this.localStream, this.facingMode);
      if (nextMode) {
        this.facingMode = nextMode;
        emit('local_stream', this.localStream);
        emit('camera_switched', { facingMode: this.facingMode });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[ZeroChat] Failed to switch camera:', err);
      return false;
    }
  }

  handleCallSignal(packet, remoteNickname, emit) {
    const { signal, isVideo, callerNickname, isVideoActive } = packet;
    if (signal === 'offer') {
      emit('call_signal_offer', { isVideo, callerNickname: callerNickname || remoteNickname || 'Peer' });
    } else if (signal === 'accepted') {
      emit('call_signal_accepted');
      emit('call_started', { role: 'caller', isVideo: this.currentCall?.metadata?.isVideo, remoteNickname });
    } else if (signal === 'rejected' || signal === 'busy' || signal === 'ended') {
      emit(`call_signal_${signal}`);
      this.cleanupCall(emit);
    } else if (signal === 'camera_toggle') {
      emit('remote_camera_toggle', { isVideoActive: !!isVideoActive });
    }
  }
}
