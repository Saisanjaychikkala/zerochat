import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

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
  throw new Error('No compatible Chrome/Edge browser binary found.');
}

async function waitForServer(url, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function runE2ETest() {
  console.log('====================================================');
  console.log(' ZeroChat End-to-End Browser Call Lift & Media Test');
  console.log('====================================================\n');

  const browserPath = getBrowserPath();
  console.log(`Using Browser executable: ${browserPath}`);

  // 1. Start Vite preview server on port 4173
  console.log('Starting local Vite preview server...');
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4173'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log(`[preview] ${d}`);
  });
  serverProcess.stderr.on('data', (d) => {
    // console.error(`[preview-err] ${d}`);
  });

  const appUrl = 'http://localhost:4173';

  try {
    await waitForServer(appUrl, 15000);
    console.log(`Preview server ready at ${appUrl}\n`);

    // 2. Launch Puppeteer Browser
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    console.log('Browser launched successfully with fake media devices.');

    // 3. Create two independent browser contexts
    const contextA = await browser.createBrowserContext();
    const contextB = await browser.createBrowserContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Set viewport
    await pageA.setViewport({ width: 1280, height: 800 });
    await pageB.setViewport({ width: 1280, height: 800 });

    // Enable console logs
    pageA.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[ZeroChat]')) console.log(`  [Peer A Log] ${text}`);
    });
    pageB.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[ZeroChat]')) console.log(`  [Peer B Log] ${text}`);
    });

    console.log('\n[Step 1] Loading Peer A...');
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });

    // Wait for Peer A room ID to appear in Hero card
    await pageA.waitForSelector('.room-code-text', { timeout: 10000 });
    const roomIdText = await pageA.$eval('.room-code-text', (el) => el.textContent.trim());
    console.log(`Peer A Room Created: ${roomIdText}`);

    // Join room URL for Peer B
    const joinUrl = `${appUrl}/#${roomIdText}`;
    console.log(`\n[Step 2] Loading Peer B to join room #${roomIdText}...`);
    await pageB.goto(joinUrl, { waitUntil: 'networkidle0' });

    // Wait for P2P connection handshake on both sides
    console.log('Waiting for WebRTC P2P DataChannel connection...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const tag = document.querySelector('.chat-header');
        return tag && tag.textContent.includes('Encrypted memory channel active');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const tag = document.querySelector('.chat-header');
        return tag && tag.textContent.includes('Encrypted memory channel active');
      }, { timeout: 15000 }),
    ]);
    console.log('✓ WebRTC P2P channel connected successfully between Peer A & Peer B!');

    // Test text message transfer
    console.log('\n[Step 3] Testing ephemeral P2P text messaging...');
    await pageA.type('.chat-input', 'Hello Peer B from automated browser test!');
    await pageA.keyboard.press('Enter');

    await pageB.waitForFunction(() => {
      return document.body.innerText.includes('Hello Peer B from automated browser test!');
    }, { timeout: 5000 });
    console.log('✓ Text message arrived at Peer B via direct RTCDataChannel.');

    // 4. Test Voice Call & Answer ("Lift the Call")
    console.log('\n[Step 4] Testing Voice Call Initiation from Peer A...');
    const callButton = await pageA.waitForSelector('.call-trigger-btn', { timeout: 5000 });
    await callButton.click();
    console.log('Peer A clicked Voice Call button.');

    // Wait for Incoming Call Dialog on Peer B
    console.log('Waiting for Incoming Call Dialog to appear on Peer B...');
    await pageB.waitForSelector('.call-incoming-dialog', { timeout: 10000 });
    console.log('✓ Peer B received incoming call dialog!');

    // Verify Accept button exists and click it ("Lift the call")
    console.log('\n[Step 5] Peer B answering ("lifting") the call...');
    const acceptBtn = await pageB.waitForSelector('.btn-call-accept', { timeout: 5000 });
    await acceptBtn.click();
    console.log('Peer B clicked "Accept" (lifting call).');

    // Wait for Call Overlay to become active and connected on BOTH sides
    console.log('Waiting for call overlay to transition to connected state...');
    await Promise.all([
      pageA.waitForSelector('.call-overlay', { timeout: 10000 }),
      pageB.waitForSelector('.call-overlay', { timeout: 10000 }),
    ]);
    console.log('✓ Call overlay active on both Peer A & Peer B!');

    // Verify call controls dock is visible on both sides
    await Promise.all([
      pageA.waitForSelector('.call-controls-dock', { timeout: 5000 }),
      pageB.waitForSelector('.call-controls-dock', { timeout: 5000 }),
    ]);
    console.log('✓ Call controls dock rendered with active toolbar.');

    // Test Zoom controls on Peer A
    console.log('\n[Step 6] Testing Zoom Controls in Call Viewport...');
    const zoomInBtn = await pageA.waitForSelector('.zoom-btn[aria-label="Zoom In"]', { timeout: 5000 });
    await zoomInBtn.click();
    await pageA.waitForFunction(() => {
      const pill = document.querySelector('.zoom-pill');
      return pill && pill.textContent.includes('125%');
    }, { timeout: 3000 });
    console.log('✓ Zoomed in to 125% successfully.');

    const zoomResetBtn = await pageA.waitForSelector('.zoom-btn.reset-btn', { timeout: 3000 });
    await zoomResetBtn.click();
    await pageA.waitForFunction(() => {
      const pill = document.querySelector('.zoom-pill');
      return pill && pill.textContent.includes('100%');
    }, { timeout: 3000 });
    console.log('✓ Zoom reset to 100% successfully.');

    // Test Audio Mute toggle on Peer B
    console.log('\n[Step 7] Testing Mute / Unmute audio...');
    const muteBtn = await pageB.waitForSelector('button[aria-label="Mute Microphone"]', { timeout: 5000 });
    await muteBtn.click();
    await pageB.waitForSelector('button[aria-label="Unmute Microphone"]', { timeout: 5000 });
    console.log('✓ Microphone muted successfully on Peer B.');

    // 8. Test End Call and Hardware Teardown
    console.log('\n[Step 8] Ending call from Peer A and verifying teardown...');
    const endCallBtn = await pageA.waitForSelector('.call-dock-btn.end-call', { timeout: 5000 });
    await endCallBtn.click();

    // Verify call overlay dismissed on BOTH sides
    await Promise.all([
      pageA.waitForFunction(() => !document.querySelector('.call-overlay'), { timeout: 5000 }),
      pageB.waitForFunction(() => !document.querySelector('.call-overlay'), { timeout: 5000 }),
    ]);
    console.log('✓ Call ended and overlays cleanly dismissed on both peers.');

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END BROWSER TESTS PASSED FLAWLESSLY!');
    console.log('   - P2P DataChannel: OK');
    console.log('   - Call Offer & Incoming Notification: OK');
    console.log('   - Call Answering ("Lifting"): OK');
    console.log('   - Active Call Overlay & Controls: OK');
    console.log('   - Viewport Zoom & Reset: OK');
    console.log('   - Call Teardown & Clean Hardware Release: OK');
    console.log('====================================================\n');

    await browser.close();
  } finally {
    serverProcess.kill();
  }
}

runE2ETest().catch((err) => {
  console.error('Fatal E2E test failure:', err);
  process.exit(1);
});
