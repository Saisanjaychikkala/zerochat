/**
 * ZeroChat - WebRTC P2P Media Calling Engine
 * Manages voice & video calls, dummy canvas tracks for audio-to-video upgrades, track replacement & screen share.
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

      // Attach dummy video track so m=video is negotiated in SDP for audio calls
      if (!activeIsVideo) {
        const dummyTrack = createDummyVideoTrack();
        if (dummyTrack) this.localStream.addTrack(dummyTrack);
      }

      emit('local_stream', this.localStream);

      const mediaConn = peer.call(remotePeerId, this.localStream, {
        metadata: { isVideo: activeIsVideo, callerNickname: myNickname },
      });

      this.currentCall = mediaConn;
      emit('call_started', { role: 'caller', isVideo: activeIsVideo, remoteNickname });

      sendJson({
        type: 'call_signal',
        signal: 'offer',
        isVideo: activeIsVideo,
        callerNickname: myNickname,
      });

      mediaConn.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
        emit('remote_stream', remoteStream);
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

      if (!activeIsVideo) {
        const dummyTrack = createDummyVideoTrack();
        if (dummyTrack) this.localStream.addTrack(dummyTrack);
      }

      emit('local_stream', this.localStream);
      mediaConn.answer(this.localStream);
      this.currentCall = mediaConn;
      this.incomingCallData = null;

      emit('call_started', { role: 'receiver', isVideo: activeIsVideo, remoteNickname });
      sendJson({ type: 'call_signal', signal: 'accepted' });

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
    if (this.screenStream) {
      stopStreamTracks(this.screenStream);
      this.screenStream = null;
    }
    if (this.localStream) {
      stopStreamTracks(this.localStream);
      this.localStream = null;
    }
    if (this.currentCall) {
      try { this.currentCall.close(); } catch (e) {}
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

    if (!videoTrack) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: this.facingMode },
          audio: false,
        });
        const realTrack = cameraStream.getVideoTracks()[0];
        realTrack.enabled = true;

        if (this.currentCall?.peerConnection) {
          const pc = this.currentCall.peerConnection;
          const senders = pc.getSenders();
          let videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (!videoSender && pc.getTransceivers) {
            const transceiver = pc.getTransceivers().find(
              (t) => (t.receiver?.track?.kind === 'video') || (t.sender?.track?.kind === 'video')
            );
            if (transceiver) {
              videoSender = transceiver.sender;
              if (transceiver.direction !== 'sendrecv') transceiver.direction = 'sendrecv';
            }
          }

          if (videoSender) {
            await videoSender.replaceTrack(realTrack);
          } else {
            pc.addTrack(realTrack, this.localStream);
          }
        }

        const oldTracks = this.localStream.getVideoTracks();
        oldTracks.forEach((t) => {
          try { t.stop(); } catch (e) {}
          this.localStream.removeTrack(t);
        });
        this.localStream.addTrack(realTrack);

        this.isVideoMuted = false;
        emit('local_stream', this.localStream);
        emit('call_video_toggle', { isMuted: false, isVideoActive: true });
        sendJson({ type: 'call_signal', signal: 'camera_toggle', isVideoActive: true });
        return false;
      } catch (err) {
        console.error('[ZeroChat] Failed to acquire camera on call upgrade:', err);
        return true;
      }
    } else {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoMuted = !videoTrack.enabled;
      emit('call_video_toggle', { isMuted: this.isVideoMuted, isVideoActive: videoTrack.enabled });
      sendJson({ type: 'call_signal', signal: 'camera_toggle', isVideoActive: videoTrack.enabled });
      return this.isVideoMuted;
    }
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
