/**
 * ZeroChat WebRTC Configuration & Constants
 */

function getCustomIceServers() {
  const custom = [];
  if (typeof window !== 'undefined' && Array.isArray(window.ZEROCHAT_ICE_SERVERS)) {
    return window.ZEROCHAT_ICE_SERVERS;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('zerochat_turn_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
        if (parsed.urls) return [parsed];
      }
    } catch (e) {}
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TURN_URL) {
    custom.push({
      urls: import.meta.env.VITE_TURN_URL.split(',').map((u) => u.trim()),
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    });
  }
  return custom;
}

const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stunserver.stunprotocol.org:3478' },
];

export const ICE_SERVERS = [
  ...getCustomIceServers(),
  ...DEFAULT_STUN_SERVERS,
];

export const STUN_ONLY_ICE_SERVERS = DEFAULT_STUN_SERVERS;
export const UNIVERSAL_ICE_SERVERS = ICE_SERVERS;

export const CHUNK_SIZE = 16 * 1024; // 16KB WebRTC chunk size

export const ROOM_WORDS = [
  'alpha', 'bravo', 'cosmic', 'delta', 'echo', 'flame',
  'galaxy', 'hyper', 'ion', 'jet', 'kinetic', 'lunar',
  'matrix', 'nexus', 'orbit', 'pulse', 'quantum', 'radar',
  'solar', 'titan', 'ultra', 'vortex', 'wave', 'zenith'
];

export function generateRoomId() {
  const w1 = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const w2 = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${w1}-${w2}-${num}`;
}

export function normalizeRoomId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  if (str.includes('#')) {
    str = str.split('#').pop();
  }
  try {
    str = decodeURIComponent(str);
  } catch (e) {}

  str = str.split('?')[0].replace(/\/+$/, '').trim();
  str = str.toLowerCase();
  str = str.replace(/[-_\s+]+/g, '-');
  str = str.replace(/[^a-z0-9-]/g, '');
  str = str.replace(/^-+|-+$/g, '');
  return str;
}

export function generateGameRoomId(gameType = 'pong') {
  return `game-${gameType}-${generateRoomId()}`;
}

export function parseRoomHash(raw) {
  const normalized = normalizeRoomId(raw);
  if (!normalized) return { isGame: false, gameType: null, roomId: '' };
  if (normalized.startsWith('game-')) {
    const parts = normalized.split('-');
    // format: game-<gameType>-<word1>-<word2>-<num>
    const gameType = parts[1] || 'pong';
    return { isGame: true, gameType, roomId: normalized };
  }
  return { isGame: false, gameType: null, roomId: normalized };
}

