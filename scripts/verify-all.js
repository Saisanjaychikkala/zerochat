/**
 * ZeroChat - Autonomous Verification & QA Test Harness
 * Validates wire protocols, chunking math, room code generation, skills, zoom math, CSS integrity, and hardware media security teardown.
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
console.log(' ZeroChat Autonomous Verification & QA Suite');
console.log('====================================================\n');

async function runTests() {
  // 1. Verify Room ID Generation & Normalization
  console.log('[Test Suite 1] Room ID Generation & Entropy');
  const { generateRoomId, normalizeRoomId, generateGameRoomId, parseRoomHash, ROOM_WORDS, CHUNK_SIZE } = await import('../src/services/webrtc/constants.js');
  assert(typeof generateRoomId === 'function', 'generateRoomId is exported');
  assert(typeof normalizeRoomId === 'function', 'normalizeRoomId is exported');
  assert(typeof generateGameRoomId === 'function', 'generateGameRoomId is exported');
  assert(typeof parseRoomHash === 'function', 'parseRoomHash is exported');
  assert(Array.isArray(ROOM_WORDS) && ROOM_WORDS.length >= 20, 'ROOM_WORDS dictionary has sufficient entropy');
  assert(CHUNK_SIZE === 16384, 'CHUNK_SIZE is standard 16KB (16384 bytes)');

  // Game Room ID generation & hash parsing
  const pongGameId = generateGameRoomId();
  assert(pongGameId.startsWith('game-'), `generateGameRoomId produces unified game prefix (${pongGameId})`);
  const parsedGame = parseRoomHash('#game-cosmic-radar-780');
  assert(parsedGame.isGame === true, 'parseRoomHash identifies game room');
  assert(parsedGame.roomId === 'game-cosmic-radar-780', 'parseRoomHash normalizes full room ID');
  const parsedChat = parseRoomHash('#cosmic-radar-780');
  assert(parsedChat.isGame === false, 'parseRoomHash identifies non-game chat room');
  assert(parsedChat.roomId === 'cosmic-radar-780', 'parseRoomHash extracts clean chat room ID');

  // Room ID Sanitization & Normalization
  assert(normalizeRoomId('nexus lunar 155') === 'nexus-lunar-155', 'normalizeRoomId converts spaces to hyphens');
  assert(normalizeRoomId('#nexus-lunar-155') === 'nexus-lunar-155', 'normalizeRoomId strips leading hash');
  assert(normalizeRoomId('nexus%20lunar-155') === 'nexus-lunar-155', 'normalizeRoomId decodes percent-encoded spaces');
  assert(normalizeRoomId('https://site.com/#nexus-lunar-155') === 'nexus-lunar-155', 'normalizeRoomId extracts hash from full URL');
  assert(normalizeRoomId('  NEXUS_LUNAR_155  ') === 'nexus-lunar-155', 'normalizeRoomId handles uppercase and underscores');
  assert(normalizeRoomId('nexus--lunar---155/') === 'nexus-lunar-155', 'normalizeRoomId collapses multiple hyphens and trailing slash');

  const sampleId = generateRoomId();
  const parts = sampleId.split('-');
  assert(parts.length === 3, `Room ID matches word-word-num format (${sampleId})`);
  assert(ROOM_WORDS.includes(parts[0]), `First word is in dictionary (${parts[0]})`);
  assert(ROOM_WORDS.includes(parts[1]), `Second word is in dictionary (${parts[1]})`);
  const num = parseInt(parts[2], 10);
  assert(!isNaN(num) && num >= 100 && num <= 999, `Third component is 3-digit number (${num})`);

  // Uniqueness check across 1000 iterations
  const set = new Set();
  for (let i = 0; i < 1000; i++) {
    set.add(generateRoomId());
  }
  assert(set.size > 970, `High entropy: 1000 generations yielded ${set.size} unique IDs`);

  // 2. Verify File Chunking & Math Calculations
  console.log('\n[Test Suite 2] AirDrop 16KB Chunking Calculations');
  const testFileSize = 1050000; // ~1.05MB
  const expectedChunks = Math.ceil(testFileSize / CHUNK_SIZE);
  assert(expectedChunks === 65, `1050000 bytes splits into ${expectedChunks} chunks of 16KB`);
  
  const progressHalf = Math.min(100, Math.round(((32 * CHUNK_SIZE) / testFileSize) * 100));
  assert(progressHalf >= 49 && progressHalf <= 51, `Progress math works correctly (${progressHalf}%)`);

  // 3. Verify Agent Skills & Customizations
  console.log('\n[Test Suite 3] Agent Skills Discovery & Verification');
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  assert(fs.existsSync(skillsDir), '.agents/skills/ directory exists');

  const expectedSkills = ['zerochat-qa', 'zerochat-webrtc', 'zerochat-ui-ux', 'zerochat-security-perf'];
  expectedSkills.forEach((skillName) => {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    assert(fs.existsSync(skillFile), `Skill ${skillName} exists at ${skillFile}`);
    if (fs.existsSync(skillFile)) {
      const content = fs.readFileSync(skillFile, 'utf8');
      assert(content.startsWith('---'), `Skill ${skillName} has valid YAML frontmatter`);
      assert(content.includes(`name: ${skillName}`), `Skill ${skillName} specifies correct name`);
    }
  });

  // 4. Verify AGENTS.md and Architecture Documentation
  console.log('\n[Test Suite 4] Architectural Blueprints & Guidelines');
  const agentsMd = path.join(ROOT, 'AGENTS.md');
  const archIndex = path.join(ROOT, 'AGENT_ARCHITECTURE.md');
  assert(fs.existsSync(agentsMd), 'AGENTS.md exists in repository root');
  assert(fs.existsSync(archIndex), 'AGENT_ARCHITECTURE.md exists in repository root');

  // 5. Verify CSS Modular Barrel
  console.log('\n[Test Suite 5] Stylesheet Modularity & Design Tokens');
  const stylesDir = path.join(ROOT, 'src', 'styles');
  const expectedStyles = [
    'variables.css',
    'base.css',
    'layout.css',
    'chat.css',
    'media.css',
    'call.css',
    'zoom.css',
    'modals.css',
    'responsive.css',
  ];
  expectedStyles.forEach((styleFile) => {
    const filePath = path.join(stylesDir, styleFile);
    assert(fs.existsSync(filePath), `Style module ${styleFile} exists`);
  });

  const indexCss = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
  assert(indexCss.includes("@import './styles/variables.css';"), 'index.css imports variables.css');
  assert(indexCss.includes("@import './styles/call.css';"), 'index.css imports call.css');
  assert(indexCss.includes("@import './styles/zoom.css';"), 'index.css imports zoom.css');
  assert(indexCss.includes("@import './styles/inChatGameCard.css';"), 'index.css imports inChatGameCard.css');
  assert(indexCss.includes("@import './styles/activeMatchStage.css';"), 'index.css imports activeMatchStage.css');

  // 6. Video Call & Screen Share Zoom System Verification
  console.log('\n[Test Suite 6] Video Call Zoom & Subcomponent Modularity');
  const { clampZoomScale, createDummyVideoTrack, stopStreamTracks } = await import('../src/services/webrtc/streamHelpers.js');
  assert(typeof clampZoomScale === 'function', 'clampZoomScale is exported');
  assert(typeof createDummyVideoTrack === 'function', 'createDummyVideoTrack is exported');
  assert(typeof stopStreamTracks === 'function', 'stopStreamTracks is exported');

  // Test zoom clamping
  assert(clampZoomScale(0.5) === 1.0, 'clampZoomScale clamps min zoom below 1.0 to 1.0');
  assert(clampZoomScale(1.5) === 1.5, 'clampZoomScale permits normal 1.5x zoom');
  assert(clampZoomScale(5.0) === 4.0, 'clampZoomScale clamps max zoom above 4.0 to 4.0');
  assert(clampZoomScale(1.0) === 1.0, 'clampZoomScale permits baseline 1.0x');

  // Verify call subcomponents exist and meet Prime Directive 4 (<350 lines)
  const callComponents = [
    'CallModal.jsx',
    'call/ZoomControls.jsx',
    'call/VideoViewport.jsx',
    'call/CallHeaderBar.jsx',
    'call/CallControlsDock.jsx',
    'call/IncomingCallDialog.jsx',
  ];

  callComponents.forEach((compPath) => {
    const fullPath = path.join(ROOT, 'src', 'components', compPath);
    assert(fs.existsSync(fullPath), `Call component ${compPath} exists`);
    if (fs.existsSync(fullPath)) {
      const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
      assert(lineCount <= 350, `File ${compPath} complies with line budget (${lineCount}/350 lines)`);
    }
  });

  // Verify mediaCallEngine.js meets Prime Directive 4 (<350 lines)
  const mediaEnginePath = path.join(ROOT, 'src', 'services', 'webrtc', 'mediaCallEngine.js');
  const engineLines = fs.readFileSync(mediaEnginePath, 'utf8').split('\n').length;
  assert(engineLines <= 350, `mediaCallEngine.js complies with line budget (${engineLines}/350 lines)`);

  // 7. Hardware Security & Camera/Mic Teardown Verification
  console.log('\n[Test Suite 7] Hardware Security & Camera/Mic Resource Release');
  
  // Test stopStreamTracks stops all mock tracks
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

  // Test peerService has beforeunload and pagehide hardware cleanup listeners
  const peerServiceSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'peerService.js'), 'utf8');
  assert(peerServiceSrc.includes("window.addEventListener('beforeunload'"), 'peerService registers beforeunload hardware cleanup');
  assert(peerServiceSrc.includes("window.addEventListener('pagehide'"), 'peerService registers pagehide hardware cleanup');

  // Test mediaCallEngine toggles camera video track on Cam Off/On
  const mediaCallSrc = fs.readFileSync(mediaEnginePath, 'utf8');
  assert(mediaCallSrc.includes('videoTrack.enabled'), 'mediaCallEngine toggles videoTrack.enabled when muting camera');
  assert(mediaCallSrc.includes('this.currentCall.peerConnection.getSenders()'), 'cleanupCall iterates RTCRtpSenders to stop hardware tracks');

  // Test ChatInputBar cleans up voice recorder on unmount
  const chatInputSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'chat', 'ChatInputBar.jsx'), 'utf8');
  assert(chatInputSrc.includes('voiceRecorder.cancel()'), 'ChatInputBar cancels voice recording on component unmount');

  // Test App.jsx terminates call on burn and disconnect
  const appSrc = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8');
  assert(appSrc.includes('handleEndCall()'), 'App.jsx terminates active calls on session burn and disconnect');

  // 8. Verify Sandboxing, Lazy Connection & File Line Budgets (<350 lines)
  console.log('\n[Test Suite 8] Sandboxing & Feature Isolation Architecture');

  // Lazy HomeScreen WebRTC Connection
  const peerSessionSrc = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'usePeerSession.js'), 'utf8');
  assert(peerSessionSrc.includes('if (initialHash) {'), 'HomeScreen avoids eager WebRTC broker connection when offline');
  assert(peerSessionSrc.includes('peerService.cleanup()'), 'usePeerSession cleans up WebRTC peer on disconnect and unmount');

  // Isolation Components Existence
  assert(fs.existsSync(path.join(ROOT, 'src', 'components', 'chat', 'ChatWorkspace.jsx')), 'ChatWorkspace component exists in chat/');
  assert(fs.existsSync(path.join(ROOT, 'src', 'components', 'AppModals.jsx')), 'AppModals coordinator exists in components/');
  assert(fs.existsSync(path.join(ROOT, 'src', 'components', 'ConfirmGameModal.jsx')), 'ConfirmGameModal exists in components/');

  // File Line Budget Verification (<350 lines per AGENTS.md)
  const budgetFiles = [
    { name: 'App.jsx', path: path.join(ROOT, 'src', 'App.jsx'), max: 350 },
    { name: 'HomeScreen.jsx', path: path.join(ROOT, 'src', 'components', 'HomeScreen.jsx'), max: 350 },
    { name: 'P2PGameArena.jsx', path: path.join(ROOT, 'src', 'components', 'P2PGameArena.jsx'), max: 350 },
    { name: 'CyberPongGame.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'CyberPongGame.jsx'), max: 350 },
    { name: 'CyberGridGame.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'CyberGridGame.jsx'), max: 350 },
    { name: 'CyberConnectFour.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'CyberConnectFour.jsx'), max: 350 },
    { name: 'GameDrawer.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'GameDrawer.jsx'), max: 350 },
    { name: 'GameLobbyChat.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'GameLobbyChat.jsx'), max: 350 },
    { name: 'GameVoiceDock.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'GameVoiceDock.jsx'), max: 350 },
    { name: 'ChatWorkspace.jsx', path: path.join(ROOT, 'src', 'components', 'chat', 'ChatWorkspace.jsx'), max: 350 },
    { name: 'AppModals.jsx', path: path.join(ROOT, 'src', 'components', 'AppModals.jsx'), max: 350 },
    { name: 'ConfirmGameModal.jsx', path: path.join(ROOT, 'src', 'components', 'ConfirmGameModal.jsx'), max: 350 },
    { name: 'usePeerSession.js', path: path.join(ROOT, 'src', 'hooks', 'usePeerSession.js'), max: 350 },
    { name: 'constants.js', path: path.join(ROOT, 'src', 'services', 'webrtc', 'constants.js'), max: 350 },
    { name: 'GameQrModal.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'GameQrModal.jsx'), max: 350 },
    { name: 'gameLobby.css', path: path.join(ROOT, 'src', 'styles', 'gameLobby.css'), max: 350 },
    { name: 'gameShelf.css', path: path.join(ROOT, 'src', 'styles', 'gameShelf.css'), max: 350 },
    { name: 'gameDrawer.css', path: path.join(ROOT, 'src', 'styles', 'gameDrawer.css'), max: 350 },
    { name: 'inChatGameCard.css', path: path.join(ROOT, 'src', 'styles', 'inChatGameCard.css'), max: 350 },
    { name: 'InChatGameCard.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'InChatGameCard.jsx'), max: 350 },
    { name: 'ActiveMatchStage.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'ActiveMatchStage.jsx'), max: 350 },
    { name: 'GameArenaHeader.jsx', path: path.join(ROOT, 'src', 'components', 'game', 'GameArenaHeader.jsx'), max: 350 },
    { name: 'ChatArea.jsx', path: path.join(ROOT, 'src', 'components', 'ChatArea.jsx'), max: 350 },
    { name: 'useInChatGames.js', path: path.join(ROOT, 'src', 'hooks', 'useInChatGames.js'), max: 350 },
    { name: 'activeMatchStage.css', path: path.join(ROOT, 'src', 'styles', 'activeMatchStage.css'), max: 350 }
  ];

  budgetFiles.forEach(({ name, path: fPath, max }) => {
    const lines = fs.readFileSync(fPath, 'utf8').split('\n').length;
    assert(lines <= max, `${name} complies with line budget (${lines}/${max} lines)`);
  });

  // 9. Real-World UX, Game State Persistence, Layout & Mic Authority
  console.log('\n[Test Suite 9] Real-World UX, Game State Persistence, Layout & Mic Authority');

  // File Transfer Save Button Layout
  const fileTransferSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'FileTransferArea.jsx'), 'utf8');
  const ftLines = fileTransferSrc.split('\n').length;
  assert(ftLines <= 350, `FileTransferArea.jsx complies with line budget (${ftLines}/350 lines)`);
  assert(fileTransferSrc.includes('whiteSpace: \'nowrap\'') && fileTransferSrc.includes('Save to Device'), 'Save to Device button has nowrap protection against distortion');
  assert(fileTransferSrc.includes('Tap "Save to Device" to preserve this file'), 'File transfer save warning is cleanly positioned below header');

  // Connect 4 Illuminated Matrix Contrast
  const c4Css = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'connect4.css'), 'utf8');
  assert(c4Css.includes('rgba(16, 28, 54, 0.96)'), 'Connect 4 board shell uses high-contrast navy cyber matrix gradient');
  assert(c4Css.includes('border: 2px solid rgba(0, 242, 254, 0.35)'), 'Connect 4 has glowing cyan outer chassis');
  assert(c4Css.includes('.c4-column.col-hover .c4-disc.empty'), 'Connect 4 empty slots highlight on column hover');

  // Game Drawer Badge Non-Wrapping
  const drawerSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'game', 'GameDrawer.jsx'), 'utf8');
  const drawerCss = fs.readFileSync(path.join(ROOT, 'src', 'styles', 'gameDrawer.css'), 'utf8');
  assert(drawerSrc.includes("badge: '60 FPS'"), 'GameDrawer uses concise 60 FPS badge');
  assert(drawerCss.includes('white-space: nowrap') && drawerCss.includes('flex-shrink: 0'), 'Game card pills have nowrap and flex-shrink 0');

  // Match State Persistence & Card ID Isolation
  const inChatGamesSrc = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useInChatGames.js'), 'utf8');
  assert(inChatGamesSrc.includes('cachedStatesRef'), 'useInChatGames maintains in-memory cachedGameStates');
  assert(inChatGamesSrc.includes('handleUpdateCardState'), 'useInChatGames exports handleUpdateCardState');
  assert(inChatGamesSrc.includes('handleResumeMatch = useCallback((targetCardId'), 'useInChatGames supports targetCardId resume');

  const activeStageSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'game', 'ActiveMatchStage.jsx'), 'utf8');
  assert(activeStageSrc.includes('cardId && event.cardId && event.cardId !== cardId'), 'ActiveMatchStage isolates incoming events by cardId');

  const gridSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'game', 'CyberGridGame.jsx'), 'utf8');
  assert(gridSrc.includes('cardId,') && gridSrc.includes('onUpdateCardState'), 'CyberGridGame receives cardId and reports live state');
  assert(gridSrc.includes("game: 'grid', cardId"), 'CyberGridGame tags moves with cardId');

  const c4Src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'game', 'CyberConnectFour.jsx'), 'utf8');
  assert(c4Src.includes('cardId,') && c4Src.includes('onUpdateCardState'), 'CyberConnectFour receives cardId and reports live state');
  assert(c4Src.includes("game: 'c4', cardId"), 'CyberConnectFour tags drops with cardId');

  const pongSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'game', 'CyberPongGame.jsx'), 'utf8');
  assert(pongSrc.includes('cardId,') && pongSrc.includes('onUpdateCardState'), 'CyberPongGame receives cardId and reports live score');
  assert(pongSrc.includes("game: 'pong', cardId"), 'CyberPongGame tags paddle and sync with cardId');

  // Audio Mute Authority & Synchronization
  const mediaEngineSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'webrtc', 'mediaCallEngine.js'), 'utf8');
  assert(mediaEngineSrc.includes('setAudioMute(isMuted, emit)'), 'mediaCallEngine implements explicit setAudioMute authority');

  const peerServiceApiSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'peerService.js'), 'utf8');
  assert(peerServiceApiSrc.includes('setAudioMute(isMuted)'), 'peerService exposes setAudioMute facade');

  const callSessionSrc = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useCallSession.js'), 'utf8');
  assert(callSessionSrc.includes('handleSetMute,'), 'useCallSession exports handleSetMute');

  const p2pArenaSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'P2PGameArena.jsx'), 'utf8');
  assert(p2pArenaSrc.includes('peerService.setAudioMute(mute)'), 'P2PGameArena invokes peerService.setAudioMute directly');
  assert(p2pArenaSrc.includes('Setting up secure P2P game arena...'), 'P2PGameArena waiting banner displays friendly guidance');

  // Background Match Persistence in ChatArea
  const chatAreaSrc = fs.readFileSync(path.join(ROOT, 'src', 'components', 'ChatArea.jsx'), 'utf8');
  assert(chatAreaSrc.includes("display: inChatGames.activeMatch.isVisible ? 'flex' : 'none'"), 'ChatArea preserves ActiveMatchStage state across Return to Chat');
  assert(chatAreaSrc.includes('End') && chatAreaSrc.includes('handleExitMatch'), 'ChatArea floating dock provides End Match button');

  // 10. Baton Pass Group Chat & Star Relay Architecture
  console.log('\n[Test Suite 10] Baton Pass Group Chat & Star Relay Architecture');
  const { generateSquadRoomId, isSquadRoomId } = await import('../src/services/webrtc/constants.js');
  assert(typeof generateSquadRoomId === 'function', 'generateSquadRoomId is exported');
  assert(typeof isSquadRoomId === 'function', 'isSquadRoomId is exported');

  const squadId = generateSquadRoomId();
  assert(squadId.startsWith('squad-'), 'generateSquadRoomId produces unified squad prefix (squad-word-word-num)');
  assert(isSquadRoomId(squadId) === true, 'isSquadRoomId identifies squad room ID');

  const parsedSquad = parseRoomHash('#squad-nexus-orbit-421');
  assert(parsedSquad.isSquad === true, 'parseRoomHash identifies squad room');
  assert(parsedSquad.roomId === 'squad-nexus-orbit-421', 'parseRoomHash normalizes full squad room ID');

  const { GroupRelayEngine } = await import('../src/services/webrtc/groupRelayEngine.js');
  assert(typeof GroupRelayEngine === 'function', 'GroupRelayEngine class is exported');

  const relayEngineSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'webrtc', 'groupRelayEngine.js'), 'utf8');
  assert(relayEngineSrc.includes('admitKnocker(') && relayEngineSrc.includes('declineKnocker('), 'GroupRelayEngine implements knock admission protocol');
  assert(relayEngineSrc.includes('passBaton(') && relayEngineSrc.includes('handleHostDisconnect('), 'GroupRelayEngine implements baton pass and failover');

  const batonMgrSrc = fs.readFileSync(path.join(ROOT, 'src', 'services', 'webrtc', 'groupBatonManager.js'), 'utf8');
  assert(batonMgrSrc.includes('setDesignatedSuccessor'), 'groupBatonManager implements designated Co-Host succession');

  // Verify group component files existence and line budgets
  const groupFiles = [
    { name: 'groupRelayEngine.js', path: path.join(ROOT, 'src', 'services', 'webrtc', 'groupRelayEngine.js'), max: 350 },
    { name: 'groupPacketHandler.js', path: path.join(ROOT, 'src', 'services', 'webrtc', 'groupPacketHandler.js'), max: 350 },
    { name: 'groupBatonManager.js', path: path.join(ROOT, 'src', 'services', 'webrtc', 'groupBatonManager.js'), max: 350 },
    { name: 'useGroupSession.js', path: path.join(ROOT, 'src', 'hooks', 'useGroupSession.js'), max: 350 },
    { name: 'GroupHeaderBar.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'GroupHeaderBar.jsx'), max: 350 },
    { name: 'CompactStreamMessage.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'CompactStreamMessage.jsx'), max: 350 },
    { name: 'MemberDrawer.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'MemberDrawer.jsx'), max: 350 },
    { name: 'GroupCreateModal.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'GroupCreateModal.jsx'), max: 350 },
    { name: 'SquadQrModal.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'SquadQrModal.jsx'), max: 350 },
    { name: 'GroupChatWorkspace.jsx', path: path.join(ROOT, 'src', 'components', 'group', 'GroupChatWorkspace.jsx'), max: 350 },
    { name: 'groupChat.css', path: path.join(ROOT, 'src', 'styles', 'groupChat.css'), max: 350 },
    { name: 'groupDrawer.css', path: path.join(ROOT, 'src', 'styles', 'groupDrawer.css'), max: 350 }
  ];

  groupFiles.forEach(({ name, path: fPath, max }) => {
    assert(fs.existsSync(fPath), `Group file ${name} exists`);
    const lines = fs.readFileSync(fPath, 'utf8').split('\n').length;
    assert(lines <= max, `${name} complies with line budget (${lines}/${max} lines)`);
  });

  const indexCssSrc = fs.readFileSync(path.join(ROOT, 'src', 'index.css'), 'utf8');
  assert(indexCssSrc.includes('groupChat.css'), 'index.css imports groupChat.css');
  assert(indexCssSrc.includes('groupDrawer.css'), 'index.css imports groupDrawer.css');

  // Summary
  console.log('\n====================================================');
  console.log(` Verification Complete: ${passedTests}/${totalTests} tests passed`);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL. Codebase is 100% AI-Ready.\n');
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
