import { useState, useEffect } from 'react';
import { peerService } from '../services/peerService';
import { groupRelayEngine } from '../services/webrtc/groupRelayEngine';
import { getClientProfile, getClientId, getDiscriminatorTag } from '../services/identity';

export function usePreferences(showToast) {
  const [clientProfile] = useState(() => getClientProfile());
  const [myNickname, setMyNickname] = useState(() => {
    return localStorage.getItem('zerochat_nickname') || 'User-' + Math.floor(100 + Math.random() * 900);
  });

  const [myAvatarBg, setMyAvatarBg] = useState(() => {
    return localStorage.getItem('zerochat_avatar_bg') || 'linear-gradient(135deg, #00f2fe, #4facfe)';
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('zerochat_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [wireBatchingEnabled, setWireBatchingEnabled] = useState(() => {
    const saved = localStorage.getItem('zerochat_wire_batching');
    return saved !== null ? JSON.parse(saved) : true; // Default ON (Recommended)
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('zerochat_theme') || 'cyber-cyan';
  });

  const [surface, setSurface] = useState(() => {
    return localStorage.getItem('zerochat_surface') || 'ultra-glass';
  });

  useEffect(() => {
    localStorage.setItem('zerochat_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('zerochat_wire_batching', JSON.stringify(wireBatchingEnabled));
    groupRelayEngine.setWireBatching(wireBatchingEnabled);
  }, [wireBatchingEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zerochat_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-surface', surface);
    localStorage.setItem('zerochat_surface', surface);
  }, [surface]);

  useEffect(() => {
    peerService.setNickname(myNickname);
  }, [myNickname]);

  const toggleTheme = () => {
    const themeCycle = [
      'cyber-cyan',
      'matrix-emerald',
      'synthwave-purple',
      'solar-amber',
      'crimson-red',
      'midnight-blue',
      'monolith-slate',
      'tokyo-neon',
    ];
    const nextTheme = themeCycle[(themeCycle.indexOf(theme) + 1) % themeCycle.length];
    setTheme(nextTheme);
    if (showToast) {
      const names = {
        'cyber-cyan': 'Cyber Cyan (Default)',
        'matrix-emerald': 'Matrix Emerald',
        'synthwave-purple': 'Synthwave Purple',
        'solar-amber': 'Solar Amber',
        'crimson-red': 'Crimson Red',
        'midnight-blue': 'Midnight Blue',
        'monolith-slate': 'Monolith Slate',
        'tokyo-neon': 'Tokyo Neon',
      };
      showToast(`Switched theme: ${names[nextTheme] || nextTheme}`, 'info');
    }
  };

  const handleSetTheme = (nextTheme) => {
    setTheme(nextTheme);
    if (showToast) {
      const names = {
        'cyber-cyan': 'Cyber Cyan (Default)',
        'matrix-emerald': 'Matrix Emerald',
        'synthwave-purple': 'Synthwave Purple',
        'solar-amber': 'Solar Amber',
        'crimson-red': 'Crimson Red',
        'midnight-blue': 'Midnight Blue',
        'monolith-slate': 'Monolith Slate',
        'tokyo-neon': 'Tokyo Neon',
      };
      showToast(`Switched theme: ${names[nextTheme] || nextTheme}`, 'info');
    }
  };

  const handleSetSurface = (nextSurface) => {
    setSurface(nextSurface);
    if (showToast) {
      const names = {
        'ultra-glass': 'Ultra Glass (Dynamic Blur)',
        'solid-dark': 'Solid Dark (High Contrast)',
        'oled-black': 'OLED Pure Black (Zero Glare)'
      };
      showToast(`Surface layout: ${names[nextSurface] || nextSurface}`, 'info');
    }
  };

  const handleSaveNickname = (name, color) => {
    setMyNickname(name);
    setMyAvatarBg(color);
    localStorage.setItem('zerochat_nickname', name);
    localStorage.setItem('zerochat_avatar_bg', color);
    peerService.setNickname(name);
    if (showToast) showToast(`Name updated to ${name}`, 'success');
  };

  const toggleWireBatching = () => {
    setWireBatchingEnabled((prev) => {
      const next = !prev;
      if (showToast) {
        showToast(
          next
            ? 'Dual-Priority Wire Batching enabled (Optimized for host performance)'
            : 'Dual-Priority Wire Batching disabled (Direct unbatched mode)',
          'info'
        );
      }
      return next;
    });
  };

  return {
    myNickname,
    displayName: myNickname,
    myAvatarBg,
    soundEnabled,
    setSoundEnabled,
    wireBatchingEnabled,
    toggleWireBatching,
    theme,
    setTheme: handleSetTheme,
    toggleTheme,
    surface,
    setSurface: handleSetSurface,
    handleSaveNickname,
    clientId: clientProfile.clientId,
    discriminatorTag: clientProfile.discriminator,
    clientProfile,
  };
}
