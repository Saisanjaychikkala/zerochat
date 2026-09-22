import React, { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Video, ShieldCheck, Radio } from 'lucide-react';

export default function IncomingCallDialog({
  status, // 'incoming' | 'calling'
  remoteNickname,
  isVideo,
  localStream,
  onAccept,
  onAnswer,
  onReject,
  onEndCall,
}) {
  const localPreviewRef = useRef(null);

  useEffect(() => {
    if (localPreviewRef.current) {
      if (localStream && isVideo) {
        localPreviewRef.current.srcObject = localStream;
      } else {
        localPreviewRef.current.srcObject = null;
      }
    }
  }, [localStream, isVideo]);

  const avatarLetter = remoteNickname ? remoteNickname.substring(0, 1).toUpperCase() : 'P';
  const handleAnswer = onAccept || onAnswer;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content call-incoming-dialog" style={{ maxWidth: '380px', textAlign: 'center' }}>
        {/* Pulsing Avatar Ring */}
        <div className="incoming-avatar-ring">
          <div className={`call-avatar-pulse ${status === 'calling' ? 'outgoing' : ''}`} />
          <div className="call-avatar-inner">{avatarLetter}</div>
        </div>

        {/* Peer Info */}
        <div style={{ margin: '14px 0 6px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
            {remoteNickname || 'Peer'}
          </h3>
          <p style={{
            fontSize: '0.84rem',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '4px',
          }}>
            {status === 'incoming' ? (
              <>
                {isVideo ? <Video size={16} /> : <Phone size={16} />}
                <span>Incoming {isVideo ? 'Video' : 'Voice'} Call...</span>
              </>
            ) : (
              <>
                <Radio size={16} className="animate-pulse" />
                <span>Calling... Waiting for answer</span>
              </>
            )}
          </p>
        </div>

        {/* E2E Security Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          marginBottom: '18px',
        }}>
          <ShieldCheck size={14} color="var(--accent-emerald)" />
          <span>P2P Encrypted • Direct Device Link</span>
        </div>

        {/* Local Video Preview for outgoing video calls */}
        {status === 'calling' && isVideo && localStream && (
          <div className="calling-pip-preview">
            <video
              ref={localPreviewRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Action Buttons */}
        {status === 'incoming' ? (
          <div className="incoming-call-actions">
            <button
              type="button"
              onClick={onReject}
              className="btn btn-call-decline"
              title="Decline Call"
            >
              <PhoneOff size={22} />
              <span>Decline</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (handleAnswer) handleAnswer(isVideo);
              }}
              className="btn btn-call-accept"
              title="Answer Call"
            >
              {isVideo ? <Video size={22} /> : <Phone size={22} />}
              <span>Accept</span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={onEndCall}
              className="btn btn-call-decline"
              style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            >
              <PhoneOff size={20} />
              <span>Cancel Call</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
