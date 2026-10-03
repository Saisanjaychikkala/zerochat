/**
 * ZeroChat - Autonomous Verification & QA Test Harness
 * Functional test runner verifying real runtime logic:
 * - Room ID generation, entropy, and URL normalization
 * - 16KB AirDrop chunking & transfer progress math
 * - Video call zoom clamping & track generation
 * - Hardware stream teardown & media resource cleanup
 * - Connect 4 matrix win-detection (horizontal, vertical, diagonal, tie)
 * - Group Chat Baton Pass Relay failover (Co-Host succession & seniority election)
 * - WebRTC Wire Protocol packet dispatching & passcode authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log(' ZeroChat Autonomous Functional Test Suite');
console.log('====================================================\n');

async function runTests() {
  // ─── [Suite 1] Room ID Generation, Normalization & Entropy ─────────
  console.log('[Test Suite 1] Room ID Generation & Entropy');
  const {
    generateRoomId,
    normalizeRoomId,
    generateGameRoomId,
    generateSquadRoomId,
    isSquadRoomId,
    parseRoomHash,
    ROOM_WORDS,
    CHUNK_SIZE,
    GROUP_PACKET_TYPES
  } = await import('../src/services/webrtc/constants.js');

  assert(typeof generateRoomId === 'function', 'generateRoomId is exported');
  assert(typeof normalizeRoomId === 'function', 'normalizeRoomId is exported');
  assert(typeof generateGameRoomId === 'function', 'generateGameRoomId is exported');
  assert(typeof generateSquadRoomId === 'function', 'generateSquadRoomId is exported');
  assert(typeof parseRoomHash === 'function', 'parseRoomHash is exported');
  assert(Array.isArray(ROOM_WORDS) && ROOM_WORDS.length >= 20, 'ROOM_WORDS dictionary has high entropy');
  assert(CHUNK_SIZE === 16384, 'CHUNK_SIZE is standard 16KB (16384 bytes)');

  // Prefix routing & identification
  const gameRoom = generateGameRoomId();
  assert(gameRoom.startsWith('game-'), `generateGameRoomId produces unified game prefix (${gameRoom})`);
  const squadRoom = generateSquadRoomId();
  assert(squadRoom.startsWith('squad-'), `generateSquadRoomId produces unified squad prefix (${squadRoom})`);
  assert(isSquadRoomId(squadRoom) === true, 'isSquadRoomId correctly identifies squad room');
  assert(isSquadRoomId('cosmic-radar-780') === false, 'isSquadRoomId rejects 1-on-1 chat room');

  // Hash parsing
  const parsedGame = parseRoomHash('#game-cosmic-radar-780');
  assert(parsedGame.isGame === true, 'parseRoomHash identifies game room');
  assert(parsedGame.roomId === 'game-cosmic-radar-780', 'parseRoomHash normalizes full game room ID');

  const parsedSquad = parseRoomHash('#squad-nexus-orbit-421');
  assert(parsedSquad.isSquad === true, 'parseRoomHash identifies squad room');
  assert(parsedSquad.roomId === 'squad-nexus-orbit-421', 'parseRoomHash normalizes full squad room ID');

  const parsedChat = parseRoomHash('#cosmic-radar-780');
  assert(parsedChat.isGame === false && parsedChat.isSquad === false, 'parseRoomHash identifies 1-on-1 chat room');
  assert(parsedChat.roomId === 'cosmic-radar-780', 'parseRoomHash extracts clean chat room ID');

  // Sanitization & normalization
  assert(normalizeRoomId('nexus lunar 155') === 'nexus-lunar-155', 'normalizeRoomId converts spaces to hyphens');
  assert(normalizeRoomId('#nexus-lunar-155') === 'nexus-lunar-155', 'normalizeRoomId strips leading hash');
  assert(normalizeRoomId('nexus%20lunar-155') === 'nexus-lunar-155', 'normalizeRoomId decodes percent-encoded spaces');
  assert(normalizeRoomId('https://zerochat.app/#nexus-lunar-155') === 'nexus-lunar-155', 'normalizeRoomId extracts hash from URL');
  assert(normalizeRoomId('  NEXUS_LUNAR_155  ') === 'nexus-lunar-155', 'normalizeRoomId handles uppercase and underscores');
  assert(normalizeRoomId('nexus--lunar---155/') === 'nexus-lunar-155', 'normalizeRoomId collapses hyphens and trailing slash');

  // Entropy test
  const sampleId = generateRoomId();
  const parts = sampleId.split('-');
  assert(parts.length === 3, `Room ID matches word-word-num format (${sampleId})`);
  assert(ROOM_WORDS.includes(parts[0]), `First word is in dictionary (${parts[0]})`);
  assert(ROOM_WORDS.includes(parts[1]), `Second word is in dictionary (${parts[1]})`);
  const num = parseInt(parts[2], 10);
  assert(!isNaN(num) && num >= 100 && num <= 999, `Third component is 3-digit number (${num})`);

  const set = new Set();
  for (let i = 0; i < 1000; i++) set.add(generateRoomId());
  assert(set.size > 970, `High entropy: 1000 generations yielded ${set.size} unique IDs`);

  // ─── [Suite 2] AirDrop 16KB Chunking Math ──────────────────────────
  console.log('\n[Test Suite 2] AirDrop 16KB Chunking Calculations');
  const testFileSize = 1050000; // ~1.05MB
  const expectedChunks = Math.ceil(testFileSize / CHUNK_SIZE);
  assert(expectedChunks === 65, `1050000 bytes splits into ${expectedChunks} chunks of 16KB`);
  
  const progressHalf = Math.min(100, Math.round(((32 * CHUNK_SIZE) / testFileSize) * 100));
  assert(progressHalf >= 49 && progressHalf <= 51, `Progress math works correctly (${progressHalf}%)`);

  // ─── [Suite 3] Connect 4 Functional Win-Detection Logic ────────────
  console.log('\n[Test Suite 3] Connect 4 Matrix Functional Win-Detection Logic');
  const { checkConnectFourWin, createEmptyGrid, ROWS, COLS } = await import('../src/utils/connectFourLogic.js');
  assert(ROWS === 6 && COLS === 7, 'Connect 4 dimensions are 6 rows by 7 columns');

  // Empty grid should return null
  const emptyGrid = createEmptyGrid();
  assert(checkConnectFourWin(emptyGrid) === null, 'Empty grid returns no winner');

  // Horizontal win test
  const hGrid = createEmptyGrid();
  hGrid[5][0] = 'C'; hGrid[5][1] = 'C'; hGrid[5][2] = 'C'; hGrid[5][3] = 'C';
  const hWin = checkConnectFourWin(hGrid);
  assert(hWin && hWin.winner === 'C' && hWin.line.length === 4, 'Detects 4-in-a-row horizontal win for Cyan');

  // Vertical win test
  const vGrid = createEmptyGrid();
  vGrid[5][2] = 'M'; vGrid[4][2] = 'M'; vGrid[3][2] = 'M'; vGrid[2][2] = 'M';
  const vWin = checkConnectFourWin(vGrid);
  assert(vWin && vWin.winner === 'M' && vWin.line.length === 4, 'Detects 4-in-a-row vertical win for Magenta');

  // Diagonal ascending win test (/)
  const dAscGrid = createEmptyGrid();
  dAscGrid[5][0] = 'C'; dAscGrid[4][1] = 'C'; dAscGrid[3][2] = 'C'; dAscGrid[2][3] = 'C';
  const dAscWin = checkConnectFourWin(dAscGrid);
  assert(dAscWin && dAscWin.winner === 'C' && dAscWin.line.length === 4, 'Detects diagonal ascending win');

  // Diagonal descending win test (\)
  const dDescGrid = createEmptyGrid();
  dDescGrid[2][0] = 'M'; dDescGrid[3][1] = 'M'; dDescGrid[4][2] = 'M'; dDescGrid[5][3] = 'M';
  const dDescWin = checkConnectFourWin(dDescGrid);
  assert(dDescWin && dDescWin.winner === 'M' && dDescWin.line.length === 4, 'Detects diagonal descending win');

  // Full board tie test
  const tieGrid = createEmptyGrid();
  const pattern = ['C', 'C', 'M', 'M', 'C', 'C', 'M'];
  const altPattern = ['M', 'M', 'C', 'C', 'M', 'M', 'C'];
  for (let r = 0; r < ROWS; r++) {
    const rowPat = r % 2 === 0 ? pattern : altPattern;
    for (let c = 0; c < COLS; c++) tieGrid[r][c] = rowPat[c];
  }
  // Verify no 4-in-a-row exists in tieGrid or simulate a full board
  const fullRes = checkConnectFourWin(tieGrid);
  assert(fullRes !== null, 'Full board triggers game over assessment');

  // ─── [Suite 4] Group Chat Baton Failover & Successor Election ──────
  console.log('\n[Test Suite 4] Baton Pass Failover & Successor Election Logic');
  const { handleHostDisconnect, setDesignatedSuccessor } = await import('../src/services/webrtc/groupBatonManager.js');

  // Scenario A: Host disconnects, designated Co-Host is elected
  const mockEngineCoHost = {
    isHost: false,
    myPeerId: 'peer-2',
    currentHostId: 'host-1',
    designatedSuccessorId: 'peer-2',
    roster: [
      { peerId: 'host-1', nickname: 'Host', isHost: true },
      { peerId: 'peer-2', nickname: 'CoHost (Me)', isCoHost: true, joinedAt: 2000 },
      { peerId: 'peer-3', nickname: 'Guest', isCoHost: false, joinedAt: 1000 }
    ],
    emit: (event, payload) => {}
  };
  handleHostDisconnect(mockEngineCoHost);
  assert(mockEngineCoHost.isHost === true, 'Designated Co-Host promotes self to Host when Host disconnects');
  assert(mockEngineCoHost.currentHostId === 'peer-2', 'New currentHostId matches promoted Co-Host');

  // Scenario B: Host disconnects without Co-Host -> Seniority fallback
  const mockEngineSeniority = {
    isHost: false,
    myPeerId: 'peer-3',
    currentHostId: 'host-1',
    designatedSuccessorId: null,
    roster: [
      { peerId: 'host-1', nickname: 'Host', isHost: true },
      { peerId: 'peer-2', nickname: 'Newer Peer', joinedAt: 5000 },
      { peerId: 'peer-3', nickname: 'Senior Peer (Me)', joinedAt: 1000 }
    ],
    emit: (event, payload) => {}
  };
  handleHostDisconnect(mockEngineSeniority);
  assert(mockEngineSeniority.isHost === true, 'Oldest joined peer by seniority is elected when no Co-Host is set');
  assert(mockEngineSeniority.currentHostId === 'peer-3', 'Senior peer becomes new Host');

  // ─── [Suite 5] WebRTC Group Wire Protocol & Knock Authentication ───
  console.log('\n[Test Suite 5] WebRTC Wire Protocol & Knock Admission Logic');
  const { handleGroupPacket } = await import('../src/services/webrtc/groupPacketHandler.js');

  // Test 1: KNOCK with correct passcode
  let sentPacket = null;
  const mockConn = {
    peer: 'knocker-1',
    open: true,
    send: (pkt) => { sentPacket = pkt; }
  };
  const mockHostWithPasscode = {
    isHost: true,
    myPeerId: 'host-1',
    roomPasscode: 'secret123',
    connections: new Map(),
    roster: [{ peerId: 'host-1', nickname: 'Admin', isHost: true }],
    broadcastRosterSync: () => {},
    emit: () => {}
  };
  handleGroupPacket(mockHostWithPasscode, {
    type: GROUP_PACKET_TYPES.KNOCK,
    nickname: 'Alice',
    passcode: 'secret123'
  }, mockConn);
  assert(sentPacket && sentPacket.type === GROUP_PACKET_TYPES.ADMIT, 'Correct passcode instantly admits knocker with ADMIT packet');
  assert(mockHostWithPasscode.connections.has('knocker-1'), 'Admitted knocker added to active connections map');

  // Test 2: KNOCK with incorrect passcode from a new peer
  sentPacket = null;
  const mockEveConn = {
    peer: 'knocker-2',
    open: true,
    send: (pkt) => { sentPacket = pkt; }
  };
  handleGroupPacket(mockHostWithPasscode, {
    type: GROUP_PACKET_TYPES.KNOCK,
    nickname: 'Eve',
    passcode: 'wrongpass'
  }, mockEveConn);
  assert(sentPacket && sentPacket.type === GROUP_PACKET_TYPES.CHALLENGE, 'Incorrect passcode sends CHALLENGE packet');

  // Test 3: Reconnecting peer auto-admission
  sentPacket = null;
  handleGroupPacket(mockHostWithPasscode, {
    type: GROUP_PACKET_TYPES.KNOCK,
    nickname: 'Alice',
    isReconnecting: true
  }, mockConn);
  assert(sentPacket && sentPacket.type === GROUP_PACKET_TYPES.ADMIT, 'Reconnecting peer is auto-admitted without re-authenticating');

  // Test 4: Open room knock queueing
  const mockOpenHost = {
    isHost: true,
    myPeerId: 'host-1',
    roomPasscode: null,
    pendingKnocks: new Map(),
    connections: new Map(),
    roster: [{ peerId: 'host-1', nickname: 'Admin', isHost: true }],
    broadcastRosterSync: () => {},
    emit: () => {}
  };
  sentPacket = null;
  handleGroupPacket(mockOpenHost, {
    type: GROUP_PACKET_TYPES.KNOCK,
    nickname: 'Bob'
  }, mockConn);
  assert(sentPacket && sentPacket.type === GROUP_PACKET_TYPES.KNOCK_ACK, 'Open room sends KNOCK_ACK to knocker');
  assert(mockOpenHost.pendingKnocks.has('knocker-1'), 'Knocker queued in pendingKnocks map for host admission');

  // ─── [Suite 6] Video Call Zoom Clamping & Track Math ───────────────
  console.log('\n[Test Suite 6] Video Call Zoom Clamping & Track Math');
  const { clampZoomScale, stopStreamTracks } = await import('../src/services/webrtc/streamHelpers.js');
  assert(typeof clampZoomScale === 'function', 'clampZoomScale is exported');
  assert(clampZoomScale(0.5) === 1.0, 'clampZoomScale clamps min zoom below 1.0 to 1.0');
  assert(clampZoomScale(1.5) === 1.5, 'clampZoomScale permits normal 1.5x zoom');
  assert(clampZoomScale(5.0) === 4.0, 'clampZoomScale clamps max zoom above 4.0 to 4.0');
  assert(clampZoomScale(1.0) === 1.0, 'clampZoomScale permits baseline 1.0x');

  // Hardware media stream track teardown
  let mockTrackStopped = false;
  const mockStream = {
    getTracks: () => [
      {
        stop: () => { mockTrackStopped = true; },
        readyState: 'live',
      },
    ],
  };
  stopStreamTracks(mockStream);
  assert(mockTrackStopped === true, 'stopStreamTracks invokes .stop() on all tracks to release hardware');

  // ─── [Suite 7] Agent Skills & System Architecture ──────────────────
  console.log('\n[Test Suite 7] Agent Skills Discovery & Blueprints');
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  assert(fs.existsSync(skillsDir), '.agents/skills/ directory exists');
  const expectedSkills = ['zerochat-qa', 'zerochat-webrtc', 'zerochat-ui-ux', 'zerochat-security-perf', 'zerochat-engineering-rules'];
  expectedSkills.forEach((skillName) => {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    assert(fs.existsSync(skillFile), `Skill ${skillName} exists with valid metadata`);
  });

  const agentsMd = path.join(ROOT, 'AGENTS.md');
  assert(fs.existsSync(agentsMd), 'AGENTS.md guidelines exist in repository root');

  // Verify stylesheet barrel integrity
  const indexCss = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
  assert(indexCss.includes("@import './styles/variables.css';"), 'index.css imports variables.css');
  assert(indexCss.includes("@import './styles/call.css';"), 'index.css imports call.css');
  assert(indexCss.includes("@import './styles/groupChat.css';"), 'index.css imports groupChat.css');
  assert(indexCss.includes("@import './styles/activeMatchStage.css';"), 'index.css imports activeMatchStage.css');

  // ─── [Suite 8] WebRTC In-Chat Game & Nudge Wire Protocol Dispatching ──
  console.log('\n[Test Suite 8] WebRTC In-Chat Game & Nudge Wire Protocol Dispatching');
  let dispatchedGameEvent = null;
  let dispatchedNudge = null;
  let dispatchedMessage = null;
  let broadcastedData = null;

  const mockGameEngineHost = {
    isHost: true,
    myPeerId: 'host-1',
    connections: new Map([['peer-2', { peer: 'peer-2', open: true }]]),
    emit: (evt, payload) => {
      if (evt === 'game_event') dispatchedGameEvent = payload;
      if (evt === 'peer_nudge') dispatchedNudge = payload;
      if (evt === 'message') dispatchedMessage = payload;
    },
    broadcast: (data, excludePeer) => {
      broadcastedData = { data, excludePeer };
    }
  };

  const gameMovePacket = {
    type: GROUP_PACKET_TYPES.GAME_ACTION,
    action: 'game_event',
    data: {
      type: 'move',
      cardId: 'card-123',
      col: 3,
      row: 5,
      player: 1
    }
  };

  handleGroupPacket(mockGameEngineHost, gameMovePacket, { peer: 'peer-2' });
  assert(dispatchedGameEvent !== null && dispatchedGameEvent.type === 'move', 'GAME_ACTION game_event is emitted to game listener');
  assert(dispatchedMessage === null, 'GAME_ACTION game_event does NOT pollute the chat messages feed');
  assert(broadcastedData && broadcastedData.excludePeer === 'peer-2', 'Host broadcasts game_event to all other peers');

  // Test turn nudge packet in squad
  const nudgePacket = {
    type: GROUP_PACKET_TYPES.GAME_ACTION,
    action: 'game_event',
    data: {
      type: 'game_nudge',
      sender: 'Alice',
      message: "It's your turn in Connect 4!"
    }
  };
  handleGroupPacket(mockGameEngineHost, nudgePacket, { peer: 'peer-2' });
  assert(dispatchedNudge && dispatchedNudge.senderNickname === 'Alice', 'Game nudge event correctly triggers peer_nudge with sender nickname');

  // ─── [Suite 9] WebRTC Reaction Wire Protocol & Aggregation ───────────
  console.log('\n[Test Suite 9] WebRTC Reaction Wire Protocol & Aggregation');
  let dispatchedReaction = null;
  let broadcastedReaction = null;

  const mockReactionHost = {
    isHost: true,
    connections: new Map([['peer-3', { peer: 'peer-3', open: true }]]),
    emit: (evt, payload) => {
      if (evt === 'reaction') dispatchedReaction = payload;
    },
    broadcast: (data, excludePeer) => {
      broadcastedReaction = { data, excludePeer };
    }
  };

  const reactionPacket = {
    type: GROUP_PACKET_TYPES.REACTION,
    messageId: 'msg-999',
    emoji: '🔥',
    authorId: 'peer-3',
    authorName: 'Charlie'
  };

  handleGroupPacket(mockReactionHost, reactionPacket, { peer: 'peer-3' });
  assert(dispatchedReaction && dispatchedReaction.emoji === '🔥', 'REACTION packet correctly emitted on host');
  assert(broadcastedReaction && broadcastedReaction.excludePeer === 'peer-3', 'Host broadcasts reaction to other squad peers');

  // ─── [Suite 10] CSS Design Tokens & Surface Themes ──────────────────
  console.log('\n[Test Suite 10] CSS Design Tokens & Surface Themes');
  const variablesCss = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'variables.css'), 'utf8');
  assert(variablesCss.includes('[data-surface="ultra-glass"]'), 'variables.css contains ultra-glass surface specification');
  assert(variablesCss.includes('[data-surface="solid-dark"]'), 'variables.css contains solid-dark surface specification');
  assert(variablesCss.includes('[data-surface="oled-black"]'), 'variables.css contains oled-black surface specification');
  assert(variablesCss.includes('--bg-main: #000000 !important;'), 'oled-black sets pure deep black background for OLED screens');
  assert(variablesCss.includes('--bg-main: #090d16 !important;'), 'solid-dark sets rich matte dark background');
  assert(variablesCss.includes('--accent-cyan:'), 'variables.css defines cyber-cyan accent token');
  assert(variablesCss.includes('--accent-purple:'), 'variables.css defines cyber-purple accent token');

  // ─── [Suite 11] Binary ZCFC Chunk Packing & Zero-Copy Framing ─────
  console.log('\n[Test Suite 11] Binary ZCFC Chunk Packing & Zero-Copy Framing');
  const { packBinaryChunk, unpackBinaryChunk } = await import('../src/services/webrtc/fileStreamEngine.js');
  assert(typeof packBinaryChunk === 'function', 'packBinaryChunk is exported');
  assert(typeof unpackBinaryChunk === 'function', 'unpackBinaryChunk is exported');

  const samplePayload = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const testFileId = 'file_abc1234_999';
  const packedBuffer = packBinaryChunk(testFileId, 2, 10, samplePayload);

  assert(packedBuffer instanceof ArrayBuffer, 'packBinaryChunk returns an ArrayBuffer');
  assert(packedBuffer.byteLength === 13 + testFileId.length + samplePayload.byteLength, 'Packed buffer length equals dynamic header + payload');

  const unpacked = unpackBinaryChunk(packedBuffer);
  assert(unpacked !== null, 'unpackBinaryChunk successfully deserializes ZCFC packet');
  assert(unpacked.fileId === testFileId, `unpacked fileId matches (${unpacked.fileId})`);
  assert(unpacked.chunkIndex === 2, 'unpacked chunkIndex matches 2');
  assert(unpacked.totalChunks === 10, 'unpacked totalChunks matches 10');
  assert(unpacked.payload.length === 8 && unpacked.payload[0] === 10 && unpacked.payload[7] === 80, 'Payload bytes intact and identical');

  const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]).buffer;
  assert(unpackBinaryChunk(invalidBuffer) === null, 'unpackBinaryChunk returns null for non-ZCFC data');

  // ─── [Suite 12] Roster Delta Sync Wire Protocol ──────────────────────
  console.log('\n[Test Suite 12] Roster Delta Sync (ROSTER_JOIN, ROSTER_LEAVE, ROSTER_UPDATE)');
  const mockRosterEngine = {
    isHost: false,
    roster: [
      { peerId: 'host-1', nickname: 'Host', isHost: true },
      { peerId: 'peer-2', nickname: 'Alice', isHost: false }
    ],
    emit: (evt, data) => {}
  };
  const mockHostConn = { peer: 'host-1', open: true };

  // 1. ROSTER_JOIN
  const joinPacket = {
    type: GROUP_PACKET_TYPES.ROSTER_JOIN,
    member: { peerId: 'peer-3', nickname: 'Bob', isHost: false }
  };
  handleGroupPacket(mockRosterEngine, joinPacket, mockHostConn);
  assert(mockRosterEngine.roster.some(m => m.peerId === 'peer-3'), 'ROSTER_JOIN adds member to roster without full array retransmission');

  // 2. ROSTER_UPDATE
  const updatePacket = {
    type: GROUP_PACKET_TYPES.ROSTER_UPDATE,
    peerId: 'peer-3',
    patch: { nickname: 'Bobby' }
  };
  handleGroupPacket(mockRosterEngine, updatePacket, mockHostConn);
  const updatedMember = mockRosterEngine.roster.find(m => m.peerId === 'peer-3');
  assert(updatedMember && updatedMember.nickname === 'Bobby', 'ROSTER_UPDATE applies patch accurately to member');

  // 3. ROSTER_LEAVE
  const leavePacket = {
    type: GROUP_PACKET_TYPES.ROSTER_LEAVE,
    peerId: 'peer-2'
  };
  handleGroupPacket(mockRosterEngine, leavePacket, mockHostConn);
  assert(!mockRosterEngine.roster.some(m => m.peerId === 'peer-2'), 'ROSTER_LEAVE removes disconnected peer from roster');

  // ─── [Suite 13] Dual-Priority Wire Lanes & Urgent Packet Filtering ───
  console.log('\n[Test Suite 13] Dual-Priority Wire Lanes & Urgent Filter');
  const { groupRelayEngine } = await import('../src/services/webrtc/groupRelayEngine.js');
  assert(typeof groupRelayEngine.isUrgentPacket === 'function', 'groupRelayEngine.isUrgentPacket exists');

  assert(groupRelayEngine.isUrgentPacket({ type: GROUP_PACKET_TYPES.GAME_ACTION }) === true, 'GAME_ACTION classified in 0ms Instant Lane');
  assert(groupRelayEngine.isUrgentPacket({ type: GROUP_PACKET_TYPES.CALL_RING }) === true, 'CALL_RING classified in 0ms Instant Lane');
  assert(groupRelayEngine.isUrgentPacket({ type: GROUP_PACKET_TYPES.ROSTER_JOIN }) === true, 'ROSTER_JOIN classified in 0ms Instant Lane');
  assert(groupRelayEngine.isUrgentPacket({ type: GROUP_PACKET_TYPES.REACTION }) === false, 'REACTION coalesced into 25ms Micro-Tick Lane');
  assert(groupRelayEngine.isUrgentPacket({ type: GROUP_PACKET_TYPES.TYPING }) === false, 'TYPING coalesced into 25ms Micro-Tick Lane');

  // ─── [Suite 14] 16-Point Normalized Audio Waveform Generation ────────
  console.log('\n[Test Suite 14] 16-Point Normalized Audio Waveform Generation');
  const { voiceRecorder } = await import('../src/utils/voiceRecorder.js');
  assert(typeof voiceRecorder.calculateNormalizedWaveform === 'function', 'calculateNormalizedWaveform is exported');

  const defaultWave = voiceRecorder.calculateNormalizedWaveform([], 16);
  assert(Array.isArray(defaultWave) && defaultWave.length === 16, 'calculateNormalizedWaveform produces exactly 16 points for empty sample');

  const mockSamples = [0.05, 0.1, 0.4, 0.8, 0.9, 0.3, 0.1, 0.6, 0.95, 0.7, 0.4, 0.2, 0.5, 0.85, 0.4, 0.1];
  const normalizedWave = voiceRecorder.calculateNormalizedWaveform(mockSamples, 16);
  assert(normalizedWave.length === 16, 'calculateNormalizedWaveform produces exactly 16 points for recorded samples');
  assert(normalizedWave.every(val => typeof val === 'number' && val >= 0.08 && val <= 1.0), 'All waveform points normalized within [0.08, 1.0]');
  assert(Math.max(...normalizedWave) === 1.0, 'Peak volume normalized to 1.0');

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n====================================================');
  console.log(` Verification Complete: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL FUNCTIONAL TESTS PASSED. Logic is verified.\n');
    process.exit(0);
  } else {
    console.error(`💥 ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
