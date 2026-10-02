import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Smile, 
  Mic, 
  X, 
  Radio, 
  ShieldAlert, 
  LogOut, 
  Check, 
  Lock 
} from 'lucide-react';
import { GroupHeaderBar } from './GroupHeaderBar';
import { CompactStreamMessage } from './CompactStreamMessage';
import { MemberDrawer } from './MemberDrawer';
import { voiceRecorder } from '../../utils/voiceRecorder';

export function GroupChatWorkspace({
  squadRoomId,
  isHost,
  currentHostId,
  designatedSuccessorId,
  status,
  declineReason,
  members,
  pendingKnocks,
  messages,
  latency,
  isLocked,
  isDrawerOpen,
  myPeerId,
  onToggleDrawer,
  onCloseDrawer,
  onSendMessage,
  onSendVoice,
  onSendReaction,
  onAdmitKnocker,
  onDeclineKnocker,
  onPassBaton,
  onSetSuccessor,
  onToggleLock,
  onLeaveSquad
}) {
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef(null);
  const streamBottomRef = useRef(null);

  useEffect(() => {
    streamBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), replyTarget);
    setInputText('');
    setReplyTarget(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const startVoiceRecording = async () => {
    try {
      await voiceRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopAndSendVoice = async () => {
    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    try {
      const { file, durationSec } = await voiceRecorder.stop();
      const reader = new FileReader();
      reader.onload = () => {
        onSendVoice(reader.result, durationSec);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[GroupChat] Voice error:', err);
    }
  };

  const cancelVoice = () => {
    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    voiceRecorder.cancel();
  };

  const isConnected = status === 'connected';

  return (
    <div className="squad-layout-container">
      <div className="squad-main-feed">
        {/* Header */}
        <GroupHeaderBar
          squadRoomId={squadRoomId}
          memberCount={members.length}
          isHost={isHost}
          latency={latency}
          onToggleDrawer={onToggleDrawer}
          onLeaveSquad={onLeaveSquad}
        />

        {/* Status Overlays */}
        {status === 'knocking' && (
          <div style={{ background: 'rgba(0, 242, 254, 0.08)', borderBottom: '1px solid var(--border-subtle)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} className="animate-spin text-cyan-400" />
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                Knocking for admission... Waiting for squad host to admit you.
              </span>
            </div>
            <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">
              Cancel
            </button>
          </div>
        )}

        {status === 'declined' && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.4)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#f87171" />
              <span style={{ fontSize: '0.88rem', color: '#f87171', fontWeight: 600 }}>
                {declineReason || 'Admission was declined by the host.'}
              </span>
            </div>
            <button type="button" onClick={onLeaveSquad} className="btn btn-danger text-xs">
              Return Home
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="squad-stream-scroll">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', margin: 'auto', maxWidth: '360px', padding: '24px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Radio size={22} color="var(--accent-cyan)" />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Welcome to the Squad!</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Zero servers, zero database. Messages are relayed peer-to-peer using the Baton Pass Star Topology.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <CompactStreamMessage
              key={msg.id}
              msg={msg}
              myPeerId={myPeerId}
              hostPeerId={currentHostId}
              coHostPeerId={designatedSuccessorId}
              onReply={(m) => setReplyTarget(m)}
              onReact={onSendReaction}
            />
          ))}
          <div ref={streamBottomRef} />
        </div>

        {/* Reply Preview Dock */}
        {replyTarget && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)', padding: '6px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <div>
              Replying to <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{replyTarget.author}</span>: {replyTarget.text?.slice(0, 50)}
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} className="btn btn-icon" style={{ width: '22px', height: '22px' }}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '12px 16px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)' }}>
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '8px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="record-dot animate-ping" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87171' }}>
                  Recording audio... {recordSeconds}s
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={cancelVoice} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="button" onClick={stopAndSendVoice} className="btn btn-primary text-xs" style={{ background: 'var(--accent-emerald)' }}>
                  Send Voice Note
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={startVoiceRecording}
                disabled={!isConnected}
                className="btn btn-icon"
                title="Record Voice Note"
                style={{ width: '40px', height: '40px', flexShrink: 0 }}
              >
                <Mic size={17} />
              </button>

              <input
                type="text"
                placeholder={isConnected ? `Message #${squadRoomId?.replace(/^squad-/, '') || 'squad'}...` : 'Connecting to squad...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isConnected}
                className="chat-input"
                style={{ flex: 1, height: '40px' }}
              />

              <button
                type="submit"
                disabled={!isConnected || !inputText.trim()}
                className="btn btn-primary"
                style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', flexShrink: 0 }}
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Member Drawer */}
      <MemberDrawer
        isOpen={isDrawerOpen}
        onClose={onCloseDrawer}
        isHost={isHost}
        myPeerId={myPeerId}
        currentHostId={currentHostId}
        designatedSuccessorId={designatedSuccessorId}
        members={members}
        pendingKnocks={pendingKnocks}
        isLocked={isLocked}
        squadRoomId={squadRoomId}
        onAdmitKnocker={onAdmitKnocker}
        onDeclineKnocker={onDeclineKnocker}
        onPassBaton={onPassBaton}
        onSetSuccessor={onSetSuccessor}
        onToggleLock={onToggleLock}
      />
    </div>
  );
}
