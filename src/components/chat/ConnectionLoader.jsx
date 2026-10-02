import React from 'react';
import { Copy, Check, X } from 'lucide-react';

/**
 * ConnectionLoader - Minimalist Cyber-Orb Connection State
 * 
 * Delivers a calm, non-intimidating loading experience while WebRTC
 * discovers reflexive STUN addresses and establishes the direct P2P socket.
 */
export default function ConnectionLoader({
  inviteUrl,
  onCopyLink,
  copied = false,
  onCancel,
}) {
  return (
    <div className="orbital-loader-card" role="status" aria-live="polite">
      {/* Concentric Orbital Rings & Photon */}
      <div className="orbital-stage" aria-hidden="true">
        <div className="orbital-ring orbital-ring-outer" />
        <div className="orbital-ring orbital-ring-mid" />
        <div className="orbital-ring orbital-ring-inner" />
        <div className="orbital-particle-track">
          <div className="orbital-photon" />
        </div>
        <div className="orbital-core-dot" />
      </div>

      {/* Main Friendly Heading */}
      <h3 className="orbital-title">Connecting with your friend</h3>

      {/* Reassuring Status Pill */}
      <div className="orbital-status-badge">
        <span className="orbital-status-dot" />
        <span>Securing direct channel</span>
      </div>

      {/* Shimmering Animated Gradient Bar */}
      <div className="orbital-progress-track" aria-hidden="true">
        <div className="orbital-progress-fill" />
      </div>

      {/* Human-Centric Micro-copy */}
      <p className="orbital-reassurance">
        Zero servers involved. Connecting directly device-to-device.
      </p>

      {/* Clean Secondary Action Buttons */}
      <div className="orbital-actions">
        {onCopyLink && (
          <button
            type="button"
            onClick={onCopyLink}
            className="orbital-btn-ghost"
            title="Copy room link to share"
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="orbital-btn-ghost"
            title="Cancel and start a new room"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
}
