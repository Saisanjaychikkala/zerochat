import React from 'react';
import { Radio, ShieldAlert, Lock } from 'lucide-react';

export function SquadStatusOverlays({
  status,
  isHost,
  declineReason,
  squadRoomId,
  passcodeInput,
  setPasscodeInput,
  handlePasscodeSubmit,
  onLeaveSquad
}) {
  return (
    <>
      {/* Passcode Required Prompt */}
      {status === 'passcode_required' && (
        <div className="squad-passcode-prompt">
          <Lock size={20} className="passcode-icon" />
          <p className="passcode-label">This squad requires a passcode to enter.</p>
          <input
            type="password"
            className="passcode-input"
            placeholder="Enter squad passcode"
            value={passcodeInput}
            onChange={e => setPasscodeInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePasscodeSubmit()}
            autoFocus
          />
          <div className="passcode-actions">
            <button type="button" className="btn btn-secondary" onClick={onLeaveSquad}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handlePasscodeSubmit}>Unlock & Join</button>
          </div>
        </div>
      )}

      {/* Status: Knocking */}
      {status === 'knocking' && (
        <div className="squad-status-banner knocking">
          <div className="squad-status-banner-left">
            <Radio size={16} className="animate-spin" />
            <span>Knocking for admission... Waiting for squad host to admit you.</span>
          </div>
          <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">Cancel</button>
        </div>
      )}

      {/* Status: Declined */}
      {status === 'declined' && (
        <div className="squad-status-banner declined">
          <div className="squad-status-banner-left">
            <ShieldAlert size={18} />
            <span>{declineReason || 'Admission was declined by the host.'}</span>
          </div>
          <button type="button" onClick={onLeaveSquad} className="btn btn-danger text-xs">Return Home</button>
        </div>
      )}

      {/* Status: Connecting Loader (Guest) */}
      {status === 'connecting' && !isHost && (
        <div className="squad-status-center">
          <div className="connecting-radar-wrap">
            <div className="connecting-radar-ring" />
            <div className="connecting-radar-ring ring-2" />
            <div className="connecting-radar-core">
              <Radio size={20} color="var(--accent-cyan)" />
            </div>
          </div>
          <h3 className="squad-status-title">Connecting to Squad...</h3>
          <p className="squad-status-body">Reaching out to host at <span className="font-mono text-cyan-400">#{squadRoomId}</span> via WebRTC.</p>
          <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">Cancel Connection</button>
        </div>
      )}

      {/* Status: Initializing Loader (Host) */}
      {status === 'connecting' && isHost && (
        <div className="squad-status-center">
          <div className="connecting-radar-wrap">
            <div className="connecting-radar-ring" />
            <div className="connecting-radar-ring ring-2" />
            <div className="connecting-radar-core">
              <Radio size={20} color="var(--accent-cyan)" />
            </div>
          </div>
          <h3 className="squad-status-title">Initializing Squad Room...</h3>
          <p className="squad-status-body">Starting Baton Pass Star Relay at <span className="font-mono text-cyan-400">#{squadRoomId}</span>.</p>
          <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">Cancel</button>
        </div>
      )}

      {/* Status: Idle */}
      {status === 'idle' && (
        <div className="squad-status-center">
          <div className="connecting-radar-wrap">
            <div className="connecting-radar-ring" />
            <div className="connecting-radar-ring ring-2" />
            <div className="connecting-radar-core">
              <Radio size={20} color="var(--accent-cyan)" />
            </div>
          </div>
          <h3 className="squad-status-title">Preparing Squad Room...</h3>
          <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">Return Home</button>
        </div>
      )}

      {/* Status: Host Unavailable */}
      {status === 'host-unavailable' && (
        <div className="squad-status-center">
          <div className="squad-status-error-icon"><ShieldAlert size={24} color="#f87171" /></div>
          <h3 className="squad-status-title error">Squad Host Unavailable</h3>
          <p className="squad-status-body">Could not find active squad host at #{squadRoomId}. The room may be closed or host is offline.</p>
          <button type="button" onClick={onLeaveSquad} className="btn btn-secondary text-xs">Return to Home Hub</button>
        </div>
      )}
    </>
  );
}
