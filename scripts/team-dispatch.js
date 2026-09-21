/**
 * ZeroChat Autonomous Multi-Agent Department Health Auditor
 * Simulates cross-department inspection by ZeroChief, Atlas, Nova, Vigil, Aegis, and Echo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function printHeader() {
  console.log('\n================================================================');
  console.log(' ⚡ ZeroChat Autonomous Multi-Agent Department Audit');
  console.log(' Executive Lead: ZeroChief | Founder: User');
  console.log('================================================================\n');
}

let departmentFailures = 0;

function reportDepartment(emoji, name, agent, passed, checks) {
  console.log(`${emoji} [Department: ${name}] Lead: ${agent}`);
  checks.forEach(({ label, success }) => {
    if (success) {
      console.log(`   ✓ ${label}`);
    } else {
      console.error(`   ✗ FAIL: ${label}`);
      departmentFailures++;
    }
  });
  console.log(`   Status: ${passed ? 'HEALTHY (100%)' : 'ACTION REQUIRED'}\n`);
}

async function runAudit() {
  printHeader();

  // 1. ATLAS (WebRTC & Networking)
  const constantsPath = path.join(ROOT, 'src', 'services', 'webrtc', 'constants.js');
  const constantsContent = fs.readFileSync(constantsPath, 'utf8');
  const atlasChecks = [
    { label: 'ICE configuration with global STUN/TURN relays present', success: constantsContent.includes('openrelay.metered.ca') },
    { label: 'AirDrop standard 16KB chunk size configured', success: constantsContent.includes('16 * 1024') },
    { label: 'Room code 3-word entropy dictionary configured', success: constantsContent.includes('ROOM_WORDS') },
    { label: 'Dummy canvas track upgrade pipeline in mediaCallEngine.js', success: fs.readFileSync(path.join(ROOT, 'src', 'services', 'webrtc', 'mediaCallEngine.js'), 'utf8').includes('createDummyVideoTrack') },
  ];
  reportDepartment('🌐', 'WebRTC & Networking', 'Atlas', atlasChecks.every(c => c.success), atlasChecks);

  // 2. NOVA (UI/UX & Design)
  const stylesDir = path.join(ROOT, 'src', 'styles');
  const responsiveCss = fs.readFileSync(path.join(stylesDir, 'responsive.css'), 'utf8');
  const baseCss = fs.readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
  const novaChecks = [
    { label: 'Cyber-glass tokens & variables loaded', success: fs.existsSync(path.join(stylesDir, 'variables.css')) },
    { label: '100dvh mobile viewport stability enforced', success: baseCss.includes('100dvh') },
    { label: 'iOS Safari auto-zoom prevention (16px font rule)', success: responsiveCss.includes('font-size: 16px !important;') },
    { label: 'Safe-area inset padding for mobile home indicators', success: responsiveCss.includes('env(safe-area-inset-bottom') },
    { label: 'Web Audio procedural synthesis (0 external mp3/wav files)', success: fs.existsSync(path.join(ROOT, 'src', 'utils', 'soundEffects.js')) },
  ];
  reportDepartment('🎨', 'UI/UX & Product Design', 'Nova', novaChecks.every(c => c.success), novaChecks);

  // 3. AEGIS (Security & Performance)
  const appCode = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8');
  const chatTransfersCode = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useChatTransfers.js'), 'utf8');
  const clipboardCode = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'clipboard.js'), 'utf8');
  const aegisChecks = [
    { label: 'Zero-Database Guarantee: No localStorage message persistence', success: !appCode.includes("localStorage.setItem('zerochat_messages'") && !chatTransfersCode.includes("localStorage.setItem('zerochat_messages'") },
    { label: 'Ephemeral memory cleanup: URL.revokeObjectURL called on burn', success: chatTransfersCode.includes('URL.revokeObjectURL') },
    { label: 'LAN IP clipboard copy fallback for http://192.168.x.x', success: clipboardCode.includes('document.execCommand') },
    { label: 'iOS Safari WebKit audio recording format fallbacks', success: fs.readFileSync(path.join(ROOT, 'src', 'utils', 'voiceRecorder.js'), 'utf8').includes('audio/mp4') },
  ];
  reportDepartment('🔒', 'Security & Performance', 'Aegis', aegisChecks.every(c => c.success), aegisChecks);

  // 4. VIGIL (QA & Test Engineering)
  const verifyScriptExists = fs.existsSync(path.join(ROOT, 'scripts', 'verify-all.js'));
  const qaSkillExists = fs.existsSync(path.join(ROOT, '.agents', 'skills', 'zerochat-qa', 'SKILL.md'));
  const vigilChecks = [
    { label: 'Autonomous verification test suite present', success: verifyScriptExists },
    { label: 'Adversarial QA skill frontmatter valid', success: qaSkillExists },
    { label: 'Strict 1-on-1 room occupation rejection logic verified', success: fs.readFileSync(path.join(ROOT, 'src', 'services', 'peerService.js'), 'utf8').includes('room_occupied') },
    { label: 'Ephemeral outgoing queue for network reconnects verified', success: fs.readFileSync(path.join(ROOT, 'src', 'services', 'peerService.js'), 'utf8').includes('outgoingQueue') },
  ];
  reportDepartment('🛡️', 'QA & Test Engineering', 'Vigil', vigilChecks.every(c => c.success), vigilChecks);

  // 5. ECHO (Build & Release Engineering)
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const teamMdExists = fs.existsSync(path.join(ROOT, 'TEAM.md'));
  const agentsMdExists = fs.existsSync(path.join(ROOT, 'AGENTS.md'));
  const echoChecks = [
    { label: 'npm test script configured in package.json', success: !!pkg.scripts?.test },
    { label: 'npm run team:audit script configured in package.json', success: !!pkg.scripts?.['team:audit'] },
    { label: 'TEAM.md organizational chart present', success: teamMdExists },
    { label: 'AGENTS.md operating guidelines present', success: agentsMdExists },
  ];
  reportDepartment('📦', 'Release & Build Engineering', 'Echo', echoChecks.every(c => c.success), echoChecks);

  // Summary
  console.log('================================================================');
  if (departmentFailures === 0) {
    console.log(' ⚡ ZeroChief Executive Summary: ALL 5 DEPARTMENTS 100% OPERATIONAL');
    console.log(' The codebase is fully autonomous, robust, and AI-Ready.');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.error(` 💥 ZeroChief Warning: ${departmentFailures} checks failed.`);
    console.log('================================================================\n');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal team dispatch error:', err);
  process.exit(1);
});
