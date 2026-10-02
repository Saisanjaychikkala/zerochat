/**
 * ZeroChat Settings Modal
 * Theme picker, surface transparency modes, and sound FX toggle.
 */
import React from 'react';
import { X, Volume2, VolumeX, Sun, Monitor, Circle } from 'lucide-react';

const THEMES = [
  { id: 'cyber-cyan',       label: 'Cyber Cyan',      color: '#00e5ff' },
  { id: 'solar-amber',      label: 'Solar Amber',     color: '#ffb300' },
  { id: 'matrix-emerald',   label: 'Matrix Emerald',  color: '#00e676' },
  { id: 'synthwave-purple', label: 'Synthwave',       color: '#d500f9' },
  { id: 'crimson-red',      label: 'Crimson',         color: '#ff1744' },
];

const SURFACES = [
  { id: 'ultra-glass', label: 'Ultra Glass',    desc: 'Dynamic backdrop blur', icon: <Circle size={14} /> },
  { id: 'solid-dark',  label: 'Solid Dark',     desc: 'High-contrast opaque',  icon: <Monitor size={14} /> },
  { id: 'oled-black',  label: 'OLED Pure Black', desc: 'Zero glare, battery saver', icon: <Sun size={14} /> },
];

export function SettingsModal({
  isOpen,
  onClose,
  currentTheme,
  onSetTheme,
  currentSurface,
  onSetSurface,
  soundEnabled,
  onToggleSound
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className="modal-panel settings-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button type="button" className="btn btn-icon modal-close" onClick={onClose}>
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
                  <span className="surface-option-icon">{s.icon}</span>
                  <span className="surface-option-text">
                    <span className="surface-option-name">{s.label}</span>
                    <span className="surface-option-desc">{s.desc}</span>
                  </span>
                  {currentSurface === s.id && (
                    <span className="surface-active-dot" />
                  )}
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
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? 'Sound Effects On' : 'Sound Effects Off'}</span>
              <span className={`toggle-pill ${soundEnabled ? 'on' : 'off'}`} />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
