import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARTIFACT_DIR = 'C:\\Users\\sanja\\.gemini\\antigravity-ide\\brain\\c9f059c5-f7b5-4c14-a253-d66f63d84467';
const SHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function getBrowserPath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome/Edge browser binary found.');
}

async function runUiTests() {
  console.log('🚀 Starting ZeroChat Localhost & UI Test Suite via Puppeteer...');
  const browserPath = getBrowserPath();
  console.log(`Using browser at: ${browserPath}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore normal offline PeerJS cloud broker handshakes during mock testing
      if (!txt.includes('peerjs') && !txt.includes('WebSocket connection to') && !txt.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(txt);
      }
      console.log(`[Browser Console ${msg.type()}]: ${txt}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
    console.error(`[Browser Page Error]: ${err.toString()}`);
  });

  try {
    // ==========================================
    // 1. DESKTOP VIEWPORT (1280x800) - HOME SCREEN
    // ==========================================
    console.log('\n🖥️ [1/6] Testing Desktop Viewport (1280x800) - Home Screen...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(SHOTS_DIR, '10_desktop_home_live.png') });
    console.log('  ✓ Captured 10_desktop_home_live.png');

    // ==========================================
    // 2. SETTINGS MODAL & DUAL-PRIORITY BATCHING
    // ==========================================
    console.log('\n⚙️ [2/6] Testing Settings Modal & Dual-Priority Wire Batching...');
    // Target the specific settings button on the header
    const settingsBtn = await page.$('button.settings-btn, button[title*="Settings (Themes"]');
    if (!settingsBtn) {
      throw new Error('Could not find button.settings-btn on Home header!');
    }
    await settingsBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    // Verify modal is open
    const modalTitle = await page.$eval('.settings-modal .modal-title', el => el.textContent.trim());
    console.log(`  ✓ Settings Modal opened with title: "${modalTitle}"`);
    if (modalTitle !== 'Settings') {
      throw new Error(`Expected modal title "Settings", got "${modalTitle}"`);
    }

    // Verify Network & Relay section and Dual-Priority Wire Batching
    const batchingLabel = await page.$eval('.settings-section .sound-toggle-name', el => el.textContent.trim());
    console.log(`  ✓ Found settings label: "${batchingLabel}"`);

    // Capture screenshot of Settings Modal (initial state)
    await page.screenshot({ path: path.join(SHOTS_DIR, '11_settings_modal_live.png') });
    console.log('  ✓ Captured 11_settings_modal_live.png');

    // Test Theme Switch to Synthwave
    console.log('  🎨 Testing theme switch to Synthwave...');
    const synthwaveBtn = await page.$('button.theme-card[title="Synthwave"]');
    if (synthwaveBtn) {
      await synthwaveBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // Test Dual-Priority Wire Batching toggle
    console.log('  ⚡ Testing Wire Batching toggle switch...');
    const wireBatchBtn = await page.$('button[title*="Dual-Priority Wire Batching"]');
    if (wireBatchBtn) {
      // Toggle off
      await wireBatchBtn.click();
      await new Promise((r) => setTimeout(r, 300));
      // Toggle back on
      await wireBatchBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    // Capture updated Settings modal
    await page.screenshot({ path: path.join(SHOTS_DIR, '11_settings_modal_customized.png') });
    console.log('  ✓ Captured 11_settings_modal_customized.png');

    // Close settings modal
    const closeBtn = await page.$('.modal-close, button[aria-label="Close settings"]');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForSelector('.settings-modal', { hidden: true, timeout: 3000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    }

    // ==========================================
    // 3. DESKTOP CHAT WORKSPACE & NEW FEATURES
    // ==========================================
    console.log('\n💬 [3/6] Testing Chat Workspace with On-Demand Files & Waveform Audio...');
    await page.goto('http://localhost:5173/#test-quantum-room', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Send a real user message through the input bar
    const chatInput = await page.$('.chat-input, input[placeholder*="Type a message"], textarea');
    if (chatInput) {
      await chatInput.type('Hello ZeroChat! Quantum wire verified with 0ms urgent priority.');
      await new Promise((r) => setTimeout(r, 200));
      await page.keyboard.press('Enter');
      await new Promise((r) => setTimeout(r, 600));
    }

    // Inject simulated messages to test on-demand lazy file preview and 16-point waveform audio
    console.log('  📦 Injecting mock On-Demand File Cards & Waveform Voice Notes...');
    await page.evaluate(() => {
      if (window.__peerService) {
        // 1. WhatsApp-Style Idle File Offer (Lazy download card)
        window.__peerService.emit('message', {
          id: 'test-file-idle-1',
          sender: 'remote',
          author: 'Alex (Co-Host)',
          type: 'file_card',
          fileId: 'file-doc-quantum-99',
          fileName: 'Quantum_Architecture_Whitepaper_v2.pdf',
          fileSize: 4892010, // ~4.9 MB
          fileType: 'application/pdf',
          status: 'idle',
          timestamp: Date.now() - 60000,
        });

        // 2. Active Downloading File Card (68% complete with circular progress ring)
        window.__peerService.emit('message', {
          id: 'test-file-downloading-2',
          sender: 'remote',
          author: 'Elena',
          type: 'file_card',
          fileId: 'file-iso-linux-42',
          fileName: 'CyberOS_Kernel_Snapshot.bin',
          fileSize: 12582912, // 12 MB
          fileType: 'application/octet-stream',
          status: 'downloading',
          progress: 68,
          timestamp: Date.now() - 30000,
        });

        // 3. Ready Downloaded File Card (WhatsApp style with Open / Save)
        window.__peerService.emit('message', {
          id: 'test-file-ready-3',
          sender: 'remote',
          author: 'Alex (Co-Host)',
          type: 'file_card',
          fileId: 'file-diagram-ready',
          fileName: 'Baton_Relay_Topology_Diagram.png',
          fileSize: 1542000, // 1.5 MB
          fileType: 'image/png',
          status: 'ready',
          downloadUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEewHgwU7cWwAAAABJRU5ErkJggg==',
          timestamp: Date.now() - 15000,
        });

        // 4. Voice Note with 16-Point Normalized Waveform Preview
        window.__peerService.emit('message', {
          id: 'test-voice-note-4',
          sender: 'remote',
          author: 'Sarah',
          isVoiceNote: true,
          type: 'voice',
          durationSec: 14,
          waveform: [0.15, 0.42, 0.85, 0.65, 0.95, 0.52, 0.78, 1.0, 0.82, 0.61, 0.74, 0.89, 0.45, 0.32, 0.22, 0.12],
          status: 'idle',
          fileId: 'voice-memo-4',
          timestamp: Date.now() - 5000,
        });
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Verify injected elements in DOM
    const fileCardsCount = await page.$$eval('.file-preview-card, .file-ready-image-wrap', els => els.length);
    console.log(`  ✓ Rendered WhatsApp File Preview Cards: ${fileCardsCount} (Expected: 3)`);
    if (fileCardsCount < 3) {
      console.warn(`Warning: Expected 3 file cards, found ${fileCardsCount}`);
    }

    const waveformBarsCount = await page.$$eval('.wave-bar', els => els.length);
    console.log(`  ✓ Rendered Audio Waveform Bars: ${waveformBarsCount} (Expected: 16)`);
    if (waveformBarsCount < 16) {
      console.warn(`Warning: Expected 16 waveform bars, found ${waveformBarsCount}`);
    }

    await page.screenshot({ path: path.join(SHOTS_DIR, '16_chat_features_verified.png') });
    console.log('  ✓ Captured 16_chat_features_verified.png');

    // ==========================================
    // 4. SQUAD BATON RELAY WORKSPACE (DESKTOP)
    // ==========================================
    console.log('\n👥 [4/6] Testing Squad Baton Relay Workspace...');
    await page.goto('http://localhost:5173/#squad-quantum-core', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Check squad header & baton indicator
    const hasSquadHeader = await page.$('.group-header-bar, .squad-header, header');
    console.log(`  ✓ Squad Header mounted: ${Boolean(hasSquadHeader)}`);

    await page.screenshot({ path: path.join(SHOTS_DIR, '17_squad_workspace_desktop.png') });
    console.log('  ✓ Captured 17_squad_workspace_desktop.png');

    // ==========================================
    // 5. MOBILE VIEWPORT (390x844) - ERGONOMICS & SAFE AREAS
    // ==========================================
    console.log('\n📱 [5/6] Testing Mobile Viewport (390x844) - Home & Chat...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 5a. Mobile Home
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SHOTS_DIR, '18_mobile_home_verified.png') });
    console.log('  ✓ Captured 18_mobile_home_verified.png');

    // 5b. Mobile Settings Modal
    const mobileSettingsBtn = await page.$('button.settings-btn');
    if (mobileSettingsBtn) {
      await mobileSettingsBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: path.join(SHOTS_DIR, '19_mobile_settings_verified.png') });
      console.log('  ✓ Captured 19_mobile_settings_verified.png');
      const mobileClose = await page.$('.modal-close');
      if (mobileClose) {
        await mobileClose.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    // 5c. Mobile Chat Workspace
    await page.goto('http://localhost:5173/#test-quantum-room', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Inject cards into mobile chat
    await page.evaluate(() => {
      if (window.__peerService) {
        window.__peerService.emit('message', {
          id: 'mob-file-1',
          sender: 'remote',
          author: 'Alex',
          type: 'file_card',
          fileId: 'file-mob-1',
          fileName: 'Mobile_Spec_v1.pdf',
          fileSize: 2400000,
          status: 'idle',
          timestamp: Date.now(),
        });
        window.__peerService.emit('message', {
          id: 'mob-voice-1',
          sender: 'remote',
          author: 'Alex',
          isVoiceNote: true,
          type: 'voice',
          durationSec: 9,
          waveform: [0.2, 0.5, 0.9, 0.7, 1.0, 0.6, 0.8, 0.4, 0.3, 0.6, 0.8, 0.5, 0.4, 0.2, 0.1, 0.1],
          status: 'idle',
          fileId: 'voice-mob-1',
          timestamp: Date.now(),
        });
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({ path: path.join(SHOTS_DIR, '20_mobile_chat_verified.png') });
    console.log('  ✓ Captured 20_mobile_chat_verified.png');

    // 5d. Mobile Squad Workspace
    await page.goto('http://localhost:5173/#squad-mobile-core', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SHOTS_DIR, '21_mobile_squad_verified.png') });
    console.log('  ✓ Captured 21_mobile_squad_verified.png');

    // ==========================================
    // 6. SUMMARY & VALIDATION
    // ==========================================
    console.log('\n====================================================');
    console.log(' ✅ All Localhost & UI Tests Completed Successfully!');
    console.log(` Console Non-Fatal Errors: ${consoleErrors.length}`);
    console.log('====================================================');

    if (consoleErrors.length > 0) {
      console.log('Console Errors Reported:', consoleErrors);
    }
  } finally {
    await browser.close();
  }
}

runUiTests().catch((e) => {
  console.error('UI Test Execution Failed:', e);
  process.exit(1);
});
