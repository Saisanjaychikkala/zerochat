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

  useEffect(() => {
    localStorage.setItem('zerochat_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    peerService.setNickname(myNickname);
  }, [myNickname]);

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
    handleSaveNickname,
  };
}
