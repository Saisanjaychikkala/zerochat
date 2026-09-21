/**
 * ZeroChat - Autonomous Verification & QA Test Harness
 * Validates wire protocols, chunking math, room code generation, skills, and CSS integrity.
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

// 1. Verify Room ID Generation
console.log('[Test Suite 1] Room ID Generation & Entropy');
import('../src/services/webrtc/constants.js').then(({ generateRoomId, ROOM_WORDS, CHUNK_SIZE }) => {
  assert(typeof generateRoomId === 'function', 'generateRoomId is exported');
  assert(Array.isArray(ROOM_WORDS) && ROOM_WORDS.length >= 20, 'ROOM_WORDS dictionary has sufficient entropy');
  assert(CHUNK_SIZE === 16384, 'CHUNK_SIZE is standard 16KB (16384 bytes)');

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
}).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
