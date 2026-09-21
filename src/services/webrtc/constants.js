/**
 * ZeroChat WebRTC Configuration & Constants
 */

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelay',
    credential: 'openrelay',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelay',
    credential: 'openrelay',
  },
];

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
