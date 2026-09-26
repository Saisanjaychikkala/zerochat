import { useState, useEffect, useCallback, useRef } from 'react';
import { peerService } from '../services/peerService';
import { playSound, startRingtone, startOutgoingRingtone } from '../utils/soundEffects';
import { stopStreamTracks } from '../services/webrtc/streamHelpers';

export function useCallSession({ status, remoteNickname, soundEnabled, showToast }) {
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'incoming' | 'calling' | 'connected'
    role: null, // 'caller' | 'receiver'
    isVideo: true,
    remoteNickname: 'Peer',
    localStream: null,
    remoteStream: null,
    isScreenSharing: false,
    isAudioMuted: false,
    isVideoMuted: false,
    isRemoteCameraActive: false,
    durationSec: 0,
  });

  const ringtoneStopRef = useRef(null);
  const callTimerRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const stopActiveRingtones = useCallback(() => {
    if (ringtoneStopRef.current) {
      ringtoneStopRef.current();
      ringtoneStopRef.current = null;
    }
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState.status === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallState((prev) => ({ ...prev, durationSec: prev.durationSec + 1 }));
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState.status]);

  // Silence ringtone immediately if user mutes sound
  useEffect(() => {
    if (!soundEnabled) {
      stopActiveRingtones();
    }
  }, [soundEnabled, stopActiveRingtones]);

  useEffect(() => {
    const unsubCallIncoming = peerService.on('call_incoming', ({ callerNickname, isVideo }) => {
      // Deterministic Call Glare Resolution: if outgoing call already pending, auto-reconcile
      setCallState((prev) => {
        if (prev.status === 'calling') {
          stopActiveRingtones();
          try {
            peerService.endCall();
          } catch (e) {}
          if (showToast) {
            showToast('Simultaneous call! Both of you dialed at the same second. Use Nudge (🔔) to coordinate.', 'warning');
          }
          return {
            status: 'idle',
            role: null,
            isVideo: true,
            remoteNickname: callerNickname || 'Peer',
            localStream: null,
            remoteStream: null,
            isScreenSharing: false,
            isAudioMuted: false,
            isVideoMuted: false,
            isRemoteCameraActive: false,
            durationSec: 0,
          };
        }

        stopActiveRingtones();
        ringtoneStopRef.current = startRingtone(soundEnabledRef.current);
        return {
          status: 'incoming',
          role: 'receiver',
          isVideo,
          remoteNickname: callerNickname || 'Peer',
          localStream: null,
          remoteStream: null,
          isScreenSharing: false,
          isAudioMuted: false,
          isVideoMuted: false,
          isRemoteCameraActive: false,
          durationSec: 0,
        };
      });
    });

    const unsubPeerNudge = peerService.on('peer_nudge', ({ message, senderNickname }) => {
      playSound('pop', soundEnabledRef.current);
      if (showToast) {
        showToast(`🔔 ${senderNickname || 'Peer'}: ${message || 'Calling you soon!'}`, 'info');
      }
    });

    const unsubCallStarted = peerService.on('call_started', ({ role, isVideo: callIsVideo, remoteNickname: callerNick }) => {
      stopActiveRingtones();
      setCallState((prev) => ({
        ...prev,
        status: 'connected',
        role: role || prev.role,
        isVideo: callIsVideo !== undefined ? callIsVideo : prev.isVideo,
        remoteNickname: callerNick || prev.remoteNickname,
      }));
    });

    const unsubLocalStream = peerService.on('local_stream', (stream) => {
      setCallState((prev) => ({ ...prev, localStream: stream }));
    });

    const unsubRemoteStream = peerService.on('remote_stream', (stream) => {
      stopActiveRingtones();
      playSound('call_start', soundEnabledRef.current);
      setCallState((prev) => ({
        ...prev,
        status: 'connected',
        remoteStream: stream,
      }));
    });

    const unsubCallEnded = peerService.on('call_ended', ({ reason }) => {
      stopActiveRingtones();
      playSound('call_end', soundEnabledRef.current);
      if (reason === 'rejected') {
        if (showToast) showToast('Call declined', 'info');
      } else {
        if (showToast) showToast('Call ended', 'info');
      }
      setCallState((prev) => {
        if (prev.localStream) {
          stopStreamTracks(prev.localStream);
        }
        if (prev.remoteStream) {
          stopStreamTracks(prev.remoteStream);
        }
        return {
          status: 'idle',
          role: null,
          isVideo: true,
          remoteNickname: 'Peer',
          localStream: null,
          remoteStream: null,
          isScreenSharing: false,
          isAudioMuted: false,
          isVideoMuted: false,
          isRemoteCameraActive: false,
          durationSec: 0,
        };
      });
    });

    const unsubCallAudioToggle = peerService.on('call_audio_toggle', ({ isMuted }) => {
      setCallState((prev) => ({ ...prev, isAudioMuted: isMuted }));
    });

    const unsubCallVideoToggle = peerService.on('call_video_toggle', ({ isMuted }) => {
      setCallState((prev) => ({ ...prev, isVideoMuted: isMuted }));
    });

    const unsubScreenShareStatus = peerService.on('screen_share_status', ({ isSharing }) => {
      setCallState((prev) => ({ ...prev, isScreenSharing: isSharing }));
    });

    const unsubCallBusy = peerService.on('call_signal_busy', () => {
      stopActiveRingtones();
      if (showToast) showToast('Peer is currently busy on another call', 'warning');
    });

    const unsubRemoteCameraToggle = peerService.on('remote_camera_toggle', ({ isVideoActive }) => {
      setCallState((prev) => ({
        ...prev,
        isRemoteCameraActive: isVideoActive,
      }));
      if (isVideoActive && showToast) {
        showToast('Peer enabled their camera', 'info');
      }
    });

    return () => {
      stopActiveRingtones();
      unsubCallIncoming();
      unsubPeerNudge();
      unsubCallStarted();
      unsubLocalStream();
      unsubRemoteStream();
      unsubCallEnded();
      unsubCallAudioToggle();
      unsubCallVideoToggle();
      unsubScreenShareStatus();
      unsubCallBusy();
      unsubRemoteCameraToggle();
      try {
        peerService.endCall();
      } catch (e) {}
    };
  }, [showToast, stopActiveRingtones]);

  const handleStartCall = useCallback(async (isVideo = true) => {
    if (status !== 'connected') {
      if (showToast) showToast('Please wait until connected to peer', 'warning');
      return;
    }
    stopActiveRingtones();
    ringtoneStopRef.current = startOutgoingRingtone(soundEnabledRef.current);

    setCallState({
      status: 'calling',
      role: 'caller',
      isVideo,
      remoteNickname: remoteNickname || 'Peer',
      localStream: null,
      remoteStream: null,
      isScreenSharing: false,
      isAudioMuted: false,
      isVideoMuted: false,
      isRemoteCameraActive: false,
      durationSec: 0,
    });

    try {
      await peerService.startCall(isVideo);
    } catch (err) {
      stopActiveRingtones();
      setCallState((prev) => ({ ...prev, status: 'idle' }));
      if (showToast) showToast(err.message || 'Could not start call (check mic/camera permissions)', 'error');
    }
  }, [status, remoteNickname, showToast, stopActiveRingtones]);

  const handleAnswerCall = useCallback(async (isVideo = null) => {
    stopActiveRingtones();
    setCallState((prev) => ({
      ...prev,
      status: 'connected',
      role: 'receiver',
    }));
    try {
      await peerService.answerCall(isVideo);
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not answer call', 'error');
    }
  }, [showToast, stopActiveRingtones]);

  const handleRejectCall = useCallback(() => {
    stopActiveRingtones();
    peerService.rejectCall();
  }, [stopActiveRingtones]);

  const handleEndCall = useCallback(() => {
    stopActiveRingtones();
    peerService.endCall();
  }, [stopActiveRingtones]);

  const handleToggleAudio = useCallback(() => {
    peerService.toggleAudio();
  }, []);

  const handleToggleVideo = useCallback(async () => {
    await peerService.toggleVideo();
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (callState.isScreenSharing) {
      await peerService.stopScreenShare();
    } else {
      try {
        await peerService.startScreenShare();
      } catch (err) {
        if (err.name !== 'NotAllowedError' && showToast) {
          showToast('Could not share screen: ' + err.message, 'error');
        }
      }
    }
  }, [callState.isScreenSharing, showToast]);

  const handleSwitchCamera = useCallback(async () => {
    await peerService.switchCamera();
  }, []);

  const handleSendNudge = useCallback((customMsg = null) => {
    if (status !== 'connected') {
      if (showToast) showToast('Connect with a peer to send a call ping', 'warning');
      return;
    }
    const text = customMsg || "I'm calling you in 5s! Stay ready.";
    peerService.sendNudge(text);
    playSound('pop', soundEnabledRef.current);
    if (showToast) showToast(`Call ping sent: "${text}"`, 'success');
  }, [status, showToast]);

  return {
    callState,
    setCallState,
    handleStartCall,
    handleAnswerCall,
    handleRejectCall,
    handleEndCall,
    handleToggleAudio,
    handleToggleVideo,
    handleToggleScreenShare,
    handleSwitchCamera,
    handleSendNudge,
    stopActiveRingtones,
  };
}
