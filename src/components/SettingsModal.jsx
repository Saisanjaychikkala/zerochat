/**
 * ZeroChat Settings Modal
 * Theme picker, surface transparency modes, and sound FX toggle.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, VolumeX, Sun, Monitor, Circle, Zap } from 'lucide-react';

const THEMES = [
  { id: 'cyber-cyan',       label: 'Cyber Cyan',      color: '#00f2fe' },
  { id: 'matrix-emerald',   label: 'Emerald',         color: '#00ff88' },
  { id: 'synthwave-purple', label: 'Synthwave',       color: '#f43f5e' },
  { id: 'solar-amber',      label: 'Solar Amber',     color: '#f59e0b' },
  { id: 'crimson-red',      label: 'Crimson',         color: '#ef4444' },
  { id: 'midnight-blue',    label: 'Midnight Blue',   color: '#38bdf8' },
  { id: 'monolith-slate',   label: 'Monolith',        color: '#e2e8f0' },
  { id: 'tokyo-neon',       label: 'Tokyo Neon',      color: '#ff007f' },
];

const SURFACES = [
  { id: 'ultra-glass', label: 'Ultra Glass',     desc: 'Dynamic blur & ambient glow',  icon: <Circle size={15} /> },
  { id: 'solid-dark',  label: 'Solid Dark',      desc: 'High-contrast matte opaque',   icon: <Monitor size={15} /> },
  { id: 'oled-black',  label: 'OLED Pure Black', desc: 'Zero glare, true pitch black', icon: <Sun size={15} /> },
];

export function SettingsModal({
  isOpen,
  onClose,
  currentTheme,
  onSetTheme,
  currentSurface,
  onSetSurface,
  soundEnabled,
  onToggleSound,
  wireBatchingEnabled,
  onToggleWireBatching
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-panel settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button type="button" className="btn btn-icon modal-close" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="settings-body">
          {/* Theme Picker */}
          <section className="settings-section">
            <h3 className="settings-section-label">Accent Theme</h3>
            <div className="theme-card-grid">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`theme-card ${currentTheme === t.id ? 'active' : ''}`}
                  onClick={() => onSetTheme(t.id)}
                  title={t.label}
                >
                  <span className="theme-swatch" style={{ background: t.color }} />
                  <span className="theme-card-label">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Surface / Transparency Mode */}
          <section className="settings-section">
            <h3 className="settings-section-label">Surface Mode</h3>
            <div className="surface-option-list">
              {SURFACES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`surface-option ${currentSurface === s.id ? 'active' : ''}`}
                  onClick={() => onSetSurface(s.id)}
                >
                  <div className="surface-option-text">
                    <span className="surface-option-name">{s.label}</span>
                    <span className="surface-option-desc">{s.desc}</span>
                  </div>
                  <div className="surface-option-right">
                    <span className="surface-option-icon">{s.icon}</span>
                    {currentSurface === s.id && (
                      <span className="surface-active-dot" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Sound FX Toggle */}
          <section className="settings-section">
            <h3 className="settings-section-label">Sound Effects</h3>
            <button
              type="button"
              className={`sound-toggle-btn ${soundEnabled ? 'enabled' : 'disabled'}`}
              onClick={onToggleSound}
            >
              <div className="sound-toggle-left">
                <span className="sound-toggle-name">Sound Effects</span>
                <span className="sound-toggle-desc">
                  {soundEnabled ? 'Procedural Web Audio active' : 'All sound synthesis muted'}
                </span>
              </div>
              <div className="sound-toggle-right">
                <span className="sound-toggle-icon">
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </span>
                <span className={`toggle-pill ${soundEnabled ? 'on' : 'off'}`} />
              </div>
            </button>
          </section>

          {/* Network & Relay Performance */}
          <section className="settings-section">
            <div className="section-label-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 className="settings-section-label" style={{ margin: 0 }}>Network & Relay</h3>
              <span className="recommended-tag" style={{ fontSize: '10px', color: 'var(--accent-cyan)', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', padding: '2px 7px', borderRadius: '12px', fontWeight: 600, letterSpacing: '0.04em' }}>Recommended</span>
            </div>
            <button
              type="button"
              className={`sound-toggle-btn ${wireBatchingEnabled ? 'enabled' : 'disabled'}`}
              onClick={onToggleWireBatching}
              title="Dual-Priority Wire Batching (Recommended for Host Efficiency)"
            >
              <div className="sound-toggle-left">
                <span className="sound-toggle-name">Dual-Priority Wire Batching</span>
                <span className="sound-toggle-desc">
                  {wireBatchingEnabled 
                    ? '25ms tick coalescing for typing & reactions • 0ms instant games' 
                    : 'Direct unbatched delivery for all packets'}
                </span>
              </div>
              <div className="sound-toggle-right">
                <span className="sound-toggle-icon">
                  <Zap size={16} color={wireBatchingEnabled ? 'var(--accent-cyan)' : 'inherit'} />
                </span>
                <span className={`toggle-pill ${wireBatchingEnabled ? 'on' : 'off'}`} />
              </div>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
