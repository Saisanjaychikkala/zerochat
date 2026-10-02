import React from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  PlusCircle, 
  AppWindow, 
  Smartphone, 
  Sparkles 
} from 'lucide-react';

/**
 * ConnectionDiagnosticCard - Friendly Network & Firewall Fallback
 * 
 * Displayed when STUN NAT-traversal is blocked by strict symmetric firewalls
 * or when the peer link has expired/timed out. Provides non-technical, human guidance.
 */
export default function ConnectionDiagnosticCard({
  onRetry,
  onCreateNewRoom,
  isRetrying = false,
  reason,
}) {
  return (
    <div className="diagnostic-card" role="alert" aria-live="assertive">
      {/* Friendly Glowing Shield Icon */}
      <div className="diagnostic-icon-wrapper" aria-hidden="true">
        <ShieldAlert size={34} color="#f59e0b" />
      </div>

      {/* Main Human-Friendly Heading */}
      <h3 className="diagnostic-title">Couldn't connect to your friend</h3>

      {/* Reassuring Subtitle */}
      <p className="diagnostic-sub">
        A direct connection couldn't be established. Most often caused by strict network firewalls or the room link expiring.
      </p>

      {/* 3 Actionable Guidance Cards */}
      <div className="diagnostic-tips-grid">
        <div className="diagnostic-tip-item">
          <div className="diagnostic-tip-icon-box">
            <AppWindow size={18} />
          </div>
          <div className="diagnostic-tip-text">
            <span className="diagnostic-tip-title">Check if both tabs are open</span>
            <span className="diagnostic-tip-desc">Both you and your friend must have ZeroChat active on screen.</span>
          </div>
        </div>

        <div className="diagnostic-tip-item">
          <div className="diagnostic-tip-icon-box">
            <Smartphone size={18} />
          </div>
          <div className="diagnostic-tip-text">
            <span className="diagnostic-tip-title">Try mobile data or different Wi-Fi</span>
            <span className="diagnostic-tip-desc">Switching networks instantly bypasses restrictive router firewalls.</span>
          </div>
        </div>

        <div className="diagnostic-tip-item">
          <div className="diagnostic-tip-icon-box">
            <Sparkles size={18} />
          </div>
          <div className="diagnostic-tip-text">
            <span className="diagnostic-tip-title">Try creating a fresh room</span>
            <span className="diagnostic-tip-desc">Start a fresh 3-word code if the previous room session expired.</span>
          </div>
        </div>
      </div>

      {/* Clear Call-To-Action Buttons */}
      <div className="diagnostic-actions">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="diagnostic-btn-primary"
            disabled={isRetrying}
            title="Attempt WebRTC connection handshake again"
          >
            <RefreshCw size={15} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Retrying Link...' : 'Try Connecting Again'}</span>
          </button>
        )}

        {onCreateNewRoom && (
          <button
            type="button"
            onClick={onCreateNewRoom}
            className="diagnostic-btn-secondary"
            title="Generate a brand new private room"
          >
            <PlusCircle size={15} />
            <span>Create New Room</span>
          </button>
        )}
      </div>
    </div>
  );
}
