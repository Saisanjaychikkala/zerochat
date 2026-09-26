import { useState, useEffect } from 'react';
import { peerService } from '../services/peerService';

export function usePreferences(showToast) {
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

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('zerochat_theme') || 'cyber-cyan';
  });

  useEffect(() => {
    localStorage.setItem('zerochat_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zerochat_theme', theme);
  }, [theme]);

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

  const handleSaveNickname = (name, color) => {
    setMyNickname(name);
    setMyAvatarBg(color);
    localStorage.setItem('zerochat_nickname', name);
    localStorage.setItem('zerochat_avatar_bg', color);
    peerService.setNickname(name);
    if (showToast) showToast(`Name updated to ${name}`, 'success');
  };

  return {
    myNickname,
    myAvatarBg,
    soundEnabled,
    setSoundEnabled,
    theme,
    toggleTheme,
    handleSaveNickname,
  };
}
