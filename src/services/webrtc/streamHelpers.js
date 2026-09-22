/**
 * ZeroChat - WebRTC Stream Helpers
 * Helper utilities for track management, dummy canvas track creation, screen share, and camera switching.
 */

/**
 * Creates a lightweight 2x2 canvas video track.
 * Used to establish m=video in SDP during audio-only calls, enabling seamless mid-call camera upgrades.
 */
export function createDummyVideoTrack() {
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

/**
 * Acquires local media stream with automatic audio-only fallback if video camera is unavailable.
 */
export async function acquireCallStream(isVideo, facingMode = 'user') {
  const constraints = {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode } : false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream, activeIsVideo: isVideo };
  } catch (mediaErr) {
    if (isVideo) {
      console.warn('[ZeroChat] Video acquisition failed, falling back to audio-only call:', mediaErr);
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      return { stream: fallbackStream, activeIsVideo: false };
    }
    throw mediaErr;
  }
}

/**
 * Stops all audio and video tracks in a MediaStream.
 * @param {MediaStream|null} stream 
 */
export function stopStreamTracks(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.warn('[ZeroChat] Error stopping media track:', e);
      }
    });
  } catch (e) {
    console.warn('[ZeroChat] Error iterating stream tracks:', e);
  }
}

/**
 * Detects if screen sharing is supported in the current environment.
 * Restricted to desktop and laptop environments (excluded on mobile devices).
 */
export function isScreenShareSupported() {
  const isMobile = typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  return !isMobile && 
    typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

/**
 * Clamp a zoom scale between minimum and maximum bounds.
 * @param {number} scale 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function clampZoomScale(scale, min = 1.0, max = 4.0) {
  return Math.min(Math.max(scale, min), max);
}

/**
 * Start screen share and replace video sender track on active call.
 */
export async function startScreenShareHelper(currentCall, localStream, onEnded) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen sharing is not supported on this device/browser');
  }
  if (!currentCall || !currentCall.peerConnection) {
    throw new Error('No active call connection');
  }

  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: false,
  });

  const screenTrack = screenStream.getVideoTracks()[0];
  const pc = currentCall.peerConnection;
  const senders = pc.getSenders();
  const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

  if (videoSender) {
    await videoSender.replaceTrack(screenTrack);
  } else {
    pc.addTrack(screenTrack, localStream);
  }

  screenTrack.onended = onEnded;
  return screenStream;
}

/**
 * Stop screen share and restore original camera track.
 */
export async function stopScreenShareHelper(currentCall, localStream, screenStream) {
  if (screenStream) {
    stopStreamTracks(screenStream);
  }

  if (currentCall && currentCall.peerConnection && localStream) {
    const cameraTrack = localStream.getVideoTracks()[0] || null;
    const pc = currentCall.peerConnection;
    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

    if (videoSender) {
      await videoSender.replaceTrack(cameraTrack);
    }
  }
}

/**
 * Switch camera between user and environment modes.
 */
export async function switchCameraHelper(currentCall, localStream, facingMode) {
  if (!localStream || !currentCall || !currentCall.peerConnection) return null;
  const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
  let newStream;
  try {
    newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: newFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacingMode },
      audio: false,
    });
  }

  const newTrack = newStream.getVideoTracks()[0];
  const pc = currentCall.peerConnection;
  const senders = pc.getSenders();
  const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

  if (videoSender) {
    await videoSender.replaceTrack(newTrack);
  }

  const oldTrack = localStream.getVideoTracks()[0];
  if (oldTrack) {
    oldTrack.stop();
    localStream.removeTrack(oldTrack);
  }
  localStream.addTrack(newTrack);
  return newFacingMode;
}
