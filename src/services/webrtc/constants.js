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
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
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

export function generateGameRoomId() {
  return `game-${generateRoomId()}`;
}

export function generateSquadRoomId() {
  return `squad-${generateRoomId()}`;
}

export function isSquadRoomId(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const normalized = normalizeRoomId(raw);
  return normalized.startsWith('squad-') || raw.toLowerCase().includes('/squad/');
}

export function parseRoomHash(raw) {
  if (!raw || typeof raw !== 'string') return { isGame: false, isSquad: false, roomId: '' };
  const lower = raw.toLowerCase();
  const isExplicitGame = lower.includes('/game/') || lower.includes('game-');
  const isExplicitSquad = lower.includes('/squad/') || lower.includes('squad-');
  const normalized = normalizeRoomId(raw);
  if (!normalized) return { isGame: false, isSquad: false, roomId: '' };
  if (normalized.startsWith('game-') || isExplicitGame) {
    const cleanGameId = normalized.startsWith('game-') 
      ? normalized 
      : `game-${normalized.replace(/^game-?/, '')}`;
    return { isGame: true, isSquad: false, roomId: cleanGameId };
  }
  if (normalized.startsWith('squad-') || isExplicitSquad) {
    const cleanSquadId = normalized.startsWith('squad-')
      ? normalized
      : `squad-${normalized.replace(/^squad-?/, '')}`;
    return { isGame: false, isSquad: true, roomId: cleanSquadId };
  }
  return { isGame: false, isSquad: false, roomId: normalized };
}

export const GROUP_PACKET_TYPES = {
  KNOCK: 'group_knock',
  KNOCK_ACK: 'group_knock_ack',
  ADMIT: 'group_admit',
  DECLINE: 'group_decline',
  CHALLENGE: 'group_challenge',
  ROSTER_SYNC: 'group_roster_sync',
  CHAT: 'group_chat',
  VOICE: 'group_voice',
  REACTION: 'group_reaction',
  GAME_CARD: 'game_card',
  GAME_ACTION: 'game_action',
  BATON_OFFER: 'group_baton_offer',
  BATON_ACCEPT: 'group_baton_accept',
  BATON_MIGRATED: 'group_baton_migrated',
  LOCK_SYNC: 'group_lock_sync',
  KICK: 'group_kick',
  HEARTBEAT: 'group_heartbeat',
  HEARTBEAT_ACK: 'group_heartbeat_ack'
};
